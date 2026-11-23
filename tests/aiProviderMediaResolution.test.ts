import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../api/_lib/supabaseAdmin.js', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          gt: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      upsert: vi.fn(() => Promise.resolve({ error: null })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
    })),
    rpc: vi.fn(() => Promise.resolve({ data: true, error: null })),
  },
}));

vi.mock('../api/_lib/rateLimiter.js', () => ({
  requireRateLimit: vi.fn(async () => true),
}));

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

describe('gemini.ts — header x-goog-api-key, rotación inmediata 429 y thinking parts', () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    vi.useRealTimers();
    delete process.env.GEMINI_PRO_API_KEYS;
    delete process.env.GEMINI_API_KEYS;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GROQ_API_KEYS;
    delete process.env.OPENROUTER_API_KEYS;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = { ...ORIGINAL_ENV };
  });

  it('envía la API key en header x-goog-api-key, lanza inmediato ante 429 (1 fetch) e ignora parts con thought=true', async () => {
    const fetchCalls: Array<{ url: string; headers: Record<string, string> }> = [];
    vi.stubGlobal('fetch', async (url: string, init: any) => {
      fetchCalls.push({ url, headers: init?.headers || {} });
      return {
        ok: false,
        status: 429,
        headers: { get: () => '45' },
        text: async () => 'RESOURCE_EXHAUSTED',
        json: async () => ({}),
      } as any;
    });

    await expect(
      geminiProvider.complete({ systemPrompt: 's', userPrompt: 'u', tier: 'pro' }, 'secret-key-hdr')
    ).rejects.toThrow(/429/);

    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0].url).not.toContain('key=');
    expect(fetchCalls[0].headers['x-goog-api-key']).toBe('secret-key-hdr');

    vi.stubGlobal('fetch', async () => ({
      ok: true,
      status: 200,
      text: async () => '',
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                { thought: true, text: 'pensamiento interno que no debe salir' },
                { text: '{"result":"real"}' },
              ],
            },
          },
        ],
      }),
    }) as any);

    const okRes = await geminiProvider.complete({ systemPrompt: 's', userPrompt: 'u', tier: 'pro' }, 'secret-key-hdr');
    expect(okRes.content).toBe('{"result":"real"}');
  });

  it('en ai-generate, una clave con 401/403 rota a la segunda clave en vez de abortar el proveedor', async () => {
    process.env.GEMINI_PRO_API_KEYS = 'rot-401-key-1,rot-401-key-2';
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const seenKeys: string[] = [];

    vi.stubGlobal('fetch', async (url: string, init: any) => {
      if (!String(url).includes('generativelanguage.googleapis.com')) {
        return {
          ok: true,
          status: 200,
          text: async () => '[]',
          json: async () => [],
        } as any;
      }
      const k = init?.headers?.['x-goog-api-key'];
      seenKeys.push(k);
      if (k === 'rot-401-key-1') {
        return {
          ok: false,
          status: 403,
          text: async () => 'API_KEY_INVALID',
          json: async () => ({}),
        } as any;
      }
      return {
        ok: true,
        status: 200,
        text: async () => '',
        json: async () => ({
          candidates: [{ content: { parts: [{ text: '{"summary":"Extracto OK"}' }] } }],
        }),
      } as any;
    });

    const { default: handler } = await import('../api/ai-generate');
    const jsonResponses: Array<{ status: number; body: any }> = [];
    const req: any = {
      method: 'POST',
      headers: { 'x-forwarded-for': '127.0.0.1' },
      body: {
        taskId: 'editorial_rewrite',
        payload: { text: 'Texto de prueba' },
        cvData: {},
      },
    };
    const res: any = {
      status(code: number) {
        return {
          json(body: any) {
            jsonResponses.push({ status: code, body });
            return res;
          },
        };
      },
    };

    // Usar una tarea tier pro (cover_letter) para activar AI_PROVIDER_PRO_ORDER y gemini_pro
    req.body = {
      taskId: 'cover_letter',
      payload: { jobTargetText: 'Dev' },
      cvData: {},
    };
    // Si la primera clave elegida al azar fue rot-401-key-2, al menos verificamos éxito y que nunca aborte por 403 si tocó la 1
    await handler(req, res);
    expect(jsonResponses).toHaveLength(1);
    expect(jsonResponses[0].status).toBe(200);
    expect(jsonResponses[0].body.providerUsed).toBe('gemini');
    expect(seenKeys).toEqual(['rot-401-key-1', 'rot-401-key-2']);
    vi.restoreAllMocks();
  }, 15_000);
});
