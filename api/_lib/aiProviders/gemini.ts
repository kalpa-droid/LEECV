import type { AiCompletionRequest, AiProviderDefinition, AiProviderPingResult, AiCompletionResponse } from './types.js';

export const geminiProvider: AiProviderDefinition = {
  id: 'gemini',
  displayName: 'Google Gemini (Cascada Flash/Lite)',
  requiredEnvVars: ['GEMINI_API_KEYS', 'GEMINI_API_KEY'],
  defaultModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  supportsImages: true,

  async complete(req: AiCompletionRequest, apiKey: string, model?: string): Promise<AiCompletionResponse> {
    const primaryModel = model || process.env.GEMINI_MODEL || this.defaultModel;
    const fallbackPool = ['gemini-3.5-flash', 'gemini-flash-lite-latest', 'gemini-3.1-flash-lite'];
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
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`;

      const generationConfig: Record<string, any> = {
        temperature: req.temperature ?? 0.1,
        maxOutputTokens: req.maxTokens || 4000,
        ...(req.responseSchema ? { responseMimeType: 'application/json', responseSchema: req.responseSchema } : {})
      };

      // thinkingConfig solo en modelos 3.8 (no lite)
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
            'Content-Type': 'application/json'
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
          throw errObj;
        }

        const data = await response.json();
        const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!content) {
          throw new Error(`Respuesta vacía o inválida de Gemini API (${currentModel})`);
        }

        const usage = data?.usageMetadata ? {
          promptTokens: data.usageMetadata.promptTokenCount || 0,
          completionTokens: data.usageMetadata.candidatesTokenCount || 0,
          totalTokens: data.usageMetadata.totalTokenCount || 0,
        } : undefined;

        return { content: content.trim(), usage, modelUsed: currentModel };
      };

      try {
        return await runAttempt(generationConfig);
      } catch (err: any) {
        // Fallback seguro: si el modelo rechaza mediaResolution (400), omitirlo y reintentar una vez
        const rejectedMediaResolution =
          err?.status === 400 &&
          generationConfig.mediaResolution &&
          /media.?resolution/i.test(String(err?.responseBody || err?.message || ''));

        if (rejectedMediaResolution) {
          console.warn(`[geminiProvider] ${currentModel} rechazó mediaResolution; reintentando sin el campo.`);
          const configWithoutMediaResolution = { ...generationConfig };
          delete configWithoutMediaResolution.mediaResolution;
          try {
            return await runAttempt(configWithoutMediaResolution);
          } catch (retryErr: any) {
            err = retryErr;
          }
        }

        lastError = err;
        // Abortar solo si credenciales inválidas (401/403)
        if (err.status === 401 || err.status === 403 || err.message?.includes('API_KEY_INVALID')) {
          throw err;
        }
        // Cualquier otro error (503, 500, 502, 404, 429, timeout, abort) → probar siguiente candidato
        console.warn(`[geminiProvider] Falló ${currentModel} (${err.status || err.message}). Probando siguiente candidato si existe...`);
      }
    }

    throw lastError;
  },

  async ping(): Promise<AiProviderPingResult> {
    const keysRaw = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '';
    const keys = keysRaw.split(',').map(k => k.trim()).filter(Boolean);

    if (keys.length === 0) {
      return {
        status: 'missing_vars',
        label: 'Variables de entorno no configuradas (GEMINI_API_KEYS)',
        model: this.defaultModel
      };
    }

    try {
      await this.complete(
        { systemPrompt: 'Ping test', userPrompt: 'Responder OK' },
        keys[0]
      );
      return {
        status: 'active',
        label: 'Gemini Activo & Operativo',
        model: this.defaultModel
      };
    } catch (err: any) {
      return {
        status: err.status === 400 || err.status === 403 ? 'invalid_credentials' : 'error',
        label: `Error de conexión con Gemini: ${err.message || String(err)}`,
        model: this.defaultModel
      };
    }
  }
};
