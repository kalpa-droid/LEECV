import type { AiCompletionRequest, AiProviderDefinition, AiProviderPingResult, AiCompletionResponse } from './types.js';

export const groqProvider: AiProviderDefinition = {
  id: 'groq',
  displayName: 'Groq Cloud (Llama 3.3 70B)',
  requiredEnvVars: ['GROQ_API_KEYS', 'GROQ_API_KEY'],
  defaultModel: 'llama-3.3-70b-versatile',

  async complete(req: AiCompletionRequest, apiKey: string, model?: string): Promise<AiCompletionResponse> {
    const targetModel = model || this.defaultModel;
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [
          { role: 'system', content: req.systemPrompt },
          { role: 'user', content: req.userPrompt }
        ],
        max_tokens: req.maxTokens || 1200,
        temperature: req.temperature ?? 0.7
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      const errObj: any = new Error(`Groq API Error (${response.status}): ${errText}`);
      errObj.status = response.status;
      throw errObj;
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Respuesta vacía o inválida de Groq API');
    }

    const usage = data?.usage ? {
      promptTokens: data.usage.prompt_tokens || 0,
      completionTokens: data.usage.completion_tokens || 0,
      totalTokens: data.usage.total_tokens || 0,
    } : undefined;

    return { content: content.trim(), usage };
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
