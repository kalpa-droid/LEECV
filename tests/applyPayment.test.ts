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
  let fakeAdminClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    fakeAdminClient = {
      from: vi.fn((table: string) => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn().mockResolvedValue({
              data: [{ token: 'tok_123', paid: true, payment_id: 'mercadopago:mp_tx_100' }],
              error: null,
            }),
          })),
        })),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { plan_vence: null } }),
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          })),
        })),
      })),
      rpc: vi.fn().mockResolvedValue({ error: null }),
    };
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
    vi.mocked(serverDal.adminNotifications.create).mockResolvedValueOnce(undefined as any);

    const selectMock = vi.fn().mockResolvedValue({
      data: [{ token: 'tok_123', paid: true, payment_id: 'mercadopago:mp_tx_100' }],
      error: null,
    });
    const eqMock = vi.fn().mockReturnValue({ select: selectMock });
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
    fakeAdminClient.from = vi.fn().mockReturnValue({ update: updateMock } as any);

    const payment: PaymentDetails = {
      exportToken: 'tok_123',
      email: 'user@test.com',
      plan: 'single_pdf',
      metodoPago: 'mercadopago',
      externalId: 'mp_tx_100',
      amount: 3200,
      currency: 'ARS',
    };

    const res = await applyPayment(fakeAdminClient, payment);
    expect(res).toEqual({ type: 'payment_applied', plan: 'single_pdf', exportToken: 'tok_123' });
    expect(serverDal.processedPayments.record).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'mercadopago',
        external_id: 'mp_tx_100',
        user_email: 'user@test.com',
        amount: 3200,
        currency: 'ARS',
        entitlement_status: 'pending',
      })
    );
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ paid: true, payment_id: 'mercadopago:mp_tx_100' })
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
      plan: 'single_pdf',
      entitlement_status: 'completed',
    });

    const payment: PaymentDetails = {
      exportToken: 'tok_dup',
      email: 'dup@test.com',
      plan: 'single_pdf',
      metodoPago: 'lemonsqueezy',
      externalId: 'ls_dup_123',
      amount: 2.6,
      currency: 'USD',
    };

    const res = await applyPayment(fakeAdminClient, payment);
    expect(res).toEqual({ type: 'already_processed', message: 'Payment already recorded' });
    expect(fakeAdminClient.from).not.toHaveBeenCalled();
    expect(serverDal.processedPayments.updateEntitlementStatus).not.toHaveBeenCalled();
  });

  it('debe lanzar error si 23505 ocurre pero getByProviderAndExternalId devuelve null (fallo de lectura)', async () => {
    const error: any = new Error('duplicate key value violates unique constraint "unq_provider_external_id"');
    error.code = '23505';
    vi.mocked(serverDal.processedPayments.record).mockRejectedValueOnce(error);
    vi.mocked(serverDal.processedPayments.getByProviderAndExternalId).mockResolvedValueOnce(null);

    const payment: PaymentDetails = {
      exportToken: 'tok_err',
      email: 'err@test.com',
      plan: 'single_pdf',
      metodoPago: 'mercadopago',
      externalId: 'mp_err_999',
      amount: 3200,
      currency: 'ARS',
    };

    await expect(applyPayment(fakeAdminClient, payment)).rejects.toThrow(
      'Violación de clave única 23505 pero no se pudo leer el registro existente'
    );
  });

  it('debe recuperar el otorgamiento si el registro previo falló parcialmente (entitlement pendiente)', async () => {
    const error: any = new Error('duplicate key value violates unique constraint "unq_provider_external_id"');
    error.code = '23505';
    vi.mocked(serverDal.processedPayments.record).mockRejectedValueOnce(error);
    vi.mocked(serverDal.processedPayments.getByProviderAndExternalId).mockResolvedValueOnce({
      id: 'pay_retry',
      plan: 'credits_pack_5',
      entitlement_status: 'pending',
    });
    vi.mocked(serverDal.adminNotifications.create).mockResolvedValueOnce(undefined as any);

    const payment: PaymentDetails = {
      userId: 'user_retry',
      email: 'retry@test.com',
      plan: 'credits_pack_5',
      metodoPago: 'mercadopago',
      externalId: 'mp_retry_999',
      amount: 12500,
      currency: 'ARS',
    };

    const res = await applyPayment(fakeAdminClient, payment);

    expect(res).toEqual({ type: 'payment_applied', plan: 'credits_pack_5', exportToken: undefined });
    expect(fakeAdminClient.rpc).toHaveBeenCalledWith('grant_export_tokens', expect.objectContaining({
      p_payment_id: 'mercadopago:mp_retry_999',
      p_user_id: 'user_retry',
      p_amount: 5,
      p_email: 'retry@test.com'
    }));
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
      amount: 1.0,
      currency: 'USD',
    };

    const res = await applyPayment(fakeAdminClient, payment);
    expect(res).toEqual({ type: 'held_for_review', message: 'Payment held due to mismatch' });
    expect(serverDal.processedPayments.record).not.toHaveBeenCalled();
    expect(serverDal.pendingGrants.create).toHaveBeenCalled();
  });

  it('debe propagar el error si pendingGrants.create falla al retener pago sin perfil', async () => {
    vi.mocked(serverDal.processedPayments.record).mockResolvedValueOnce(undefined as any);
    vi.mocked(serverDal.profiles.getByEmail).mockResolvedValueOnce(null as any);
    vi.mocked(serverDal.pendingGrants.create).mockRejectedValueOnce(
      new Error('[pendingGrants] Error creando pending grant: db down')
    );

    const payment: PaymentDetails = {
      email: 'unknown@test.com',
      plan: 'credits_pack_5',
      metodoPago: 'mercadopago',
      externalId: 'mp_noprofile_123',
      amount: 12500,
      currency: 'ARS',
    };

    await expect(applyPayment(fakeAdminClient, payment)).rejects.toThrow(
      'Error creando pending grant'
    );
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
      p_payment_id: 'mercadopago:mp_pro_123',
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
    vi.mocked(serverDal.profiles.getByEmail).mockResolvedValueOnce({ id: 'user_pro_retry' } as any);
    vi.mocked(serverDal.adminNotifications.create).mockResolvedValueOnce(undefined as any);

    const payment: PaymentDetails = {
      userId: 'user_pro_retry',
      email: 'pro_retry@test.com',
      plan: 'pro',
      metodoPago: 'mercadopago',
      externalId: 'mp_pro_retry_456',
      amount: 27000,
      currency: 'ARS',
    };

    const res = await applyPayment(fakeAdminClient, payment);
    expect(res).toEqual({ type: 'payment_applied', plan: 'pro', exportToken: undefined });
    expect(fakeAdminClient.rpc).toHaveBeenCalledWith('grant_pro_subscription', {
      p_payment_id: 'mercadopago:mp_pro_retry_456',
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

  it('debe lanzar error en single_pdf si 0 filas se actualizaron y el token no existe', async () => {
    vi.mocked(serverDal.processedPayments.record).mockResolvedValueOnce(undefined as any);
    
    // update returns 0 rows updated
    const selectMock = vi.fn().mockResolvedValue({ data: [], error: null });
    const eqMock = vi.fn().mockReturnValue({ select: selectMock });
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
    
    // fallback check returns null
    const maybeSingleMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const selectFallbackEq = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const selectFallback = vi.fn().mockReturnValue({ eq: selectFallbackEq });

    fakeAdminClient.from = vi.fn().mockImplementation((table: string) => {
      if (table === 'pdf_export_tokens') {
        return {
          update: updateMock,
          select: selectFallback,
        };
      }
      return {};
    });

    const payment: PaymentDetails = {
      exportToken: 'tok_missing_404',
      email: 'guest@test.com',
      plan: 'single_pdf',
      metodoPago: 'mercadopago',
      externalId: 'mp_single_404',
      amount: 3200,
      currency: 'ARS',
    };

    await expect(applyPayment(fakeAdminClient, payment)).rejects.toThrow(
      'No se encontró el token de exportación especificado: tok_missing_404'
    );
  });

  it('debe permitir reintento idempotente en single_pdf si el token ya fue pagado con este payment_id', async () => {
    vi.mocked(serverDal.processedPayments.record).mockResolvedValueOnce(undefined as any);
    
    // update returns 0 rows updated
    const selectMock = vi.fn().mockResolvedValue({ data: [], error: null });
    const eqMock = vi.fn().mockReturnValue({ select: selectMock });
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
    
    // fallback check returns existing paid token with matching payment_id
    const maybeSingleMock = vi.fn().mockResolvedValue({
      data: { token: 'tok_already_paid', paid: true, payment_id: 'mercadopago:mp_already_1' },
      error: null,
    });
    const selectFallbackEq = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const selectFallback = vi.fn().mockReturnValue({ eq: selectFallbackEq });

    fakeAdminClient.from = vi.fn().mockImplementation((table: string) => {
      if (table === 'pdf_export_tokens') {
        return {
          update: updateMock,
          select: selectFallback,
        };
      }
      return {};
    });

    const payment: PaymentDetails = {
      exportToken: 'tok_already_paid',
      email: 'guest@test.com',
      plan: 'single_pdf',
      metodoPago: 'mercadopago',
      externalId: 'mp_already_1',
      amount: 3200,
      currency: 'ARS',
    };

    const res = await applyPayment(fakeAdminClient, payment);
    expect(res).toEqual({ type: 'payment_applied', plan: 'single_pdf', exportToken: 'tok_already_paid' });
    expect(serverDal.processedPayments.updateEntitlementStatus).toHaveBeenCalledWith('mercadopago', 'mp_already_1', 'completed');
  });

  it('debe aislar pagos de diferentes proveedores con el mismo externalId numérico', async () => {
    vi.mocked(serverDal.processedPayments.record).mockResolvedValue(undefined as any);
    vi.mocked(serverDal.profiles.getByEmail).mockResolvedValue({ id: 'user_shared_id' } as any);

    const paymentMp: PaymentDetails = {
      userId: 'user_shared_id',
      email: 'mp@test.com',
      plan: 'credits_pack_5',
      metodoPago: 'mercadopago',
      externalId: '12345',
      amount: 12500,
      currency: 'ARS',
    };

    const paymentPp: PaymentDetails = {
      userId: 'user_shared_id',
      email: 'pp@test.com',
      plan: 'credits_pack_5',
      metodoPago: 'paypal',
      externalId: '12345',
      amount: 10,
      currency: 'USD',
    };

    await applyPayment(fakeAdminClient, paymentMp);
    expect(fakeAdminClient.rpc).toHaveBeenCalledWith('grant_export_tokens', expect.objectContaining({
      p_payment_id: 'mercadopago:12345',
    }));

    await applyPayment(fakeAdminClient, paymentPp);
    expect(fakeAdminClient.rpc).toHaveBeenCalledWith('grant_export_tokens', expect.objectContaining({
      p_payment_id: 'paypal:12345',
    }));
  });
});
