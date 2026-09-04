import type { VercelRequest } from '@vercel/node';
import type { PaymentDetails } from '../applyPayment.js';

export type ProviderId = 'mercadopago' | 'paypal' | 'lemonsqueezy';

export type ProviderStatusCode = 'active' | 'missing_vars' | 'invalid_credentials' | 'webhook_not_found' | 'error';

export interface ProviderStatus {
  status: ProviderStatusCode;
  label: string;
  missingVars: string[];
}

export interface WebhookVerifyContext {
  req: VercelRequest;
  rawBody?: string;
  parsedBody: any;
}

export interface PaymentProvider {
  id: ProviderId;
  requiresRawBody: boolean;
  diagnose(forcePing: boolean): Promise<ProviderStatus>;
  verifyWebhook(ctx: WebhookVerifyContext): Promise<boolean>;
  extractPaymentData(ctx: WebhookVerifyContext): Promise<PaymentDetails | null>;
}
