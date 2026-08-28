import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Iniciando verificación de consumo del Motor de PDF (check-pdf-engine-usage)...');

const targetFile = path.resolve(__dirname, '../src/shared/core/pdf-engine/layers/presets/presetCompositionEngine.ts');

if (!fs.existsSync(targetFile)) {
  console.error(`❌ ARCHIVO NO ENCONTRADO: ${targetFile}`);
  process.exit(1);
}

const content = fs.readFileSync(targetFile, 'utf8');

if (!content.includes('translateThemeToSurfaces(')) {
  console.error('❌ VERIFICACIÓN FALLIDA: translateThemeToSurfaces no está siendo consumido en presetCompositionEngine.ts.');
  process.exit(1);
}

console.log('✅ Verificación de consumo de translateThemeToSurfaces pasada exitosamente.');
