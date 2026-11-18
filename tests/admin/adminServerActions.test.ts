import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Tests de las server actions admin nuevas (PR-D) y del blindaje
 * anti-fraude de api/create-checkout.ts.
 *
 * Reglas de seguridad que se defienden acá:
 *
 * 1. admin-api (set-plan / grant-export-tokens) sólo opera detrás de
 *    requireAdmin, con rate-limit, validación estricta de input y auditoría
 *    en admin_audit_logs. Los errores 500 devuelven un mensaje genérico
 *    (nunca err.message del backend).
 * 2. create-checkout NUNCA acepta userId del body como fuente de identidad:
 *    con Bearer JWT se resuelve por supabaseAdmin.auth.getUser; sin sesión,
 *    el dueño sale del token pdf_export_tokens pre-checkout. Un body con
 *    userId ajeno no puede desviar la acreditación.
 */

const h = vi.hoisted(() => ({
  maybeSingle: vi.fn(),
  getUser: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('../../api/_lib/supabaseAdmin.js', () => ({
  supabaseAdmin: {
    rpc: h.rpc,
    auth: { getUser: h.getUser },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: h.maybeSingle })),
      })),
    })),
  },
}));

vi.mock('../../api/_lib/authMiddleware.js', () => ({
  requireAdmin: vi.fn().mockResolvedValue({ user: { id: 'admin-user-1' } }),
}));

vi.mock('../../api/_lib/rateLimiter.js', () => ({
  requireRateLimit: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../api/_lib/serverDal.js', () => ({
  serverDal: {
    profiles: {
      getById: vi.fn(),
      updateSubscription: vi.fn(),
    },
    adminAuditLogs: { log: vi.fn() },
  },
}));

vi.mock('../../api/_lib/applyPayment.js', () => ({
  applyPayment: vi.fn().mockResolvedValue({ type: 'payment_applied' }),
}));

vi.mock('../../api/_lib/sentryBackend.js', () => ({
  captureBackendException: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../api/_lib/paymentProviders/registry.js', () => ({
  diagnoseAllProviders: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../api/_lib/paymentProviders/checkoutInitiators.js', () => ({
  createCheckoutForProvider: vi.fn().mockResolvedValue({ checkoutUrl: 'https://provider.test/checkout' }),
}));

vi.mock('../../api/_lib/aiProviders/registry.js', () => ({
  AI_PROVIDERS: {},
}));

vi.mock('../../api/_lib/aiProviders/keyRotation.js', () => ({
  getAiKeyCooldownSummary: vi.fn().mockResolvedValue({}),
  clearExpiredCooldowns: vi.fn().mockResolvedValue(true),
}));

import handler from '../../api/admin-api.js';
import checkoutHandler from '../../api/create-checkout.js';
import { requireAdmin } from '../../api/_lib/authMiddleware.js';
import { requireRateLimit } from '../../api/_lib/rateLimiter.js';
import { serverDal } from '../../api/_lib/serverDal.js';
import { createCheckoutForProvider } from '../../api/_lib/paymentProviders/checkoutInitiators.js';

const UUID = '123e4567-e89b-12d3-a456-426655440000';
const UUID_2 = '123e4567-e89b-12d3-a456-426655440099';

function makeRes() {
  const res: any = {
    statusCode: 0,
    body: null as any,
    status(code: number) { res.statusCode = code; return res; },
    json(payload: any) { res.body = payload; return res; },
  };
  return res;
}

function makeReq(body: any, query: Record<string, string> = {}, method: 'GET' | 'POST' = 'POST', headers: Record<string, string> = {}) {
  return {
    method,
    query,
    body,
    headers: { 'x-forwarded-for': '1.2.3.4', ...headers },
    socket: { remoteAddress: '1.2.3.4' },
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  // Restaura los defaults que clearAllMocks no preserva
  vi.mocked(requireAdmin).mockResolvedValue({ user: { id: 'admin-user-1' } } as any);
  vi.mocked(requireRateLimit).mockResolvedValue(true as any);
});

