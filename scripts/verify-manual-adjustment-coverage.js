import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ts from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

console.log('🔍 Iniciando auditoría AST de cobertura de SectionManualAdjustment en UI...');

const editorPanelPath = path.join(ROOT, 'src/modules/cv-builder/components/EditorPanel.tsx');
const personalInfoPath = path.join(ROOT, 'src/modules/cv-builder/components/editor/PersonalInfoSection.tsx');
const sectionRegistryPath = path.join(ROOT, 'src/shared/core/sectionRegistry.ts');
const repeatablePath = path.join(ROOT, 'src/shared/core/ui/RepeatableSection.tsx');

if (!fs.existsSync(editorPanelPath) || !fs.existsSync(personalInfoPath) || !fs.existsSync(sectionRegistryPath) || !fs.existsSync(repeatablePath)) {
  console.error('❌ No se encontraron los archivos requeridos para la verificación AST.');
  process.exit(1);
}

// 1. Verify RepeatableSection contains slot rendering without depending on modules import
const repeatableContent = fs.readFileSync(repeatablePath, 'utf-8');
const hasSlotRender = repeatableContent.includes('manualAdjustment') || repeatableContent.includes('renderTrailingSlot');

if (!hasSlotRender) {
  console.error('❌ RepeatableSection.tsx no incluye la prop de renderizado manualAdjustment / renderTrailingSlot.');
  process.exit(1);
}

// 2. Parse sectionRegistry.ts to extract catalog section IDs
const registryContent = fs.readFileSync(sectionRegistryPath, 'utf-8');
const catalogMatches = [...registryContent.matchAll(/\{\s*id:\s*'([^']+)'/g)];
const expectedSectionIds = catalogMatches.map(m => m[1]);

// 3. Helper to parse AST and find JSX elements with VERIFIED manualAdjustment slot
function extractJsxSectionBindings(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  
  const boundIds = new Set();
  let hasDynamicCustomSectionSlot = false;

  function visit(node) {
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      const tagName = node.tagName.getText(sourceFile);
      const attrs = node.attributes.properties;
      
      const hasSlot = attrs.some(attr => 
        ts.isJsxAttribute(attr) && ['manualAdjustment', 'renderTrailingSlot'].includes(attr.name.getText(sourceFile))
      );

      if (tagName === 'SectionManualAdjustment') {
        const idAttr = attrs.find(attr => ts.isJsxAttribute(attr) && attr.name.getText(sourceFile) === 'sectionId');
        if (idAttr && idAttr.initializer && ts.isStringLiteral(idAttr.initializer)) {
          boundIds.add(idAttr.initializer.text);
        }
      } else if (['RecordFormSection', 'RepeatableSection'].includes(tagName)) {
        if (hasSlot) {
          const keyAttr = attrs.find(attr => ts.isJsxAttribute(attr) && attr.name.getText(sourceFile) === 'sectionKey');
          if (keyAttr && keyAttr.initializer) {
            if (ts.isStringLiteral(keyAttr.initializer)) {
              boundIds.add(keyAttr.initializer.text);
            } else if (keyAttr.initializer.getText(sourceFile).includes('cs.id')) {
              hasDynamicCustomSectionSlot = true;
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return { boundIds, hasDynamicCustomSectionSlot };
}

const editorResult = extractJsxSectionBindings(editorPanelPath);
const personalResult = extractJsxSectionBindings(personalInfoPath);

const allBoundIds = new Set([...editorResult.boundIds, ...personalResult.boundIds]);
const hasCustomSlot = editorResult.hasDynamicCustomSectionSlot || personalResult.hasDynamicCustomSectionSlot;

let missingSections = [];

expectedSectionIds.forEach(id => {
  if (!allBoundIds.has(id)) {
    missingSections.push(id);
  }
});

console.log(`\n── Cobertura Estructural AST (${expectedSectionIds.length} secciones en catálogo) ──`);

expectedSectionIds.forEach(id => {
  if (allBoundIds.has(id)) {
    console.log(`  ✓ Sección '${id}' -> Nodo AST JSX con prop de ajuste manual verificado OK.`);
  } else {
    console.log(`  ❌ Sección '${id}' -> FALTA prop de ajuste manual en nodo AST JSX.`);
  }
});

if (hasCustomSlot) {
  console.log(`  ✓ Secciones Personalizadas Dinámicas (cs.id) -> Slot de ajuste manual verificado OK.`);
} else {
  console.log(`  ❌ Secciones Personalizadas Dinámicas (cs.id) -> FALTA slot de ajuste manual.`);
  missingSections.push('customSections-dynamic');
}

if (missingSections.length > 0) {
  console.error(`\n❌ VERIFICACIÓN AST FALLIDA: ${missingSections.length} secciones no tienen slot de ajuste manual en el árbol AST JSX:`);
  missingSections.forEach(id => console.error(`   - ${id}`));
  process.exit(1);
}

console.log(`\n════════════════════════════════════════════════════════════`);
console.log(`✅ VERIFICACIÓN AST EXITOSA: Las ${expectedSectionIds.length}/${expectedSectionIds.length} secciones fijas + secciones custom tienen prop manualAdjustment/renderTrailingSlot real en el árbol AST JSX.`);
