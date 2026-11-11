# Plan de Arquitectura: Pipeline OCR Secuencial HD, Corrección ATS con Groq y Mapeo Canónico de 20+ Secciones

Este documento es la especificación técnica completa y guía paso a paso para la implementación del nuevo flujo de importación y extracción de CVs en LEECV, especialmente diseñado para procesar PDFs escaneados largos (hasta 30 páginas, como el caso de prueba de 26 páginas y 17.8 MB) sin agotar memoria ni sufrir timeouts en Vercel.

---

## 1. Resumen Ejecutivo del Problema

1. **Causa del Timeout (`FUNCTION_INVOCATION_TIMEOUT` 60s en Vercel):**
   - El modelo `gemini-3.8-flash` tiene activo por defecto el modo de pensamiento reflexivo (`thinking`). Al procesar una imagen de página completa con un esquema JSON grande, genera tokens de pensamiento durante 50-55s antes del JSON, provocando que Vercel Serverless corte la ejecución al límite de 60s.
2. **Causa de Sobrecarga de Memoria en Navegador:**
   - La función `processPdfPages` en `ImportCvAiModal.tsx` renderizaba todas las páginas del PDF simultáneamente en un array de Base64, reteniendo decenas de megabytes en el heap gráfico del navegador.
3. **Falta de Envío Secuencial Completo:**
   - El modal actual solo enviaba la página 1 y quedaba esperando un polling a un worker inexistente en Vercel Serverless.
4. **Mapeo Incompleto de Secciones:**
   - `cvImportReview.ts` solo conocía 5 listas (`experience`, `education`, `skills`, `languages`, `coursesAndCertificates`) en lugar del catálogo canónico de más de 20 secciones que soporta el motor de PDF (`cvDataAdapter.ts`). Además, no activaba automáticamente la visibilidad de las secciones (`sectionVisibility[id] = true`).

---

## 2. Diagrama del Nuevo Flujo

```
[PDF del Usuario (hasta 30 páginas)]
           │
           ▼
[Fase 1: Renderizador Local HD en Navegador]
   - Página por página por demanda (1 a la vez)
   - Canvas altura ~1800px (~200 DPI equivalente)
   - JPEG comprimido 85% (~350-500 KB)
   - Limpieza y destrucción inmediata del Canvas
           │
           ▼
[Fase 2: OCR Secuencial con Gemini 3.8 Flash]
   - 1 página por request a /api/cv-import-api?action=extract-page
   - thinkingConfig: { thinkingBudget: 0 } (Respuesta en 3-5 seg)
   - AbortSignal.timeout(45000)
   - Barra de progreso en vivo: "Leyendo página X de Y... (Z%)"
           │
           ▼
[Fase 3: Consolidación y Pulido ATS con Groq (Llama 3.3 70B)]
   - Petición final a /api/cv-import-api?action=consolidate-ats
   - Une textos y oraciones cortadas entre páginas
   - Elimina sellos, folios y cabeceras repetitivas de escaneo
   - Optimiza redacción con verbos de acción y foco en logros
           │
           ▼
[Fase 4: Mapeo Canónico a 20+ Secciones en cvData]
   - Normalización de datos para todas las secciones de SECTION_CATALOG
   - activateSection() enciende sectionVisibility[s] = true
   - Inyección en CVContext
           │
           ▼
[Fase 5: Visualización Inmediata en Editor y PDF]
   - Los registros aparecen en el editor lateral
   - El PDF Engine (cvDataAdapter) renderiza los datos en tiempo real
```

---

## 3. Especificación Técnica por Fases

