# Plan: Mejora IA Extracción PDF/Imagen + Botón Show Password (V2.4.0)

> **Fecha**: 2026-10-31
> **Estado**: PENDIENTE
> **Versión destino**: V2.4.0

---

## Resumen Ejecutivo

Tres ejes de trabajo:

1. **Verificar y corregir que la IA funcione end-to-end** para extracción de datos desde PDF e imágenes
2. **Agregar botón "mostrar/ocultar contraseña"** en LoginModal (método contraseña)
3. **Mejoras al motor de IA** para que la extracción sea más robusta y precisa

---

## EJE 1 — Verificación y corrección del flujo IA de extracción

### Estado actual (hallazgos de auditoría)

| Componente | Archivo | Estado |
|---|---|---|
| Modal de importación | `src/modules/cv-builder/components/modals/ImportCvAiModal.tsx` (224 líneas) | ✅ Completo |
| API serverless | `api/cv-import-api.ts` (135 líneas) | ✅ Completo |
| Provider Gemini | `api/_lib/aiProviders/gemini.ts` (96 líneas) | ✅ Soporta imágenes |
| Provider Groq | `api/_lib/aiProviders/groq.ts` (80 líneas) | ⚠️ NO soporta imágenes |
| Key Rotation | `api/_lib/aiProviders/keyRotation.ts` (57 líneas) | ✅ Completo |
| Text Coherence | `src/shared/core/cv-import/textCoherenceHeuristic.ts` (20 líneas) | ✅ Funcional |
| Image Encoder | `src/shared/core/cv-import/pageImageEncoder.ts` (94 líneas) | ✅ Completo |
| Merge Fragments | `src/shared/core/cv-import/mergeFragments.ts` (64 líneas) | ✅ Completo |
| API Client | `src/shared/core/utils/apiClient.ts` (105 líneas) | ✅ Adjunta token auth |

### BUGS ENCONTRADOS

#### BUG 1 — Groq en primer lugar del fallback, pero no soporta imágenes
- **Archivo**: `api/_lib/aiProviders/registry.ts` línea 10
- **Problema**: `AI_PROVIDER_FALLBACK_ORDER = ['groq', 'gemini']` — Groq va primero, pero el provider Groq (`groq.ts`) no envía `req.images` al API porque usa el endpoint OpenAI-compatible que solo acepta `messages[].content` como string, no multipart con imágenes. Si el usuario sube una **imagen** (foto de CV) o un PDF con páginas sin texto coherente (que se rasteriza a imagen), Groq recibirá el prompt SIN la imagen y devolverá basura o error.
- **Solución**: En `cv-import-api.ts`, si `kind === 'image'`, saltar Groq y usar directamente los providers que soporten imágenes. O mejor: agregar un flag `supportsImages` a `AiProviderDefinition` y filtrar en el loop de fallback.

#### BUG 2 — apiClient envía `requiresAuth: true` por default pero cv-import no valida auth
- **Archivo**: `src/shared/core/utils/apiClient.ts` línea 25 y `api/cv-import-api.ts`
- **Problema**: `apiClient.post()` agrega `Authorization: Bearer ...` por defecto (`requiresAuth = true`), pero la API `cv-import-api.ts` no valida ni usa ese token — solo hace rate-limit por IP. Esto funciona, pero si el usuario NO tiene sesión activa, `getSession()` puede lanzar un error que se silencia. No es un blocker pero es una incoherencia.
- **Solución**: En `ImportCvAiModal.tsx`, la llamada a `apiClient.post()` debería usar `{ requiresAuth: false }` ya que la importación IA es libre y no requiere autenticación.

#### BUG 3 — Error handling insuficiente en el modal
- **Archivo**: `ImportCvAiModal.tsx` línea 82-84
- **Problema**: La validación `if (!pData || !pData.data || !pData.data.fragmentJson)` no verifica `pData.ok`. Si el API devuelve un error HTTP (429, 502, etc.) con `ok: false`, `pData.data` podría tener un objeto de error, y `pData.data.fragmentJson` sería `undefined`, tirando el error genérico "Error inesperado procesando página X" sin mostrar el mensaje real del servidor.
- **Solución**: Verificar `pData.ok` primero y usar `pData.error` como mensaje.