describe('admin-api action=set-plan — cambio de plan server-side', () => {
  it('aplica el plan con service_role vía DAL, audita y responde success', async () => {
    vi.mocked(serverDal.profiles.updateSubscription).mockResolvedValue({ id: UUID } as any);

    const res = makeRes();
    await handler(makeReq({ userId: UUID, plan: 'pro' }, { action: 'set-plan' }, 'POST'), res);

    expect(res.statusCode).toBe(200);
    expect(res.body?.success).toBe(true);
    expect(vi.mocked(serverDal.profiles.updateSubscription)).toHaveBeenCalledWith(
      { id: UUID },
      { plan: 'pro', plan_vence: null, premium_activo: true }
    );
    expect(vi.mocked(serverDal.adminAuditLogs.log)).toHaveBeenCalledWith(
      'admin-user-1', 'set_user_plan', UUID, { plan: 'pro', vence: null }
    );
  });

  it('free desactiva premium_activo', async () => {
    vi.mocked(serverDal.profiles.updateSubscription).mockResolvedValue({ id: UUID } as any);

    const res = makeRes();
    await handler(makeReq({ userId: UUID, plan: 'free' }, { action: 'set-plan' }, 'POST'), res);

    expect(res.statusCode).toBe(200);
    expect(vi.mocked(serverDal.profiles.updateSubscription)).toHaveBeenCalledWith(
      { id: UUID },
      { plan: 'free', plan_vence: null, premium_activo: false }
    );
  });

  it('vence válida se normaliza a ISO (fecha inválida → 400)', async () => {
    vi.mocked(serverDal.profiles.updateSubscription).mockResolvedValue({ id: UUID } as any);

    const okRes = makeRes();
    await handler(makeReq({ userId: UUID, plan: 'pro', vence: '2026-12-31' }, { action: 'set-plan' }, 'POST'), okRes);
    expect(okRes.statusCode).toBe(200);
    expect(vi.mocked(serverDal.profiles.updateSubscription)).toHaveBeenCalledWith(
      { id: UUID },
      { plan: 'pro', plan_vence: new Date('2026-12-31').toISOString(), premium_activo: true }
    );

    const badRes = makeRes();
    await handler(makeReq({ userId: UUID, plan: 'pro', vence: 'no-es-fecha' }, { action: 'set-plan' }, 'POST'), badRes);
    expect(badRes.statusCode).toBe(400);
  });

  it('rechaza userId que no es UUID (400) y no toca la DB', async () => {
    const res = makeRes();
    await handler(makeReq({ userId: 'no-uuid', plan: 'pro' }, { action: 'set-plan' }, 'POST'), res);
    expect(res.statusCode).toBe(400);
    expect(vi.mocked(serverDal.profiles.updateSubscription)).not.toHaveBeenCalled();
  });

  it('rechaza planes fuera de {free, pro} (400)', async () => {
    const res = makeRes();
    await handler(makeReq({ userId: UUID, plan: 'enterprise' }, { action: 'set-plan' }, 'POST'), res);
    expect(res.statusCode).toBe(400);
    expect(vi.mocked(serverDal.profiles.updateSubscription)).not.toHaveBeenCalled();
  });

  it('usuario inexistente → 404', async () => {
    vi.mocked(serverDal.profiles.updateSubscription).mockResolvedValue(null as any);

    const res = makeRes();
    await handler(makeReq({ userId: UUID, plan: 'pro' }, { action: 'set-plan' }, 'POST'), res);
    expect(res.statusCode).toBe(404);
    expect(res.body?.success).toBe(false);
  });

  it('si la DB falla devuelve 500 genérico SIN filtrar err.message', async () => {
    vi.mocked(serverDal.profiles.updateSubscription).mockRejectedValue(new Error('duplicate key value violates unique constraint "profiles_pkey"'));

    const res = makeRes();
    await handler(makeReq({ userId: UUID, plan: 'pro' }, { action: 'set-plan' }, 'POST'), res);

    expect(res.statusCode).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('duplicate key');
    expect(JSON.stringify(res.body)).not.toContain('profiles_pkey');
  });

  it('rechaza GET con 405', async () => {
    const res = makeRes();
    await handler(makeReq({}, { action: 'set-plan' }, 'GET'), res);
    expect(res.statusCode).toBe(405);
    expect(vi.mocked(serverDal.profiles.updateSubscription)).not.toHaveBeenCalled();
  });

  it('si requireAdmin deniega, no toca la DB ni responde success', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce(null as any);

    const res = makeRes();
    await handler(makeReq({ userId: UUID, plan: 'pro' }, { action: 'set-plan' }, 'POST'), res);

    expect(vi.mocked(serverDal.profiles.updateSubscription)).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(0);
  });

  it('rate limit excedido → no ejecuta la mutación', async () => {
    vi.mocked(requireRateLimit).mockResolvedValueOnce(false);

    const res = makeRes();
    await handler(makeReq({ userId: UUID, plan: 'pro' }, { action: 'set-plan' }, 'POST'), res);

    expect(vi.mocked(serverDal.profiles.updateSubscription)).not.toHaveBeenCalled();
  });
});

