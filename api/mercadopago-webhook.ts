import { createWebhookHandler } from './_lib/webhookHandler.js';
import { mercadoPagoProvider } from './_lib/paymentProviders/mercadopago.js';

export default createWebhookHandler({
  provider: 'mercadopago',
  verifySignature: (ctx) => mercadoPagoProvider.verifyWebhook(ctx),
  extractPaymentDetails: (ctx) => mercadoPagoProvider.extractPaymentData(ctx),
});
