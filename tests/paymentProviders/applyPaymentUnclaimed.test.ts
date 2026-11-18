import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyPayment } from '../../api/_lib/applyPayment.js';
import { serverDal } from '../../api/_lib/serverDal.js';

vi.mock('../../api/_lib/serverDal.js', () => ({
  serverDal: {
    processedPayments: {
      record: vi.fn().mockResolvedValue(undefined),
      getByProviderAndExternalId: vi.fn().mockResolvedValue(null),
      updateEntitlementStatus: vi.fn().mockResolvedValue(undefined),
    },
    adminNotifications: { create: vi.fn().mockResolvedValue(undefined) },
    profiles: { getByEmail: vi.fn().mockResolvedValue(null) },
    pendingGrants: { create: vi.fn().mockResolvedValue(undefined) },
  },
}));

vi.mock('../../api/_lib/emails/sendPurchaseReceipt.js', () => ({
  sendPurchaseReceipt: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../api/_lib/whatsappAlert.js', () => ({
  dispatchWaAlert: vi.fn(),
}));

import { sendPurchaseReceipt } from '../../api/_lib/emails/sendPurchaseReceipt.js';
import { dispatchWaAlert } from '../../api/_lib/whatsappAlert.js';

let insertedRows: any[] = [];
let insertError: any = null;

const fakeAdminClient: any = {
  from: vi.fn((table: string) => {
    if (table === 'unclaimed_email_credits') {
      return {
        insert: vi.fn((row: any) => {
          insertedRows.push(row);
          return Promise.resolve({ error: insertError });
        }),
      };
    }
    throw new Error(`Tabla inesperada en este test: ${table}`);
  }),
};

const basePayment = {
  exportToken: null,
  email: 'invitado@test.com',
  userId: null,
  plan: 'credits_pack_10',
  metodoPago: 'mercadopago' as const,
  externalId: 'MP-998877',
  amount: 21000,
  currency: 'ARS',
};

describe('applyPayment — pago de pack sin cuenta (unclaimed_email_credits)', () => {
  beforeEach(() => {
    insertedRows = [];
    insertError = null;
    vi.clearAllMocks();
    vi.mocked(serverDal.profiles.getByEmail).mockResolvedValue(null);
  });

  it('guarda los créditos y CIERRA el pago como completed (no pending)', async () => {
    const result = await applyPayment(fakeAdminClient, { ...basePayment });

    expect(insertedRows).toHaveLength(1);
    expect(insertedRows[0]).toMatchObject({
      email: 'invitado@test.com',
      credits: 10,
      provider: 'mercadopago',
      plan: 'credits_pack_10',
    });
    expect(serverDal.processedPayments.updateEntitlementStatus).toHaveBeenCalledWith(
      'mercadopago',
      'MP-998877',
      'completed',
      { unclaimed: true }
    );
    expect(result).toMatchObject({ type: 'payment_applied', unclaimed: true });
  });

  it('envía el recibo con la nota de reclamo automático al entrar con el mismo email', async () => {
    await applyPayment(fakeAdminClient, { ...basePayment });

    expect(sendPurchaseReceipt).toHaveBeenCalledTimes(1);
    const [toEmail, label, amountPaid, orderId, extraNote] = vi.mocked(sendPurchaseReceipt).mock.calls[0];
    expect(toEmail).toBe('invitado@test.com');
    expect(label).toBe('Pack de 10 Exportaciones');
    expect(amountPaid).toContain('21000');
    expect(orderId).toBe('MP-998877');
    expect(String(extraNote)).toContain('mismo email');
  });

  it('avisa al admin y registra la notificación (una vez, no en reintentos)', async () => {
    await applyPayment(fakeAdminClient, { ...basePayment });

    expect(dispatchWaAlert).toHaveBeenCalledTimes(1);
    expect(serverDal.adminNotifications.create).toHaveBeenCalledTimes(1);
    expect(
      vi.mocked(serverDal.adminNotifications.create).mock.calls[0][0]
    ).toMatchObject({ type: 'payment_pending_review', metadata: { unclaimed: true } });
  });

  it('plan pro sin perfil: guarda 0 créditos (nunca "unlimited" en columna integer)', async () => {
    await applyPayment(fakeAdminClient, { ...basePayment, plan: 'pro', amount: 27000 });

    expect(insertedRows[0].credits).toBe(0);
    expect(typeof insertedRows[0].credits).toBe('number');
  });

  it('un insert duplicado (23505) es idempotente y no rompe el flujo', async () => {
    insertError = { code: '23505', message: 'duplicate key value violates unique constraint' };
    const result = await applyPayment(fakeAdminClient, { ...basePayment });

    expect(result).toMatchObject({ type: 'payment_applied', unclaimed: true });
    expect(serverDal.processedPayments.updateEntitlementStatus).toHaveBeenCalled();
  });

  it('un insert fallido por otra causa PROPAGA el error (no responde 200 OK en silencio)', async () => {
    insertError = { code: '42501', message: 'new row violates row-level security policy' };
    await expect(applyPayment(fakeAdminClient, { ...basePayment })).rejects.toThrow(/unclaimed_email_credits/);
    expect(serverDal.processedPayments.updateEntitlementStatus).not.toHaveBeenCalled();
  });
});
