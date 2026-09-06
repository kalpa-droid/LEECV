import { describe, it, expect } from 'vitest';
import type { PaymentProvider, WebhookVerifyContext } from '../../api/_lib/paymentProviders/types.js';

export interface ProviderContractFixtures {
  validSignatureContext: WebhookVerifyContext;
  invalidSignatureContext: WebhookVerifyContext;
  expectedPlan: string;
  expectedMinAmount: number;
  expectedCurrency: string;
}

export function runProviderContractTests(
  provider: PaymentProvider,
  fixtures: ProviderContractFixtures
) {
  describe(`Contrato de proveedor: ${provider.id}`, () => {
    it('debe tener id e indicar si requiere rawBody', () => {
      expect(provider.id).toBeDefined();
      expect(typeof provider.requiresRawBody).toBe('boolean');
    });

    it('diagnose() debe retornar un status válido de ProviderStatus', async () => {
      const diag = await provider.diagnose(false);
      expect(diag).toHaveProperty('status');
      expect(diag).toHaveProperty('label');
      expect(Array.isArray(diag.missingVars)).toBe(true);
    });

    it('verifyWebhook() debe retornar true con firma válida y false con firma alterada', async () => {
      const valid = await provider.verifyWebhook(fixtures.validSignatureContext);
      expect(valid).toBe(true);

      const invalid = await provider.verifyWebhook(fixtures.invalidSignatureContext);
      expect(invalid).toBe(false);
    });

    it('extractPaymentData() debe extraer correctamente el plan, monto y moneda', async () => {
      const data = await provider.extractPaymentData(fixtures.validSignatureContext);
      expect(data).not.toBeNull();
      if (data) {
        expect(data.plan).toBe(fixtures.expectedPlan);
        expect(data.amount).toBeGreaterThanOrEqual(fixtures.expectedMinAmount);
        expect(data.currency?.toUpperCase()).toBe(fixtures.expectedCurrency.toUpperCase());
        expect(data.metodoPago).toBe(provider.id);
      }
    });
  });
}
