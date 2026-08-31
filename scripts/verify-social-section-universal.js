import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

console.log('🔍 Verificando sección universal de Redes Sociales y Migrador...');

const registryPath = path.join(ROOT, 'src/shared/core/sectionRegistry.ts');
const migrationPath = path.join(ROOT, 'src/shared/core/storage/cvMigrationEngine.ts');
const personalInfoPath = path.join(ROOT, 'src/modules/cv-builder/components/editor/PersonalInfoSection.tsx');
const editorPanelPath = path.join(ROOT, 'src/modules/cv-builder/components/EditorPanel.tsx');

const registryContent = fs.readFileSync(registryPath, 'utf-8');
const migrationContent = fs.readFileSync(migrationPath, 'utf-8');
const personalInfoContent = fs.readFileSync(personalInfoPath, 'utf-8');
const editorPanelContent = fs.readFileSync(editorPanelPath, 'utf-8');

// Assert 1: redes section exists in sectionRegistry
if (!registryContent.includes("id: 'redes'")) {
  console.error('❌ redes no existe en sectionRegistry.ts');
  process.exit(1);
}

// Assert 2: email and website are migrated in cvMigrationEngine.ts
if (!migrationContent.includes("plataforma: 'Email'") || !migrationContent.includes("plataforma: 'Sitio Web / Portafolio'")) {
  console.error('❌ cvMigrationEngine.ts no contiene el paso de migración para email y website');
  process.exit(1);
}

// Assert 3: email and website fields were removed from PersonalInfoSection.tsx
if (personalInfoContent.includes('id="email"') || personalInfoContent.includes('id="website"')) {
  console.error('❌ PersonalInfoSection.tsx aún conserva los campos de email o website');
  process.exit(1);
}

// Assert 4: EditorPanel.tsx renders redes section
if (!editorPanelContent.includes("activeTab === 'redes'")) {
  console.error('❌ EditorPanel.tsx no renderiza la pestaña redes');
  process.exit(1);
}

console.log('✅ Verificación de sección universal de Redes Sociales completada con éxito.');
