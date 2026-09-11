/**
 * verify:plan-features — Valida que todas las entradas de `PLAN_FEATURES` tengan
 * un arreglo `marketingBullets` con claves existentes en el catálogo de i18n de precios (`pricing.ts`).
 */
import { PLAN_FEATURES } from '../src/shared/core/entitlements/useEntitlements.js';
import { pricingCatalog } from '../src/shared/i18n/catalog/pricing.js';

let hasErrors = false;

console.log('🔍 Verificando sincronización entre PLAN_FEATURES y pricingCatalog (i18n)...\n');

for (const [planId, planData] of Object.entries(PLAN_FEATURES)) {
  const bullets = (planData as any).marketingBullets || [];
  
  if (bullets.length === 0) {
    console.warn(`⚠️ El plan "${planId}" no tiene marketingBullets definidos.`);
  }

  for (const bullet of bullets) {
    if (!(bullet in pricingCatalog)) {
      console.error(`❌ La viñeta "${bullet}" del plan "${planId}" no existe en src/shared/i18n/catalog/pricing.ts`);
      hasErrors = true;
    }
  }
}

if (hasErrors) {
  console.error('\n💥 Existen referencias a viñetas (marketingBullets) rotas en useEntitlements.ts que no están en pricing.ts');
  process.exit(1);
}

console.log(`✅ PASS: Todas las viñetas (marketingBullets) de PLAN_FEATURES existen en el catálogo de i18n.`);
process.exit(0);
