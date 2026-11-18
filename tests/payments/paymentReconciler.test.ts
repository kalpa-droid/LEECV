import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests del reconciliador pagos ↔ entitlements (PR-D2).
 *
 * Reglas que se defienden:
 *  - Nunca acredita "en la duda": aprobado + referencia inutilizable ⇒ retención
 *    garantizada + revisión manual, sin tocar applyPayment.
 *  - Rechazado por la pasarela ⇒ failed + retención cerrada + aviso admin.
 *  - applyPayment es idempotente: re-ejecutarlo no duplica créditos.
 *  - Pagos pendientes de más de 7 días ⇒ UNA notificación agregada por corrida.
 *  - El mismo pago en ambas fuentes (pending_grants + processed_payments)
 *    se procesa una sola vez por corrida.
 */

const h = vi.hoisted(() => ({
  listProviderPending: vi.fn(),
  listPending: vi.fn(),
  resolveIfPending: vi.fn(),
  createGrant: vi.fn(),
  updateEntitlementStatus: vi.fn(),
  adminNotificationCreate: vi.fn(),
  applyPayment: vi.fn(),
  captureBackendException: vi.fn(),
}));

vi.mock('../../api/_lib/supabaseAdmin.js', () => ({ supabaseAdmin: {} }));

vi.mock('../../api/_lib/serverDal.js', () => ({
  serverDal: {
    pendingGrants: {
      listProviderPending: h.listProviderPending,
      resolveIfPending: h.resolveIfPending,
      create: h.createGrant,
    },
    processedPayments: {
      listPending: h.listPending,
      updateEntitlementStatus: h.updateEntitlementStatus,
    },
    adminNotifications: { create: h.adminNotificationCreate },
  },
}));

vi.mock('../../api/_lib/applyPayment.js', () => ({
  applyPayment: h.applyPayment,
}));

vi.mock('../../api/_lib/sentryBackend.js', () => ({
  captureBackendException: h.captureBackendException,
}));

import { reconcilePendingPayments } from '../../api/_lib/paymentReconciler.js';
import { formatPlanReference } from '../../api/_lib/paymentProviders/planReference.js';

const RECENT = () => new Date().toISOString();
const DAYS_AGO = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

function grantRow(overrides: any = {}) {
  return {
    id: 'grant-1',
    email: 'comprador@x.com',
    provider: 'mercadopago',
    external_id: '123',
    plan: 'single_pdf',
    amount: 3200,
    currency: 'ARS',
    hold_reason: 'provider_pending',
    export_token: 'TOKEN123',
    created_at: RECENT(),
    ...overrides,
  };
}

function mpPayment(overrides: any = {}) {
  return {
    id: 123,
    status: 'approved',
    external_reference: formatPlanReference('single_pdf', 'TOKEN123'),
    payer: { email: 'comprador@x.com' },
    transaction_amount: 3200,
    currency_id: 'ARS',
    ...overrides,
  };
}

function stubFetchMp(payment: any) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => payment,
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.MP_ACCESS_TOKEN = 'mp-token';
  process.env.PAYPAL_ENV = 'sandbox';
  process.env.PAYPAL_CLIENT_ID = 'cid';
  process.env.PAYPAL_CLIENT_SECRET = 'secret';
  h.listProviderPending.mockResolvedValue([]);
  h.listPending.mockResolvedValue([]);
  h.resolveIfPending.mockResolvedValue(undefined);
  h.createGrant.mockResolvedValue(undefined);
  h.updateEntitlementStatus.mockResolvedValue(undefined);
  h.adminNotificationCreate.mockResolvedValue(undefined);
  h.applyPayment.mockResolvedValue({ type: 'payment_applied' });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('reconcilePendingPayments — Mercado Pago', () => {
  it('aprobado → re-aplica applyPayment (idempotente) y cierra la retención', async () => {
    h.listProviderPending.mockResolvedValue([grantRow()]);
    stubFetchMp(mpPayment());

    const summary = await reconcilePendingPayments();

    expect(summary).toMatchObject({ scanned: 1, applied: 1, rejected: 0, errors: 0 });
    expect(h.applyPayment).toHaveBeenCalledTimes(1);
    const payment = h.applyPayment.mock.calls[0][1];
    expect(payment).toMatchObject({
      plan: 'single_pdf',
      exportToken: 'TOKEN123',
      metodoPago: 'mercadopago',
      externalId: '123',
      providerStatus: 'approved',
    });
    expect(h.resolveIfPending).toHaveBeenCalledWith('mercadopago', '123', 'reconciler_confirmed');
  });

  it('rechazado → marca failed, cierra la retención y notifica; NO acredita', async () => {
    h.listProviderPending.mockResolvedValue([grantRow({ external_id: '999' })]);
    stubFetchMp(mpPayment({ id: 999, status: 'rejected' }));

    const summary = await reconcilePendingPayments();

    expect(summary).toMatchObject({ rejected: 1, applied: 0 });
    expect(h.updateEntitlementStatus).toHaveBeenCalledWith('mercadopago', '999', 'failed');
    expect(h.resolveIfPending).toHaveBeenCalledWith('mercadopago', '999', 'provider_rejected');
    expect(h.adminNotificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'payment_pending_review' })
    );
    expect(h.applyPayment).not.toHaveBeenCalled();
  });

  it('sigue pendiente → no toca nada; con más de 7 días escala con UNA notificación agregada', async () => {
    h.listProviderPending.mockResolvedValue([grantRow({ external_id: '555', created_at: DAYS_AGO(8) })]);
    stubFetchMp(mpPayment({ id: 555, status: 'in_process' }));

    const summary = await reconcilePendingPayments();

    expect(summary).toMatchObject({ stillPending: 1, escalated: 1, applied: 0 });
    expect(h.applyPayment).not.toHaveBeenCalled();
    expect(h.adminNotificationCreate).toHaveBeenCalledTimes(1);
    expect(h.adminNotificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'payment_pending_review', title: expect.stringMatching(/revisión manual/) })
    );
  });

  it('aprobado pero referencia inutilizable → NUNCA acredita; garantiza la retención y escala', async () => {
    h.listProviderPending.mockResolvedValue([grantRow({ external_id: '777' })]);
    stubFetchMp(mpPayment({ id: 777, external_reference: 'referencia-ilegible!!!' }));

    const summary = await reconcilePendingPayments();

    expect(h.applyPayment).not.toHaveBeenCalled();
    expect(h.createGrant).toHaveBeenCalledWith(
      expect.objectContaining({ external_id: '777', hold_reason: 'provider_pending', plan: 'unknown' })
    );
    expect(summary).toMatchObject({ applied: 0, stillPending: 1, escalated: 1 });
  });

  it('error consultando la pasarela → errors=1, captura excepción y no revienta el cron', async () => {
    h.listProviderPending.mockResolvedValue([grantRow({ external_id: '888' })]);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('MP down')));

    const summary = await reconcilePendingPayments();

    expect(summary.errors).toBe(1);
    expect(h.captureBackendException).toHaveBeenCalled();
    expect(h.applyPayment).not.toHaveBeenCalled();
  });
});

