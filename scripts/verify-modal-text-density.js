import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

console.log('🔍 Verificando simplificación de densidad de texto en modales e InfoHint...');

const glossaryPath = path.join(ROOT, 'src/shared/core/ui/uiTextGlossary.ts');
const infoHintPath = path.join(ROOT, 'src/shared/core/ui/InfoHint.tsx');
const savedModalPath = path.join(ROOT, 'src/modules/cv-builder/components/SavedCVsModal.tsx');

if (!fs.existsSync(glossaryPath) || !fs.existsSync(infoHintPath) || !fs.existsSync(savedModalPath)) {
  console.error('❌ Falta un archivo esencial (uiTextGlossary.ts, InfoHint.tsx o SavedCVsModal.tsx)');
  process.exit(1);
}

const glossaryContent = fs.readFileSync(glossaryPath, 'utf-8');
const infoHintContent = fs.readFileSync(infoHintPath, 'utf-8');
const savedModalContent = fs.readFileSync(savedModalPath, 'utf-8');

let passed = 0;
let failed = 0;

// Assert 1: glossary exports UI_GLOSSARY
if (glossaryContent.includes('UI_GLOSSARY') && glossaryContent.includes('getUiHint')) {
  console.log('  ✓ Motor uiTextGlossary: Exporta la estructura canónica UI_GLOSSARY y getUiHint OK.');
  passed++;
} else {
  console.error('  ❌ uiTextGlossary.ts no exporta UI_GLOSSARY o getUiHint');
  failed++;
}

// Assert 2: InfoHint soporta la prop variant para escritorio y celular (hover | tap | inline)
if (infoHintContent.includes("variant?: 'hover' | 'tap' | 'inline'") && infoHintContent.includes("variant === 'tap'")) {
  console.log('  ✓ Componente InfoHint: Soporta modo adaptativo para celular y touch (variant="tap") OK.');
  passed++;
} else {
  console.error('  ❌ InfoHint.tsx no soporta la prop variant adaptativa para móvil.');
  failed++;
}

// Assert 3: SavedCVsModal consume InfoHint conectado al glosario
if (savedModalContent.includes('<InfoHint') && savedModalContent.includes('hintId="draftDot"')) {
  console.log('  ✓ Integración en Modal: SavedCVsModal consume <InfoHint hintId="draftDot" variant="tap" /> OK.');
  passed++;
} else {
  console.error('  ❌ SavedCVsModal no incluye el componente InfoHint conectado.');
  failed++;
}

console.log('\n════════════════════════════════════════════════════════════');
if (failed > 0) {
  console.error(`❌ AUDITORÍA DE DENSIDAD DE TEXTOS FALLIDA: ${failed} verificaciones no pasaron.`);
  process.exit(1);
} else {
  console.log(`✅ Verificación de densidad de textos e InfoHint superada con éxito (${passed} verificaciones pasaron).`);
}
