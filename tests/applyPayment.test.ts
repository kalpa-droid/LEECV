import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyPayment, PaymentDetails } from '../api/_lib/applyPayment.js';
import { serverDal } from '../api/_lib/serverDal.js';

vi.mock('../api/_lib/serverDal.js', () => {
  return {
    serverDal: {
      processedPayments: {
        record: vi.fn(),
        getByProviderAndExternalId: vi.fn(),
        updateEntitlementStatus: vi.fn(),
      },
      adminNotifications: {
        create: vi.fn(),
      },
      profiles: {
        getByEmail: vi.fn(),
        updateSubscription: vi.fn(),
      },
      pendingGrants: {
        create: vi.fn(),
      },
    },
  };
});

describe('applyPayment Unit Tests', () => {
  const fakeAdminClient: any = {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({ error: null }))
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { plan_vence: null } })
        }))
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
        entitlement_status: 'pending',
      })
    );
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ paid: true })
    );
    expect(eqMock).toHaveBeenCalledWith('token', 'tok_123');
    expect(serverDal.processedPayments.updateEntitlementStatus).toHaveBeenCalledWith('mercadopago', 'mp_tx_100', 'completed');
  });

  it('debe manejar idempotencia omitiendo el pago si external_id ya existe con derecho completado', async () => {
    const error: any = new Error('duplicate key value violates unique constraint "unq_provider_external_id"');
    error.code = '23505';
    vi.mocked(serverDal.processedPayments.record).mockRejectedValueOnce(error);
    vi.mocked(serverDal.processedPayments.getByProviderAndExternalId).mockResolvedValueOnce({
      id: 'pay_123',
      plan: 'credits_pack_1',
      entitlement_status: 'completed',
    });

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
    expect(serverDal.processedPayments.updateEntitlementStatus).not.toHaveBeenCalled();
  });

  it('debe recuperar el otorgamiento si el registro previo falló parcialmente (entitlement pendiente)', async () => {
    // 1. Simular reintento de webhook donde processedPayments da 23505 pero con entitlement_status 'pending'
    const error: any = new Error('duplicate key value violates unique constraint "unq_provider_external_id"');
    error.code = '23505';
    vi.mocked(serverDal.processedPayments.record).mockRejectedValueOnce(error);
    vi.mocked(serverDal.processedPayments.getByProviderAndExternalId).mockResolvedValueOnce({
      id: 'pay_retry',
      plan: 'credits_pack_5',
      entitlement_status: 'pending',
    });
    vi.mocked(serverDal.profiles.getByEmail).mockResolvedValue({ id: 'user_retry' } as any);
    vi.mocked(serverDal.adminNotifications.create).mockResolvedValueOnce(undefined as any);

    const payment: PaymentDetails = {
      userId: 'user_retry',
      email: 'retry@test.com',
      plan: 'credits_pack_5',
      metodoPago: 'mercadopago',
      externalId: 'mp_retry_999',
    };

    const res = await applyPayment(fakeAdminClient, payment);

    // Debe proceder a otorgar los tokens via RPC a pesar de ser duplicado
    expect(res).toEqual({ type: 'payment_applied', plan: 'credits_pack_5', exportToken: undefined });
    expect(fakeAdminClient.rpc).toHaveBeenCalledWith('grant_export_tokens', expect.objectContaining({
      p_payment_id: 'mp_retry_999',
      p_user_id: 'user_retry',
      p_amount: 5,
      p_email: 'retry@test.com'
    }));
    // Y finalmente debe marcar como completado
    expect(serverDal.processedPayments.updateEntitlementStatus).toHaveBeenCalledWith('mercadopago', 'mp_retry_999', 'completed');
  });

  it('debe retener para revisión si el monto/moneda no coincide con el catálogo', async () => {
    vi.mocked(serverDal.adminNotifications.create).mockResolvedValueOnce(undefined as any);
    vi.mocked(serverDal.pendingGrants.create).mockResolvedValueOnce(undefined as any);

    const payment: PaymentDetails = {
      email: 'mismatch@test.com',
      userId: 'user_mismatch',
      plan: 'credits_pack_5',
      metodoPago: 'paypal',
      externalId: 'pp_mismatch_123',
      amount: 1.0, // Cobrado 1 USD, cuando el plan vale más
      currency: 'USD',
    };

    const res = await applyPayment(fakeAdminClient, payment);
    expect(res).toEqual({ type: 'held_for_review', message: 'Payment held due to mismatch' });
    // NO debe haberse registrado como pago aprobado en processedPayments
    expect(serverDal.processedPayments.record).not.toHaveBeenCalled();
    expect(serverDal.pendingGrants.create).toHaveBeenCalled();
  });

  it('debe otorgar suscripción Pro de forma atómica e idempotente vía grant_pro_subscription', async () => {
    vi.mocked(serverDal.processedPayments.record).mockResolvedValueOnce(undefined as any);
    vi.mocked(serverDal.profiles.getByEmail).mockResolvedValueOnce({ id: 'user_pro_1' } as any);
    vi.mocked(serverDal.adminNotifications.create).mockResolvedValueOnce(undefined as any);

    const payment: PaymentDetails = {
      userId: 'user_pro_1',
      email: 'pro@test.com',
      plan: 'pro',
      metodoPago: 'mercadopago',
      externalId: 'mp_pro_123',
      amount: 27000,
      currency: 'ARS',
    };

    const res = await applyPayment(fakeAdminClient, payment);
    expect(res).toEqual({ type: 'payment_applied', plan: 'pro', exportToken: undefined });
    expect(fakeAdminClient.rpc).toHaveBeenCalledWith('grant_pro_subscription', {
      p_payment_id: 'mp_pro_123',
      p_user_id: 'user_pro_1',
      p_days: 30
    });
    expect(serverDal.processedPayments.updateEntitlementStatus).toHaveBeenCalledWith('mercadopago', 'mp_pro_123', 'completed');
  });

  it('debe recuperar suscripción Pro en reintento de webhook con entitlement pendiente', async () => {
    const error: any = new Error('duplicate key value violates unique constraint "unq_provider_external_id"');
    error.code = '23505';
    vi.mocked(serverDal.processedPayments.record).mockRejectedValueOnce(error);
    vi.mocked(serverDal.processedPayments.getByProviderAndExternalId).mockResolvedValueOnce({
      id: 'pay_pro_retry',
      plan: 'pro',
      entitlement_status: 'pending',
    });
    vi.mocked(serverDal.profiles.getByEmail).mockResolvedValue({ id: 'user_pro_retry' } as any);
    vi.mocked(serverDal.adminNotifications.create).mockResolvedValueOnce(undefined as any);

    const payment: PaymentDetails = {
      userId: 'user_pro_retry',
      email: 'pro_retry@test.com',
      plan: 'pro',
      metodoPago: 'mercadopago',
      externalId: 'mp_pro_retry_456',
    };

    const res = await applyPayment(fakeAdminClient, payment);
    expect(res).toEqual({ type: 'payment_applied', plan: 'pro', exportToken: undefined });
    expect(fakeAdminClient.rpc).toHaveBeenCalledWith('grant_pro_subscription', {
      p_payment_id: 'mp_pro_retry_456',
      p_user_id: 'user_pro_retry',
      p_days: 30
    });
    expect(serverDal.processedPayments.updateEntitlementStatus).toHaveBeenCalledWith('mercadopago', 'mp_pro_retry_456', 'completed');
  });

  it('debe propagar el error si updateEntitlementStatus falla en la base de datos', async () => {
    vi.mocked(serverDal.processedPayments.record).mockResolvedValueOnce(undefined as any);
    vi.mocked(serverDal.profiles.getByEmail).mockResolvedValueOnce({ id: 'user_pro_fail' } as any);
    vi.mocked(serverDal.processedPayments.updateEntitlementStatus).mockRejectedValueOnce(
      new Error('[processedPayments] Error actualizando entitlement_status: connection terminated')
    );

    const payment: PaymentDetails = {
      userId: 'user_pro_fail',
      email: 'pro_fail@test.com',
      plan: 'pro',
      metodoPago: 'mercadopago',
      externalId: 'mp_pro_fail_789',
      amount: 27000,
      currency: 'ARS',
    };

    await expect(applyPayment(fakeAdminClient, payment)).rejects.toThrow(
      'Error actualizando entitlement_status'
    );
  });
});