### Fase 1: Renderizado Local HD Secuencial (Frontend)
- **Archivo:** `src/modules/cv-builder/components/modals/ImportCvAiModal.tsx`
- **Comportamiento:**
  - Abrir el documento usando `pdfjsLib.getDocument(...)`.
  - En lugar de renderizar todas las páginas de golpe en un array:
    - Iterar con un bucle `for (let i = 1; i <= totalPages; i++)`.
    - Obtener página `const page = await pdf.getPage(i)`.
    - Si tiene capa de texto coherente (`isTextLayerCoherent(rawText)`), enviar como `{ kind: 'text', content: rawText }`.
    - Si es escaneada:
      - Calcular escala para que la altura o ancho máximo sea ~1800px (nitidez óptima para OCR de letras chicas y firmas).
      - Renderizar en un `<canvas>`.
      - Exportar con `canvas.toDataURL('image/jpeg', 0.85)`.
      - **Liberación de memoria inmediata:**
        ```typescript
        canvas.width = 0;
        canvas.height = 0;
        ```
      - Subir inmediatamente la página `i`.

### Fase 2: Configuración Gemini sin Delay y Endpoint Secuencial (Backend)
- **Archivo:** `api/_lib/aiProviders/gemini.ts`
  - En la llamada `complete`, dentro de `generationConfig`:
    ```typescript
    generationConfig: {
      temperature: req.temperature ?? 0.1,
      maxOutputTokens: req.maxTokens || 4000,
      thinkingConfig: {
        thinkingBudget: 0 // Apaga el razonamiento interno que causaba los 60s de timeout
      },
      ...(req.responseSchema ? { responseMimeType: 'application/json', responseSchema: req.responseSchema } : {})
    }
    ```
  - En el `fetch`:
    ```typescript
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(...),
      signal: AbortSignal.timeout(45000) // Salvaguarda antes de Vercel
    });
    ```
- **Archivo:** `api/cv-import-api.ts`
  - Mantener la acción `extract-page` para responder de forma síncrona el JSON de esa página (sin depender de jobs asíncronos en cola inexistentes).

### Fase 3: Consolidación y Pulido ATS con Groq
- **Archivo:** `api/cv-import-api.ts`
  - Agregar la acción `consolidate-ats`:
    - Recibe un array con los fragmentos JSON o textos extraídos de todas las páginas: `{ fragments: any[] }`.
    - Invoca al proveedor Groq (`groqProvider`, modelo `llama-3.3-70b-versatile`).
    - **Prompt del Sistema para Groq:**
      ```text
      Eres un consultor experto en optimización de CVs y sistemas ATS (Applicant Tracking Systems).
      Tu tarea es consolidar y pulir los datos extraídos por OCR de múltiples páginas de un CV.
      
      REGLAS OBLIGATORIAS:
      1. CONTINUIDAD: Une descripciones u oraciones que se hayan cortado al cambiar de página.
      2. ELIMINAR RUIDO: Remueve números de página, notas al pie de escaneo, folios y sellos repetitivos.
      3. IMPACTO ATS: Inicia los puntos de responsabilidad y logros con verbos de acción fuertes en tiempo pasado (ej. Implementó, Diseñó, Coordinó, Optimizó).
      4. CLASIFICACIÓN EXACTA: Mapea cada elemento a su categoría canónica de LEECV.
      ```
    - Devuelve el JSON consolidado completo listo para revisión o inserción.

---

## 4. Mapeo a las 20+ Secciones Canónicas

Referencia canónica: `src/shared/core/sectionRegistry.ts` y `src/shared/core/pdf-engine/layers/records/cvDataAdapter.ts`.

