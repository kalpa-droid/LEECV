import { createWebhookHandler } from './_lib/webhookHandler.js';
import { lemonSqueezyProvider } from './_lib/paymentProviders/lemonsqueezy.js';

export const config = { api: { bodyParser: false } };

export default createWebhookHandler({
  provider: 'lemonsqueezy',
  rawBody: true,
  verifySignature: (ctx) => lemonSqueezyProvider.verifyWebhook(ctx),
  extractPaymentDetails: (ctx) => lemonSqueezyProvider.extractPaymentData(ctx),
});
