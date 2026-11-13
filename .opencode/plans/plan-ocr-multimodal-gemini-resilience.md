# Plan de Implementación: Resiliencia del Pipeline OCR Multimodal (Gemini + Fotos Directas)

> **Destinatario:** OpenCode / Agente Ejecutor  
> **Proyecto:** LEECV (`kalpa-droid/LEECV`)  
> **Versión objetivo:** `V2.8.5`  
> **Fecha:** 2026-11-12  
> **Reglas aplicables:** `AGENTS.md` (Regla 0: `npm run check-all` = 0 errores, Regla 6: rama descriptiva + PR, Regla 1: motores canónicos).

---

## 1. Diagnóstico Forense y Causa Raíz

### Síntomas reportados
1. **PDFs de 16 a 26 páginas:** En cada página el sistema llega al 3° intento ("Reintentando página X (intento 3)..."), falla y salta a la página siguiente. Al final, de 16 páginas solo se extraen 3 registros (únicamente de las páginas que tenían texto digital puro).
2. **Fotos / Imágenes directas:** Al subir una imagen directamente (PNG o JPG), falla de inmediato con *"El proveedor de IA falló (error técnico)"*.
3. **Pérdida de contexto al cerrar:** Si el usuario cierra la ventana de edición por accidente, debe poder reabrir los datos extraídos de inmediato sin perderlos.

### Causa raíz comprobada en producción y en la API de Google
1. **Google dio de baja `gemini-2.0-flash` (HTTP 404):**  
   Google retiró `gemini-2.0-flash` de la API oficial `v1beta`. Devuelve:
   ```json
   {
     "error": {
       "code": 404,
       "message": "This model models/gemini-2.0-flash is no longer available. Please update your code to use models/gemini-3.8-flash...",
       "status": "NOT_FOUND"
     }
   }
   ```
2. **`gemini-3.8-flash` sufre saturación frecuente (HTTP 503) y latencia > 28s:**  
   El modelo más nuevo de Google arroja con frecuencia:
   ```json
   {
     "error": {
       "code": 503,
       "message": "This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.",
       "status": "UNAVAILABLE"
     }
   }
   ```
3. **Falla en la cadena de respaldo (`api/_lib/aiProviders/gemini.ts`):**  
   - El código tenía `gemini-3.8-flash` como primario y `gemini-2.0-flash` como único suplente.
   - Cuando el primario daba 503 o timeout, saltaba a `gemini-2.0-flash`, que devolvía 404.
   - La condición de reintento (`isTransient`, líneas 86-90) **no consideraba el 404 como transitorio**, por lo que abortaba de inmediato lanzando el error.
   - El backend en `api/cv-import-api.ts` capturaba esto y devolvía `502 ai_provider_error`.
4. **Consecuencia en el frontend (`ImportCvAiModal.tsx`):**  
   - En **imágenes directas**, se hacía una sola petición sin `extractWithRetry`. Al fallar la llamada única con 502, el modal mostraba inmediatamente *"El proveedor de IA falló (error técnico)"*.
   - En **PDFs largos**, las páginas con imágenes/escaneadas se enviaban a Gemini: fallaban en el intento 1, 2 y 3. Al llegar al límite de reintentos, se agregaban a `failedPages[]` y continuaban a la siguiente página. Solo las páginas con capa de texto digital (procesadas por Groq) tenían éxito.
5. **Modelos probados y activos en tiempo real (100% operativos):**  
   - `gemini-3.1-flash-lite`: Responde en **3.08s** con visión multimodal impecable.
   - `gemini-flash-lite-latest`: Responde en **4.45s** con 0 errores.
   - `gemini-3.5-flash`: Responde en **4 a 10s** con máxima precisión.

---

## 2. Plan de Acción y Archivos a Intervenir