### Tareas Eje 1

```
TAREA 1.1 — Agregar flag `supportsImages` a AiProviderDefinition
  Archivo: api/_lib/aiProviders/types.ts
  Acción: Agregar campo `supportsImages: boolean` a la interfaz `AiProviderDefinition`

TAREA 1.2 — Marcar cada provider con su soporte de imágenes
  Archivo: api/_lib/aiProviders/gemini.ts
  Acción: Agregar `supportsImages: true` al objeto geminiProvider
  
  Archivo: api/_lib/aiProviders/groq.ts
  Acción: Agregar `supportsImages: false` al objeto groqProvider

TAREA 1.3 — Filtrar providers por capacidad en cv-import-api
  Archivo: api/cv-import-api.ts
  Acción: En el loop de providers (línea 77), si `kind === 'image'` y `!provider.supportsImages`, hacer `continue` para saltar ese provider.
  Código sugerido:
    for (const providerId of AI_PROVIDER_FALLBACK_ORDER) {
      const provider = AI_PROVIDERS[providerId];
      if (!provider) continue;
      if (kind === 'image' && !provider.supportsImages) continue;  // ← NUEVA LÍNEA
      ...
    }

TAREA 1.4 — Mejorar error handling en ImportCvAiModal
  Archivo: src/modules/cv-builder/components/modals/ImportCvAiModal.tsx
  Acción: Reemplazar el bloque de validación (líneas 82-84) con:
    if (!pData.ok) {
      throw new Error(pData.error || `Error del servidor procesando página ${i+1}`);
    }
    if (!pData.data?.fragmentJson) {
      throw new Error(`Respuesta inesperada del servidor para página ${i+1}`);
    }

TAREA 1.5 — Pasar requiresAuth: false en la llamada a cv-import
  Archivo: src/modules/cv-builder/components/modals/ImportCvAiModal.tsx
  Acción: Cambiar línea 76-80 para agregar la opción:
    const pData = await apiClient.post('/api/cv-import-api?action=extract-page', {
      kind: page.kind,
      content: page.content,
      contextSummary
    }, { requiresAuth: false });
```

---

## EJE 2 — Botón Mostrar/Ocultar Contraseña en LoginModal

### Estado actual

- **Archivo**: `src/modules/auth/components/LoginModal.tsx`
- **Línea 290-297**: Input `type="password"` hardcoded, sin toggle de visibilidad
- **No existe** ningún botón de ojo / mostrar contraseña

### Tareas Eje 2

```
TAREA 2.1 — Agregar estado showPassword al LoginModal
  Archivo: src/modules/auth/components/LoginModal.tsx
  Acción: Agregar import de icono `Eye` y `EyeOff` de lucide-react (línea 4).
  Agregar estado: const [showPassword, setShowPassword] = useState(false);
  Ubicar junto a los otros estados (después de línea 26).

TAREA 2.2 — Reemplazar input de password con toggle
  Archivo: src/modules/auth/components/LoginModal.tsx
  Acción: Reemplazar el bloque del input password (líneas 286-298) con:

  <div className="space-y-1">
    <label className="text-xs font-bold text-[var(--ui-text-secondary)]">Contraseña</label>
    <div className="relative">
      <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ui-text-secondary)]" />
      <input
        type={showPassword ? 'text' : 'password'}
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className={`w-full text-xs pl-9 pr-10 py-2.5 rounded-[${radius.control}] bg-[var(--ui-bg-card)] border border-[var(--ui-border)] focus:border-[var(--color-accent-base)] outline-none transition`}
        placeholder="••••••••"
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ui-text-secondary)] hover:text-[var(--ui-text-primary)] transition-colors"
        tabIndex={-1}
        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      >
        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  </div>

  NOTA IMPORTANTE: El padding-right del input cambia de `pr-3` a `pr-10` para dejar espacio al botón del ojo.

TAREA 2.3 — Resetear showPassword al cerrar/cambiar método
  Archivo: src/modules/auth/components/LoginModal.tsx
  Acción: En la función `resetForm()` (línea 33-42), agregar `setShowPassword(false);`
```

