import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { geminiProvider } from '../api/_lib/aiProviders/gemini';
import { groqProvider } from '../api/_lib/aiProviders/groq';

/** Captura los cuerpos JSON enviados a fetch para inspeccionarlos. */
function stubFetchSequence(handlers: Array<(body: any) => { status: number; json: any }>) {
  const calls: any[] = [];
  const impl = async (_url: string, init: any) => {
    const body = JSON.parse(init.body);
    calls.push(body);
    const handler = handlers[Math.min(calls.length - 1, handlers.length - 1)];
    const { status, json } = handler(body);
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => JSON.stringify(json),
      json: async () => json,
    } as any;
  };
  vi.stubGlobal('fetch', impl);
  return calls;
}

const okGeminiBody = {
  candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }],
  usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 },
};

describe('gemini.ts — mediaResolution', () => {
  beforeEach(() => vi.useRealTimers());
  afterEach(() => vi.unstubAllGlobals());

  it('envía MEDIA_RESOLUTION_HIGH cuando hay imágenes', async () => {
    const calls = stubFetchSequence([() => ({ status: 200, json: okGeminiBody })]);
    await geminiProvider.complete(
      { systemPrompt: 's', userPrompt: 'u', images: [{ mimeType: 'image/webp', base64: 'AAAA' }] },
      'test-key'
    );
    expect(calls).toHaveLength(1);
    expect(calls[0].generationConfig.mediaResolution).toBe('MEDIA_RESOLUTION_HIGH');
    expect(calls[0].contents[0].parts[0].inlineData.mimeType).toBe('image/webp');
  });

  it('sin imágenes NO envía mediaResolution', async () => {
    const calls = stubFetchSequence([() => ({ status: 200, json: okGeminiBody })]);
    await geminiProvider.complete({ systemPrompt: 's', userPrompt: 'u' }, 'test-key');
    expect(calls[0].generationConfig.mediaResolution).toBeUndefined();
  });

  it('si el modelo rechaza mediaResolution (400), reintenta SIN el campo una vez', async () => {
    const calls = stubFetchSequence([
      () => ({ status: 400, json: { error: { message: 'Invalid argument: mediaResolution is not supported' } } }),
      () => ({ status: 200, json: okGeminiBody }),
    ]);
    const result = await geminiProvider.complete(
      { systemPrompt: 's', userPrompt: 'u', images: [{ mimeType: 'image/jpeg', base64: 'AAAA' }] },
      'test-key'
    );
    expect(calls).toHaveLength(2);
    expect(calls[1].generationConfig.mediaResolution).toBeUndefined();
    expect(result.content).toBe('{"ok":true}');
  });
});

describe('groq.ts — temperatura según responseSchema', () => {
  afterEach(() => vi.unstubAllGlobals());

  const okGroqBody = {
    choices: [{ message: { content: '{"ok":true}' } }],
    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
  };

  it('con responseSchema usa temperatura 0.1 por defecto', async () => {
    const calls = stubFetchSequence([() => ({ status: 200, json: okGroqBody })]);
    await groqProvider.complete(
      { systemPrompt: 's', userPrompt: 'u', responseSchema: { type: 'object' } },
      'test-key'
    );
    expect(calls[0].temperature).toBe(0.1);
    expect(calls[0].response_format).toEqual({ type: 'json_object' });
  });

  it('sin responseSchema ni temperatura explícita conserva 0.7', async () => {
    const calls = stubFetchSequence([() => ({ status: 200, json: okGroqBody })]);
    await groqProvider.complete({ systemPrompt: 's', userPrompt: 'u' }, 'test-key');
    expect(calls[0].temperature).toBe(0.7);
  });

  it('soporta mimeType webp en la data URL', async () => {
    const calls = stubFetchSequence([() => ({ status: 200, json: okGroqBody })]);
    await groqProvider.complete(
      { systemPrompt: 's', userPrompt: 'u', images: [{ mimeType: 'image/webp', base64: 'AAAA' }] },
      'test-key'
    );
    const imagePart = calls[0].messages[1].content[0];
    expect(imagePart.image_url.url).toBe('data:image/webp;base64,AAAA');
  });
});
