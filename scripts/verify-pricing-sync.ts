/**
 * verify:pricing-sync — Compara el catálogo de precios del frontend
 * (src/shared/core/payments/pricingCatalog.ts) contra su gemelo del backend
 * (api/_lib/paymentProviders/pricingCatalog.ts) y falla si un solo número
 * difiere. Existen dos archivos porque Vercel no permite que las funciones
 * serverless importen fuera de api/ — este script es lo que hace que esa
 * duplicación sea segura en vez de una fuente silenciosa de bugs.
 */
import { PRICING_CATALOG as FRONTEND_CATALOG } from '../src/shared/core/payments/pricingCatalog.js';
import { PRICING_CATALOG as BACKEND_CATALOG } from '../api/_lib/paymentProviders/pricingCatalog.js';

let hasErrors = false;

console.log('🔍 Verificando sincronización entre el catálogo de precios del frontend y el backend...\n');

if (FRONTEND_CATALOG.length !== BACKEND_CATALOG.length) {
  console.error(`❌ Cantidad de planes distinta: frontend tiene ${FRONTEND_CATALOG.length}, backend tiene ${BACKEND_CATALOG.length}`);
  hasErrors = true;
}

for (const frontendEntry of FRONTEND_CATALOG) {
  const backendEntry = BACKEND_CATALOG.find((p) => p.id === frontendEntry.id);

  if (!backendEntry) {
    console.error(`❌ El plan "${frontendEntry.id}" existe en el catálogo del frontend pero no en el del backend.`);
    hasErrors = true;
    continue;
  }

  if (frontendEntry.usd !== backendEntry.usd) {
    console.error(`❌ Precio USD desalineado para "${frontendEntry.id}": frontend=${frontendEntry.usd} vs backend=${backendEntry.usd}`);
    hasErrors = true;
  }

  if (frontendEntry.ars !== backendEntry.ars) {
    console.error(`❌ Precio ARS desalineado para "${frontendEntry.id}": frontend=${frontendEntry.ars} vs backend=${backendEntry.ars}`);
    hasErrors = true;
  }
}

for (const backendEntry of BACKEND_CATALOG) {
  if (!FRONTEND_CATALOG.find((p) => p.id === backendEntry.id)) {
    console.error(`❌ El plan "${backendEntry.id}" existe en el catálogo del backend pero no en el del frontend.`);
    hasErrors = true;
  }
}

if (hasErrors) {
  console.error('\n💥 Los catálogos de precios están desalineados. Editá ambos archivos con los mismos números:');
  console.error('   - src/shared/core/payments/pricingCatalog.ts');
  console.error('   - api/_lib/paymentProviders/pricingCatalog.ts');
  process.exit(1);
}

console.log(`✅ PASS: ${FRONTEND_CATALOG.length} planes verificados, frontend y backend cobran exactamente lo mismo.`);
process.exit(0);
