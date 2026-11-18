import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyPayment } from '../../api/_lib/applyPayment.js';

vi.mock('../../api/_lib/supabaseAdmin.js', () => ({ supabaseAdmin: {} }));

vi.mock('../../api/_lib/rateLimiter.js', () => ({
  requireRateLimit: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../api/_lib/applyPayment.js', () => ({
  applyPayment: vi.fn().mockResolvedValue({ type: 'payment_applied' }),
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

function makeReq(body: any, query: Record<string, string> = {}) {
  return {
    method: 'POST',
    query,
    body,
    headers: { 'x-forwarded-for': '1.2.3.4' },
    socket: { remoteAddress: '1.2.3.4' },
  } as any;
}

const CAPTURE_RESPONSE = {
  status: 'COMPLETED',
  payer: { email_address: 'comprador@paypal.com' },
  purchase_units: [
    {
      custom_id: `credits_pack_10|${TOKEN}|`,
      payments: {
        captures: [
          {
            id: 'CAPTURE-123',
            amount: { currency_code: 'USD', value: '25.00' },
          },
        ],
      },
    },
  ],
};

describe('paypal-order action=capture — acreditación inmediata idempotente', () => {
  beforeEach(() => {
    process.env.PAYPAL_ENV = 'sandbox';
    process.env.PAYPAL_CLIENT_ID = 'cid';
    process.env.PAYPAL_CLIENT_SECRET = 'secret';
    vi.clearAllMocks();
  });

  it('tras capturar COMPLETED llama a applyPayment con el capture.id (misma clave que el webhook)', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'AT' }) }) // oauth
      .mockResolvedValueOnce({ ok: true, json: async () => CAPTURE_RESPONSE }); // capture
    vi.stubGlobal('fetch', fetchMock);

    const res = makeRes();
    await handler(makeReq({ action: 'capture', orderId: 'ORDER-1' }), res);

    expect(res.body?.success).toBe(true);
    expect(applyPayment).toHaveBeenCalledTimes(1);
    const payment = vi.mocked(applyPayment).mock.calls[0][1];
    expect(payment).toMatchObject({
      exportToken: TOKEN,
      email: 'comprador@paypal.com',
      plan: 'credits_pack_10',
      metodoPago: 'paypal',
      externalId: 'CAPTURE-123',
      providerStatus: 'approved',
    });
    expect(payment.amount).toBe(25);
    vi.unstubAllGlobals();
  });

  it('si applyPayment falla, la captura sigue respondiendo 200 (el webhook es la red de seguridad)', async () => {
    vi.mocked(applyPayment).mockRejectedValueOnce(new Error('DB down'));
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'AT' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => CAPTURE_RESPONSE });
    vi.stubGlobal('fetch', fetchMock);

    const res = makeRes();
    await handler(makeReq({ action: 'capture', orderId: 'ORDER-1' }), res);

    expect(res.statusCode).toBe(200);
    expect(res.body?.success).toBe(true);
    expect(res.body?.status).toBe('COMPLETED');
    vi.unstubAllGlobals();
  });

  it('captura ya existente (ORDER_ALREADY_CAPTURED) devuelve el estado de la orden sin re-acreditar', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'AT' }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ message: 'gateway', details: [{ issue: 'ORDER_ALREADY_CAPTURED' }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'COMPLETED', id: 'ORDER-1' }) }); // GET orden
    vi.stubGlobal('fetch', fetchMock);

    const res = makeRes();
    await handler(makeReq({ action: 'capture', orderId: 'ORDER-1' }), res);

    expect(res.body?.success).toBe(true);
    expect(res.body?.alreadyCaptured).toBe(true);
    expect(applyPayment).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('captura PENDING/DECLINED no acredita nada (providerStatus pending o ignora)', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'AT' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'DECLINED' }) });
    vi.stubGlobal('fetch', fetchMock);

    const res = makeRes();
    await handler(makeReq({ action: 'capture', orderId: 'ORDER-1' }), res);

    expect(res.body?.success).toBe(true);
    expect(applyPayment).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
