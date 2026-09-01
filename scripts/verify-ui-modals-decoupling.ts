/**
 * SCRIPT DE AUTOCOMPROBACIÓN Y AUDITORÍA ANTI-REGRESIÓN
 * Verifica el desacoplamiento de modales UI (Guardar, Abrir, Copia por Puesto, Exportación Portátil).
 */

import React from 'react';
import fs from 'fs';
import path from 'path';

console.log('🔍 Iniciando auditoría anti-regresión del Desacoplamiento de Modales UI...\n');

let totalChecks = 0;
let failedChecks = 0;

// 1. Verificación del componente SaveAsVersionModal.tsx
totalChecks++;
const saveAsModalPath = path.resolve(process.cwd(), 'src/modules/cv-builder/components/SaveAsVersionModal.tsx');
if (!fs.existsSync(saveAsModalPath)) {
  console.error('❌ FALLO UI: SaveAsVersionModal.tsx no existe.');
  failedChecks++;
} else {
  const content = fs.readFileSync(saveAsModalPath, 'utf8');
  if (content.includes('JOB_POSITION_CATALOG') && content.includes('SaveAsVersionModal') && !content.includes('onExportJson')) {
    console.log('  ✓ Modal Desacoplamiento: SaveAsVersionModal.tsx existe y se enfoca exclusivamente en clonación por puesto.');
  } else {
    console.error('❌ FALLO UI: SaveAsVersionModal.tsx contiene dependencias o botones redundantes.');
    failedChecks++;
  }
}

// 2. Verificación de Navbar.tsx desacoplado
totalChecks++;
const navbarPath = path.resolve(process.cwd(), 'src/modules/cv-builder/components/Navbar.tsx');
const navbarContent = fs.readFileSync(navbarPath, 'utf8');
if (navbarContent.includes('onOpenSaveAsModal') && navbarContent.includes('onSaveCVClick') && navbarContent.includes('onOpenJsonDownloadModal')) {
  console.log('  ✓ Barra de Navegación: Navbar.tsx dispara acciones directas y desacopladas (Guardar, Guardar como copia, Copia Portátil).');
} else {
  console.error('❌ FALLO UI: Navbar.tsx no tiene los callbacks de acciones desacopladas.');
  failedChecks++;
}

// 3. Verificación de SavedCVsModal.tsx (Importación .JSON y .ZIP)
totalChecks++;
const savedCVsModalPath = path.resolve(process.cwd(), 'src/modules/cv-builder/components/SavedCVsModal.tsx');
const savedCVsContent = fs.readFileSync(savedCVsModalPath, 'utf8');
if (savedCVsContent.includes('Importar Respaldo (.JSON / .ZIP)') && savedCVsContent.includes('accept=".json,.zip"')) {
  console.log('  ✓ Modal Abrir Documento: SavedCVsModal.tsx soporta importación de respaldos .json y .zip.');
} else {
  console.error('❌ FALLO UI: SavedCVsModal.tsx no soporta los formatos de respaldo unificados.');
  failedChecks++;
}

console.log('\n════════════════════════════════════════════════════════════');
if (failedChecks > 0) {
  console.error(`❌ AUDITORÍA DE DESACOPLAMIENTO UI FALLIDA: ${failedChecks} de ${totalChecks} verificaciones no pasaron.`);
  process.exit(1);
} else {
  console.log(`✅ AUDITORÍA DE DESACOPLAMIENTO UI EXITOSA: ${totalChecks} verificaciones pasaron al 100%.`);
}
