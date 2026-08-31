import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

console.log('🔍 Verificando muelle móvil, micro-espaciado y remoción de flechas inactivas...');

const dockPath = path.join(ROOT, 'src/modules/cv-builder/components/CanvaIconDock.tsx');

if (!fs.existsSync(dockPath)) {
  console.error('❌ No existe CanvaIconDock.tsx');
  process.exit(1);
}

const dockContent = fs.readFileSync(dockPath, 'utf-8');

// Assert 1: Inactive Chevron arrows have been removed
if (dockContent.includes('ChevronDown') || dockContent.includes('ChevronRight')) {
  console.error('❌ CanvaIconDock.tsx aún contiene flechas decorativas inactivas (ChevronDown/ChevronRight)');
  process.exit(1);
}

// Assert 2: Mobile nav uses micro-gap tuning (p-1 gap-1)
if (!dockContent.includes('p-1 grid grid-rows-2 grid-flow-col gap-1')) {
  console.error('❌ CanvaIconDock.tsx no utiliza el micro-espaciado p-1 gap-1 en celular');
  process.exit(1);
}

// Assert 3: Leading double-size buttons row-span-2 exist for Menu, Plus, Palette
if (!dockContent.includes('row-span-2') || !dockContent.includes('col-span-2')) {
  console.error('❌ CanvaIconDock.tsx no asigna doble tamaño (span-2) a Menú, Agregar Sección y Paleta');
  process.exit(1);
}

console.log('✅ Verificación de muelle móvil y remoción de flechas superada con éxito.');