describe('admin-api action=grant-export-tokens — acreditación manual de créditos', () => {
  it('acredita vía RPC service_role, audita y responde success', async () => {
    vi.mocked(serverDal.profiles.getById).mockResolvedValue({ id: UUID, email: 'cli@example.com' } as any);
    h.rpc.mockResolvedValue({ error: null });

    const res = makeRes();
    await handler(makeReq({ userId: UUID, amount: 5 }, { action: 'grant-export-tokens' }, 'POST'), res);

    expect(res.statusCode).toBe(200);
    expect(res.body?.success).toBe(true);
    expect(h.rpc).toHaveBeenCalledTimes(1);
    const rpcArgs = h.rpc.mock.calls[0];
    expect(rpcArgs[0]).toBe('grant_export_tokens');
    expect(rpcArgs[1]).toMatchObject({
      p_user_id: UUID,
      p_amount: 5,
      p_email: 'cli@example.com',
    });
    expect(rpcArgs[1].p_payment_id).toMatch(/^admin:manual:admin-user-1:/);
    expect(vi.mocked(serverDal.adminAuditLogs.log)).toHaveBeenCalledWith(
      'admin-user-1', 'grant_export_tokens', UUID, expect.objectContaining({ amount: 5 })
    );
  });

  it('amount fuera de rango entero 1..1000 → 400 (sin llamar la RPC)', async () => {
    for (const amount of [0, -1, 1001, 2.5, 'cinco']) {
      const res = makeRes();
      await handler(makeReq({ userId: UUID, amount }, { action: 'grant-export-tokens' }, 'POST'), res);
      expect(res.statusCode).toBe(400);
    }
    expect(h.rpc).not.toHaveBeenCalled();
  });

  it('usuario inexistente → 404', async () => {
    vi.mocked(serverDal.profiles.getById).mockResolvedValue(null as any);

    const res = makeRes();
    await handler(makeReq({ userId: UUID, amount: 1 }, { action: 'grant-export-tokens' }, 'POST'), res);

    expect(res.statusCode).toBe(404);
    expect(h.rpc).not.toHaveBeenCalled();
  });

  it('si la RPC falla devuelve 500 genérico SIN filtrar err.message', async () => {
    vi.mocked(serverDal.profiles.getById).mockResolvedValue({ id: UUID, email: 'cli@example.com' } as any);
    h.rpc.mockResolvedValue({ error: { message: 'function grant_export_tokens(text, uuid, integer, text) does not exist' } });

    const res = makeRes();
    await handler(makeReq({ userId: UUID, amount: 1 }, { action: 'grant-export-tokens' }, 'POST'), res);

    expect(res.statusCode).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('grant_export_tokens(text');
  });

  it('rechaza GET con 405', async () => {
    const res = makeRes();
    await handler(makeReq({}, { action: 'grant-export-tokens' }, 'GET'), res);
    expect(res.statusCode).toBe(405);
    expect(h.rpc).not.toHaveBeenCalled();
  });
});

