import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyPayment, PaymentDetails } from '../api/_lib/applyPayment.js';
import { serverDal } from '../api/_lib/serverDal.js';

vi.mock('../api/_lib/serverDal.js', () => {
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

describe('applyPayment Unit Tests', () => {
  const fakeAdminClient: any = {};

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe lanzar un error si no se provee userId ni email', async () => {
    const payment: PaymentDetails = {
      plan: 'credits_pack_5',
      metodoPago: 'mercadopago',
    };

    await expect(applyPayment(fakeAdminClient, payment)).rejects.toThrow(
      'applyPayment requiere userId o email'
    );
  });

  it('debe acreditar créditos correctamente para un pack de créditos', async () => {
    vi.mocked(serverDal.processedPayments.record).mockResolvedValueOnce(undefined as any);
    vi.mocked(serverDal.pdfExportCredits.grantCredits).mockResolvedValueOnce({ credits: 10 } as any);
    vi.mocked(serverDal.adminNotifications.create).mockResolvedValueOnce(undefined as any);

    const payment: PaymentDetails = {
      userId: 'usr_123',
      plan: 'credits_pack_10',
      metodoPago: 'mercadopago',
      externalId: 'mp_tx_100',
      amount: 14.0,
      currency: 'USD',
    };

    const res = await applyPayment(fakeAdminClient, payment);
    expect(res).toEqual({ type: 'credits', credits: 10 });
    expect(serverDal.processedPayments.record).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'mercadopago',
        external_id: 'mp_tx_100',
        user_id: 'usr_123',
        amount: 14.0,
        currency: 'USD',
      })
    );
    expect(serverDal.pdfExportCredits.grantCredits).toHaveBeenCalledWith('usr_123', 10);
  });

  it('debe activar plan Enterprise y crear la organización para el usuario', async () => {
    vi.mocked(serverDal.processedPayments.record).mockResolvedValueOnce(undefined as any);
    vi.mocked(serverDal.profiles.updateSubscription).mockResolvedValueOnce({ id: 'usr_enterprise_1' } as any);
    vi.mocked(serverDal.organizations.getByOwnerId).mockResolvedValueOnce(null);
    vi.mocked(serverDal.organizations.create).mockResolvedValueOnce({ id: 'org_1' } as any);
    vi.mocked(serverDal.adminNotifications.create).mockResolvedValueOnce(undefined as any);

    const payment: PaymentDetails = {
      userId: 'usr_enterprise_1',
      email: 'corp@company.com',
      plan: 'enterprise',
      metodoPago: 'paypal',
      externalId: 'paypal_tx_ent',
      amount: 29.0,
      currency: 'USD',
    };

    const res = await applyPayment(fakeAdminClient, payment);
    expect(res.type).toBe('subscription');
    expect(res.plan).toBe('enterprise');
    expect(serverDal.organizations.create).toHaveBeenCalledWith(
      expect.objectContaining({ owner_id: 'usr_enterprise_1' })
    );
  });

  it('debe manejar idempotencia omitiendo el pago si external_id ya existe', async () => {
    const error: any = new Error('duplicate key value violates unique constraint "unq_provider_external_id"');
    error.code = '23505';
    vi.mocked(serverDal.processedPayments.record).mockRejectedValueOnce(error);

    const payment: PaymentDetails = {
      userId: 'usr_123',
      plan: 'pro',
      metodoPago: 'lemonsqueezy',
      externalId: 'ls_dup_123',
    };

    const res = await applyPayment(fakeAdminClient, payment);
    expect(res).toEqual({ type: 'already_processed', message: 'Payment already recorded' });
    expect(serverDal.pdfExportCredits.grantCredits).not.toHaveBeenCalled();
    expect(serverDal.profiles.updateSubscription).not.toHaveBeenCalled();
  });

  it('debe buscar el perfil por email si userId no viene (fallback Lemon Squeezy)', async () => {
    vi.mocked(serverDal.profiles.getByEmail).mockResolvedValueOnce({ id: 'usr_resolved_from_email' } as any);
    vi.mocked(serverDal.processedPayments.record).mockResolvedValueOnce(undefined as any);
    vi.mocked(serverDal.pdfExportCredits.grantCredits).mockResolvedValueOnce({ credits: 5 } as any);
    vi.mocked(serverDal.adminNotifications.create).mockResolvedValueOnce(undefined as any);

    const payment: PaymentDetails = {
      email: 'user_without_id@test.com',
      plan: 'credits_pack_5',
      metodoPago: 'lemonsqueezy',
      externalId: 'ls_email_only',
    };

    const res = await applyPayment(fakeAdminClient, payment);
    expect(serverDal.profiles.getByEmail).toHaveBeenCalledWith('user_without_id@test.com');
    expect(serverDal.pdfExportCredits.grantCredits).toHaveBeenCalledWith('usr_resolved_from_email', 5);
    expect(res).toEqual({ type: 'credits', credits: 5 });
  });
});
