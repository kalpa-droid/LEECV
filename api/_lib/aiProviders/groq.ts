import type { AiCompletionRequest, AiProviderDefinition, AiProviderPingResult, AiCompletionResponse } from './types.js';

const GROQ_TEXT_MODEL = 'llama-3.3-70b-versatile';
const GROQ_VISION_MODEL = 'llama-3.2-11b-vision-preview';
const GROQ_VISION_FALLBACK = 'meta-llama/llama-4-scout-17b-16e-instruct';

export const groqProvider: AiProviderDefinition = {
  id: 'groq',
  displayName: 'Groq Cloud (Llama 3.3 70B + Visión)',
  requiredEnvVars: ['GROQ_API_KEYS', 'GROQ_API_KEY'],
  defaultModel: GROQ_TEXT_MODEL,
  supportsImages: true,

  async complete(req: AiCompletionRequest, apiKey: string, model?: string): Promise<AiCompletionResponse> {
    const hasImages = !!req.images && req.images.length > 0;

    // Presupuesto global por petición: Vercel corta a los 60s
    const requestDeadline = Date.now() + 50_000;

    // Candidatos de modelo: para imágenes, la cascada de visión; si no, el modelo de texto
    let modelCandidates: string[];
    if (model) {
      modelCandidates = [model];
    } else if (hasImages) {
      const configured = process.env.GROQ_VISION_MODEL || GROQ_VISION_MODEL;
      modelCandidates = [...new Set([configured, GROQ_VISION_FALLBACK])];
    } else {
      modelCandidates = [this.defaultModel];
    }

    let lastError: any = null;

    for (const currentModel of modelCandidates) {
      const remainingMs = requestDeadline - Date.now();
      if (remainingMs < 4000) {
        console.warn('[groqProvider] Presupuesto de tiempo de Vercel agotado. No hay margen para otro intento.');
        break;
      }
      const attemptTimeoutMs = Math.min(18000, remainingMs);

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

      const body: Record<string, any> = {
        model: currentModel,
        messages: [
          { role: 'system', content: req.systemPrompt },
          { role: 'user', content: userContent }
        ],
        max_tokens: req.maxTokens || 1200,
        temperature: req.temperature ?? 0.7,
        // Forzar JSON estructurado cuando el request lo requiere
        ...(req.responseSchema ? { response_format: { type: 'json_object' } } : {})
      };

      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(attemptTimeoutMs)
        });

        if (!response.ok) {
          const errText = await response.text();
          const errObj: any = new Error(`Groq API Error (${response.status}) on ${currentModel}: ${errText}`);
          errObj.status = response.status;
          throw errObj;
        }

        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content;
        if (!content) {
          throw new Error(`Respuesta vacía o inválida de Groq API (${currentModel})`);
        }

        const usage = data?.usage ? {
          promptTokens: data.usage.prompt_tokens || 0,
          completionTokens: data.usage.completion_tokens || 0,
          totalTokens: data.usage.total_tokens || 0,
        } : undefined;

        return { content: content.trim(), usage };
      } catch (err: any) {
        lastError = err;
        // Abortar solo si credenciales inválidas (401/403)
        if (err.status === 401 || err.status === 403 || err.message?.includes('API_KEY_INVALID') || err.message?.includes('Invalid API Key')) {
          throw err;
        }
        // Cualquier otro error (429, 500, timeout, modelo no disponible) → probar siguiente candidato si existe
        console.warn(`[groqProvider] Falló ${currentModel} (${err.status || err.message}).`);
      }
    }

    throw lastError;
  },

  async ping(): Promise<AiProviderPingResult> {
    const keysRaw = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || '';
    const keys = keysRaw.split(',').map(k => k.trim()).filter(Boolean);

    if (keys.length === 0) {
      return {
        status: 'missing_vars',
        label: 'Variables de entorno no configuradas (GROQ_API_KEYS)',
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
        label: 'Groq Activo & Operativo',
        model: this.defaultModel
      };
    } catch (err: any) {
      return {
        status: err.status === 401 ? 'invalid_credentials' : 'error',
        label: `Error de conexión con Groq: ${err.message || String(err)}`,
        model: this.defaultModel
      };
    }
  }
};