describe('create-checkout — anti-fraude (userId del body NO es identidad)', () => {
  const validToken = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

  it('plan desconocido → 400 y NO crea checkout (aunque venga exportToken válido)', async () => {
    const res = makeRes();
    await checkoutHandler(makeReq({ providerId: 'mercadopago', plan: 'enterprise', email: 'a@b.com', exportToken: validToken, userId: UUID }, {}, 'POST'), res);

    expect(res.statusCode).toBe(400);
    expect(vi.mocked(createCheckoutForProvider)).not.toHaveBeenCalled();
  });

  it('plan pro rechazado (400): Pro no se compra por checkout', async () => {
    const res = makeRes();
    await checkoutHandler(makeReq({ providerId: 'paypal', plan: 'pro', email: 'a@b.com', exportToken: validToken }, {}, 'POST'), res);

    expect(res.statusCode).toBe(400);
    expect(vi.mocked(createCheckoutForProvider)).not.toHaveBeenCalled();
  });

  it('providerId fuera de mercadopago|paypal → 400', async () => {
    const res = makeRes();
    await checkoutHandler(makeReq({ providerId: 'stripe', plan: 'single_pdf', email: 'a@b.com', exportToken: validToken }, {}, 'POST'), res);

    expect(res.statusCode).toBe(400);
  });

  it('sin exportToken → 400', async () => {
    const res = makeRes();
    await checkoutHandler(makeReq({ providerId: 'mercadopago', plan: 'single_pdf', email: 'a@b.com' }, {}, 'POST'), res);

    expect(res.statusCode).toBe(400);
    expect(vi.mocked(createCheckoutForProvider)).not.toHaveBeenCalled();
  });

  it('token inexistente en pdf_export_tokens → 400', async () => {
    h.maybeSingle.mockResolvedValue({ data: null, error: null });

    const res = makeRes();
    await checkoutHandler(makeReq({ providerId: 'mercadopago', plan: 'single_pdf', email: 'a@b.com', exportToken: validToken }, {}, 'POST'), res);

    expect(res.statusCode).toBe(400);
    expect(vi.mocked(createCheckoutForProvider)).not.toHaveBeenCalled();
  });

  it('token YA pagado → 400', async () => {
    h.maybeSingle.mockResolvedValue({ data: { token: validToken, paid: true, user_id: null }, error: null });

    const res = makeRes();
    await checkoutHandler(makeReq({ providerId: 'mercadopago', plan: 'single_pdf', email: 'a@b.com', exportToken: validToken }, {}, 'POST'), res);

    expect(res.statusCode).toBe(400);
    expect(vi.mocked(createCheckoutForProvider)).not.toHaveBeenCalled();
  });

  it('REGRESIÓN anti-fraude: body con userId ajeno es IGNORADO; sin sesión acredita undefined', async () => {
    h.maybeSingle.mockResolvedValue({ data: { token: validToken, paid: false, user_id: null }, error: null });

    const res = makeRes();
    await checkoutHandler(makeReq({ providerId: 'mercadopago', plan: 'single_pdf', email: 'a@b.com', exportToken: validToken, userId: UUID_2 }, {}, 'POST'), res);

    expect(res.statusCode).toBe(200);
    expect(vi.mocked(createCheckoutForProvider)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(createCheckoutForProvider).mock.calls[0][4]).toBeUndefined();
  });

  it('con JWT: el checkout acredita a la cuenta del JWT, no al userId del body', async () => {
    h.getUser.mockResolvedValue({ data: { user: { id: UUID, email: 'real@example.com' } }, error: null });
    h.maybeSingle.mockResolvedValue({ data: { token: validToken, paid: false, user_id: null }, error: null });

    const res = makeRes();
    await checkoutHandler(
      makeReq({ providerId: 'mercadopago', plan: 'single_pdf', email: 'falso@example.com', exportToken: validToken, userId: UUID_2 }, {}, 'POST', { authorization: 'Bearer jwt-valid' }),
      res
    );

    expect(res.statusCode).toBe(200);
    const call = vi.mocked(createCheckoutForProvider).mock.calls[0];
    expect(call[4]).toBe(UUID);           // userId del JWT, no UUID_2 del body
    expect(call[3]).toBe('real@example.com'); // email del JWT, no el del body
  });

  it('JWT inválido → 401 (no degradar a invitado en silencio)', async () => {
    h.getUser.mockResolvedValue({ data: { user: null }, error: new Error('bad token') });

    const res = makeRes();
    await checkoutHandler(
      makeReq({ providerId: 'mercadopago', plan: 'single_pdf', email: 'a@b.com', exportToken: validToken }, {}, 'POST', { authorization: 'Bearer jwt-falso' }),
      res
    );

    expect(res.statusCode).toBe(401);
    expect(vi.mocked(createCheckoutForProvider)).not.toHaveBeenCalled();
  });

  it('token atado a otra cuenta + sesión de un tercero → 403', async () => {
    h.getUser.mockResolvedValue({ data: { user: { id: UUID_2, email: 'otro@example.com' } }, error: null });
    h.maybeSingle.mockResolvedValue({ data: { token: validToken, paid: false, user_id: UUID }, error: null });

    const res = makeRes();
    await checkoutHandler(
      makeReq({ providerId: 'mercadopago', plan: 'single_pdf', email: 'otro@example.com', exportToken: validToken }, {}, 'POST', { authorization: 'Bearer jwt-valido' }),
      res
    );

    expect(res.statusCode).toBe(403);
    expect(vi.mocked(createCheckoutForProvider)).not.toHaveBeenCalled();
  });

  it('token atado a la cuenta del JWT (misma cuenta) → 200 y acredita a esa cuenta', async () => {
    h.getUser.mockResolvedValue({ data: { user: { id: UUID, email: 'real@example.com' } }, error: null });
    h.maybeSingle.mockResolvedValue({ data: { token: validToken, paid: false, user_id: UUID }, error: null });

    const res = makeRes();
    await checkoutHandler(
      makeReq({ providerId: 'paypal', plan: 'credits_pack_5', email: 'real@example.com', exportToken: validToken }, {}, 'POST', { authorization: 'Bearer jwt-valido' }),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(vi.mocked(createCheckoutForProvider).mock.calls[0][4]).toBe(UUID);
  });

  it('token de invitado (sin user_id) + sesión logueada → checkout acredita a la sesión', async () => {
    h.getUser.mockResolvedValue({ data: { user: { id: UUID, email: 'real@example.com' } }, error: null });
    h.maybeSingle.mockResolvedValue({ data: { token: validToken, paid: false, user_id: null }, error: null });

    const res = makeRes();
    await checkoutHandler(
      makeReq({ providerId: 'mercadopago', plan: 'single_pdf', email: 'real@example.com', exportToken: validToken }, {}, 'POST', { authorization: 'Bearer jwt-valido' }),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(vi.mocked(createCheckoutForProvider).mock.calls[0][4]).toBe(UUID);
  });

  it('email inválido → 400', async () => {
    const res = makeRes();
    await checkoutHandler(makeReq({ providerId: 'mercadopago', plan: 'single_pdf', email: 'no-es-email', exportToken: validToken }, {}, 'POST'), res);

    expect(res.statusCode).toBe(400);
    expect(h.maybeSingle).not.toHaveBeenCalled();
  });

  it('rechaza GET con 405', async () => {
    const res = makeRes();
    await checkoutHandler(makeReq({}, {}, 'GET'), res);
    expect(res.statusCode).toBe(405);
  });
});
