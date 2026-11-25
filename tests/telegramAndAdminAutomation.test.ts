import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const h = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  profilesGetById: vi.fn(),
  profilesGetByEmail: vi.fn(),
  profilesUpdateSubscription: vi.fn(),
  pendingGetUnresolved: vi.fn(),
  pendingMarkResolved: vi.fn(),
  adminAuditLog: vi.fn(),
  applyPayment: vi.fn(),
}));

vi.mock('../api/_lib/supabaseAdmin.js', () => ({
  supabaseAdmin: {
    rpc: h.rpc,
    from: h.from,
    auth: { getUser: vi.fn() },
  },
}));

vi.mock('../api/_lib/authMiddleware.js', () => ({
  requireAdmin: vi.fn().mockResolvedValue({ user: { id: '11111111-1111-4111-8111-111111111111' } }),
}));

vi.mock('../api/_lib/rateLimiter.js', () => ({
  requireRateLimit: vi.fn().mockResolvedValue(true),
}));

vi.mock('../api/_lib/sentryBackend.js', () => ({
  captureBackendException: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../api/_lib/paymentProviders/registry.js', () => ({
  diagnoseAllProviders: vi.fn().mockResolvedValue({
    mercadopago: { status: 'active', label: 'MP OK' },
    paypal: { status: 'active', label: 'PP OK' },
  }),
}));

vi.mock('../api/_lib/applyPayment.js', () => ({
  applyPayment: h.applyPayment,
}));

vi.mock('../api/_lib/serverDal.js', () => ({
  serverDal: {
    profiles: {
      getById: h.profilesGetById,
      getByEmail: h.profilesGetByEmail,
      updateSubscription: h.profilesUpdateSubscription,
    },
    pendingGrants: {
      getUnresolvedById: h.pendingGetUnresolved,
      markResolved: h.pendingMarkResolved,
    },
    adminAuditLogs: { log: h.adminAuditLog },
    adminNotifications: { create: vi.fn().mockResolvedValue(undefined) },
    unclaimedCredits: { listPending: vi.fn(), getById: vi.fn(), markReminded: vi.fn() },
  },
}));

import {
  isTelegramConfigured,
  getTelegramStatus,
  sendTelegramAdminAlert,
} from '../api/_lib/telegramAlert.js';
import { ADMIN_WHATSAPP, buildWaLink, dispatchWaAlert } from '../api/_lib/whatsappAlert.js';
import {
  sendPassActivatedEmail,
  sendTeamInviteEmail,
  sendCalmExpiryNoticeEmail,
} from '../api/_lib/emails/lifecycleEmails.js';
import { sendPurchaseReceipt } from '../api/_lib/emails/sendPurchaseReceipt.js';
import { sendUnclaimedCreditsReminder } from '../api/_lib/emails/sendUnclaimedCreditsReminder.js';
import adminHandler from '../api/admin-api.js';

function makeRes() {
  const res: any = {
    statusCode: 0,
    body: null as any,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: any) {
      res.body = payload;
      return res;
    },
  };
  return res;
}

