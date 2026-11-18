import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Tests del diagnóstico server-side de motores de IA (action=ai-providers-status)
 * y del botón de limpieza de pausas de claves (action=clear-ai-cooldowns)
 * en api/admin-api.ts.
 *
 * La regla de seguridad que se defiende acá: la respuesta del endpoint
 * NUNCA contiene material de claves (ni texto ni hashes) — solo conteos.
 */

vi.mock('../../api/_lib/supabaseAdmin.js', () => ({ supabaseAdmin: {} }));

vi.mock('../../api/_lib/authMiddleware.js', () => ({
  requireAdmin: vi.fn().mockResolvedValue({ user: { id: 'admin-user-1' } }),
}));

vi.mock('../../api/_lib/rateLimiter.js', () => ({
  requireRateLimit: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../api/_lib/serverDal.js', () => ({ serverDal: {} }));

vi.mock('../../api/_lib/applyPayment.js', () => ({
  applyPayment: vi.fn().mockResolvedValue({ type: 'payment_applied' }),
}));

vi.mock('../../api/_lib/sentryBackend.js', () => ({
  captureBackendException: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../api/_lib/paymentProviders/registry.js', () => ({
  diagnoseAllProviders: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../api/_lib/aiProviders/registry.js', () => ({
  AI_PROVIDERS: {
    groq: {
      id: 'groq',
      displayName: 'Groq Cloud',
      defaultModel: 'groq-model',
      ping: vi.fn().mockResolvedValue({ status: 'active', label: 'Groq OK', model: 'groq-model' }),
    },
    gemini: {
      id: 'gemini',
      displayName: 'Google AI Studio',
      defaultModel: 'gemini-model',
      ping: vi.fn().mockResolvedValue({ status: 'missing_vars', label: 'Falta GEMINI_API_KEYS', model: 'gemini-model' }),
    },
  },
}));

vi.mock('../../api/_lib/aiProviders/keyRotation.js', () => ({
  getAiKeyCooldownSummary: vi.fn().mockImplementation((providerId: string) =>
    Promise.resolve({
      provider: providerId,
      configuredKeys: 3,
      pausedKeys: providerId === 'groq' ? 1 : 0,
      source: 'database',
    })
  ),
  clearExpiredCooldowns: vi.fn().mockResolvedValue(true),
}));

import handler from '../../api/admin-api.js';
import { AI_PROVIDERS } from '../../api/_lib/aiProviders/registry.js';
import { clearExpiredCooldowns } from '../../api/_lib/aiProviders/keyRotation.js';

function makeRes() {
  const res: any = {
    statusCode: 0,
    body: null as any,
    status(code: number) { res.statusCode = code; return res; },
    json(payload: any) { res.body = payload; return res; },
  };
  return res;
}

function makeReq(body: any, query: Record<string, string> = {}, method: 'GET' | 'POST' = 'GET') {
  return {
    method,
    query,
    body,
    headers: { 'x-forwarded-for': '1.2.3.4' },
    socket: { remoteAddress: '1.2.3.4' },
  } as any;
}

describe('admin-api action=ai-providers-status — diagnóstico server-side de IA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devuelve el estado real de cada motor + resumen de pausas de claves (solo conteos)', async () => {
    const res = makeRes();
    await handler(makeReq({}, { action: 'ai-providers-status', forcePing: 'true' }, 'GET'), res);

    expect(res.statusCode).toBe(200);
    expect(res.body?.success).toBe(true);
    expect(res.body?.groq).toMatchObject({
      id: 'groq',
      status: 'active',
      label: 'Groq OK',
      model: 'groq-model',
      configuredKeys: 3,
      pausedKeys: 1,
      source: 'database',
    });
    expect(res.body?.gemini).toMatchObject({
      id: 'gemini',
      status: 'missing_vars',
      configuredKeys: 3,
      pausedKeys: 0,
    });
    expect(typeof res.body?.lastCheckedAt).toBe('string');
  });

  it('NUNCA expone material de claves (texto de key, prefijos sk-/AIza o hashes) en la respuesta', async () => {
    const res = makeRes();
    await handler(makeReq({}, { action: 'ai-providers-status', forcePing: 'true' }, 'GET'), res);

    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toMatch(/sk-[A-Za-z0-9]/);
    expect(serialized).not.toMatch(/AIza/);
    expect(serialized).not.toMatch(/[0-9a-f]{64}/);
    for (const id of ['groq', 'gemini']) {
      expect(Object.keys(res.body[id])).not.toContain('keyHash');
      expect(Object.keys(res.body[id])).not.toContain('apiKey');
    }
  });

  it('si el ping de un motor falla, el resto del diagnóstico sigue intacto (fail-safe por proveedor)', async () => {
    vi.mocked(AI_PROVIDERS.gemini.ping).mockRejectedValueOnce(new Error('timeout del proveedor'));

    const res = makeRes();
    await handler(makeReq({}, { action: 'ai-providers-status', forcePing: 'true' }, 'GET'), res);

    expect(res.statusCode).toBe(200);
    expect(res.body?.gemini?.status).toBe('error');
    expect(res.body?.gemini?.label).toContain('Sin respuesta');
    // El resumen de pausas sigue adjunto aunque el ping haya fallado
    expect(res.body?.gemini?.configuredKeys).toBe(3);
    expect(res.body?.groq?.status).toBe('active');
  });

  it('rechaza POST con 405 (el diagnóstico es de solo lectura)', async () => {
    const res = makeRes();
    await handler(makeReq({ action: 'ai-providers-status' }, {}, 'POST'), res);

    expect(res.statusCode).toBe(405);
  });
});

describe('admin-api action=clear-ai-cooldowns — limpieza de pausas ya expiradas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('borra vía clearExpiredCooldowns (solo filas ya expiradas) y responde success', async () => {
    const res = makeRes();
    await handler(makeReq({ action: 'clear-ai-cooldowns' }, {}, 'POST'), res);

    expect(res.statusCode).toBe(200);
    expect(res.body?.success).toBe(true);
    expect(clearExpiredCooldowns).toHaveBeenCalledTimes(1);
  });

  it('si la DB no responde responde 503 sin inventar éxito', async () => {
    vi.mocked(clearExpiredCooldowns).mockResolvedValueOnce(false);

    const res = makeRes();
    await handler(makeReq({ action: 'clear-ai-cooldowns' }, {}, 'POST'), res);

    expect(res.statusCode).toBe(503);
    expect(res.body?.success).toBe(false);
  });

  it('rechaza GET con 405 (la limpieza muta estado y debe ser POST)', async () => {
    const res = makeRes();
    await handler(makeReq({}, { action: 'clear-ai-cooldowns' }, 'GET'), res);

    expect(res.statusCode).toBe(405);
    expect(clearExpiredCooldowns).not.toHaveBeenCalled();
  });
});
