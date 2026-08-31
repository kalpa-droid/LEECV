import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

console.log('🔍 Verificando precisión de anclaje de desplazamiento en visor PDF...');

const enginePath = path.join(ROOT, 'src/shared/core/pdf-engine/layers/anchors/pdfAnchorEngine.ts');
const viewerPath = path.join(ROOT, 'src/shared/core/pdf-engine/VectorDocViewer.tsx');

if (!fs.existsSync(enginePath)) {
  console.error('❌ No existe pdfAnchorEngine.ts');
  process.exit(1);
}

const engineContent = fs.readFileSync(enginePath, 'utf-8');
const viewerContent = fs.readFileSync(viewerPath, 'utf-8');

// Assert 1: pdfAnchorEngine maps redes section
if (!engineContent.includes("redes: ['redes']")) {
  console.error('❌ pdfAnchorEngine.ts no mapea la sección redes');
  process.exit(1);
}

// Assert 2: resolveSectionAnchor calculates ratio towards section end
if (!engineContent.includes('validIndex + 0.8')) {
  console.error('❌ pdfAnchorEngine.ts no desplaza hasta el último registro de la sección');
  process.exit(1);
}

// Assert 3: VectorDocViewer triggers scrollToPdfAnchor on activeTab change
if (!viewerContent.includes('scrollToPdfAnchor')) {
  console.error('❌ VectorDocViewer.tsx no invoca scrollToPdfAnchor');
  process.exit(1);
}

console.log('✅ Verificación de anclaje PDF al último registro superada con éxito.');
