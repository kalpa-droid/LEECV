/**
 * verify:pricing-margin — Comprueba que los precios cargados en los catálogos
 * dejan un margen neto positivo después de restar las comisiones.
 */
import { PRICING_CATALOG } from '../src/shared/core/payments/pricingCatalog.js';

let hasErrors = false;

// Comisiones teóricas
// PayPal: ~5.4% + 0.30 USD
const PAYPAL_FIXED_FEE = 0.30;
const PAYPAL_PERCENT_FEE = 0.054;

// Lemon Squeezy: 5% + 0.50 USD
const LEMONSQUEEZY_FIXED_FEE = 0.50;
const LEMONSQUEEZY_PERCENT_FEE = 0.05;

// Mercado Pago 10 días: 4.39%
const MP_PERCENT_FEE = 0.0439;

// Límites mínimos netos
const MIN_NET_USD = 1.80;
const MIN_NET_ARS = 2900;

console.log('💰 Verificando márgenes de precios (PayPal, Lemon Squeezy y Mercado Pago)...\n');

for (const plan of PRICING_CATALOG) {
  // Calculo PayPal USD
  const paypalFee = (plan.usd * PAYPAL_PERCENT_FEE) + PAYPAL_FIXED_FEE;
  const paypalNeto = plan.usd - paypalFee;
  const paypalMargin = (paypalNeto / plan.usd) * 100;

  // Calculo Lemon Squeezy USD
  const lemonFee = (plan.usd * LEMONSQUEEZY_PERCENT_FEE) + LEMONSQUEEZY_FIXED_FEE;
  const lemonNeto = plan.usd - lemonFee;
  const lemonMargin = (lemonNeto / plan.usd) * 100;

  // Calculo MP ARS
  const mpFee = plan.ars * MP_PERCENT_FEE;
  const mpNeto = plan.ars - mpFee;
  const mpMargin = (mpNeto / plan.ars) * 100;

  console.log(`Plan: ${plan.id} (${plan.label})`);
  console.log(`  - USD: $${plan.usd.toFixed(2)} | PayPal Neto: $${paypalNeto.toFixed(2)} (${paypalMargin.toFixed(1)}% margen)`);
  console.log(`  - USD: $${plan.usd.toFixed(2)} | Lemon Squeezy Neto: $${lemonNeto.toFixed(2)} (${lemonMargin.toFixed(1)}% margen)`);
  console.log(`  - ARS: $${plan.ars} | MP Neto: $${mpNeto.toFixed(2)} (${mpMargin.toFixed(1)}% margen)\n`);

  if (paypalNeto < MIN_NET_USD) {
    console.error(`❌ El plan ${plan.id} no alcanza el mínimo en PayPal: $${paypalNeto.toFixed(2)} USD netos (Min: $${MIN_NET_USD}).`);
    hasErrors = true;
  }

  if (lemonNeto < MIN_NET_USD) {
    console.error(`❌ El plan ${plan.id} no alcanza el mínimo en Lemon Squeezy: $${lemonNeto.toFixed(2)} USD netos (Min: $${MIN_NET_USD}).`);
    hasErrors = true;
  }

  if (mpNeto < MIN_NET_ARS) {
    console.error(`❌ El plan ${plan.id} no alcanza el mínimo en Mercado Pago: $${mpNeto.toFixed(2)} ARS netos (Min: $${MIN_NET_ARS}).`);
    hasErrors = true;
  }
}

if (hasErrors) {
  console.error('💥 Fallo en la verificación de márgenes. Por favor, ajustá los precios.');
  process.exit(1);
}

console.log(`✅ PASS: Todos los ${PRICING_CATALOG.length} planes superan los límites mínimos de rentabilidad.`);
process.exit(0);