| ID Sección | Colección / Campo en `cvData` | Estructura del Registro |
|---|---|---|
| `contacto` | `personalInfo` | `{ phone, email, address, cityProvince, facebook, website }` |
| `datos-personales` | `personalInfo` | `{ dni, cuit, birthDate, nacionalidad, estadoCivil, disponibilidad, licenciaConducir }` |
| `frase` | `frase` o `personalInfo.quote` | `string` (Lema o titular profesional) |
| `objetivo` | `objective` | `string` (Objetivo profesional / metas) |
| `resumen` | `summary` | `string` (Resumen ejecutivo / perfil) |
| `experiencia` | `experience` | `[{ role, company, institution, details, startDate, endDate, year }]` |
| `logros` | `achievements` | `[{ title, institution, details }]` |
| `portafolio` | `portfolio` | `[{ title, institution, details }]` |
| `formacion` | `education` | `[{ degree, institution, level, startDate, endDate, year }]` |
| `profesion` | `profession` | `[{ degree, institution, year }]` |
| `cursos` | `coursesAndCertificates` | `[{ title, institution, hours, year }]` |
| `informatica` | `informatics` | `[{ title, course, institution }]` |
| `proyectos` | `projects` | `[{ title, institution, details, year }]` |
| `publicaciones` | `publications` | `[{ title, autor, institution, year }]` |
| `referencias` | `references` | `[{ personaReferencia, cargo, institution, contactoReferencia }]` |
| `habilidades` | `hardSkills` | `[{ name, level }]` |
| `competencias` | `skills` | `[{ name }]` (Soft skills) |
| `idiomas` | `languages` | `[{ idioma, language, nivel, level, proficiency }]` |
| `redes` | `redes` | `[{ plataforma, usuario, url }]` |
| `personalizada-1`..`5` | `personalizada-1`..`5` | `[{ tituloOGrado, institucion, periodo, descripcion }]` |
| `certificados` | `certificatesScanned` | `[{ name, url }]` |
| `firma` | `signature` | `{ signerName, signerRole, date, dataUrl }` |

---

## 5. Activación de Secciones en la UI y el Editor

- **Archivo:** `src/modules/cv-builder/utils/cvImportReview.ts`
  - Ampliar `IMPORTABLE_LIST_FIELDS` con todas las listas anteriores.
  - Normalizar los campos para que coincidan exactamente con la estructura que espera `cvDataAdapter.ts`.
- **Archivo:** `src/modules/cv-builder/components/editor/sections/ImportDataSection.tsx`
  - En `handleConfirmImport`, al aplicar los cambios al CV:
    ```typescript
    import { activateSection } from '../../../../../shared/core/sections/sectionActivationEngine';

    let updated = applyImportReview(previous, editedFragment, selections);
    
    // Activar automáticamente la visibilidad de cada sección que posea datos
    const listSectionMapping: Record<string, string> = {
      experience: 'experiencia',
      education: 'formacion',
      profession: 'profesion',
      achievements: 'logros',
      portfolio: 'portafolio',
      coursesAndCertificates: 'cursos',
      informatics: 'informatica',
      projects: 'proyectos',
      publications: 'publicaciones',
      references: 'referencias',
      hardSkills: 'habilidades',
      skills: 'competencias',
      languages: 'idiomas',
      redes: 'redes'
    };

    Object.entries(listSectionMapping).forEach(([fieldKey, sectionId]) => {
      if (Array.isArray(updated[fieldKey]) && updated[fieldKey].length > 0) {
        updated = activateSection(updated, sectionId).updatedCvData;
      }
    });

    if (updated.objective) updated = activateSection(updated, 'objetivo').updatedCvData;
    if (updated.summary) updated = activateSection(updated, 'resumen').updatedCvData;
    if (updated.frase) updated = activateSection(updated, 'frase').updatedCvData;

    return updated;
    ```

---

## 6. Reglas de Validación Obligatorias (AGENTS.md)

1. **Regla 0:** Antes de terminar, ejecutar:
   ```bash
   npm run check-all
   ```
   Debe arrojar exactamente **0 errores**.
2. **Regla 1:** Usar los motores canónicos (`sectionActivationEngine`, `sectionRegistry`, `cvDataAdapter`, `apiClient`, `withErrorHandling`).
3. **Regla 2:** No usar clases dinámicas de Tailwind (`bg-[${variable}]`).
4. **Regla 6:** Crear rama descriptiva (`feat/ocr-pipeline-ats-groq`), no pushear directo a `main`. Abrir PR y esperar CI en verde.
