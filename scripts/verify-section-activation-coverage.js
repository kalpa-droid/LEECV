import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

console.log('🔍 Verificando motor de activación unificada de secciones (sectionActivationEngine)...');

const activationEnginePath = path.join(ROOT, 'src/shared/core/sections/sectionActivationEngine.ts');
const editorPanelPath = path.join(ROOT, 'src/modules/cv-builder/components/EditorPanel.tsx');

if (!fs.existsSync(activationEnginePath)) {
  console.error('❌ No existe sectionActivationEngine.ts');
  process.exit(1);
}

const engineContent = fs.readFileSync(activationEnginePath, 'utf-8');
const _editorPanelContent = fs.readFileSync(editorPanelPath, 'utf-8');

if (!engineContent.includes('export function activateSection')) {
  console.error('❌ sectionActivationEngine.ts no exporta la función activateSection');
  process.exit(1);
}

if (!engineContent.includes('sectionVisibility') || !engineContent.includes('targetTab')) {
  console.error('❌ sectionActivationEngine.ts no actualiza visibilidad ni devuelve el targetTab');
  process.exit(1);
}

console.log('✅ Verificación de motor de activación de secciones superada.');
