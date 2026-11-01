# Plan: Orientar LeeCV a la Estrategia de Crecimiento y Adquisición ATS (V2.5.0)

> **Rama de trabajo**: `feat/estrategia-ats-cro`
> **Estado**: LISTO PARA IMPLEMENTAR
> **Versión objetivo**: `V2.5.0`

---

## 1. Diagnóstico y Objetivo Estratégico

* **Diagnóstico**: La landing page actual define a la plataforma como *"Creador de currículums listo para imprimir"*. Sin embargo, el mercado real de contratación está dominado por sistemas ATS (Applicant Tracking Systems) que descartan más del 75% de las candidaturas de forma automatizada si el formato o la capa de texto son ilegibles (caso habitual en plantillas gráficas de Canva). Además, los competidores tradicionales (Resume.io, etc.) aplican esquemas de suscripción recurrente con renovaciones automáticas no deseadas ($29.95/mes).
* **Nuevo Posicionamiento**:
  > *"El currículum que supera los filtros ATS y te consigue entrevistas."*
* **Propósito**: Aumentar la conversión de visitantes a usuarios (CRO), visibilizar las ventajas técnicas reales de LeeCV (lectura ATS por diseño + anonimización local en navegador sin entrenamiento de IA) y destacar el modelo de precios de pago único transparente sin cobros ocultos.

---

## 2. Hoja de Ruta de Implementación — FASE 1 (Landing Page & CRO)

### Tarea 1.1 — Catálogo Canónico de Textos (i18n)
* **Archivo a modificar**: `src/shared/i18n/catalog/landing.ts`
* **Acciones**:
  1. Actualizar `hero`:
     - `title`: `"El currículum que supera los filtros ATS y te consigue entrevistas"`
     - `lead`: `"Diseñado para que los sistemas de selección y los reclutadores lean cada palabra de tu experiencia. Privacidad blindada en tu navegador y sin suscripciones trampa."`
  2. Agregar `heroPills`:
     - `ats`: `{ title: "100% Compatible con ATS", description: "Texto estructurado limpio, sin capas gráficas rotas de Canva." }`
     - `privacy`: `{ title: "Privacidad Total", description: "Datos anonimizados en tu navegador, sin entrenar modelos de IA." }`
     - `pricing`: `{ title: "Sin Suscripciones Trampa", description: "Pagás solo cuando descargás, sin débitos mensuales automáticos." }`
  3. Agregar `atsAuditor`:
     - Textos para la zona de arrastre de PDF, estados de análisis, mensajes de diagnóstico para textos coherentes vs. rotos, y etiquetas de resultados.
  4. Agregar `transparencyTable`:
     - Encabezados, filas de comparación (Modelo de cobro, Lectura ATS, Privacidad, Cancelación) y descripciones para LeeCV vs. Creadores Tradicionales vs. Canva.
  5. Asegurar cumplimiento de `npm run check-plain-language` (cero palabras de imprenta vedadas).

---

### Tarea 1.2 — Componente Auditor ATS en Vivo en Cliente (Sin Registro)
* **Archivo a crear**: `src/modules/landing/components/AtsAuditHeroWidget.tsx`
* **Especificaciones técnicas**:
  1. **Procesamiento 100% en el cliente** ($0 costo de tokens de IA, respuesta instantánea en <200ms):
     - Utiliza `ensurePdfjsWorkerConfigured` de `src/shared/core/pdf-engine/pdfjsWorkerSetup.ts` para abrir el PDF subido.
     - Extrae el texto de la primera página / páginas usando `getTextContent()`.
     - Evalúa la coherencia con `isTextLayerCoherent(rawText)` de `src/shared/core/cv-import/textCoherenceHeuristic.ts`.
  2. **Cálculo de Score ATS (0 a 100)**:
     - Si la capa de texto no es coherente o está vacía (comportamiento de Canva o imagen escaneada): Score bajo (<40), advertencia crítica: *"Capa de texto fragmentada o aplanada (típica de Canva/escaneos)"*.
     - Detección de secciones esenciales: Contacto (email/teléfono), Experiencia, Formación, Habilidades (+15 pts c/u).
     - Densidad y estructura de palabras (+20 pts).
  3. **Visualización de Resultados**:
     - Medidor circular o barra de progreso con color dinámico según score.
     - Lista de 3 hallazgos directos y concretos.
     - Botón CTA principal: *"Corregir y optimizar con LeeCV"* que navega al editor (`/crear-cv`) transfiriendo el archivo ya cargado.
  4. **Protección SSR / Prerender**:
     - Garantizar que ninguna llamada a APIs del navegador (`window`, `document`, `canvas`) se ejecute durante el prerenderizado de `scripts/prerender.mjs`.

