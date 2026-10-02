import { PRICING_CATALOG } from '../src/shared/core/payments/pricingCatalog.js';
import fs from 'fs';

const LEGAL_FILES = [
  'src/shared/legal/TermsOfServiceContent.tsx',
  'src/shared/legal/PrivacyPolicyContent.tsx',
  'src/modules/legal/RefundPolicyPage.tsx',
];

// Nombres de planes que existieron pero ya no están en el catálogo —
// si alguno aparece literal en un documento legal, algo quedó hardcodeado.
const RETIRED_PLAN_NAMES = ['Enterprise', 'enterprise'];

let hasErrors = false;
for (const file of LEGAL_FILES) {
  if (!fs.existsSync(file)) {
    console.error(`❌ El archivo ${file} no existe.`);
    hasErrors = true;
    continue;
  }
  
  const content = fs.readFileSync(file, 'utf-8');
  for (const retired of RETIRED_PLAN_NAMES) {
    if (content.includes(retired)) {
      console.error(`❌ ${file} menciona "${retired}", que no existe en PRICING_CATALOG.`);
      hasErrors = true;
    }
  }
}

if (hasErrors) {
  process.exit(1);
}

console.log('✅ PASS: Todos los documentos legales están limpios de referencias a planes retirados.');
process.exit(0);
