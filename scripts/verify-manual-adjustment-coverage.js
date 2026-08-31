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

// 3. Helper to parse AST and find JSX attributes for sectionId and sectionKey
function extractJsxSectionBindings(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  
  const boundIds = new Set();

  function visit(node) {
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      const tagName = node.tagName.getText(sourceFile);
      if (['SectionManualAdjustment', 'RecordFormSection', 'RepeatableSection'].includes(tagName)) {
        node.attributes.properties.forEach(attr => {
          if (ts.isJsxAttribute(attr) && ['sectionId', 'sectionKey'].includes(attr.name.getText(sourceFile))) {
            if (attr.initializer && ts.isStringLiteral(attr.initializer)) {
              boundIds.add(attr.initializer.text);
            }
          }
        });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return boundIds;
}

const editorBoundIds = extractJsxSectionBindings(editorPanelPath);
const personalBoundIds = extractJsxSectionBindings(personalInfoPath);

const allBoundIds = new Set([...editorBoundIds, ...personalBoundIds]);

let missingSections = [];

expectedSectionIds.forEach(id => {
  if (!allBoundIds.has(id)) {
    missingSections.push(id);
  }
});

console.log(`\n── Cobertura Estructural AST (${expectedSectionIds.length} secciones en catálogo) ──`);

expectedSectionIds.forEach(id => {
  if (allBoundIds.has(id)) {
    console.log(`  ✓ Sección '${id}' -> Nodo AST JSX verificado OK.`);
  } else {
    console.log(`  ❌ Sección '${id}' -> FALTA vínculo AST JSX.`);
  }
});

if (missingSections.length > 0) {
  console.error(`\n❌ VERIFICACIÓN AST FALLIDA: ${missingSections.length} secciones no tienen vinculación de AST JSX:`);
  missingSections.forEach(id => console.error(`   - ${id}`));
  process.exit(1);
}

console.log(`\n════════════════════════════════════════════════════════════`);
console.log(`✅ VERIFICACIÓN AST EXITOSA: Las ${expectedSectionIds.length}/${expectedSectionIds.length} secciones del catálogo tienen binding JSX real en el árbol AST.`);