---

## EJE 3 — Mejoras al Motor de IA

### 3.A — Mejorar el prompt de extracción

```
TAREA 3.1 — Prompt más detallado y con ejemplos
  Archivo: api/cv-import-api.ts
  Acción: Reemplazar el `systemInstruction` (líneas 35-44) con un prompt mejorado:

  const systemInstruction = `Eres un extractor experto de CVs, hojas de vida y perfiles de LinkedIn.
Tu tarea es extraer TODA la información estructurada de la página provista a un objeto JSON.

ESTRUCTURA DE SALIDA OBLIGATORIA:
{
  "personalInfo": {
    "fullName": "Nombre completo",
    "email": "correo@ejemplo.com",
    "phone": "+54 11 1234-5678",
    "role": "Cargo o título profesional actual",
    "location": "Ciudad, País",
    "summary": "Resumen profesional o perfil (copiar textualmente si existe, o dejar vacío)",
    "dni": "",
    "cuit": "",
    "birthDate": "YYYY-MM-DD si se encuentra",
    "estadoCivil": "",
    "nacionalidad": "",
    "linkedin": "URL de LinkedIn si aparece",
    "portfolio": "URL de portfolio/web personal si aparece"
  },
  "experience": [
    {
      "company": "Nombre de la empresa",
      "role": "Puesto / Cargo",
      "startDate": "YYYY-MM o texto original",
      "endDate": "YYYY-MM, 'Presente' o 'Actual' si sigue vigente",
      "description": "Descripción COMPLETA de responsabilidades y logros. NO resumir ni acortar. Copiar TODO el texto.",
      "continuesFromPrevious": false
    }
  ],
  "education": [
    {
      "institution": "Universidad / Instituto",
      "degree": "Título obtenido o en curso",
      "startDate": "",
      "endDate": "",
      "description": "Detalles adicionales si existen",
      "continuesFromPrevious": false
    }
  ],
  "skills": [
    { "name": "Habilidad individual" }
  ],
  "languages": [
    { "language": "Idioma", "proficiency": "Nivel (Nativo, Avanzado, Intermedio, Básico)" }
  ]
}

REGLAS CRÍTICAS:
1. Extraer TODOS los datos que encuentres. No omitir ninguna experiencia ni educación.
2. Las descripciones de experiencia deben copiarse TEXTUALMENTE y COMPLETAS. No resumir.
3. Si un dato continúa de la página anterior (texto cortado), marcar "continuesFromPrevious": true.
4. Si el documento es una exportación de LinkedIn, mapear "Licenses & Certifications" a education, y "Skills" a skills.
5. Extraer DNI, CUIT, fecha de nacimiento, estado civil y nacionalidad si los encuentras.
6. Si hay URLs de LinkedIn o portfolio, incluirlas en personalInfo.
7. Las fechas deben normalizarse a formato YYYY-MM cuando sea posible.
8. Las habilidades deben separarse individualmente (una por objeto, no agrupadas).
9. Devolver ÚNICAMENTE el JSON válido, sin texto adicional ni explicaciones.`;

TAREA 3.2 — Aumentar maxTokens para CVs extensos
  Archivo: api/cv-import-api.ts
  Acción: Cambiar `maxTokens: 2000` a `maxTokens: 4000` (línea 51).
  Justificación: CVs con muchas experiencias detalladas pueden superar 2000 tokens de salida, causando JSON truncado que falla en el parse.

TAREA 3.3 — Agregar responseSchema más estricto para Gemini
  Archivo: api/cv-import-api.ts
  Acción: Mejorar el `responseSchema` (líneas 53-62) con propiedades más detalladas:

  responseSchema: {
    type: "object",
    properties: {
      personalInfo: {
        type: "object",
        properties: {
          fullName: { type: "string" },
          email: { type: "string" },
          phone: { type: "string" },
          role: { type: "string" },
          location: { type: "string" },
          summary: { type: "string" },
          dni: { type: "string" },
          cuit: { type: "string" },
          birthDate: { type: "string" },
          estadoCivil: { type: "string" },
          nacionalidad: { type: "string" },
          linkedin: { type: "string" },
          portfolio: { type: "string" }
        }
      },
      experience: {
        type: "array",
        items: {
          type: "object",
          properties: {
            company: { type: "string" },
            role: { type: "string" },
            startDate: { type: "string" },
            endDate: { type: "string" },
            description: { type: "string" },
            continuesFromPrevious: { type: "boolean" }
          }
        }
      },
      education: {
        type: "array",
        items: {
          type: "object",
          properties: {
            institution: { type: "string" },
            degree: { type: "string" },
            startDate: { type: "string" },
            endDate: { type: "string" },
            description: { type: "string" },
            continuesFromPrevious: { type: "boolean" }
          }
        }
      },
      skills: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" }
          }
        }
      },
      languages: {
        type: "array",
        items: {
          type: "object",
          properties: {
            language: { type: "string" },
            proficiency: { type: "string" }
          }
        }
      }
    }
  }
```

