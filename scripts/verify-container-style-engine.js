import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

console.log('🔍 Verificando motor de estilos de contenedor y bordes...');

const enginePath = path.join(ROOT, 'src/shared/core/styles/containerStyleEngine.ts');
const schemaPath = path.join(ROOT, 'src/shared/core/pdf-engine/layers/cards/cardDesignSchema.ts');
const adjustmentPath = path.join(ROOT, 'src/modules/cv-builder/components/editor/SectionManualAdjustment.tsx');

if (!fs.existsSync(enginePath)) {
  console.error('❌ No existe containerStyleEngine.ts');
  process.exit(1);
}

const engineContent = fs.readFileSync(enginePath, 'utf-8');
const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
const adjustmentContent = fs.readFileSync(adjustmentPath, 'utf-8');

// Assert 1: containerStyleEngine exports CONTAINER_STYLE_PRESETS
if (!engineContent.includes('CONTAINER_STYLE_PRESETS')) {
  console.error('❌ containerStyleEngine.ts no define CONTAINER_STYLE_PRESETS');
  process.exit(1);
}

// Assert 2: cardDesignSchema includes fill and outline presets
if (!schemaContent.includes("'accent-outline'") || !schemaContent.includes("'clean'")) {
  console.error('❌ cardDesignSchema.ts no incluye presets de resalte sin fondo u opción limpia');
  process.exit(1);
}

// Assert 3: SectionManualAdjustment includes container style selector
if (!adjustmentContent.includes('handleSetCardDesign') || !adjustmentContent.includes('🎨 Borde Acento')) {
  console.error('❌ SectionManualAdjustment.tsx no incluye el selector unificado de Estilo de Contenedor');
  process.exit(1);
}

console.log('✅ Verificación de motor de estilos de contenedor superada con éxito.');
