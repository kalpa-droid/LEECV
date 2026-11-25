import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockRpcCalls: Array<{ fn: string; params: any }> = [];
const mockLoggedTelemetry: any[] = [];
const mockAuthUsers = new Map<string, string>();

vi.mock('../api/_lib/supabaseAdmin.js', () => ({
  supabaseAdmin: {
    auth: {
      getUser: vi.fn(async (jwt: string) => {
        const uid = mockAuthUsers.get(jwt);
        return uid
          ? { data: { user: { id: uid } }, error: null }
          : { data: { user: null }, error: { message: 'invalid token' } };
      }),
    },
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: { plan: 'pass_30d', plan_vence: new Date(Date.now() + 86400_000).toISOString() }, error: null })),
            })),
          })),
        };
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gt: vi.fn(() => Promise.resolve({ data: [], error: null })),
            limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
        upsert: vi.fn(() => Promise.resolve({ error: null })),
        insert: vi.fn(() => Promise.resolve({ error: null })),
      };
    }),
    rpc: vi.fn(async (fn: string, params: any) => {
      mockRpcCalls.push({ fn, params });
      return { data: true, error: null };
    }),
  },
}));

vi.mock('../api/_lib/serverDal.js', () => ({
  serverDal: {
    aiTelemetry: {
      logUsage: vi.fn(async (entry: any) => {
        mockLoggedTelemetry.push(entry);
      }),
    },
  },
}));

import { getNextAvailableKey, getGeminiKeyPoolDiagnostics } from '../api/_lib/aiProviders/keyRotation.js';
import { AI_TASKS_CATALOG } from '../api/_lib/aiTasks/catalog.js';
import { executeAiTask, clearAiTaskCache } from '../src/shared/core/ai/aiClient.js';
import { apiClient } from '../src/shared/core/utils/apiClient.js';

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  mockRpcCalls.length = 0;
  mockLoggedTelemetry.length = 0;
  mockAuthUsers.clear();
  clearAiTaskCache();
  delete process.env.GEMINI_API_KEYS;
  delete process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_PRO_API_KEYS;
  delete process.env.GROQ_API_KEYS;
  delete process.env.GROQ_API_KEY;
  delete process.env.OPENROUTER_API_KEYS;
  delete process.env.OPENROUTER_API_KEY;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Blindaje de pools de API keys (Fast vs Pro)', () => {
  it('excluye claves Pro mezcladas dentro de GEMINI_API_KEYS cuando hay claves Fast dedicadas', async () => {
    process.env.GEMINI_API_KEYS = 'fast-key-only,shared-pro-key';
    process.env.GEMINI_PRO_API_KEYS = 'shared-pro-key';

    const diag = getGeminiKeyPoolDiagnostics();
    expect(diag.fastConfigured).toBe(1);
    expect(diag.proConfigured).toBe(1);
    expect(diag.overlapFiltered).toBe(1);
    expect(diag.isolated).toBe(true);

    for (let i = 0; i < 6; i++) {
      expect(await getNextAvailableKey('gemini')).toBe('fast-key-only');
    }
    expect(await getNextAvailableKey('gemini_pro')).toBe('shared-pro-key');
  });

  it('mantiene fallback en gemini si todas las claves coinciden con Pro (no deja el pool vacío)', async () => {
    process.env.GEMINI_API_KEYS = 'only-shared-key';
    process.env.GEMINI_PRO_API_KEYS = 'only-shared-key';

    const diag = getGeminiKeyPoolDiagnostics();
    expect(diag.fastConfigured).toBe(1);
    expect(diag.isolated).toBe(false);
    expect(await getNextAvailableKey('gemini')).toBe('only-shared-key');
  });
});

describe('Reclasificación de tareas Pro vs Fast en AI_TASKS_CATALOG', () => {
  it('mantiene solo 6 tareas pesadas/visión en tier pro y pasa tareas ágiles a fast', () => {
    const proTasks = Object.values(AI_TASKS_CATALOG)
      .filter((t: any) => t.tier === 'pro')
      .map((t: any) => t.taskId)
      .sort();

    expect(proTasks).toEqual([
      'ats_analysis',
      'book_detect_orientation',
      'book_detect_page_numbers',
      'editorial_ocr_page',
      'editorial_structure',
      'tailor_cv_for_application',
    ]);

    expect((AI_TASKS_CATALOG as any).cover_letter.tier).toBe('fast');
    expect((AI_TASKS_CATALOG as any).app_guide_assistant.tier).toBe('fast');
    expect((AI_TASKS_CATALOG as any).editorial_detect_preset.tier).toBe('fast');
    expect((AI_TASKS_CATALOG as any).suggest_job_profiles.tier).toBe('fast');
  });
});

