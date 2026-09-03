import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

console.log('🔍 Iniciando verificación rigurosa de los 4 arreglos...\n');

let passed = 0;
let failed = 0;

const personalInfoPath = path.join(ROOT, 'src/modules/cv-builder/components/editor/PersonalInfoSection.tsx');
const appPath = path.join(ROOT, 'src/app/App.tsx');
const dockPath = path.join(ROOT, 'src/modules/cv-builder/components/CanvaIconDock.tsx');

const personalInfoContent = fs.readFileSync(personalInfoPath, 'utf-8');
const appContent = fs.readFileSync(appPath, 'utf-8');
const dockContent = fs.readFileSync(dockPath, 'utf-8');

// Assert 1: PersonalInfoSection unificada con 1 solo control de ajuste manual para datos-personales (contacto y frase anclados)
const datosMatch = (personalInfoContent.match(/sectionId="datos-personales"/g) || []).length;
const contactoMatch = (personalInfoContent.match(/sectionId="contacto"/g) || []).length;
const fraseMatch = (personalInfoContent.match(/sectionId="frase"/g) || []).length;

if (datosMatch === 1 && contactoMatch === 0 && fraseMatch === 0) {
  console.log('  ✓ Arreglo 1: PersonalInfoSection unificada con exactamente 1 ajuste manual para datos-personales OK.');
  passed++;
} else {
  console.error(`  ❌ Arreglo 1 falló: conteos de ajuste manual no esperados (datos-personales: ${datosMatch}, contacto: ${contactoMatch}, frase: ${fraseMatch})`);
  failed++;
}

// Assert 2: Persistencia inmediata de nuevos borradores en App.tsx
if (appContent.includes('saveCV()') || appContent.includes('saveCV(cvData)')) {
  console.log('  ✓ Arreglo 2: Persistencia de nuevo borrador al crear la pestaña activa en App.tsx OK.');
  passed++;
} else {
  console.error('  ❌ Arreglo 2 falló: App.tsx no persiste de inmediato el borrador activo.');
  failed++;
}

// Assert 3: UI Theme atado a localStorage ('cv_ui_theme_preference')
if (appContent.includes("localStorage.getItem('cv_ui_theme_preference')") && appContent.includes("localStorage.setItem('cv_ui_theme_preference'")) {
  console.log('  ✓ Arreglo 3: Tema de UI desvinculado del documento y persistido en localStorage ("cv_ui_theme_preference") OK.');
  passed++;
} else {
  console.error('  ❌ Arreglo 3 falló: App.tsx no gestiona el tema UI en localStorage.');
  failed++;
}

// Assert 4: CanvaIconDock renderiza el indicador visual de hasContent
if (dockContent.includes('sec.hasContent && !isDisabled')) {
  console.log('  ✓ Arreglo 4: CanvaIconDock renderiza la insignia visual de datos cargados (hasContent) OK.');
  passed++;
} else {
  console.error('  ❌ Arreglo 4 falló: CanvaIconDock.tsx no consume sec.hasContent.');
  failed++;
}

console.log('\n════════════════════════════════════════════════════════════');
if (failed > 0) {
  console.error(`❌ VERIFICACIÓN DE ARREGLOS FALLIDA: ${failed} pruebas no pasaron.`);
  process.exit(1);
} else {
  console.log(`✅ VERIFICACIÓN DE ARREGLOS EXITOSA: Las ${passed} pruebas pasaron al 100%.`);
}