---

### Tarea 1.3 — Componente Tabla Comparativa de Transparencia
* **Archivo a crear**: `src/modules/landing/components/TransparencyComparisonTable.tsx`
* **Especificaciones técnicas**:
  1. Renderizar una tabla/grid visualmente clara con 4 columnas o cards comparativas:
     - Criterio de comparación.
     - **LeeCV.app** (Destacado con borde de acento y badge de recomendación).
     - **Creadores Tradicionales** (Resume.io, etc.).
     - **Canva**.
  2. Criterios comparados:
     - **Modelo de Cobro**: Pago único accesible vs. Pruebas que renuevan a $29.95/mes vs. Planes Pro de diseño.
     - **Compatibilidad con ATS**: 100% garantizada por código vs. Variable / texto plano vs. Elementos aplanados ilegibles.
     - **Privacidad y Seguridad**: Anonimizado en tu navegador sin entrenamiento de IA vs. Almacenamiento en servidores de terceros.
     - **Facilidad de Cancelación**: No hay nada que cancelar vs. Procesos deliberadamente complejos.
  3. Estricto uso de variables de diseño de `uiDesignSystem` (`colorSystem`, `radius`, `elevationSystem`) y contraste accesible WCAG 2.1 AA.

---

### Tarea 1.4 — Integración en la Landing Page Principal
* **Archivo a modificar**: `src/modules/landing/LandingPage.tsx`
* **Acciones**:
  1. Actualizar el Hero para incorporar las 3 píldoras de valor (ATS, Privacidad, Transparencia) inmediatamente bajo el CTA primario.
  2. Incrustar el `AtsAuditHeroWidget` en una sección destacada entre el Hero y los detalles de producto.
  3. Incrustar la `TransparencyComparisonTable` justo antes de la sección de planes/precios.
  4. Verificar que no se introduzcan clases de Tailwind nominadas que violen `check-module-boundaries`.

---

### Tarea 1.5 — Actualización de Versión Canónica
* **Archivo a modificar**: `src/shared/core/version.ts`
* **Acciones**:
  - `minor: 5`, `patch: 0`, `label: 'V2.5.0'`.
  - Actualizar `stage`: *"Rediseño CRO Landing Page, Auditor ATS en vivo en cliente y Tabla Comparativa de Transparencia"*.

---

### Tarea 1.6 — Pruebas Unitarias Automatizadas
* **Archivos a crear**:
  1. `tests/atsAuditHeroWidget.test.ts`:
     - Evalúa la función de scoring con texto estructurado (score alto >85).
     - Evalúa con texto roto / vacío (score bajo <40 con bandera de Canva).
  2. `tests/transparencyTable.test.ts`:
     - Verifica que la tabla comparativa se renderice con todos los criterios y textos del catálogo i18n sin errores de accesibilidad.

---

## 3. Hoja de Ruta — Fases Futuras

* **FASE 2 (V2.6.0)**:
  - Generador de logros cuantificados ACR (Acción + Contexto + Resultado) dentro del editor de CV.
  - Widget de compatibilidad ATS en tiempo real en la barra lateral del editor.
  - Despliegue de infraestructura de SEO programático (pSEO) con las primeras 50 URLs de profesiones (`/plantillas/cv-contador`, etc.).
* **FASE 3 (Largo plazo)**:
  - Videos comparativos para redes sociales (Canva colapsando en ATS vs LeeCV 100% legible).
  - Acuerdos B2B2C con bootcamps y agencias de talento remoto en LatAm.
  - Bucle de referidos con créditos.

---

## 4. Checklist de Verificación y Gobernanza

Antes de finalizar la implementación de Fase 1, OpenCode debe certificar:

```bash
# 1. Compilación TypeScript
npm run typecheck       # 0 errores

# 2. Suite de pruebas
npm test                # 280+ passed, 0 failed

# 3. Gobernanza y auditorías de tokens
npm run check-plain-language              # 0 palabras vedadas
npx tsx scripts/check-module-boundaries.js # 0 violations
npm run check-contrast                   # 0 violaciones nuevas

# 4. Auditoría de build y SEO prerender
npm run build                            # Build y prerender estático de / sin errores
npm run verify:seo                       # 40 verificaciones OK
```
