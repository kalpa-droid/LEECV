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

    let lastError: any = null;

    for (const currentModel of modelCandidates) {
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

      try {
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
            generationConfig
          }),
          signal: AbortSignal.timeout(20000) // 20s por candidato, caben 2-3 dentro de 60s de Vercel
        });

        if (!response.ok) {
          const errText = await response.text();
          const errObj: any = new Error(`Gemini API Error (${response.status}) on ${currentModel}: ${errText}`);
          errObj.status = response.status;
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

        return { content: content.trim(), usage };
      } catch (err: any) {
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
