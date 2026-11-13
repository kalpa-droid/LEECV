# Directiva para OpenCode: Opción B (Completar Mejoras OCR sobre PR #79)

> **Contexto:** Continuación directa sobre la rama `feat/gemini-multimodal-resilience` (Pull Request #79 abierta).  
> **Objetivo:** Incorporar las 5 mejoras críticas del documento `mejoraocr.docx` para blindar el pipeline OCR y multimodal contra timeouts, cortes de red y saturación de APIs.  
> **Reglas aplicables:** `AGENTS.md` (Regla 0: `npm run check-all` = 0 errores, Regla 1: motores canónicos, Regla 2: no clases dinámicas de Tailwind).

---

## 1. Alcance de las Mejoras a Implementar

### A. Groq Multimodal (Visión) + Soporte Multi-Key (`GROQ_API_KEYS`)
- **Archivos:** `api/_lib/aiProviders/groq.ts`, `api/_lib/aiProviders/registry.ts`, `api/cv-import-api.ts`.
- **Qué hacer:**
  1. Habilitar `supportsImages: true` en Groq cuando la petición incluya imágenes (`req.images && req.images.length > 0`).
  2. Usar un modelo multimodal de Groq: `llama-3.2-11b-vision-preview` (o configurable vía `GROQ_VISION_MODEL`, con fallback a `meta-llama/llama-4-scout-17b-16e-instruct`).
  3. Enviar el payload compatible con OpenAI Vision en `groq.ts`:
     ```typescript
     const userParts: any[] = [];
     if (req.images && req.images.length > 0) {
       for (const img of req.images) {
         userParts.push({
           type: 'image_url',
           image_url: {
             url: `data:${img.mimeType || 'image/jpeg'};base64,${img.base64}`
           }
         });
       }
     }
     userParts.push({ type: 'text', text: req.userPrompt });
     ```
  4. Forzar salida JSON estructurada en Groq cuando se requiera:
     ```typescript
     response_format: { type: 'json_object' }
     ```
  5. En `api/cv-import-api.ts`:
     - Permitir que Groq participe en la cascada de imágenes si Gemini falla (o viceversa).
     - En `action === 'consolidate-ats'`, rotar entre todas las claves de `GROQ_API_KEYS` usando `getNextAvailableKey('groq')`, y ante error 429 marcar con `markKeyRateLimited('groq', apiKey, 60)` en lugar de rendirse.

---

### B. Presupuesto Global de Tiempo (Anti-Timeout de 60s en Vercel)
- **Archivos:** `api/_lib/aiProviders/gemini.ts` y `api/cv-import-api.ts`.
- **Qué hacer:**
  1. Fijar un límite global por request: `const requestDeadline = Date.now() + 50_000` (50 segundos).
  2. En cada intento del bucle de candidatos:
     ```typescript
     const remainingMs = requestDeadline - Date.now();
     if (remainingMs < 4000) {
       console.warn('Presupuesto de tiempo de Vercel agotado. Saltando al siguiente paso.');
       break;
     }
     const attemptTimeoutMs = Math.min(18000, remainingMs);
     ```
  3. Usar `AbortSignal.timeout(attemptTimeoutMs)` en el fetch hacia Gemini y Groq. Esto garantiza que la función Serverless nunca alcance los 60s forzados por Vercel (error 504).

---

### C. Guardado Progresivo por Página en `localStorage` (Anti-Pérdida)
- **Archivo:** `src/modules/cv-builder/components/modals/ImportCvAiModal.tsx`.
- **Qué hacer:**
  1. Dentro del bucle `for (let i = 1; i <= totalPages; i++)`, después de extraer con éxito cada página (`fragments.push(fragment)`):
     ```typescript
     if (typeof window !== 'undefined' && fragments.length > 0) {
       try {
         const partialCv = fragments.length === 1 ? fragments[0] : mergePageFragments(fragments);
         localStorage.setItem('leecv_last_imported_draft', JSON.stringify({
           timestamp: Date.now(),
           sourceName: file?.name || 'Texto pegado',
           data: partialCv,
           progress: { current: i, total: totalPages, failedPages }
         }));
       } catch (e) {
         console.warn('No se pudo guardar borrador parcial:', e);
       }
     }
     ```
  2. Si la conexión se corta en la página 18 de un PDF de 25 páginas, el usuario tiene resguardadas las 17 páginas previas en su borrador de rescate.

---

### D. Reintento Selectivo de Páginas Omitidas en la UI
- **Archivo:** `src/modules/cv-builder/components/modals/ImportCvAiModal.tsx`.
- **Qué hacer:**
  1. En el estado `done`, si `failedPages.length > 0`:
     - Mostrar un botón secundario: **"Reintentar páginas pendientes"**.
     - Al pulsarlo, no reiniciar desde la página 1: reejecutar `extractWithRetry` *únicamente* sobre los índices que fallaron (`failedPages`), sumar los nuevos fragmentos y volver a consolidar.

---

### E. Gobernanza y Versión
- **Archivo:** `src/shared/core/version.ts`.
- **Qué hacer:**
  - `patch: 6` (o mantener V2.8.5 enriquecida)
  - `label: 'V2.8.6'`
  - `stage: 'Pipeline OCR completo: Groq Visión fallback, rotación multi-key, presupuesto global 50s, guardado progresivo y reintento selectivo'`
- **Archivo:** `tests/aiProviderImageSupport.test.ts`.
  - Actualizar tests para reflejar que tanto `gemini` como `groq` soportan visión multimodal con modelos compatibles.

---

## 2. Checklist de Validación Obligatoria

Antes de commitear y pushear a la PR #79:
1. `npm run test` (todos los tests en verde).
2. `npm run typecheck` (0 errores).
3. `npm run check-all` (0 errores en toda la suite).
4. `git push origin feat/gemini-multimodal-resilience` para actualizar la PR #79.
