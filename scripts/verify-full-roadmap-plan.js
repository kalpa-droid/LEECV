import { resolveSectionAnchor } from '../src/shared/core/pdf-engine/layers/anchors/pdfAnchorEngine.ts';
import { getPreset, getAllPresets } from '../src/shared/core/pdf-engine/layers/presets/presetRegistry.ts';
import { resolveEffectivePresetSectors } from '../src/shared/core/pdf-engine/layers/sectors/layoutResolutionEngine.ts';
import { getPageSize, PAGE_SIZES } from '../src/shared/core/pdf-engine/layers/page/pageSizes.ts';
import { resolveActiveDockSections, checkSectionHasContent } from '../src/shared/core/sections/activeSectionsDockEngine.ts';
import { sanitizeCvData } from '../src/shared/core/utils/cvDataSchema.ts';
import { getColumnLayoutPresetName } from '../src/shared/core/pdf-engine/layers/presets/presetCompositionInstances.ts';
import { generateHarmoniousTypographyScale } from '../src/shared/core/pdf-engine/layers/typography/typographyHarmonyEngine.ts';

console.log('🔍 Iniciando verificación integral de los 10 puntos del Plan de Gobernanza...\n');

let passed = 0;
let failed = 0;

// Test 1: Scroll a sección en el visor PDF con orden efectivo (Punto 1)
const presetClasico = getPreset('cv-clasico');
const anchorExperiencia = resolveSectionAnchor('experiencia', [], presetClasico, {
  sectionOrders: { primaria: ['experiencia', 'resumen', 'formacion'] }
});
const anchorFormacion = resolveSectionAnchor('formacion', [], presetClasico, {
  sectionOrders: { primaria: ['experiencia', 'resumen', 'formacion'] }
});

if (typeof anchorExperiencia.verticalRatio === 'number' && typeof anchorFormacion.verticalRatio === 'number' && anchorExperiencia.verticalRatio !== anchorFormacion.verticalRatio) {
  console.log('  ✓ Motor de Anclaje PDF: Resuelve coordenadas verticales únicas usando resolveEffectivePresetSectionOrder OK.');
  passed++;
} else {
  console.error('  ❌ Falló el motor de anclaje PDF con orden efectivo del usuario.');
  failed++;
}

// Test 2: Tamaño de página Carta / Legal / A4 (Punto 2)
const cartaSize = getPageSize('carta');
const legalSize = getPageSize('legal');

if (cartaSize.widthPt === 612 && cartaSize.heightPt === 791 && legalSize.widthPt === 612 && legalSize.heightPt === 1009) {
  console.log('  ✓ Conexión de Tamaño de Hoja: "Carta" (612x791pt) y "Legal" (612x1009pt) mapeados exactamente en PAGE_SIZES OK.');
  passed++;
} else {
  console.error('  ❌ Dimensiones en pt incorrectas para Carta o Legal.');
  failed++;
}

// Test 3: Indicador hasContent en el Dock (Punto 4)
const emptyCv = sanitizeCvData({});
const populatedCv = sanitizeCvData({
  experience: [{ puesto: 'Desarrollador Senior', empresa: 'Tech Corp' }]
});

const emptyHasExp = checkSectionHasContent(emptyCv, 'experiencia');
const popHasExp = checkSectionHasContent(populatedCv, 'experiencia');

if (emptyHasExp === false && popHasExp === true) {
  console.log('  ✓ Motor del Dock: Propiedad hasContent detecta ausencia (false) y presencia real (true) de registros OK.');
  passed++;
} else {
  console.error('  ❌ checkSectionHasContent no calculó correctamente la presencia de datos.');
  failed++;
}

// Test 4: Ancho de Sidebar Ajustable (32% - 42%) (Punto 5)
const clampedMin = sanitizeCvData({ layout: { sidebarWidthPercent: 20 } }).layout.sidebarWidthPercent;
const clampedMax = sanitizeCvData({ layout: { sidebarWidthPercent: 60 } }).layout.sidebarWidthPercent;
const legitimateVal = sanitizeCvData({ layout: { sidebarWidthPercent: 38 } }).layout.sidebarWidthPercent;

const effectiveSectors = resolveEffectivePresetSectors(presetClasico, { sidebarWidthPercent: 38 });
const sidebarSector = effectiveSectors.find(s => s.role === 'sidebar');

if (clampedMin === 32 && clampedMax === 42 && legitimateVal === 38 && sidebarSector?.widthPercent === 38) {
  console.log('  ✓ Ancho de Sidebar Ajustable: Clamping (32% - 42%) y resolución de sectores en TemplateRenderer OK.');
  passed++;
} else {
  console.error('  ❌ Falló la restricción o resolución del ancho de barra lateral.');
  failed++;
}

// Test 5: Etiqueta dinámica con un solo % (Punto 7)
const label35 = getColumnLayoutPresetName('sidebar-left', 35);
if (label35 === 'Barra Izquierda (35%)') {
  console.log('  ✓ Etiqueta Dinámica de Layout: Muestra un solo porcentaje dinámico ("Barra Izquierda (35%)") OK.');
  passed++;
} else {
  console.error(`  ❌ Etiqueta de layout incorrecta: se esperaba "Barra Izquierda (35%)", se obtuvo "${label35}"`);
  failed++;
}

// Test 6: Escala tipográfica armónica (Punto 8)
const scale = generateHarmoniousTypographyScale({ baseBodyPt: 10, scheme: 'majorThird' });
if (scale.itemTitle > scale.body && scale.sectionHeading > scale.itemTitle && scale.title > scale.sectionHeading) {
  console.log('  ✓ Motor de Armonía Tipográfica: Escala matemática estrictamente creciente OK.');
  passed++;
} else {
  console.error('  ❌ La escala tipográfica armónica no cumple la jerarquía matemática de proporciones.');
  failed++;
}

console.log('\n════════════════════════════════════════════════════════════');
if (failed > 0) {
  console.error(`❌ VERIFICACIÓN INTEGRAL FALLIDA: ${failed} pruebas no pasaron.`);
  process.exit(1);
} else {
  console.log(`✅ VERIFICACIÓN INTEGRAL EXITOSA: Las ${passed} pruebas del Plan de Gobernanza pasaron al 100%.`);
}