describe('Etapa 6: Telegram real, emails leecv.app y Admin automatizado', () => {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_ADMIN_CHAT_ID;
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    globalThis.fetch = originalFetch;
  });

  it('telegramAlert reporta missing_vars y no llama fetch si faltan credenciales', async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as any;

    expect(isTelegramConfigured()).toBe(false);
    expect(getTelegramStatus().status).toBe('missing_vars');

    const res = await sendTelegramAdminAlert('Pago de prueba', { plan: 'pass_editorlee' });
    expect(res).toEqual({ sent: false, reason: 'missing_env' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('telegramAlert envia POST real a api.telegram.org y dispatchWaAlert delega sin llamar wa.me', async () => {
    process.env.TELEGRAM_BOT_TOKEN = '123456:TEST_TOKEN';
    process.env.TELEGRAM_ADMIN_CHAT_ID = '-100987654';
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    globalThis.fetch = fetchSpy as any;

    expect(ADMIN_WHATSAPP).toBe('+5493878342772');
    expect(buildWaLink('hola')).toContain('https://wa.me/');

    dispatchWaAlert('Nuevo pago recibido', { order: 'ord_1' });
    await new Promise((r) => setTimeout(r, 15));

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [calledUrl, init] = fetchSpy.mock.calls[0];
    expect(String(calledUrl)).toBe('https://api.telegram.org/bot123456:TEST_TOKEN/sendMessage');
    expect(init.method).toBe('POST');
    expect(String(init.body)).toContain('-100987654');
    expect(String(init.body)).toContain('Nuevo pago recibido');
  });

  it('todos los emails usan dominio leecv.app y remitente hola@leecv.app por defecto', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'email_1' }),
    });
    globalThis.fetch = fetchSpy as any;
    process.env.RESEND_API_KEY = 're_test_123';

    await sendPurchaseReceipt('user@example.com', 'Pase EditorLee', 'USD 5', 'ord_99');
    await sendUnclaimedCreditsReminder('guest@example.com', 5);
    await sendPassActivatedEmail('user@example.com', 'Pase FacturLee');
    await sendTeamInviteEmail('col@example.com', 'owner@example.com', 'Tesis 2026');
    await sendCalmExpiryNoticeEmail('user@example.com', 'Pase Total 30 Días', 5, '2026-12-30T00:00:00Z');

    expect(fetchSpy).toHaveBeenCalledTimes(5);
    for (const call of fetchSpy.mock.calls) {
      const payload = JSON.parse(String(call[1].body));
      expect(payload.from).toBe('LEECV <hola@leecv.app>');
      expect(payload.html).toContain('leecv.app');
      expect(payload.html).not.toContain('leecv.com');
    }
  });

  it('admin-api integrations-status incluye estado real de Telegram y Resend', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'bot_tok';
    process.env.TELEGRAM_ADMIN_CHAT_ID = 'chat_1';
    process.env.RESEND_API_KEY = 're_1';

    const res = makeRes();
    await adminHandler(
      {
        method: 'GET',
        query: { action: 'integrations-status', forcePing: 'true' },
        body: {},
        headers: {},
        socket: {},
      } as any,
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.telegram).toMatchObject({ id: 'telegram', status: 'active' });
    expect(res.body.resend).toMatchObject({ id: 'resend', status: 'active' });
  });

  it('admin-api resolve-pending-grant permite liberar pago invitado sin perfil previo hacia unclaimed_email_credits', async () => {
    const grantId = '22222222-2222-4222-8222-222222222222';
    h.pendingGetUnresolved.mockResolvedValueOnce({
      id: grantId,
      provider: 'mercadopago',
      external_id: 'mp_guest_99',
      email: 'invitado@correo.com',
      plan: 'pass_editorlee',
      amount: 12000,
      currency: 'ARS',
    });
    h.profilesGetByEmail.mockResolvedValueOnce(null);
    h.applyPayment.mockResolvedValueOnce({ type: 'payment_applied', plan: 'pass_editorlee', unclaimed: true });
    h.pendingMarkResolved.mockResolvedValueOnce(true);

    const res = makeRes();
    await adminHandler(
      {
        method: 'POST',
        query: { action: 'resolve-pending-grant' },
        body: {
          grantId,
          targetEmail: 'invitado@correo.com',
          reason: 'Pago invitado verificado en Mercado Pago',
          approveAmountMismatch: false,
        },
        headers: {},
        socket: {},
      } as any,
      res
    );

    expect(res.statusCode).toBe(200);
    expect(h.applyPayment).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        email: 'invitado@correo.com',
        userId: undefined,
        plan: 'pass_editorlee',
      })
    );
    expect(h.pendingMarkResolved).toHaveBeenCalledWith(
      grantId,
      null,
      '11111111-1111-4111-8111-111111111111',
      'Pago invitado verificado en Mercado Pago'
    );
  });

  it('admin-api grant-app-pass y revoke-app-pass ejecutan RPC/update y dejan auditoria', async () => {
    const targetUserId = '33333333-3333-4333-8333-333333333333';
    h.profilesGetById.mockResolvedValueOnce({ id: targetUserId, email: 'cliente@leecv.app' });
    h.rpc.mockResolvedValueOnce({ error: null });

    const grantRes = makeRes();
    await adminHandler(
      {
        method: 'POST',
        query: { action: 'grant-app-pass' },
        body: { userId: targetUserId, passId: 'pass_editorlee', reason: 'Soporte VIP' },
        headers: {},
        socket: {},
      } as any,
      grantRes
    );

    expect(grantRes.statusCode).toBe(200);
    expect(h.rpc).toHaveBeenCalledWith(
      'grant_app_pass',
      expect.objectContaining({ p_user_id: targetUserId, p_pass_id: 'pass_editorlee' })
    );
    expect(h.adminAuditLog).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      'grant_app_pass',
      targetUserId,
      expect.objectContaining({ passId: 'pass_editorlee' })
    );

    const isChain = vi.fn().mockResolvedValueOnce({ error: null });
    const eqPass = vi.fn(() => ({ is: isChain }));
    const eqUser = vi.fn(() => ({ eq: eqPass }));
    const updateFn = vi.fn(() => ({ eq: eqUser }));
    h.from.mockReturnValueOnce({ update: updateFn });

    const revRes = makeRes();
    await adminHandler(
      {
        method: 'POST',
        query: { action: 'revoke-app-pass' },
        body: { userId: targetUserId, passId: 'pass_editorlee', reason: 'Reembolso solicitado' },
        headers: {},
        socket: {},
      } as any,
      revRes
    );

    expect(revRes.statusCode).toBe(200);
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({ revoke_reason: 'Reembolso solicitado' })
    );
  });
});
