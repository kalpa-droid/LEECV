/**
 * verify:pricing-margin — Comprueba que los precios cargados en los catálogos
 * dejan un margen neto positivo después de restar las comisiones de PayPal y MP.
 */
import { PRICING_CATALOG } from '../src/shared/core/payments/pricingCatalog.js';

let hasErrors = false;

// Comisiones teóricas
// PayPal: ~5.4% + 0.30 USD
const PAYPAL_FIXED_FEE = 0.30;
const PAYPAL_PERCENT_FEE = 0.054;

// Mercado Pago 10 días: 4.29% + IVA (21%) = ~5.19%
const MP_PERCENT_FEE = 0.0519;

console.log('💰 Verificando márgenes de precios (PayPal y Mercado Pago)...\n');

for (const plan of PRICING_CATALOG) {
  // Calculo PayPal USD
  const paypalFee = (plan.usd * PAYPAL_PERCENT_FEE) + PAYPAL_FIXED_FEE;
  const paypalNeto = plan.usd - paypalFee;
  const paypalMargin = (paypalNeto / plan.usd) * 100;

  // Calculo MP ARS
  const mpFee = plan.ars * MP_PERCENT_FEE;
  const mpNeto = plan.ars - mpFee;
  const mpMargin = (mpNeto / plan.ars) * 100;

  console.log(`Plan: ${plan.id} (${plan.label})`);
  console.log(`  - USD: $${plan.usd.toFixed(2)} | PayPal Neto: $${paypalNeto.toFixed(2)} (${paypalMargin.toFixed(1)}% margen)`);
  console.log(`  - ARS: $${plan.ars} | MP Neto: $${mpNeto.toFixed(2)} (${mpMargin.toFixed(1)}% margen)\n`);

  if (paypalNeto <= 0) {
    console.error(`❌ El plan ${plan.id} da pérdida en PayPal: $${paypalNeto.toFixed(2)} USD netos.`);
    hasErrors = true;
  }

  if (mpNeto <= 0) {
    console.error(`❌ El plan ${plan.id} da pérdida en Mercado Pago: $${mpNeto.toFixed(2)} ARS netos.`);
    hasErrors = true;
  }

  // Alerta si el margen es menor al 60%
  if (paypalMargin < 60 || mpMargin < 60) {
    console.warn(`⚠️ Advertencia: El plan ${plan.id} tiene un margen neto menor al 60%.`);
  }
}

if (hasErrors) {
  console.error('💥 Fallo en la verificación de márgenes. Por favor, ajustá los precios.');
  process.exit(1);
}

console.log(`✅ PASS: Todos los ${PRICING_CATALOG.length} planes tienen márgenes netos positivos.`);
process.exit(0);