describe('reconcilePendingPayments — PayPal', () => {
  function stubFetchPaypal(capture: any) {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'AT' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => capture }));
  }

  it('captura COMPLETED → acredita con la referencia embebida', async () => {
    h.listPending.mockResolvedValue([
      { id: 'p1', provider: 'paypal', external_id: 'CAP-1', plan: 'credits_pack_5', created_at: RECENT() },
    ]);
    stubFetchPaypal({
      status: 'COMPLETED',
      id: 'CAP-1',
      custom_id: formatPlanReference('credits_pack_5', 'TOKENPP'),
      payer: { email_address: 'payer@x.com' },
      amount: { value: '10.00', currency_code: 'USD' },
    });

    const summary = await reconcilePendingPayments();

    expect(summary).toMatchObject({ applied: 1, scanned: 1 });
    const payment = h.applyPayment.mock.calls[0][1];
    expect(payment).toMatchObject({
      plan: 'credits_pack_5',
      exportToken: 'TOKENPP',
      metodoPago: 'paypal',
      externalId: 'CAP-1',
      providerStatus: 'approved',
      amount: 10,
      currency: 'USD',
    });
    expect(h.resolveIfPending).toHaveBeenCalledWith('paypal', 'CAP-1', 'reconciler_confirmed');
  });

  it('captura DENIED → rechazado, sin acreditar', async () => {
    h.listProviderPending.mockResolvedValue([grantRow({ provider: 'paypal', external_id: 'CAP-2' })]);
    stubFetchPaypal({ status: 'DENIED', id: 'CAP-2' });

    const summary = await reconcilePendingPayments();

    expect(summary).toMatchObject({ rejected: 1, applied: 0 });
    expect(h.applyPayment).not.toHaveBeenCalled();
    expect(h.resolveIfPending).toHaveBeenCalledWith('paypal', 'CAP-2', 'provider_rejected');
  });
});

describe('reconcilePendingPayments — reglas transversales', () => {
  it('el mismo pago en ambas fuentes se procesa UNA sola vez', async () => {
    const row = { id: 'x', provider: 'mercadopago', external_id: '321', plan: 'single_pdf', created_at: RECENT() };
    h.listProviderPending.mockResolvedValue([{ ...row, hold_reason: 'provider_pending' }]);
    h.listPending.mockResolvedValue([row]);
    stubFetchMp(mpPayment({ id: 321 }));

    const summary = await reconcilePendingPayments();

    expect(summary.scanned).toBe(1);
    expect(h.applyPayment).toHaveBeenCalledTimes(1);
  });

  it('filas con external_id vacío se ignoran', async () => {
    h.listProviderPending.mockResolvedValue([grantRow({ external_id: '' })]);
    h.listPending.mockResolvedValue([
      { id: 'y', provider: 'mercadopago', external_id: null, created_at: RECENT() },
    ]);

    const summary = await reconcilePendingPayments();

    expect(summary.scanned).toBe(0);
    expect(h.applyPayment).not.toHaveBeenCalled();
  });

  it('sin escalados no emite la notificación agregada', async () => {
    h.listProviderPending.mockResolvedValue([grantRow()]);
    stubFetchMp(mpPayment());

    await reconcilePendingPayments();

    const aggregateCalls = h.adminNotificationCreate.mock.calls.filter(
      (args) => String(args[0]?.title || '').includes('revisión manual')
    );
    expect(aggregateCalls).toHaveLength(0);
  });
});