### Archivo 1: `api/_lib/aiProviders/gemini.ts`
1. **Actualizar la lista de candidatos en cascada:**
   Reemplazar el candidato deprecado `gemini-2.0-flash` por una lista en cascada de modelos activos y probados:
   ```typescript
   const primaryModel = model || process.env.GEMINI_MODEL || this.defaultModel;
   const fallbackPool = ['gemini-3.5-flash', 'gemini-flash-lite-latest', 'gemini-3.1-flash-lite'];
   const modelCandidates = [primaryModel, ...fallbackPool.filter(m => m !== primaryModel)];
   ```
2. **Reintento resiliente ante cualquier error no credencial:**  
   Permitir que el bucle continúe con el siguiente modelo ante cualquier error de servidor (503, 500, 502, 404, 429, timeout o abort). Solo abortar inmediatamente si las credenciales son inválidas (401 / 403 / `"API_KEY_INVALID"`).
3. **Timeout por candidato:**  
   Configurar 20 segundos por candidato (`AbortSignal.timeout(20000)`) para que quepan 2 o 3 candidatos cómodamente dentro de los 60s de Vercel.
4. **Soporte seguro de `thinkingConfig`:**  
   Aplicar `thinkingConfig` únicamente en modelos que lo requieran/admitan (ej. `currentModel.includes('3.8')`), evitando parámetros no soportados en modelos lite.

### Archivo 2: `api/cv-import-api.ts`
1. **Detalle descriptivo de errores en respuesta 502:**  
   En la línea ~421, retornar:
   ```typescript
   return errorResponse(res, 502, `ai_provider_error: ${lastError?.message || 'Error técnico del proveedor de IA'}`);
   ```
   Esto asegura trazabilidad completa si ocurre cualquier anomalía.

### Archivo 3: `src/modules/cv-builder/components/modals/ImportCvAiModal.tsx`
1. **Usar `extractWithRetry` también para imágenes directas:**  
   Reemplazar la llamada suelta a `apiClient.post` en `file.type.startsWith('image/')` por `extractWithRetry`, brindando los mismos 2 reintentos con retroceso exponencial que tienen los PDFs.
2. **Feedback transparente de páginas leídas y omitidas:**  
   Si `failedPages.length > 0` pero `fragments.length > 0`, no silenciar el resultado: notificar al usuario en el estado final que se importaron datos de X páginas, advirtiendo cuáles no pudieron procesarse.
3. **Asegurar borrador de rescate en `localStorage`:**  
   Confirmar que `localStorage.setItem('leecv_last_imported_draft', ...)` guarde siempre la información antes de abrir la modal de revisión.

### Archivo 4: `tests/aiProviderImageSupport.test.ts`
1. Verificar que los tests unitarios de configuración de proveedores de IA pasen correctamente con los nuevos candidatos.

### Archivo 5: `src/shared/core/version.ts`
1. Incrementar la versión a `V2.8.5`:
   - `patch: 5`
   - `label: 'V2.8.5'`
   - `stage: 'Pipeline OCR multimodal resiliente: cascada activa Gemini 3.5/Flash-Lite, reintentos en fotos directas y feedback de páginas'`

---

## 3. Protocolo de Ejecución Obligatorio (AGENTS.md)

1. **Crear rama de trabajo:**
   ```bash
   git checkout -b feat/gemini-multimodal-resilience
   ```
2. **Aplicar los cambios quirúrgicamente** según la sección 2.
3. **Validar localmente (Regla 0):**
   ```bash
   npm run check-all
   ```
   Debe arrojar exactamente **0 errores** (typecheck, lint, build, vitest y plain-language).
4. **Push y apertura de Pull Request (Regla 6):**
   ```bash
   git push origin feat/gemini-multimodal-resilience
   ```
   Abrir PR contra `main`, esperar a que el workflow `check-all.yml` de GitHub Actions finalice en verde.
5. **Aprobación de CODEOWNER (Kalpa) y Merge:**
   Kalpa aprueba la PR y ejecuta el squash merge a `main`.
6. **Registrar en `SESSION_LOG.md`**.
