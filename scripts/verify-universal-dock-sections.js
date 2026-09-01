import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

console.log('🔍 Iniciando verificación de Secciones Universales en Dock...');

const sectionRegistryPath = path.join(ROOT, 'src/shared/core/sectionRegistry.ts');
const activeDockEnginePath = path.join(ROOT, 'src/shared/core/sections/activeSectionsDockEngine.ts');
const cvFormatRegistryPath = path.join(ROOT, 'src/shared/core/formats/cvFormatRegistry.ts');

if (!fs.existsSync(sectionRegistryPath)) {
  console.error('❌ No existe sectionRegistry.ts');
  process.exit(1);
}

if (!fs.existsSync(activeDockEnginePath)) {
  console.error('❌ No existe activeSectionsDockEngine.ts');
  process.exit(1);
}

const sectionContent = fs.readFileSync(sectionRegistryPath, 'utf-8');
const activeDockContent = fs.readFileSync(activeDockEnginePath, 'utf-8');
const formatContent = fs.readFileSync(cvFormatRegistryPath, 'utf-8');

// Assert 1: sectionRegistry defines isUniversal property
if (!sectionContent.includes('isUniversal?: boolean')) {
  console.error('❌ SectionCatalogEntry no define la propiedad isUniversal');
  process.exit(1);
}

// Assert 2: SECTION_CATALOG has redes section entry
if (!sectionContent.includes("id: 'redes'")) {
  console.error('❌ SECTION_CATALOG no contiene la sección universal redes');
  process.exit(1);
}

// Assert 3: CV_FORMAT_REGISTRY defaultVisibleSections includes redes across formats
if (!formatContent.includes("'redes'")) {
  console.error('❌ CV_FORMAT_REGISTRY no incluye la sección redes en sus visibilidades por defecto');
  process.exit(1);
}

// Assert 4: activeSectionsDockEngine preserves catalog entries with isDisabled flag
if (!activeDockContent.includes('isDisabled: visibility[entry.id] === false')) {
  console.error('❌ activeSectionsDockEngine.ts no asigna la bandera isDisabled correctamente');
  process.exit(1);
}

console.log('✅ Verificación de Secciones Universales en Dock completada con éxito.');
