import type { AiCompletionRequest, AiProviderDefinition, AiProviderPingResult, AiCompletionResponse } from './types.js';
import { describeResponseSchema } from './schemaGuide.js';

// Modelos recomendados y vigentes en OpenRouter (priorizando el tier libre/free):
// 1. Llama 3.3 70B Instruct (Free) - Gran capacidad de razonamiento y redacción en español.
// 2. Gemini 2.0 Flash Exp (Free) - Rápido, multimodal y preciso.
// 3. Qwen 2.5 Coder 32B (Free) - Excelente para estructuración estricta de datos.
const OPENROUTER_DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free';
const OPENROUTER_FALLBACK_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemini-2.0-flash-exp:free',
  'qwen/qwen-2.5-coder-32b-instruct:free'
];

export const openrouterProvider: AiProviderDefinition = {
  id: 'openrouter',
  displayName: 'OpenRouter (Modelos Libres & Fallback)',
  requiredEnvVars: ['OPENROUTER_API_KEYS', 'OPENROUTER_API_KEY'],
  defaultModel: OPENROUTER_DEFAULT_MODEL,
  supportsImages: true,

  async complete(req: AiCompletionRequest, apiKey: string, model?: string): Promise<AiCompletionResponse> {
    const hasImages = !!req.images && req.images.length > 0;
    const requestDeadline = Date.now() + 50_000;

    let modelCandidates: string[];
    if (model) {
      modelCandidates = [model];
    } else {
      modelCandidates = [...new Set([this.defaultModel, ...OPENROUTER_FALLBACK_MODELS])];
    }

    let lastError: any = null;

    for (const currentModel of modelCandidates) {
      const remainingMs = requestDeadline - Date.now();
      if (remainingMs < 4000) {
        console.warn('[openrouterProvider] Presupuesto de tiempo agotado antes de reintentar.');
        break;
      }
      const attemptTimeoutMs = Math.min(22000, remainingMs);

      const userContent: any = hasImages
        ? [
            ...req.images!.map(img => ({
              type: 'image_url',
              image_url: {
                url: `data:${img.mimeType || 'image/jpeg'};base64,${img.base64}`
              }
            })),
            { type: 'text', text: req.userPrompt }
          ]
        : req.userPrompt;

      const schemaGuide = req.responseSchema ? describeResponseSchema(req.responseSchema) : '';
      const systemPrompt = schemaGuide
        ? `${req.systemPrompt}\n\n${schemaGuide}`
        : req.systemPrompt;

      const body: Record<string, any> = {
        model: currentModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        max_tokens: req.maxTokens || 1200,
        temperature: req.temperature ?? (req.responseSchema ? 0.1 : 0.7),
        ...(req.responseSchema ? { response_format: { type: 'json_object' } } : {})
      };

      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://leecv.app',
            'X-Title': 'LEECV'
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(attemptTimeoutMs)
        });

        if (!response.ok) {
          const errText = await response.text();
          const errObj: any = new Error(`OpenRouter API Error (${response.status}) on ${currentModel}: ${errText}`);
          errObj.status = response.status;
          throw errObj;
        }

        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content;
        if (!content) {
          throw new Error(`Respuesta vacía de OpenRouter API (${currentModel})`);
        }

        const usage = data?.usage ? {
          promptTokens: data.usage.prompt_tokens || 0,
          completionTokens: data.usage.completion_tokens || 0,
          totalTokens: data.usage.total_tokens || 0,
        } : undefined;

        return { content: content.trim(), usage, modelUsed: currentModel };
      } catch (err: any) {
        lastError = err;
        if (err.status === 401 || err.status === 403 || err.message?.includes('User key not found') || err.message?.includes('Invalid API Key')) {
          throw err;
        }
        console.warn(`[openrouterProvider] Falló modelo ${currentModel} (${err.status || err.message}). Evaluando siguiente fallback.`);
      }
    }

    throw lastError;
  },

  async ping(): Promise<AiProviderPingResult> {
    const keysRaw = process.env.OPENROUTER_API_KEYS || process.env.OPENROUTER_API_KEY || '';
    const keys = keysRaw.split(',').map(k => k.trim()).filter(Boolean);

    if (keys.length === 0) {
      return {
        status: 'missing_vars',
        label: 'Variables de entorno no configuradas (OPENROUTER_API_KEY)',
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
        label: 'OpenRouter Activo & Operativo',
        model: this.defaultModel
      };
    } catch (err: any) {
      return {
        status: err.status === 401 ? 'invalid_credentials' : 'error',
        label: `Error de conexión con OpenRouter: ${err.message || String(err)}`,
        model: this.defaultModel
      };
    }
  }
};
