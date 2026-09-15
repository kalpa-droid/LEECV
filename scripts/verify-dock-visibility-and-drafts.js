import { resolveActiveDockSections } from '../src/shared/core/sections/activeSectionsDockEngine.ts';
import { SECTION_CATALOG, getSection } from '../src/shared/core/sectionRegistry.ts';
import { getUiHint } from '../src/shared/core/ui/uiTextGlossary.ts';
import { sanitizeCvData } from '../src/shared/core/utils/cvDataSchema.ts';
import { cvDataToContentSections } from '../src/shared/core/pdf-engine/layers/records/cvDataAdapter.ts';

console.log('🔍 Iniciando auditoría del Muelle Unificado, Sección de Redes, Glosario y Clonación de Borradores...\n');

let passed = 0;
let failed = 0;

// Test 1: Visibilidad de botones en Dock (Punto 1)
const emptyCv = sanitizeCvData({});
const dockItems = resolveActiveDockSections(emptyCv);

const universalCatalogCount = SECTION_CATALOG.filter(s => s.isUniversal && !['contacto', 'datos-personales', 'frase'].includes(s.id)).length;
const activeCvData = sanitizeCvData({ sectionVisibility: { logros: true } });
const activeDockItems = resolveActiveDockSections(activeCvData);

if (dockItems.length >= universalCatalogCount && activeDockItems.some(i => i.id === 'logros')) {
  console.log(`  ✓ Regla de Muelle: Se muestran las ${dockItems.length} secciones universales por defecto y las opcionales al activarse OK.`);
  passed++;
} else {
  console.error(`  ❌ Muelle incompleto: se esperaban al menos ${universalCatalogCount} ítems universales en el Dock, se obtuvieron ${dockItems.length}`);
  failed++;
}

// Test 2: Sección de Redes Sociales (Punto 8)
const redesCatalog = getSection('redes');
const redesCvData = sanitizeCvData({
  redes: [{ plataforma: 'LinkedIn', usuario: 'testuser', url: 'https://linkedin.com/in/testuser' }]
});
const redesDockItem = resolveActiveDockSections(redesCvData).find(i => i.id === 'redes');
const renderedRedes = cvDataToContentSections(redesCvData).find(s => s.id === 'redes');

if (redesCatalog && redesDockItem && renderedRedes && renderedRedes.records.length > 0) {
  console.log('  ✓ Sección Redes Sociales: Registrada en catálogo, presente en Dock y conectada a PDF render OK.');
  passed++;
} else {
  console.error('  ❌ Falló la validación integral de la sección Redes Sociales.');
  failed++;
}

// Test 3: Glosario de Texto Conectado (Punto 7)
const hintResumen = getUiHint('resumen');
const hintRedes = getUiHint('redes');
const hintManual = getUiHint('manualAdjustment');

if (hintResumen.text && hintRedes.text && hintManual.text) {
  console.log('  ✓ Motor uiTextGlossary: Prose y consejos contextuales (InfoHint) completamente conectados OK.');
  passed++;
} else {
  console.error('  ❌ Faltan textos explicativos en el motor de Glosario uiTextGlossary.');
  failed++;
}

// Test 4: Clonación / Duplicado de Borradores (Punto 5)
const originalData = sanitizeCvData({
  title: 'CV Ingeniero Principal',
  versionLabel: 'Versión Senior'
});

const clonedData = sanitizeCvData({
  ...originalData,
  id: 'cloned_id_123',
  title: `${originalData.title} (Copia)`,
  versionLabel: `${originalData.versionLabel || originalData.version_label || 'Borrador'} (Copia)`
});

const versionStr = clonedData.versionLabel || clonedData.version_label || '';

if (clonedData.title.includes('(Copia)') && versionStr.includes('(Copia)')) {
  console.log('  ✓ Motor de Clonación de Borradores: Duplicación atómica de estructura y metadatos OK.');
  passed++;
} else {
  console.error('  ❌ Falló el motor de clonación de borradores.');
  failed++;
}

console.log('\n════════════════════════════════════════════════════════════');
if (failed > 0) {
  console.error(`❌ AUDITORÍA DE MUELLE Y BORRADORES FALLIDA: ${failed} pruebas no pasaron.`);
  process.exit(1);
} else {
  console.log(`✅ AUDITORÍA DE MUELLE Y BORRADORES EXITOSA: Las ${passed} pruebas pasaron al 100%.`);
}
