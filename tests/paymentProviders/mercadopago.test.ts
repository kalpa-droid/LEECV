import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mercadoPagoProvider } from '../../api/_lib/paymentProviders/mercadopago.js';
import { runProviderContractTests } from './contract.js';
import crypto from 'crypto';

const MOCK_SECRET = 'mp_secret_test_123';
const MOCK_TOKEN = 'mp_token_test_abc';
const MOCK_DATA_ID = '12345678';
const MOCK_REQUEST_ID = 'req_987654321';
const MOCK_TS = '1700000000';

function generateMpSignature(dataId: string, requestId: string, ts: string, secret: string) {
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const v1 = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  return `ts=${ts},v1=${v1}`;
}

describe('MercadoPago Provider Contract', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, MP_WEBHOOK_SECRET: MOCK_SECRET, MP_ACCESS_TOKEN: MOCK_TOKEN };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 12345678,
        status: 'approved',
        transaction_amount: 1500,
        currency_id: 'ARS',
        external_reference: JSON.stringify({ userId: 'usr_mp_123', plan: 'pro' }),
        payer: { email: 'mp_user@test.com' },
      }),
    }));
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  const validSig = generateMpSignature(MOCK_DATA_ID, MOCK_REQUEST_ID, MOCK_TS, MOCK_SECRET);
  const invalidSig = `ts=${MOCK_TS},v1=0000000000000000000000000000000000000000000000000000000000000000`;

  const validContext: any = {
    req: {
      headers: {
        'x-signature': validSig,
        'x-request-id': MOCK_REQUEST_ID,
      },
      query: { 'data.id': MOCK_DATA_ID },
    },
    parsedBody: { type: 'payment', data: { id: MOCK_DATA_ID } },
  };

  const invalidContext: any = {
    req: {
      headers: {
        'x-signature': invalidSig,
        'x-request-id': MOCK_REQUEST_ID,
      },
      query: { 'data.id': MOCK_DATA_ID },
    },
    parsedBody: { type: 'payment', data: { id: MOCK_DATA_ID } },
  };

  runProviderContractTests(mercadoPagoProvider, {
    validSignatureContext: validContext,
    invalidSignatureContext: invalidContext,
    expectedPlan: 'pro',
    expectedMinAmount: 1,
    expectedCurrency: 'ARS',
  });

  it('extractPaymentData debe llamar a la API de MP y procesar external_reference JSON', async () => {
    const mockPaymentData = {
      id: 12345678,
      status: 'approved',
      transaction_amount: 1500,
      currency_id: 'ARS',
      external_reference: JSON.stringify({ userId: 'usr_mp_123', plan: 'credits_pack_5' }),
      payer: { email: 'user@test.com' },
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockPaymentData,
    }));

    const details = await mercadoPagoProvider.extractPaymentData(validContext);
    expect(details).not.toBeNull();
    expect(details?.userId).toBe('usr_mp_123');
    expect(details?.plan).toBe('credits_pack_5');
    expect(details?.amount).toBe(1500);
    expect(details?.currency).toBe('ARS');
  });
});
