import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Tests anti-fraude de api/paypal-order.ts action=create (PR-D2).
 *
 * Mismas reglas que create-checkout (PR-D): el body NUNCA es fuente de
 * identidad (userId del body se ignora); la identidad sale del Bearer JWT o
 * del token pdf_export_tokens pre-checkout; providerId del body se ignora
 * (siempre PayPal); errores 500 genéricos sin filtrar err.message.
 */

const h = vi.hoisted(() => ({
  maybeSingle: vi.fn(),
  getUser: vi.fn(),
  rpc: vi.fn(),
  createCheckoutForProvider: vi.fn(),
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

vi.mock('../../api/_lib/rateLimiter.js', () => ({
  requireRateLimit: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../api/_lib/applyPayment.js', () => ({
  applyPayment: vi.fn().mockResolvedValue({ type: 'payment_applied' }),
}));

vi.mock('../../api/_lib/sentryBackend.js', () => ({
  captureBackendException: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../api/_lib/whatsappAlert.js', () => ({
  dispatchWaAlert: vi.fn(),
}));

vi.mock('../../api/_lib/paymentProviders/checkoutInitiators.js', () => ({
  createCheckoutForProvider: h.createCheckoutForProvider,
}));

vi.mock('../../api/_lib/paymentProviders/planReference.js', () => ({
  parsePlanReference: vi.fn().mockResolvedValue(null),
}));

import handler from '../../api/paypal-order.js';

const TOKEN = '550e8400-e29b-41d4-a716-446655440000';

function makeRes() {
  const res: any = {
    statusCode: 0,
    body: null as any,
    status(code: number) { res.statusCode = code; return res; },
    json(payload: any) { res.body = payload; return res; },
  };
  return res;
}

function makeReq(body: any, query: Record<string, string> = { action: 'create' }, headers: Record<string, string> = {}) {
  return {
    method: 'POST',
    query,
    body: { action: 'create', ...body },
    headers: { 'x-forwarded-for': '1.2.3.4', ...headers },
    socket: { remoteAddress: '1.2.3.4' },
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  h.createCheckoutForProvider.mockResolvedValue({ checkoutUrl: 'https://paypal.test/checkout' });
  h.maybeSingle.mockResolvedValue({ data: { token: TOKEN, paid: false, user_id: 'account-user-1' }, error: null });
});

describe('paypal-order action=create — anti-fraude', () => {
  it('el userId del body se IGNORA: acredita a la cuenta dueña del token', async () => {
    const res = makeRes();
    await handler(makeReq(
      { plan: 'single_pdf', email: 'invitado@x.com', exportToken: TOKEN, userId: 'atacante-user-99' },
    ), res);

    expect(res.statusCode).toBe(200);
    expect(h.createCheckoutForProvider).toHaveBeenCalledWith('paypal', 'single_pdf', TOKEN, 'invitado@x.com', 'account-user-1');
  });

  it('providerId del body se ignora: siempre PayPal', async () => {
    const res = makeRes();
    await handler(makeReq(
      { plan: 'single_pdf', email: 'a@x.com', exportToken: TOKEN, providerId: 'mercadopago' },
    ), res);

    expect(res.statusCode).toBe(200);
    expect(h.createCheckoutForProvider).toHaveBeenCalledWith('paypal', 'single_pdf', TOKEN, 'a@x.com', 'account-user-1');
  });

  it('JWT inválido → 401 y NO crea checkout', async () => {
    h.getUser.mockResolvedValue({ data: { user: null }, error: new Error('bad token') });

    const res = makeRes();
    await handler(makeReq(
      { plan: 'single_pdf', email: 'a@x.com', exportToken: TOKEN },
      { action: 'create' },
      { authorization: 'Bearer token-trucho' },
    ), res);

    expect(res.statusCode).toBe(401);
    expect(res.body?.error || res.body?.message).toMatch(/No autenticado/);
    expect(h.createCheckoutForProvider).not.toHaveBeenCalled();
  });

  it('JWT válido cuyo user difiere del dueño del token → 403', async () => {
    h.getUser.mockResolvedValue({ data: { user: { id: 'otro-user', email: 'a@x.com' } }, error: null });

    const res = makeRes();
    await handler(makeReq(
      { plan: 'single_pdf', email: 'a@x.com', exportToken: TOKEN },
      { action: 'create' },
      { authorization: 'Bearer valido' },
    ), res);

    expect(res.statusCode).toBe(403);
    expect(h.createCheckoutForProvider).not.toHaveBeenCalled();
  });

  it('JWT válido + token de invitado (user_id null) → acredita a la sesión', async () => {
    h.maybeSingle.mockResolvedValue({ data: { token: TOKEN, paid: false, user_id: null }, error: null });
    h.getUser.mockResolvedValue({ data: { user: { id: 'sesion-user', email: 'sesion@x.com' } }, error: null });

    const res = makeRes();
    await handler(makeReq(
      { plan: 'single_pdf', email: 'otro-body@x.com', exportToken: TOKEN },
      { action: 'create' },
      { authorization: 'Bearer valido' },
    ), res);

    expect(res.statusCode).toBe(200);
    // El email de la sesión gana sobre el del body; userId = sesión.
    expect(h.createCheckoutForProvider).toHaveBeenCalledWith('paypal', 'single_pdf', TOKEN, 'sesion@x.com', 'sesion-user');
  });

  it('plan pro → 400 Plan desconocido', async () => {
    const res = makeRes();
    await handler(makeReq({ plan: 'pro', email: 'a@x.com', exportToken: TOKEN }), res);
    expect(res.statusCode).toBe(400);
    expect(h.createCheckoutForProvider).not.toHaveBeenCalled();
  });

  it('plan fuera del catálogo → 400 Plan desconocido', async () => {
    const res = makeRes();
    await handler(makeReq({ plan: 'plan-que-no-existe', email: 'a@x.com', exportToken: TOKEN }), res);
    expect(res.statusCode).toBe(400);
  });

  it('exportToken faltante → 400', async () => {
    const res = makeRes();
    await handler(makeReq({ plan: 'single_pdf', email: 'a@x.com' }), res);
    expect(res.statusCode).toBe(400);
    expect(h.createCheckoutForProvider).not.toHaveBeenCalled();
  });

  it('token ya pagado → 400', async () => {
    h.maybeSingle.mockResolvedValue({ data: { token: TOKEN, paid: true, user_id: null }, error: null });
    const res = makeRes();
    await handler(makeReq({ plan: 'single_pdf', email: 'a@x.com', exportToken: TOKEN }), res);
    expect(res.statusCode).toBe(400);
  });

  it('token inexistente → 400', async () => {
    h.maybeSingle.mockResolvedValue({ data: null, error: null });
    const res = makeRes();
    await handler(makeReq({ plan: 'single_pdf', email: 'a@x.com', exportToken: TOKEN }), res);
    expect(res.statusCode).toBe(400);
  });

  it('fallo en la pasarela → 500 genérico SIN filtrar err.message', async () => {
    h.createCheckoutForProvider.mockRejectedValue(new Error('detalle interno de PayPal SDK: access_token expirado'));

    const res = makeRes();
    await handler(makeReq({ plan: 'single_pdf', email: 'a@x.com', exportToken: TOKEN }), res);

    expect(res.statusCode).toBe(500);
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain('access_token');
    expect(serialized).not.toContain('detalle interno');
  });
});
