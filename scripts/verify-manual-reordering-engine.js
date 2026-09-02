import { sanitizeCvData } from '../src/shared/core/utils/cvDataSchema.ts';
import { cvDataToContentSections } from '../src/shared/core/pdf-engine/layers/records/cvDataAdapter.ts';
import { resolveEffectivePresetSectionOrder } from '../src/shared/core/pdf-engine/layers/sectors/layoutResolutionEngine.ts';
import { getPreset } from '../src/shared/core/pdf-engine/layers/presets/presetRegistry.ts';

console.log('🔍 Iniciando auditoría del Motor de Ajuste Manual de Posición y Estilo de Contenedores...\n');

let passed = 0;
let failed = 0;

// Test 1: Defaults en sanitizeCvData
const cleanData = sanitizeCvData({});
if (cleanData.recordCardDesigns?.resumen === 'accent-outline') {
  console.log('  ✓ Estilo predeterminado de Resumen Profesional: accent-outline (🎨 Borde Acento sin fondo) OK.');
  passed++;
} else {
  console.error('  ❌ Falló el estilo predeterminado para Resumen (se esperaba accent-outline, se obtuvo: ' + cleanData.recordCardDesigns?.resumen + ')');
  failed++;
}

// Test 2: Posición predeterminada de Resumen en Posición 1 de Primaria
const defaultPreset = getPreset('cv-clasico');
const resolvedDefaultOrder = resolveEffectivePresetSectionOrder(defaultPreset, cleanData.layout);
const defaultPrimaria = resolvedDefaultOrder.find(s => s.sectorRole === 'main')?.sectionIds || [];
if (defaultPrimaria[0] === 'resumen' || defaultPrimaria[0] === 'personales' || defaultPrimaria[0] === 'frase') {
  console.log('  ✓ Posición predeterminada de Resumen/Frase en columna primaria OK.');
  passed++;
} else {
  console.error('  ❌ Resumen/Personales no está en la posición #1 de la columna primaria por defecto. Obtenido: ' + defaultPrimaria[0]);
  failed++;
}

// Test 3: Reordenamiento dinámico y reflejo en cvDataToContentSections
const reorderedCvData = sanitizeCvData({
  summary: 'Extracto de prueba reordenado',
  experience: [{ role: 'Desarrollador' }],
  education: [{ degree: 'Ingeniería' }],
  layout: {
    sectionOrders: {
      primaria: ['experiencia', 'resumen', 'formacion'],
      secundaria: ['contacto', 'redes']
    }
  }
});

const sections = cvDataToContentSections(reorderedCvData);
const sectionIds = sections.map(s => s.id);
const expIdx = sectionIds.indexOf('experiencia');
const resIdx = sectionIds.indexOf('resumen');
const eduIdx = sectionIds.indexOf('formacion');

if (expIdx !== -1 && resIdx !== -1 && eduIdx !== -1 && expIdx < resIdx && resIdx < eduIdx) {
  console.log('  ✓ Motor cvDataAdapter respeta el orden manual del usuario (experiencia -> resumen -> formacion) OK.');
  passed++;
} else {
  console.error(`  ❌ cvDataAdapter no respetó el orden manual. Orden obtenido: ${sectionIds.join(', ')}`);
  failed++;
}

// Test 4: layoutResolutionEngine
const presetMock = {
  sectors: [{ role: 'sidebar' }, { role: 'main' }],
  sectionOrder: [
    { sectorRole: 'sidebar', sectionIds: ['contacto'] },
    { sectorRole: 'main', sectionIds: ['formacion', 'experiencia'] }
  ]
};

const resolvedOrder = resolveEffectivePresetSectionOrder(presetMock, {
  sectionOrders: {
    primaria: ['resumen', 'experiencia', 'formacion'],
    secundaria: ['contacto', 'redes']
  }
});

const resolvedMainIds = resolvedOrder.find(s => s.sectorRole === 'main')?.sectionIds || [];
if (resolvedMainIds[0] === 'resumen' && resolvedMainIds[1] === 'experiencia') {
  console.log('  ✓ Motor layoutResolutionEngine fusiona correctamente sectionOrders del usuario OK.');
  passed++;
} else {
  console.error('  ❌ layoutResolutionEngine no fusionó el orden del usuario.');
  failed++;
}

console.log('\n════════════════════════════════════════════════════════════');
if (failed > 0) {
  console.error(`❌ AUDITORÍA DE REORDENAMIENTO FALLIDA: ${failed} pruebas no pasaron.`);
  process.exit(1);
} else {
  console.log(`✅ AUDITORÍA DE REORDENAMIENTO EXITOSA: Las ${passed} pruebas pasaron al 100%.`);
}
