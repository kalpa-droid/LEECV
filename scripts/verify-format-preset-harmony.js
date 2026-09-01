#!/usr/bin/env node
/**
 * verify-format-preset-harmony.js
 * Script de verificación de armonía entre Formato Global (Nivel 1), Plantilla Base (Nivel 2)
 * y resolución dinámica al abrir/cargar documentos guardados.
 */

import { resolveActiveFormatId, resolveActiveFormat } from '../src/shared/core/formats/cvFormatRegistry.js';
import { applyPresetLevel } from '../src/shared/core/pdf-engine/layers/presets/presetHierarchyEngine.js';
import { sanitizeCvData } from '../src/shared/core/utils/cvDataSchema.js';

let passed = 0;
let failed = 0;

function assert(label, condition, detail) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.log(`  ✗ ${label} — ${detail}`);
    failed++;
  }
}

console.log('🔍 Iniciando verificación de Armonía de Formatos y Presets...\n');

// 1. Inferencia de Formato al Cargar Documento Guardado Antiguo (sin activeFormatId en JSON)
const legacyCv2Col = {
  id: 'cv_legado_2col',
  activePresetId: 'modern-corporate'
};

const inferred2Col = resolveActiveFormatId(legacyCv2Col);
assert(
  'CV guardado antiguo con preset 2 columnas (modern-corporate) infiere latam-clasico',
  inferred2Col === 'latam-clasico',
  `Se esperaba latam-clasico, se obtuvo ${inferred2Col}`
);

const legacyCv1Col = {
  id: 'cv_legado_1col',
  activePresetId: 'minimal-editorial'
};

const inferred1Col = resolveActiveFormatId(legacyCv1Col);
assert(
  'CV guardado antiguo con preset 1 columna (minimal-editorial) infiere ats-one-column',
  inferred1Col === 'ats-one-column',
  `Se esperaba ats-one-column, se obtuvo ${inferred1Col}`
);

// 2. Normalización de cvDataSchema (sanitizeCvData)
const sanitized = sanitizeCvData(legacyCv2Col);
assert(
  'sanitizeCvData asigna el activeFormatId inferido al abrir el documento',
  sanitized.activeFormatId === 'latam-clasico',
  `Se esperaba latam-clasico, se obtuvo ${sanitized.activeFormatId}`
);

// 3. Sincronización en la Cascada de 3 Niveles (presetHierarchyEngine)
const afterPresetChange = applyPresetLevel(sanitized, 'preset', { presetId: 'minimal-editorial' });
assert(
  'Cambiar a plantilla minimal-editorial (1 columna) actualiza activeFormatId a ats-one-column',
  afterPresetChange.activeFormatId === 'ats-one-column',
  `Se esperaba ats-one-column, se obtuvo ${afterPresetChange.activeFormatId}`
);

const afterFormatChange = applyPresetLevel(afterPresetChange, 'format', { formatId: 'europass' });
assert(
  'Cambiar a formato Europass asigna activeFormatId: europass y columnLayoutPresetId: sidebar-left',
  afterFormatChange.activeFormatId === 'europass' && afterFormatChange.columnLayoutPresetId === 'sidebar-left',
  `Se esperaba europass y sidebar-left, se obtuvo ${afterFormatChange.activeFormatId} y ${afterFormatChange.columnLayoutPresetId}`
);

console.log(`\n${'═'.repeat(60)}`);
if (failed === 0) {
  console.log(`✅ VERIFICACIÓN DE ARMONÍA FORMATOS/PRESETS EXITOSA: ${passed}/${passed + failed}`);
  process.exit(0);
} else {
  console.log(`❌ FALLÓ LA VERIFICACIÓN DE ARMONÍA: ${passed} pasaron, ${failed} fallaron`);
  process.exit(1);
}