### 3.B — Enfoque híbrido: siempre imagen + texto como contexto

**Problema de fondo**: Muchos PDFs tienen una capa de texto que NO coincide con lo que se ve
visualmente (OCR malo, fuentes con encoding roto, exports de Canva/diseño). La heurística
`isTextLayerCoherent` detecta los casos MUY rotos, pero no detecta cuando el texto "parece"
coherente pero dice algo distinto a lo que se ve en la página. Resultado: la IA recibe texto
basura y devuelve datos incorrectos.

**Solución**: Para TODAS las páginas de PDF, SIEMPRE renderizar a imagen y mandar la imagen
a Gemini visión. El texto extraído de la capa PDF se envía como contexto auxiliar (si parece
coherente), para que Gemini pueda cruzar información. Gemini lee visualmente lo que está en
la página — es mucho más confiable que confiar en la capa de texto.

```
TAREA 3.B.1 — Cambiar processPdfPages para siempre generar imagen + texto auxiliar
  Archivo: src/modules/cv-builder/components/modals/ImportCvAiModal.tsx
  Acción: Reescribir la función `processPdfPages` (líneas 100-130) para que SIEMPRE
  renderice cada página a imagen, y además extraiga el texto como dato auxiliar.

  Cambiar el tipo de retorno de:
    Array<{ kind: 'text' | 'image', content: string }>
  A:
    Array<{ kind: 'text' | 'image', content: string, auxiliaryText?: string }>

  Nueva implementación:

  const processPdfPages = async (pdfFile: File) => {
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdfjsLib = ensurePdfjsWorkerConfigured();
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    const pages: Array<{ kind: 'text' | 'image', content: string, auxiliaryText?: string }> = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);

      // SIEMPRE extraer el texto de la capa PDF como dato auxiliar
      const textContent = await page.getTextContent();
      const rawText = textContent.items.map((item: any) => item.str).join(' ');
      const textIsUseful = isTextLayerCoherent(rawText);

      // SIEMPRE renderizar a imagen — Gemini visión lee lo que realmente se ve
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        await page.render({ canvasContext: ctx, viewport }).promise;
        const base64 = encodeCanvasWithinBudget(clampCanvasSize(canvas));
        pages.push({
          kind: 'image',
          content: base64,
          auxiliaryText: textIsUseful ? rawText : undefined
        });
      } else {
        // Fallback: si el canvas no funciona pero el texto es coherente, usar solo texto
        if (textIsUseful) {
          pages.push({ kind: 'text', content: rawText });
        } else {
          throw new Error('Este navegador no soporta canvas y el PDF no tiene texto legible.');
        }
      }
    }
    return pages;
  };

TAREA 3.B.2 — Enviar auxiliaryText al backend como contexto
  Archivo: src/modules/cv-builder/components/modals/ImportCvAiModal.tsx
  Acción: En el loop de procesamiento (líneas 67-87), pasar el auxiliaryText al backend.

  Cambiar la llamada (línea 76-80) a:
    const pData = await apiClient.post('/api/cv-import-api?action=extract-page', {
      kind: page.kind,
      content: page.content,
      contextSummary,
      auxiliaryText: page.auxiliaryText || ''
    }, { requiresAuth: false });

TAREA 3.B.3 — Usar auxiliaryText en el prompt del backend
  Archivo: api/cv-import-api.ts
  Acción:
  1. Extraer `auxiliaryText` del body (línea 28):
     const { kind, content, contextSummary = '', auxiliaryText = '' } = req.body || {};

  2. Incorporar auxiliaryText en el userPrompt cuando existe (líneas 48-50):
     Para kind === 'image' con auxiliaryText:
       userPrompt: `Extrae los datos de la imagen de la página del CV provista.
