/**
 * SCRIPT DE PRUEBA ANTI-REGRESIÓN — AUDITORÍA DE COBERTURA DE FORMULARIOS EN EDITORPANEL
 * (verify-editor-panel-coverage.js)
 * 
 * Garantiza que CADA sección declarada en `SECTION_CATALOG` (sectionRegistry.ts)
 * posea un manejador de formulario o tab activo correspondiente en `EditorPanel.tsx` o `PersonalInfoSection.tsx`.
 * Si se agrega una sección al catálogo sin cablear su formulario de edición, esta prueba falla inmediatamente.
 */

import fs from 'fs';
import path from 'path';
import { SECTION_CATALOG } from '../src/shared/core/sectionRegistry.js';

console.log('🔍 Iniciando auditoría anti-regresión de cobertura de formularios en EditorPanel...\n');

const editorPanelPath = path.resolve(process.cwd(), 'src/modules/cv-builder/components/EditorPanel.tsx');
const personalInfoPath = path.resolve(process.cwd(), 'src/modules/cv-builder/components/editor/PersonalInfoSection.tsx');

if (!fs.existsSync(editorPanelPath)) {
  console.error(`❌ ERROR CRÍTICO: No se encontró el archivo ${editorPanelPath}`);
  process.exit(1);
}

const editorPanelContent = fs.readFileSync(editorPanelPath, 'utf8');
const personalInfoContent = fs.existsSync(personalInfoPath) ? fs.readFileSync(personalInfoPath, 'utf8') : '';

let totalChecks = 0;
let failedChecks = 0;

// ÚNICAS secciones del catálogo cuyo formulario está embebido/absorbido en PersonalInfoSection.tsx
const PERSONAL_TAB_ABSORBED = new Set(['contacto', 'datos-personales', 'frase']);

for (const entry of SECTION_CATALOG) {
  totalChecks++;
  const sectionId = entry.id;

  if (PERSONAL_TAB_ABSORBED.has(sectionId)) {
    // Para la pestaña personal, verificamos que EditorPanel maneje 'personales' y PersonalInfoSection tenga los campos
    const hasPersonalTabInEditor = editorPanelContent.includes("activeTab === 'personales'");
    const hasFieldInPersonalInfo = personalInfoContent.includes('updatePersonalInfo') || personalInfoContent.includes('cvData.personalInfo');
    if (hasPersonalTabInEditor && hasFieldInPersonalInfo) {
      console.log(`  ✓ Cobertura Formulario [Sección: ${sectionId}] -> Absorbida en pestaña 'personales' OK.`);
    } else {
      console.error(`❌ FALLO DE COBERTURA [Sección: ${sectionId}]: Falta manejador para activeTab === 'personales' en EditorPanel.tsx`);
      failedChecks++;
    }
  } else {
    // Para secciones independientes, buscamos match exacto en EditorPanel de activeTab === 'sectionId'
    const matchesSectionId = editorPanelContent.includes(`activeTab === '${sectionId}'`) || editorPanelContent.includes(`activeTab === "${sectionId}"`);

    if (matchesSectionId) {
      console.log(`  ✓ Cobertura Formulario [Sección: ${sectionId}] -> Enrutamiento activeTab OK.`);
    } else {
      console.error(`❌ FALLO DE COBERTURA [Sección: ${sectionId}]: No se encontró bloque de formulario para activeTab === '${sectionId}' en EditorPanel.tsx`);
      failedChecks++;
    }
  }
}

console.log('\n════════════════════════════════════════════════════════════');
if (failedChecks > 0) {
  console.error(`❌ PRUEBA ANTI-REGRESIÓN FALLIDA: ${failedChecks} de ${totalChecks} secciones del catálogo no tienen formulario en EditorPanel.tsx.`);
  process.exit(1);
} else {
  console.log(`✅ PRUEBA ANTI-REGRESIÓN EXITOSA: Las ${totalChecks}/${totalChecks} secciones de SECTION_CATALOG tienen formulario de edición cableado.`);
}
