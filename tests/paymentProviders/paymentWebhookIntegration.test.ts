import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyPayment } from '../../api/_lib/applyPayment.js';
import { serverDal } from '../../api/_lib/serverDal.js';

vi.mock('../../api/_lib/serverDal.js', () => {
  return {
    serverDal: {
      processedPayments: {
        record: vi.fn(),
      },
      adminNotifications: {
        create: vi.fn(),
      },
      profiles: {
        getByEmail: vi.fn(),
      },
    },
  };
});

describe('Payment Webhook Integration & Gateway Handlers', () => {
  const fakeAdminClient: any = {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({ error: null }))
      }))
    })),
    rpc: vi.fn().mockResolvedValue({ error: null })
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Mercado Pago Webhook Flow', () => {
    it('debe procesar un evento de pago aprobado de Mercado Pago y otorgar créditos', async () => {
      vi.mocked(serverDal.processedPayments.record).mockResolvedValueOnce(undefined as any);
      vi.mocked(serverDal.profiles.getByEmail).mockResolvedValueOnce({ id: 'mp_user_123' } as any);
      
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      fakeAdminClient.from.mockReturnValue({ update: updateMock } as any);
      
      vi.mocked(serverDal.adminNotifications.create).mockResolvedValueOnce(undefined as any);

      const mpWebhookPayload = {
        exportToken: 'tok_mp_1',
        email: 'mp_user@test.com',
        plan: 'credits_pack_5',
        metodoPago: 'mercadopago' as const,
        externalId: 'mp_payment_998877',
        amount: 5.0,
        currency: 'USD',
      };

      const result = await applyPayment(fakeAdminClient, mpWebhookPayload);

      expect(result).toEqual({ type: 'payment_applied', plan: 'credits_pack_5', exportToken: 'tok_mp_1' });
      expect(serverDal.processedPayments.record).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'mercadopago',
          external_id: 'mp_payment_998877',
          user_email: 'mp_user@test.com',
          amount: 5.0,
        })
      );
    });
  });



  describe('Lemon Squeezy Webhook Flow', () => {
    it('debe descartar un webhook duplicado de Lemon Squeezy sin re-acreditar créditos', async () => {
      const duplicateErr: any = new Error('duplicate key');
      duplicateErr.code = '23505';
      vi.mocked(serverDal.processedPayments.record).mockRejectedValueOnce(duplicateErr);

      const lsDuplicatePayload = {
        exportToken: 'tok_ls_dup',
        email: 'ls_dup@test.com',
        plan: 'credits_pack_10',
        metodoPago: 'lemonsqueezy' as const,
        externalId: 'LS_ORDER_DUP_123',
      };

      const result = await applyPayment(fakeAdminClient, lsDuplicatePayload);

      expect(result).toEqual({ type: 'already_processed', message: 'Payment already recorded' });
      expect(fakeAdminClient.from).not.toHaveBeenCalled();
    });
  });
});