${auxiliaryText ? `\nTexto auxiliar extraído del PDF (puede tener errores — usalo solo como referencia, priorizá lo que ves en la imagen):\n${auxiliaryText}\n` : ''}
${contextSummary}`

     Esto le da a Gemini:
     - La imagen (fuente primaria — lo que realmente se ve)
     - El texto del PDF como pista auxiliar (fuente secundaria — puede estar mal)
     - Gemini prioriza lo visual pero puede cruzar datos

TAREA 3.B.4 — Forzar Gemini como provider primario para imágenes
  Archivo: api/_lib/aiProviders/registry.ts
  Acción: Cambiar el orden de fallback para que Gemini vaya PRIMERO (es el único con visión):
    export const AI_PROVIDER_FALLBACK_ORDER = ['gemini', 'groq'];
  Justificación: Ahora que la mayoría de las páginas PDF irán como imagen, Gemini debe
  ser el provider primario. Groq queda como fallback para el raro caso de texto puro
  (texto pegado, archivos .txt).
```

### 3.C — Mejoras de resiliencia

```
TAREA 3.C.1 — Retry automático en JSON parse error
  Archivo: api/cv-import-api.ts
  Acción: Si el JSON parse falla (líneas 121-128), intentar una segunda llamada al AI con un prompt de corrección en vez de devolver error inmediato.
  Código sugerido (reemplazar bloque líneas 120-128):

    let fragmentJson = {};
    try {
      const cleanJsonStr = completionText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
      fragmentJson = JSON.parse(cleanJsonStr);
    } catch (parseErr) {
      // Retry: pedir a la IA que corrija su propia respuesta
      try {
        const retryRequest: AiCompletionRequest = {
          systemPrompt: 'Recibes un texto que debería ser JSON pero tiene errores de sintaxis. Corregí el JSON y devolvelo SOLO como JSON válido, sin explicaciones.',
          userPrompt: `Corregí este JSON:\n${completionText}`,
          maxTokens: 4000,
          temperature: 0.0,
          responseSchema: request.responseSchema
        };
        const provider = AI_PROVIDERS[successfulProviderId];
        const apiKey = getNextAvailableKey(successfulProviderId);
        if (provider && apiKey) {
          const retryResult = await provider.complete(retryRequest, apiKey);
          const retryClean = retryResult.content.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
          fragmentJson = JSON.parse(retryClean);
        } else {
          throw parseErr;
        }
      } catch {
        console.error('AI no devolvió JSON válido ni en retry', completionText);
        return errorResponse(res, 500, 'Error procesando respuesta de IA (Formato inválido tras reintento)');
      }
    }

TAREA 3.C.2 — Agregar campo linkedin y portfolio a mergeFragments
  Archivo: src/shared/core/cv-import/mergeFragments.ts
  Acción: No requiere cambios — el merge ya es genérico con `Object.entries(fragment.personalInfo)`. Los campos nuevos (linkedin, portfolio) se mergearan automáticamente.
  Solo verificar que el merge no rompe con los campos nuevos. ✅ Ya es compatible.

TAREA 3.C.3 — Mejorar textCoherenceHeuristic para más idiomas
  Archivo: src/shared/core/cv-import/textCoherenceHeuristic.ts
  Acción: Agregar más palabras comunes en portugués (Brasil) e inglés técnico al regex de la línea 16:
  
  Reemplazar:
    const commonWords = /\b(de|la|el|en|con|para|experiencia|educacion|educación|and|the|with|for|experience|education|email|tel[éé]fono|phone)\b/i;
  Con:
    const commonWords = /\b(de|la|el|en|con|para|experiencia|educacion|educación|and|the|with|for|experience|education|email|tel[éé]fono|phone|trabalho|empresa|universidade|skills|summary|profile|objective|professional|formación|habilidades|idiomas|referencias)\b/i;
```

