import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyPayment, PaymentDetails } from '../api/_lib/applyPayment.js';
import { serverDal } from '../api/_lib/serverDal.js';
import { ADMIN_WHATSAPP, buildWaLink, dispatchWaAlert } from '../api/_lib/whatsappAlert.js';
import { requestOtp, verifyOtp, claimCreditsOnAuth } from '../src/shared/core/auth/authService.js';
import { supabase } from '../src/shared/core/lib/supabaseClient.js';

// Mocks de servidor
vi.mock('../api/_lib/serverDal.js', () => ({
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
}));

// Mocks del cliente Supabase frontend para authService
vi.mock('../src/shared/core/lib/supabaseClient.js', () => {
  const mockClient = {
    auth: {
      signInWithOtp: vi.fn(),
      verifyOtp: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
    },
    rpc: vi.fn(),
  };
  return {
    supabase: mockClient,
    checkStorageStatus: vi.fn(() => ({ isCloud: true, label: 'Nube Supabase Conectada' })),
  };
});

describe('Plan Maestro: Pagos, Magic Link, Auto-Claim y WhatsApp Integration Tests', () => {
  let fakeAdminClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(serverDal.profiles.getByEmail).mockResolvedValue(null);

    fakeAdminClient = {
      from: vi.fn((table: string) => {
        if (table === 'pdf_export_tokens') {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn().mockResolvedValue({
                  data: [{ token: 'tok_test', paid: true, payment_id: 'mp:123' }],
                  error: null,
                }),
              })),
            })),
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              })),
            })),
          };
        }
        if (table === 'unclaimed_email_credits') {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            })),
          })),
        };
      }),
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
  });

  /* -------------------------------------------------------------------------- */
  /* 1. Coherencia de Precios en Pasarelas (MP en ARS y PayPal en USD)          */
  /* -------------------------------------------------------------------------- */
  describe('1. Coherencia de precios oficiales (Mercado Pago y PayPal)', () => {
    const officialTiers = [
      {
        plan: 'single_pdf',
        credits: 1,
        mp: { amount: 3200, currency: 'ARS' },
        pp: { amount: 2.60, currency: 'USD' },
      },
      {
        plan: 'credits_pack_5',
        credits: 5,
        mp: { amount: 12500, currency: 'ARS' },
        pp: { amount: 10.00, currency: 'USD' },
      },
      {
        plan: 'credits_pack_10',
        credits: 10,
        mp: { amount: 21000, currency: 'ARS' },
        pp: { amount: 17.00, currency: 'USD' },
      },
    ];

    it.each(officialTiers)(
      'debe procesar exitosamente pago Mercado Pago para $plan ($mp.amount $mp.currency)',
      async ({ plan, credits, mp }) => {
        vi.mocked(serverDal.processedPayments.record).mockResolvedValueOnce(undefined as any);

        const payment: PaymentDetails = {
          exportToken: plan === 'single_pdf' ? 'tok_mp_single' : undefined,
          email: 'buyer_mp@test.com',
          userId: plan !== 'single_pdf' ? 'user_mp_123' : undefined,
          plan,
          metodoPago: 'mercadopago',
          externalId: `mp_tx_${plan}`,
          amount: mp.amount,
          currency: mp.currency,
        };

        const result = await applyPayment(fakeAdminClient, payment);
        expect(result.type).toBe('payment_applied');

        if (plan !== 'single_pdf') {
          expect(fakeAdminClient.rpc).toHaveBeenCalledWith('grant_export_tokens', expect.objectContaining({
            p_user_id: 'user_mp_123',
            p_amount: credits,
            p_payment_id: `mercadopago:mp_tx_${plan}`,
          }));
        }
      }
    );

    it.each(officialTiers)(
      'debe procesar exitosamente pago PayPal para $plan ($pp.amount $pp.currency)',
      async ({ plan, credits, pp }) => {
        vi.mocked(serverDal.processedPayments.record).mockResolvedValueOnce(undefined as any);

        const payment: PaymentDetails = {
          exportToken: plan === 'single_pdf' ? 'tok_pp_single' : undefined,
          email: 'buyer_pp@test.com',
          userId: plan !== 'single_pdf' ? 'user_pp_123' : undefined,
          plan,
          metodoPago: 'paypal',
          externalId: `pp_tx_${plan}`,
          amount: pp.amount,
          currency: pp.currency,
        };

        const result = await applyPayment(fakeAdminClient, payment);
        expect(result.type).toBe('payment_applied');

        if (plan !== 'single_pdf') {
          expect(fakeAdminClient.rpc).toHaveBeenCalledWith('grant_export_tokens', expect.objectContaining({
            p_user_id: 'user_pp_123',
            p_amount: credits,
            p_payment_id: `paypal:pp_tx_${plan}`,
          }));
        }
      }
    );
  });

  /* -------------------------------------------------------------------------- */
  /* 2. Idempotencia y Protección ante Reintentos de Webhook                    */
  /* -------------------------------------------------------------------------- */
  describe('2. Idempotencia en webhooks repetidos', () => {
    it('debe descartar un webhook ya completado (código 23505) sin duplicar créditos', async () => {
      const duplicateError: any = new Error('duplicate key value violates unique constraint');
      duplicateError.code = '23505';

      vi.mocked(serverDal.processedPayments.record).mockRejectedValueOnce(duplicateError);
      vi.mocked(serverDal.processedPayments.getByProviderAndExternalId).mockResolvedValueOnce({
        entitlement_status: 'completed',
      } as any);

      const payment: PaymentDetails = {
        email: 'user@test.com',
        userId: 'user_123',
        plan: 'credits_pack_5',
        metodoPago: 'mercadopago',
        externalId: 'mp_duplicate_999',
        amount: 12500,
        currency: 'ARS',
      };

      const res = await applyPayment(fakeAdminClient, payment);
      expect(res).toEqual({ type: 'already_processed', message: 'Payment already recorded' });
      expect(fakeAdminClient.rpc).not.toHaveBeenCalled();
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 3. Detección de Discrepancias de Monto (Amount Mismatch)                   */
  /* -------------------------------------------------------------------------- */
  describe('3. Detección y retención ante monto discrepante', () => {
    it('debe retener el pago en pending_grants si el monto cobrado no coincide con el catálogo', async () => {
      const payment: PaymentDetails = {
        email: 'attacker@test.com',
        plan: 'credits_pack_10', // Espera $17.00 USD
        metodoPago: 'paypal',
        externalId: 'pp_fake_low_amount',
        amount: 1.00, // Monto adulterado
        currency: 'USD',
      };

      const result = await applyPayment(fakeAdminClient, payment);
      expect(result).toEqual({ type: 'held_for_review', message: 'Payment held due to mismatch' });

      expect(serverDal.pendingGrants.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'attacker@test.com',
          provider: 'paypal',
          external_id: 'pp_fake_low_amount',
          plan: 'credits_pack_10',
          amount: 1.00,
          currency: 'USD',
          hold_reason: 'amount_mismatch',
        })
      );

      expect(serverDal.adminNotifications.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'payment_pending_review',
          title: expect.stringContaining('Pago sospechoso'),
        })
      );
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 4. Compra como Invitado y Auto-Acreditación en unclaimed_email_credits    */
  /* -------------------------------------------------------------------------- */
  describe('4. Flujo de compra como invitado (Guest Pack)', () => {
    it('debe depositar los créditos en unclaimed_email_credits si no existe perfil registrado', async () => {
      vi.mocked(serverDal.processedPayments.record).mockResolvedValueOnce(undefined as any);
      vi.mocked(serverDal.profiles.getByEmail).mockResolvedValueOnce(null); // Sin perfil

      const insertMock = vi.fn().mockResolvedValue({ error: null });
      fakeAdminClient.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'unclaimed_email_credits') {
          return { insert: insertMock };
        }
        return {};
      });

      const payment: PaymentDetails = {
        email: 'guest_buyer@gmail.com',
        plan: 'credits_pack_5',
        metodoPago: 'mercadopago',
        externalId: 'mp_guest_001',
        amount: 12500,
        currency: 'ARS',
      };

      const result = await applyPayment(fakeAdminClient, payment);
      expect(result).toEqual({
        type: 'payment_applied',
        plan: 'credits_pack_5',
        exportToken: undefined,
        unclaimed: true,
      });

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'guest_buyer@gmail.com',
          credits: 5,
          payment_id: 'mercadopago:mp_guest_001',
          provider: 'mercadopago',
          plan: 'credits_pack_5',
          amount: 12500,
          currency: 'ARS',
        })
      );
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 5. Autenticación Passwordless (OTP/Magic Link) y Reclamo Automático        */
  /* -------------------------------------------------------------------------- */
  describe('5. Autenticación Passwordless y claimCreditsOnAuth', () => {
    it('requestOtp debe solicitar el código a Supabase con shouldCreateUser: true', async () => {
      const mockSignInWithOtp = vi.mocked(supabase!.auth.signInWithOtp).mockResolvedValueOnce({
        data: {} as any,
        error: null,
      });

      await requestOtp('usuario@ejemplo.com');

      expect(mockSignInWithOtp).toHaveBeenCalledWith({
        email: 'usuario@ejemplo.com',
        options: { shouldCreateUser: true },
      });
    });

    it('verifyOtp debe verificar el token de 6 dígitos y disparar claimCreditsOnAuth automáticamente', async () => {
      const mockVerifyOtp = vi.mocked(supabase!.auth.verifyOtp).mockResolvedValueOnce({
        data: {
          user: { id: 'usr_new_999', email: 'usuario@ejemplo.com' } as any,
          session: { access_token: 'fake_jwt' } as any,
        },
        error: null,
      });

      const mockRpc = vi.mocked(supabase!.rpc).mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValueOnce({
          data: {
            credits_claimed: 5,
            rows_claimed: 1,
            guest_tokens_linked: 0,
            matched_email: 'usuario@ejemplo.com',
          },
          error: null,
        }),
      } as any);

      const res = await verifyOtp('usuario@ejemplo.com', '123456');

      expect(mockVerifyOtp).toHaveBeenCalledWith({
        email: 'usuario@ejemplo.com',
        token: '123456',
        type: 'email',
      });
      expect(res.user?.id).toBe('usr_new_999');

      // Verifica que claimCreditsOnAuth fue ejecutado con el user id y email
      expect(mockRpc).toHaveBeenCalledWith('claim_credits_on_auth', {
        p_user_id: 'usr_new_999',
        p_email: 'usuario@ejemplo.com',
      });
    });

    it('claimCreditsOnAuth no debe lanzar ni bloquear si el RPC devuelve error o falla', async () => {
      vi.mocked(supabase!.rpc).mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValueOnce({
          data: null,
          error: { message: 'function does not exist' },
        }),
      } as any);

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await claimCreditsOnAuth({ id: 'usr_1', email: 'test@example.com' });
      expect(result).toBeNull();
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 6. Sistema de Alertas WhatsApp al Administrador (+5493878342772)          */
  /* -------------------------------------------------------------------------- */
  describe('6. Alertas WhatsApp (+5493878342772)', () => {
    it('debe tener como destinatario oficial el número +5493878342772', () => {
      expect(ADMIN_WHATSAPP).toBe('+5493878342772');
    });

    it('buildWaLink debe generar un enlace seguro codificado con wa.me', () => {
      const link = buildWaLink('Hola Kalpa, reporte de pago');
      expect(link).toContain('https://wa.me/5493878342772');
      expect(link).toContain('text=Hola%20Kalpa%2C%20reporte%20de%20pago');
    });

    it('dispatchWaAlert debe ser resiliente (fire-and-forget) y no lanzar ante errores', () => {
      // Mock global fetch que rechaza
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      expect(() => {
        dispatchWaAlert('Prueba de alerta sin bloqueo', { orden: 'test_123' });
      }).not.toThrow();

      globalThis.fetch = originalFetch;
    });
  });
});
