import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { FIELD_CATALOG } from '../src/shared/core/pdf-engine/layers/records/fieldCatalog.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Iniciando verificación de consumo del Motor de PDF y cobertura de diseño (check-pdf-engine-usage)...');

// 1. Verificación de consumo de translateThemeToSurfaces
const presetEngineFile = path.resolve(__dirname, '../src/shared/core/pdf-engine/layers/presets/presetCompositionEngine.ts');
if (!fs.existsSync(presetEngineFile)) {
  console.error(`❌ ARCHIVO NO ENCONTRADO: ${presetEngineFile}`);
  process.exit(1);
}
const presetEngineContent = fs.readFileSync(presetEngineFile, 'utf8');
if (!presetEngineContent.includes('translateThemeToSurfaces(')) {
  console.error('❌ VERIFICACIÓN FALLIDA: translateThemeToSurfaces no está siendo consumido en presetCompositionEngine.ts.');
  process.exit(1);
}
console.log('  ✓ Consumo de translateThemeToSurfaces en presetCompositionEngine.ts OK.');

// 2. Verificación de consumo de resolveFieldDesign y resolveUnifiedTextSpec
const cardRendererFile = path.resolve(__dirname, '../src/shared/core/pdf-engine/layers/cards/CardObjectRenderer.tsx');
if (!fs.existsSync(cardRendererFile)) {
  console.error(`❌ ARCHIVO NO ENCONTRADO: ${cardRendererFile}`);
  process.exit(1);
}
const cardRendererContent = fs.readFileSync(cardRendererFile, 'utf8');
if (!cardRendererContent.includes('resolveFieldDesign(')) {
  console.error('❌ VERIFICACIÓN FALLIDA: resolveFieldDesign no está siendo consumido en CardObjectRenderer.tsx.');
  process.exit(1);
}
console.log('  ✓ Consumo de resolveFieldDesign en CardObjectRenderer.tsx OK.');

const unifiedEngineFile = path.resolve(__dirname, '../src/shared/core/pdf-engine/layers/typography/unifiedTextHierarchyEngine.ts');
if (!fs.existsSync(unifiedEngineFile)) {
  console.error(`❌ ARCHIVO NO ENCONTRADO: ${unifiedEngineFile}`);
  process.exit(1);
}
const unifiedEngineContent = fs.readFileSync(unifiedEngineFile, 'utf8');
if (!unifiedEngineContent.includes('resolveUnifiedTextSpec(')) {
  console.error('❌ VERIFICACIÓN FALLIDA: resolveUnifiedTextSpec no está exportado en unifiedTextHierarchyEngine.ts.');
  process.exit(1);
}
console.log('  ✓ Núcleo unificado resolveUnifiedTextSpec en unifiedTextHierarchyEngine.ts OK.');

// 3. Verificación de Cobertura Completa de Campos (checkFieldDesignCoverage)
const catalogKeys = Object.keys(FIELD_CATALOG);
let missingHintsCount = 0;

for (const key of catalogKeys) {
  const fieldDef = FIELD_CATALOG[key];
  if (!fieldDef || fieldDef.designHint === undefined) {
    console.error(`❌ COBERTURA INCOMPLETA: El campo '${key}' en FIELD_CATALOG no declara 'designHint'.`);
    missingHintsCount++;
  }
}

if (missingHintsCount > 0) {
  console.error(`❌ AUDITORÍA DE COBERTURA FALLIDA: ${missingHintsCount} campos de ${catalogKeys.length} no tienen designHint declarado.`);
  process.exit(1);
}

console.log(`✅ COBERTURA DE DISEÑO POR CAMPO AL 100%: Los ${catalogKeys.length}/${catalogKeys.length} campos del catálogo tienen su designHint declarado.`);

// 4. Verificación de consumo de resolveActivePreset en tiempo de ejecución
const previewFile = path.resolve(__dirname, '../src/modules/cv-builder/components/CVPreview.tsx');
if (!fs.existsSync(previewFile)) {
  console.error(`❌ ARCHIVO NO ENCONTRADO: ${previewFile}`);
  process.exit(1);
}
const previewContent = fs.readFileSync(previewFile, 'utf8');
if (!previewContent.includes('resolveActivePreset(')) {
  console.error('❌ VERIFICACIÓN FALLIDA: resolveActivePreset no está siendo consumido en CVPreview.tsx.');
  process.exit(1);
}
console.log('  ✓ Consumo de resolveActivePreset en tiempo de ejecución OK.');

// 5. Verificación de consumo de capas decorativas
const sectionBannerFile = path.resolve(__dirname, '../src/shared/core/pdf-engine/layers/cards/SectionBannerCard.tsx');
const sectionBannerContent = fs.readFileSync(sectionBannerFile, 'utf8');
if (!sectionBannerContent.includes('dividerStyle')) {
  console.error('❌ VERIFICACIÓN FALLIDA: dividerStyle no está siendo consumido en SectionBannerCard.tsx.');
  process.exit(1);
}
console.log('  ✓ Consumo de dividerStyle en SectionBannerCard.tsx OK.');

const templateRendererFile = path.resolve(__dirname, '../src/shared/core/pdf-engine/renderer/TemplateRenderer.tsx');
const templateRendererContent = fs.readFileSync(templateRendererFile, 'utf8');
if (!templateRendererContent.includes('DecorativeBackgroundRenderer')) {
  console.error('❌ VERIFICACIÓN FALLIDA: DecorativeBackgroundRenderer no está siendo consumido en TemplateRenderer.tsx.');
  process.exit(1);
}
console.log('  ✓ Consumo de DecorativeBackgroundRenderer en TemplateRenderer.tsx OK.');

