import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { paypalProvider } from '../../api/_lib/paymentProviders/paypal.js';

const MOCK_WEBHOOK_ID = 'WH_PAYPAL_123';

describe('PayPal Provider Contract', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      PAYPAL_CLIENT_ID: 'client_id_test',
      PAYPAL_CLIENT_SECRET: 'client_secret_test',
      PAYPAL_WEBHOOK_ID: MOCK_WEBHOOK_ID,
      PAYPAL_ENV: 'sandbox',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('diagnose() debe verificar credenciales vía OAuth x-www-form-urlencoded', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'fake_access_token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: MOCK_WEBHOOK_ID }),
      });

    vi.stubGlobal('fetch', fetchMock);

    const diag = await paypalProvider.diagnose(false);
    expect(diag.status).toBe('active');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api-m.sandbox.paypal.com/v1/oauth2/token',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/x-www-form-urlencoded',
        }),
      })
    );
  });

  it('verifyWebhook() debe llamar a verify-webhook-signature con JSON body', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'fake_access_token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ verification_status: 'SUCCESS' }),
      });

    vi.stubGlobal('fetch', fetchMock);

    const ctx: any = {
      req: {
        headers: {
          'paypal-auth-algo': 'SHA256withRSA',
          'paypal-cert-url': 'https://api.paypal.com/cert',
          'paypal-transmission-id': 'trans_123',
          'paypal-transmission-sig': 'sig_123',
          'paypal-transmission-time': '2026-09-06T00:00:00Z',
        },
      },
      parsedBody: { event_type: 'PAYMENT.CAPTURE.COMPLETED' },
    };

    const isVerified = await paypalProvider.verifyWebhook(ctx);
    expect(isVerified).toBe(true);
  });

  it('extractPaymentData() debe interpretar la carga útil PAYMENT.CAPTURE.COMPLETED con custom_id JSON', async () => {
    const ctx: any = {
      parsedBody: {
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource: {
          id: 'CAP_998877',
          custom_id: JSON.stringify({ userId: 'usr_paypal_456', plan: 'enterprise' }),
          amount: { value: 29, currency_code: 'USD' },
          payer: { email_address: 'paypal_client@test.com' },
        },
      },
    };

    const details = await paypalProvider.extractPaymentData(ctx);
    expect(details).not.toBeNull();
    expect(details?.userId).toBe('usr_paypal_456');
    expect(details?.plan).toBe('enterprise');
    expect(details?.amount).toBe(29);
    expect(details?.currency).toBe('USD');
    expect(details?.metodoPago).toBe('paypal');
  });
});
