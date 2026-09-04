import { createWebhookHandler } from './_lib/webhookHandler.js';
import { paypalProvider } from './_lib/paymentProviders/paypal.js';

export default createWebhookHandler({
  provider: 'paypal',
  verifySignature: (ctx) => paypalProvider.verifyWebhook(ctx),
  extractPaymentDetails: (ctx) => paypalProvider.extractPaymentData(ctx),
});
