import type { AiCompletionRequest, AiProviderDefinition, AiProviderPingResult, AiCompletionResponse } from './types.js';

export const geminiProvider: AiProviderDefinition = {
  id: 'gemini',
  displayName: 'Google Gemini (Gemini 2.5 Flash)',
  requiredEnvVars: ['GEMINI_API_KEYS', 'GEMINI_API_KEY'],
  defaultModel: 'gemini-2.5-flash',

  async complete(req: AiCompletionRequest, apiKey: string, model?: string): Promise<AiCompletionResponse> {
    const targetModel = model || this.defaultModel;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;

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
        generationConfig: {
          temperature: req.temperature ?? 0.7,
          maxOutputTokens: req.maxTokens || 1200,
          ...(req.responseSchema ? { responseMimeType: 'application/json', responseSchema: req.responseSchema } : {})
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      const errObj: any = new Error(`Gemini API Error (${response.status}): ${errText}`);
      errObj.status = response.status;
      throw errObj;
    }

    const data = await response.json();
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      throw new Error('Respuesta vacía o inválida de Gemini API');
    }

    const usage = data?.usageMetadata ? {
      promptTokens: data.usageMetadata.promptTokenCount || 0,
      completionTokens: data.usageMetadata.candidatesTokenCount || 0,
      totalTokens: data.usageMetadata.totalTokenCount || 0,
    } : undefined;

    return { content: content.trim(), usage };
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
