# Plan Técnico V2.8.3: Resiliencia Total del Pipeline OCR y ATS

## Objetivo
Hacer que la importación de CVs (PDFs escaneados o digitales de hasta 30 páginas) sea 100% resiliente contra saturaciones de red, errores 503 ("high demand") de Google Gemini y límites de timeout de 60s en Vercel Serverless.

---

## 1. Archivos a Modificar

1. `src/modules/cv-builder/components/modals/ImportCvAiModal.tsx` (Frontend: reducción de canvas, reintentos con backoff, tolerancia a fallos parciales, progreso transparente).
2. `api/_lib/aiProviders/gemini.ts` (Backend: timeout a 35s, fallback a `gemini-2.0-flash` si 3.8-flash da 503/timeout).
3. `api/cv-import-api.ts` (Backend: robustez en fallback de consolidación ATS si no hay Groq).
4. `src/shared/core/version.ts` (Gobernanza: bump a V2.8.3).

---

## 2. Especificación Paso a Paso

### Paso 1: Optimizar Payload y Resolución del Canvas (`ImportCvAiModal.tsx`)
- En la línea ~106 donde se calcula `targetScale`:
  - Cambiar la altura objetivo de 1800px a **1400px**:
    ```typescript
    const targetScale = Math.max(1.2, Math.min(2.0, 1400 / (unscaledViewport.height || 1000)));
    ```
- En `pageImageEncoder.ts`: asegurar calidad JPEG inicial en 0.75 (reduce el peso de base64 en un ~60%, haciendo que Gemini responda en 4-7s en vez de 35-45s).

### Paso 2: Reintentos por Página con Backoff en Frontend (`ImportCvAiModal.tsx`)
- Envolver la petición de cada página en una función auxiliar con reintentos:
  ```typescript
  async function extractPageWithRetry(payload: any, pageNumber: number, maxRetries = 2) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const resp = await apiClient.post<{ fragmentJson?: any; message?: string }>(
          '/api/cv-import-api?action=extract-page',
          payload,
          { requiresAuth: false }
        );
        if (resp.ok && resp.data?.fragmentJson) {
          return resp.data.fragmentJson;
        }
        throw new Error(resp.error || `Error en página ${pageNumber}`);
      } catch (err: any) {
        if (attempt < maxRetries) {
          const delay = (attempt + 1) * 1500;
          await new Promise(r => setTimeout(r, delay));
        } else {
          throw err;
        }
      }
    }
  }
  ```

### Paso 3: Tolerancia a Fallos Parciales (`ImportCvAiModal.tsx`)
- Mantener un array `failedPages: number[] = []`.
- Si una página agota los 2 reintentos, capturar el error, hacer `failedPages.push(i)` y **NO hacer throw**: continuar con el bucle de las siguientes páginas.
- Al terminar el bucle:
  - Si `fragments.length > 0`:
    - Ejecutar la consolidación ATS con los fragmentos obtenidos.
    - Si hubo `failedPages.length > 0`, notificar: `"Se procesaron X de Y páginas. Algunas páginas tuvieron demoras de red. Podés continuar con lo extraído o reintentar."`.
    - Pasar a `onImportComplete(finalCv)`.
  - Solo si `fragments.length === 0`:
    - Cambiar a `status: 'error'` con el mensaje correspondiente.

### Paso 4: Fallback de Modelos y Timeout en Backend (`gemini.ts`)
- Reducir `AbortSignal.timeout(35000)` (35 segundos, para no chocar con el límite de 60s de Vercel).
- Si la llamada a `gemini-3.8-flash` falla con 503 (high demand) o timeout, y aún queda tiempo, intentar con `gemini-2.0-flash`.
- Mantener `thinkingConfig: { thinkingLevel: 'LOW' }` para Gemini 3.8 Flash, pero para `gemini-2.0-flash` o modelos anteriores no pasar `thinkingConfig` (o usar `thinkingBudget: 0` solo si el modelo lo requiere).

### Paso 5: Fallback de Consolidación ATS (`cv-import-api.ts`)
- En `action === 'consolidate-ats'`:
  - Si `GROQ_API_KEY` está configurada, usar Groq (`llama-3.3-70b-versatile`).
  - Si no está configurada o falla, usar Gemini sin arrojar error 503.
  - En el frontend, si `consolidate-ats` falla, hacer fallback automático a `mergePageFragments(fragments)` local.

---

## 3. Gobernanza y Verificación Obligatoria (Regla 0)
Antes de commitear o mergear:
```bash
npm run check-all
```
Debe dar **0 errores** (294 tests, typecheck, lint, gobernanza de tokens, contraste WCAG, plain language y build de Vite).
