import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { lemonSqueezyProvider } from '../../api/_lib/paymentProviders/lemonsqueezy.js';
import { runProviderContractTests } from './contract.js';
import crypto from 'crypto';

const MOCK_LS_SECRET = 'ls_secret_test_456';
const MOCK_LS_RAW_BODY = JSON.stringify({
  meta: { event_name: 'order_created' },
  data: {
    id: 'ord_ls_777',
    attributes: {
      user_email: 'lemon@test.com',
      total: 800, // 800 cents = $8.00 USD (Pack 5)
      currency: 'USD',
      first_order_item: { variant_id: 2095046 }, // LS_VARIANT_PACK5 default
    },
  },
});

function calculateLsHmac(rawBody: string, secret: string) {
  return crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
}

describe('Lemon Squeezy Provider Contract', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      LEMONSQUEEZY_WEBHOOK_SECRET: MOCK_LS_SECRET,
      LEMONSQUEEZY_API_KEY: 'ls_key_test',
      LS_VARIANT_PACK5: '2095046',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  const validSig = calculateLsHmac(MOCK_LS_RAW_BODY, MOCK_LS_SECRET);
  const invalidSig = '0000000000000000000000000000000000000000000000000000000000000000';

  const validContext: any = {
    req: { headers: { 'x-signature': validSig } },
    rawBody: MOCK_LS_RAW_BODY,
    parsedBody: JSON.parse(MOCK_LS_RAW_BODY),
  };

  const invalidContext: any = {
    req: { headers: { 'x-signature': invalidSig } },
    rawBody: MOCK_LS_RAW_BODY,
    parsedBody: JSON.parse(MOCK_LS_RAW_BODY),
  };

  runProviderContractTests(lemonSqueezyProvider, {
    validSignatureContext: validContext,
    invalidSignatureContext: invalidContext,
    expectedPlan: 'credits_pack_5',
    expectedMinAmount: 8,
    expectedCurrency: 'USD',
  });

  it('extractPaymentData() debe dividir los centavos por 100 para obtener el monto en USD real', async () => {
    const details = await lemonSqueezyProvider.extractPaymentData(validContext);
    expect(details).not.toBeNull();
    expect(details?.amount).toBe(8); // 800 / 100
    expect(details?.currency).toBe('USD');
    expect(details?.email).toBe('lemon@test.com');
    expect(details?.plan).toBe('credits_pack_5');
  });
});
