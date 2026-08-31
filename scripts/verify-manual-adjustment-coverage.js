import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

console.log('🔍 Iniciando auditoría anti-regresión de cobertura de SectionManualAdjustment en UI...');

const editorPanelPath = path.join(ROOT, 'src/modules/cv-builder/components/EditorPanel.tsx');
const personalInfoPath = path.join(ROOT, 'src/modules/cv-builder/components/editor/PersonalInfoSection.tsx');
const sectionRegistryPath = path.join(ROOT, 'src/shared/core/sectionRegistry.ts');

if (!fs.existsSync(editorPanelPath) || !fs.existsSync(personalInfoPath) || !fs.existsSync(sectionRegistryPath)) {
  console.error('❌ No se encontraron los archivos requeridos para la verificación.');
  process.exit(1);
}

const registryContent = fs.readFileSync(sectionRegistryPath, 'utf-8');
const editorContent = fs.readFileSync(editorPanelPath, 'utf-8');
const personalContent = fs.readFileSync(personalInfoPath, 'utf-8');

const combinedContent = editorContent + '\n' + personalContent;

// Extract section IDs from SECTION_CATALOG array definition in sectionRegistry.ts
const catalogMatches = [...registryContent.matchAll(/\{\s*id:\s*'([^']+)'/g)];
const expectedSectionIds = catalogMatches.map(m => m[1]);

const repeatablePath = path.join(ROOT, 'src/shared/core/ui/RepeatableSection.tsx');
if (!fs.existsSync(repeatablePath)) {
  console.error('❌ No se encontró RepeatableSection.tsx.');
  process.exit(1);
}

const repeatableContent = fs.readFileSync(repeatablePath, 'utf-8');
const hasRepeatableIntegration = repeatableContent.includes('<SectionManualAdjustment sectionId={sectionKey}');

if (!hasRepeatableIntegration) {
  console.error('❌ RepeatableSection.tsx no incluye <SectionManualAdjustment sectionId={sectionKey} />.');
  process.exit(1);
}

let missingSections = [];

expectedSectionIds.forEach(id => {
  const directPattern = new RegExp(`<SectionManualAdjustment[^>]*sectionId=["']${id}["']`, 'i');
  const keyPattern = new RegExp(`sectionKey=["']${id}["']`, 'i');
  if (!directPattern.test(combinedContent) && !keyPattern.test(combinedContent)) {
    missingSections.push(id);
  }
});

console.log(`\n── Cobertura de Ajuste Manual (${expectedSectionIds.length} secciones en catálogo) ──`);

expectedSectionIds.forEach(id => {
  const directPattern = new RegExp(`<SectionManualAdjustment[^>]*sectionId=["']${id}["']`, 'i');
  const keyPattern = new RegExp(`sectionKey=["']${id}["']`, 'i');
  if (directPattern.test(combinedContent) || keyPattern.test(combinedContent)) {
    console.log(`  ✓ Sección '${id}' -> Manual Adjustment cableado OK.`);
  } else {
    console.log(`  ❌ Sección '${id}' -> FALTA SectionManualAdjustment cableado.`);
  }
});

if (missingSections.length > 0) {
  console.error(`\n❌ VERIFICACIÓN FALLIDA: ${missingSections.length} secciones no tienen SectionManualAdjustment cableado:`);
  missingSections.forEach(id => console.error(`   - ${id}`));
  process.exit(1);
}

console.log(`\n════════════════════════════════════════════════════════════`);
console.log(`✅ COBERTURA 100% EXITOSA: Las ${expectedSectionIds.length}/${expectedSectionIds.length} secciones del catálogo tienen SectionManualAdjustment cableado.`);