describe('Cuotas diferenciadas y trazabilidad real de usuario en ai-generate', () => {
  it('aplica cuotas separadas fast/pro y registra el userId del JWT autenticado', async () => {
    process.env.GROQ_API_KEYS = 'groq-test-1';
    process.env.GEMINI_PRO_API_KEYS = 'gemini-pro-test-1';
    mockAuthUsers.set('jwt-user-42', 'user-uuid-42');

    vi.stubGlobal('fetch', async (url: string) => {
      const target = String(url);
      if (target.includes('groq.com')) {
        return {
          ok: true,
          status: 200,
          text: async () => '',
          json: async () => ({
            choices: [{ message: { content: '{"improvedBullet":"Logro optimizado"}' } }],
            usage: { prompt_tokens: 10, completion_tokens: 5 },
          }),
        } as any;
      }
      return {
        ok: true,
        status: 200,
        text: async () => '',
        json: async () => ({
          candidates: [{ content: { parts: [{ text: '{"semanticScore":92,"findings":[]}' }] } }],
          usageMetadata: { promptTokenCount: 20, candidatesTokenCount: 10 },
        }),
      } as any;
    });

    const { default: handler } = await import('../api/ai-generate');
    const responses: Array<{ status: number; body: any }> = [];
    const makeRes = () => {
      const r: any = {
        status(code: number) {
          return {
            json(body: any) {
              responses.push({ status: code, body });
              return r;
            },
          };
        },
      };
      return r;
    };

    // Llamada Fast autenticada (cover_letter) -> cuota fast (250 para pass_30d)
    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer jwt-user-42', 'x-forwarded-for': '10.0.0.2' },
        body: { taskId: 'improve_bullet', payload: { text: 'Vendí cosas' }, cvData: {} },
      } as any,
      makeRes()
    );

    expect(responses[0].status).toBe(200);
    expect(mockRpcCalls[0]).toEqual({
      fn: 'check_rate_limit',
      params: { p_key: 'ai_fast_user_user-uuid-42', p_max_requests: 250, p_window_seconds: 86400 },
    });
    expect(mockLoggedTelemetry[0].userId).toBe('user-uuid-42');

    // Llamada Pro anónima (ats_analysis) -> cuota pro guest (8) + UUID anónimo
    await handler(
      {
        method: 'POST',
        headers: { 'x-forwarded-for': '10.0.0.3' },
        body: { taskId: 'ats_analysis', payload: { cvText: 'Dev', jobDescription: 'TS' }, cvData: {} },
      } as any,
      makeRes()
    );

    expect(responses[1].status).toBe(200);
    expect(mockRpcCalls[1]).toEqual({
      fn: 'check_rate_limit',
      params: { p_key: 'ai_pro_ip_10.0.0.3', p_max_requests: 8, p_window_seconds: 86400 },
    });
    expect(mockLoggedTelemetry[1].userId).toBe('00000000-0000-0000-0000-000000000000');
  });
});

describe('Caché de deduplicación en aiClient', () => {
  it('reutiliza respuesta dentro del TTL cuando useCache=true y no vuelve a llamar al backend', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({
      ok: true,
      status: 200,
      data: { success: true, text: '{"refinedText":"Texto limpio"}', providerUsed: 'groq' },
    });

    const first = await executeAiTask({
      taskId: 'editorial_refine',
      payload: { text: 'hola mundo' },
      useCache: true,
    });
    const second = await executeAiTask({
      taskId: 'editorial_refine',
      payload: { text: 'hola mundo' },
      useCache: true,
    });

    expect(first.data).toEqual({ refinedText: 'Texto limpio' });
    expect(second.data).toEqual({ refinedText: 'Texto limpio' });
    expect(postSpy).toHaveBeenCalledTimes(1);
  });
});
