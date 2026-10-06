import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyPayment, PaymentDetails } from '../api/_lib/applyPayment.js';
import { serverDal } from '../api/_lib/serverDal.js';

vi.mock('../api/_lib/serverDal.js', () => {
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

describe('applyPayment Unit Tests', () => {
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

  it('debe lanzar un error si no se provee exportToken', async () => {
    const payment: PaymentDetails = {
      plan: 'credits_pack_5',
      metodoPago: 'mercadopago',
    };

    await expect(applyPayment(fakeAdminClient, payment)).rejects.toThrow(
      'applyPayment requiere exportToken, userId, o email para habilitar el servicio'
    );
  });

  it('debe acreditar créditos correctamente para un token (Guest Checkout)', async () => {
    vi.mocked(serverDal.processedPayments.record).mockResolvedValueOnce(undefined as any);
    vi.mocked(serverDal.profiles.getByEmail).mockResolvedValueOnce({ id: 'user_123' } as any);
    
    const eqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
    fakeAdminClient.from.mockReturnValue({ update: updateMock } as any);
    
    vi.mocked(serverDal.adminNotifications.create).mockResolvedValueOnce(undefined as any);

    const payment: PaymentDetails = {
      exportToken: 'tok_123',
      email: 'user@test.com',
      plan: 'credits_pack_1',
      metodoPago: 'mercadopago',
      externalId: 'mp_tx_100',
      amount: 14.0,
      currency: 'USD',
    };

    const res = await applyPayment(fakeAdminClient, payment);
    expect(res).toEqual({ type: 'payment_applied', plan: 'credits_pack_1', exportToken: 'tok_123' });
    expect(serverDal.processedPayments.record).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'mercadopago',
        external_id: 'mp_tx_100',
        user_email: 'user@test.com',
        amount: 14.0,
        currency: 'USD',
      })
    );
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ paid: true })
    );
    expect(eqMock).toHaveBeenCalledWith('token', 'tok_123');
  });


  it('debe manejar idempotencia omitiendo el pago si external_id ya existe', async () => {
    const error: any = new Error('duplicate key value violates unique constraint "unq_provider_external_id"');
    error.code = '23505';
    vi.mocked(serverDal.processedPayments.record).mockRejectedValueOnce(error);

    const payment: PaymentDetails = {
      exportToken: 'tok_dup',
      email: 'dup@test.com',
      plan: 'credits_pack_1',
      metodoPago: 'lemonsqueezy',
      externalId: 'ls_dup_123',
    };

    const res = await applyPayment(fakeAdminClient, payment);
    expect(res).toEqual({ type: 'already_processed', message: 'Payment already recorded' });
    expect(fakeAdminClient.from).not.toHaveBeenCalled();
  });
});
