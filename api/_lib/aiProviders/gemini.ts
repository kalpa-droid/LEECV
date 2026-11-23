import type { AiCompletionRequest, AiProviderDefinition, AiProviderPingResult, AiCompletionResponse } from './types.js';

export const geminiProvider: AiProviderDefinition = {
  id: 'gemini',
  displayName: 'Google Gemini (Cascada Flash/Lite)',
  requiredEnvVars: ['GEMINI_API_KEYS', 'GEMINI_API_KEY'],
  defaultModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  supportsImages: true,

  async complete(req: AiCompletionRequest, apiKey: string, model?: string): Promise<AiCompletionResponse> {
    const GEMINI_PRO_DEFAULT = process.env.GEMINI_PRO_MODEL || 'gemini-2.5-pro';
    const PRO_FALLBACK_POOL = [GEMINI_PRO_DEFAULT, process.env.GEMINI_MODEL || 'gemini-3.8-flash'];
    const FAST_FALLBACK_POOL = ['gemini-3.5-flash', 'gemini-flash-lite-latest', 'gemini-3.1-flash-lite'];

    const isPro = req.tier === 'pro';
    const primaryModel = model || (isPro ? GEMINI_PRO_DEFAULT : (process.env.GEMINI_MODEL || this.defaultModel));
    const fallbackPool = isPro ? PRO_FALLBACK_POOL : FAST_FALLBACK_POOL;
    const modelCandidates = [primaryModel, ...fallbackPool.filter(m => m !== primaryModel)];

    // Presupuesto global por petición: Vercel corta a los 60s.
    // Cada candidato toma como máximo 18s y nunca pisa la deadline global.
    const requestDeadline = Date.now() + 50_000;

    let lastError: any = null;

    for (const currentModel of modelCandidates) {
      const remainingMs = requestDeadline - Date.now();
      if (remainingMs < 4000) {
        console.warn('[geminiProvider] Presupuesto de tiempo de Vercel agotado. No hay margen para otro intento.');
        break;
      }
      const attemptTimeoutMs = Math.min(18000, remainingMs);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent`;

      const generationConfig: Record<string, any> = {
        temperature: req.temperature ?? 0.1,
        maxOutputTokens: req.maxTokens || 4000,
        ...(req.responseSchema ? { responseMimeType: 'application/json', responseSchema: req.responseSchema } : {})
      };

      // thinkingConfig solo en modelos 3.8 (no lite ni 2.5-pro con thinkingLevel)
      if (currentModel.includes('3.8')) {
        generationConfig.thinkingConfig = {
          thinkingLevel: 'LOW'
        };
      }

      const hasImages = !!req.images && req.images.length > 0;
      if (hasImages) {
        // Alta resolución de medios: tablas, notas al pie y texto chico legibles.
        // Si un modelo lite antiguo rechaza el campo, el catch de abajo lo omite y reintenta una vez.
        generationConfig.mediaResolution = req.mediaResolution || 'MEDIA_RESOLUTION_HIGH';
      }

      const runAttempt = async (config: Record<string, any>): Promise<AiCompletionResponse> => {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: req.systemPrompt }]
            },
            contents: [
              {
                role: 'user',
                parts: [
                  ...(req.images || []).map(img => ({
                    inlineData: {
                      mimeType: img.mimeType,
                      data: img.base64
                    }
                  })),
                  { text: req.userPrompt }
                ]
              }
            ],
            generationConfig: config
          }),
          signal: AbortSignal.timeout(attemptTimeoutMs)
        });

        if (!response.ok) {
          const errText = await response.text();
          const errObj: any = new Error(`Gemini API Error (${response.status}) on ${currentModel}: ${errText}`);
          errObj.status = response.status;
          errObj.responseBody = errText;
          const retryHeader = response.headers?.get?.('retry-after');
          errObj.retryAfterSec = retryHeader ? parseInt(retryHeader, 10) || 60 : 60;
          throw errObj;
        }

        const data = await response.json();
        const parts = Array.isArray(data?.candidates?.[0]?.content?.parts)
          ? data.candidates[0].content.parts
          : [];
        const textParts = parts
          .filter((p: any) => !p?.thought && typeof p?.text === 'string')
          .map((p: any) => p.text);
        const content = textParts.join('').trim();
        if (!content) {
          throw new Error(`Respuesta vacía o inválida de Gemini API (${currentModel})`);
        }

        const usage = data?.usageMetadata ? {
          promptTokens: data.usageMetadata.promptTokenCount || 0,
          completionTokens: data.usageMetadata.candidatesTokenCount || 0,
          totalTokens: data.usageMetadata.totalTokenCount || 0,
        } : undefined;

        return { content, usage, modelUsed: currentModel };
      };

      try {
        return await runAttempt(generationConfig);
      } catch (err: any) {
        // Fallback seguro: si el modelo rechaza mediaResolution o thinkingConfig (400), omitir y reintentar una vez
        const errMsg = String(err?.responseBody || err?.message || '');
        const rejectedMediaResolution =
          err?.status === 400 &&
          generationConfig.mediaResolution &&
          /media.?resolution/i.test(errMsg);
        const rejectedThinkingConfig =
          err?.status === 400 &&
          generationConfig.thinkingConfig &&
          /thinking/i.test(errMsg);

        if (rejectedMediaResolution || rejectedThinkingConfig) {
          const fallbackConfig = { ...generationConfig };
          if (rejectedMediaResolution) {
            console.warn(`[geminiProvider] ${currentModel} rechazó mediaResolution; reintentando sin el campo.`);
            delete fallbackConfig.mediaResolution;
          }
          if (rejectedThinkingConfig) {
            console.warn(`[geminiProvider] ${currentModel} rechazó thinkingConfig; reintentando sin el campo.`);
            delete fallbackConfig.thinkingConfig;
          }
          try {
            return await runAttempt(fallbackConfig);
          } catch (retryErr: any) {
            err = retryErr;
          }
        }

        lastError = err;
        // Abortar inmediatamente ante 429 o credenciales inválidas (401/403) para que el caller rote a otra API key
        if (
          err.status === 429 ||
          err.status === 401 ||
          err.status === 403 ||
          err.message?.includes('API_KEY_INVALID') ||
          err.message?.includes('RESOURCE_EXHAUSTED')
        ) {
          throw err;
        }
        // Otros errores (503, 500, 502, 404, timeout, abort) → probar siguiente candidato con esta clave
        console.warn(`[geminiProvider] Falló ${currentModel} (${err.status || err.message}). Probando siguiente candidato si existe...`);
      }
    }

    throw lastError;
  },

  async ping(): Promise<AiProviderPingResult> {
    const keysRaw = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '';
    const proKeysRaw = process.env.GEMINI_PRO_API_KEYS || '';
    const keys = Array.from(
      new Set(
        [...keysRaw.split(','), ...proKeysRaw.split(',')]
          .map(k => k.trim())
          .filter(Boolean)
      )
    );

    if (keys.length === 0) {
      return {
        status: 'missing_vars',
        label: 'Variables de entorno no configuradas (GEMINI_API_KEYS)',
        model: this.defaultModel,
        healthyKeys: 0,
        totalKeys: 0
      };
    }

    const keysToTest = keys.slice(0, 5);
    const results = await Promise.allSettled(
      keysToTest.map(k =>
        this.complete({ systemPrompt: 'Ping test', userPrompt: 'Responder OK' }, k)
      )
    );

    const healthyKeys = results.filter(r => r.status === 'fulfilled').length;
    if (healthyKeys > 0) {
      return {
        status: 'active',
        label: healthyKeys === keysToTest.length
          ? `Gemini Activo & Operativo (${healthyKeys}/${keysToTest.length} claves OK)`
          : `Gemini Activo (${healthyKeys}/${keysToTest.length} claves OK)`,
        model: this.defaultModel,
        healthyKeys,
        totalKeys: keys.length
      };
    }

    const firstRejection = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
    const err: any = firstRejection?.reason;
    return {
      status: err?.status === 400 || err?.status === 401 || err?.status === 403 ? 'invalid_credentials' : 'error',
      label: `Error de conexión con Gemini: ${err?.message || String(err || 'Sin respuesta')}`,
      model: this.defaultModel,
      healthyKeys: 0,
      totalKeys: keys.length
    };
  }
};