---

## EJE 4 — Tests de Verificación

```
TAREA 4.1 — Test unitario: supportsImages filtering y hybrid approach
  Archivo: tests/aiProviderImageSupport.test.ts (NUEVO)
  Contenido: Verificar que el flag supportsImages existe en cada provider y que Groq es false, Gemini es true.
  Verificar que el fallback order tiene gemini primero.

TAREA 4.2 — Test unitario: show/hide password toggle
  Archivo: tests/loginModalShowPassword.test.ts (NUEVO)
  Contenido: Verificar que LoginModal renderiza el botón de ojo y que alterna entre type="text" y type="password".

TAREA 4.3 — Test unitario: textCoherenceHeuristic actualizado
  Archivo: tests/textCoherenceHeuristic.test.ts (NUEVO)
  Contenido: Verificar que textos en español, inglés y portugués pasan la heurística.

TAREA 4.4 — Test unitario: mergeFragments con campos nuevos
  Archivo: tests/mergeFragments.test.ts (NUEVO)
  Contenido: Verificar merge con campos linkedin, portfolio, y continuesFromPrevious.
```

---

## EJE 5 — Actualizar versión

```
TAREA 5.1 — Actualizar version.ts
  Archivo: src/shared/core/version.ts
  Acción: Cambiar label a 'V2.4.0', patch a 0, minor a 4, y actualizar stage y lastUpdated.
```

---

## Orden de Implementación

1. Eje 2 (Show Password) — Cambio aislado, sin riesgo
2. Eje 1 (Bugs IA) — Correcciones críticas
3. Eje 3 (Mejoras IA) — Mejoras de calidad
4. Eje 4 (Tests) — Verificación
5. Eje 5 (Versión) — Último

---

## Checklist de Verificación Post-Implementación

OpenCode debe ejecutar y confirmar:

```bash
# 1. Compilación sin errores
npm run typecheck  # Debe dar 0 errores

# 2. Tests pasan
npm test  # Debe dar 0 failed, incluir los 4 tests nuevos

# 3. Gobernanza
npx tsx scripts/check-module-boundaries.js  # 0 violations

# 4. Verificación de integridad de archivos modificados
# Cada archivo debe terminar con su cierre correcto (}, };, etc.)
# Ningún archivo debe estar truncado

# 5. Verificación manual (instrucciones para el dev):
# - Abrir la app → LoginModal → método Contraseña → verificar botón de ojo funciona
# - Subir un PDF con texto → verificar extracción exitosa
# - Subir una IMAGEN de un CV → verificar que NO usa Groq y extrae correctamente
# - Pegar texto plano → verificar extracción exitosa
```

---

## Archivos Modificados (resumen)

| Archivo | Acción |
|---|---|
| `api/_lib/aiProviders/types.ts` | Agregar `supportsImages: boolean` |
| `api/_lib/aiProviders/gemini.ts` | Agregar `supportsImages: true` |
| `api/_lib/aiProviders/groq.ts` | Agregar `supportsImages: false` |
| `api/_lib/aiProviders/registry.ts` | Cambiar fallback order: gemini primero, groq segundo |
| `api/cv-import-api.ts` | Filtrar providers por imágenes, mejorar prompt, subir maxTokens, usar auxiliaryText, retry en parse error, mejorar responseSchema |
| `src/modules/auth/components/LoginModal.tsx` | Agregar show/hide password toggle con Eye/EyeOff |
| `src/modules/cv-builder/components/modals/ImportCvAiModal.tsx` | Enfoque híbrido (siempre imagen + texto auxiliar), mejorar error handling, requiresAuth: false |
| `src/shared/core/cv-import/textCoherenceHeuristic.ts` | Ampliar regex de palabras comunes |
| `src/shared/core/version.ts` | V2.4.0 |
| `tests/aiProviderImageSupport.test.ts` | NUEVO |
| `tests/loginModalShowPassword.test.ts` | NUEVO |
| `tests/textCoherenceHeuristic.test.ts` | NUEVO |
| `tests/mergeFragments.test.ts` | NUEVO |
