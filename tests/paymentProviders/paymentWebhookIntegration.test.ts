import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyPayment } from '../../api/_lib/applyPayment.js';
import { serverDal } from '../../api/_lib/serverDal.js';

vi.mock('../../api/_lib/serverDal.js', () => {
  return {
    serverDal: {
      profiles: {
        getByEmail: vi.fn(),
        updateSubscription: vi.fn(),
      },
      processedPayments: {
        record: vi.fn(),
      },
      pdfExportCredits: {
        grantCredits: vi.fn(),
      },
      adminNotifications: {
        create: vi.fn(),
      },
      organizations: {
        getByOwnerId: vi.fn(),
        create: vi.fn(),
      },
    },
  };
});

describe('Payment Webhook Integration & Gateway Handlers', () => {
  const fakeAdminClient: any = {};

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Mercado Pago Webhook Flow', () => {
    it('debe procesar un evento de pago aprobado de Mercado Pago y otorgar créditos', async () => {
      vi.mocked(serverDal.processedPayments.record).mockResolvedValueOnce(undefined as any);
      vi.mocked(serverDal.pdfExportCredits.grantCredits).mockResolvedValueOnce({ credits: 5 } as any);
      vi.mocked(serverDal.adminNotifications.create).mockResolvedValueOnce(undefined as any);

      const mpWebhookPayload = {
        userId: 'usr_mp_1',
        plan: 'credits_pack_5',
        metodoPago: 'mercadopago' as const,
        externalId: 'mp_payment_998877',
        amount: 5.0,
        currency: 'USD',
      };

      const result = await applyPayment(fakeAdminClient, mpWebhookPayload);

      expect(result).toEqual({ type: 'credits', credits: 5 });
      expect(serverDal.processedPayments.record).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'mercadopago',
          external_id: 'mp_payment_998877',
          user_id: 'usr_mp_1',
          amount: 5.0,
        })
      );
    });
  });

  describe('PayPal Webhook Flow', () => {
    it('debe procesar la captura de una orden de PayPal y activar la suscripción Pro', async () => {
      vi.mocked(serverDal.processedPayments.record).mockResolvedValueOnce(undefined as any);
      vi.mocked(serverDal.profiles.updateSubscription).mockResolvedValueOnce({ id: 'usr_paypal_1', plan: 'pro' } as any);
      vi.mocked(serverDal.adminNotifications.create).mockResolvedValueOnce(undefined as any);

      const paypalPayload = {
        userId: 'usr_paypal_1',
        plan: 'pro',
        metodoPago: 'paypal' as const,
        externalId: 'PAYPAL_ORDER_883311',
        amount: 9.0,
        currency: 'USD',
      };

      const result = await applyPayment(fakeAdminClient, paypalPayload);

      expect(result).toEqual(expect.objectContaining({ type: 'subscription', plan: 'pro' }));
      expect(serverDal.profiles.updateSubscription).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'usr_paypal_1' }),
        expect.objectContaining({ plan: 'pro', metodo_pago: 'paypal' })
      );
    });
  });

  describe('Lemon Squeezy Webhook Flow', () => {
    it('debe descartar un webhook duplicado de Lemon Squeezy sin re-acreditar créditos', async () => {
      const duplicateErr: any = new Error('duplicate key');
      duplicateErr.code = '23505';
      vi.mocked(serverDal.processedPayments.record).mockRejectedValueOnce(duplicateErr);

      const lsDuplicatePayload = {
        userId: 'usr_ls_dup',
        plan: 'credits_pack_10',
        metodoPago: 'lemonsqueezy' as const,
        externalId: 'LS_ORDER_DUP_123',
      };

      const result = await applyPayment(fakeAdminClient, lsDuplicatePayload);

      expect(result).toEqual({ type: 'already_processed', message: 'Payment already recorded' });
      expect(serverDal.pdfExportCredits.grantCredits).not.toHaveBeenCalled();
    });
  });
});
