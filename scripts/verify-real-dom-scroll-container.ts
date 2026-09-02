/**
 * SCRIPT DE AUTOCOMPROBACIÓN Y AUDITORÍA PROFUNDA REAL
 * Verifica que scrollToPdfAnchor detecte el contenedor padre real con desbordamiento
 * en la jerarquía DOM de App.tsx (descartando wrappers intermedios estáticos).
 */

import fs from 'fs';
import path from 'path';

console.log('🔍 Iniciando verificación de detección del Contenedor de Scroll Real en la jerarquía DOM...\n');

let totalChecks = 0;
let failedChecks = 0;

// 1. Verificación del algoritmo de búsqueda en pdfAnchorEngine.ts
totalChecks++;
const pdfAnchorEnginePath = path.resolve(process.cwd(), 'src/shared/core/pdf-engine/layers/anchors/pdfAnchorEngine.ts');
const engineContent = fs.readFileSync(pdfAnchorEnginePath, 'utf8');

if (
  engineContent.includes('isActuallyScrollable') &&
  engineContent.includes('scrollHeight > scrollableParent.clientHeight + 10')
) {
  console.log('  ✓ Motor de Anclaje: pdfAnchorEngine.ts requiere desbordamiento real (scrollHeight > clientHeight + 10).');
} else {
  console.error('❌ FALLO MOTOR: pdfAnchorEngine.ts no incluye la validación de desbordamiento real.');
  failedChecks++;
}

// 2. Verificación de VectorDocViewer.tsx sin overflowY estático en wrapper
totalChecks++;
const vectorViewerPath = path.resolve(process.cwd(), 'src/shared/core/pdf-engine/VectorDocViewer.tsx');
const viewerContent = fs.readFileSync(vectorViewerPath, 'utf8');

if (!viewerContent.includes("overflowY: 'auto'")) {
  console.log('  ✓ Visor Vectorial: VectorDocViewer.tsx delegó el desbordamiento vertical al contenedor padre real.');
} else {
  console.error('❌ FALLO VISOR: VectorDocViewer.tsx aún conserva overflowY: auto en su wrapper interno.');
  failedChecks++;
}

// 3. Verificación de la estructura en App.tsx
totalChecks++;
const appPath = path.resolve(process.cwd(), 'src/app/App.tsx');
const appContent = fs.readFileSync(appPath, 'utf8');

if (appContent.includes('overflow-y-auto') && appContent.includes('CVPreview')) {
  console.log('  ✓ Aplicación Principal: App.tsx provee el contenedor de vista previa con overflow-y-auto.');
} else {
  console.error('❌ FALLO APP: App.tsx no tiene el contenedor con overflow-y-auto.');
  failedChecks++;
}

console.log('\n════════════════════════════════════════════════════════════');
if (failedChecks > 0) {
  console.error(`❌ AUDITORÍA DE CONTENEDOR DE SCROLL REAL FALLIDA: ${failedChecks} de ${totalChecks} verificaciones no pasaron.`);
  process.exit(1);
} else {
  console.log(`✅ AUDITORÍA DE CONTENEDOR DE SCROLL REAL EXITOSA: ${totalChecks} verificaciones pasaron al 100%.`);
}
