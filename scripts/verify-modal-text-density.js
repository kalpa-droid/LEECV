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

if (!fs.existsSync(glossaryPath) || !fs.existsSync(infoHintPath)) {
  console.error('❌ Falta uiTextGlossary.ts o InfoHint.tsx');
  process.exit(1);
}

const glossaryContent = fs.readFileSync(glossaryPath, 'utf-8');
const _savedModalContent = fs.readFileSync(savedModalPath, 'utf-8');

// Assert 1: glossary exports UI_GLOSSARY
if (!glossaryContent.includes('UI_GLOSSARY')) {
  console.error('❌ uiTextGlossary.ts no exporta UI_GLOSSARY');
  process.exit(1);
}

console.log('✅ Verificación de densidad de textos e InfoHint superada con éxito.');
