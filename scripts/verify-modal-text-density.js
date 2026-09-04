import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

console.log('🔍 Verificando simplificación de densidad de texto en modales e InfoHint...');

let passed = 0;
let failed = 0;

const glossaryPath = path.join(ROOT, 'src/shared/core/uiTextGlossary.ts');
const savedModalPath = path.join(ROOT, 'src/modules/cv-builder/components/SavedCVsModal.tsx');
const editorPanelPath = path.join(ROOT, 'src/modules/cv-builder/components/EditorPanel.tsx');

const glossaryContent = fs.readFileSync(glossaryPath, 'utf-8');
const savedModalContent = fs.readFileSync(savedModalPath, 'utf-8');
const editorPanelContent = fs.readFileSync(editorPanelPath, 'utf-8');

// Assert 1: uiTextGlossary exporta getUiHint y cascadaDiseno
if (glossaryContent.includes('getUiHint') && glossaryContent.includes('cascadaDiseno')) {
  console.log('  ✓ Motor uiTextGlossary: Exporta la estructura canónica UI_GLOSSARY y getUiHint OK.');
  passed++;
} else {
  console.error('  ❌ uiTextGlossary.ts no incluye getUiHint o cascadaDiseno.');
  failed++;
}

// Assert 2: SavedCVsModal no contiene la caja explicativa triplicada
if (!savedModalContent.includes('Explanation Banner') && !savedModalContent.includes('Borrador (En Edición)')) {
  console.log('  ✓ Modales: Poda de caja explicativa triplicada en SavedCVsModal OK.');
  passed++;
} else {
  console.error('  ❌ SavedCVsModal.tsx aún contiene la caja explicativa triplicada.');
  failed++;
}

// Assert 3: EditorPanel consume cascadaDiseno
if (editorPanelContent.includes("getUiHint('cascadaDiseno')")) {
  console.log('  ✓ EditorPanel: Consume el aviso de la cascada de 3 niveles desde el glosario OK.');
  passed++;
} else {
  console.error('  ❌ EditorPanel.tsx no consume getUiHint(\'cascadaDiseno\').');
  failed++;
}

console.log('\n════════════════════════════════════════════════════════════');
if (failed > 0) {
  console.error(`❌ VERIFICACIÓN DE DENSIDAD DE TEXTO FALLIDA: ${failed} pruebas no pasaron.`);
  process.exit(1);
} else {
  console.log(`✅ VERIFICACIÓN DE DENSIDAD DE TEXTO EXITOSA: Las ${passed} pruebas pasaron al 100%.`);
}
