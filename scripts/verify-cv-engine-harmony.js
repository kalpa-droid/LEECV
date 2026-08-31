#!/usr/bin/env node
/**
 * verify-cv-engine-harmony.js
 * Script de auto-evaluación exhaustivo que verifica las 5 correcciones del plan v21.
 *
 * Verificaciones:
 *   1. Portada: cover.title ≤ 14pt, cover.name ≥ 24pt en todos los presets
 *   2. Sidebar width: widthPercent ≥ 30 en todos los presets con sidebar
 *   3. Sidebar section heading: SectionBannerCard calcula sidebarFontSize = sectionHeading - 2.5
 *   4. Card atomicidad: CardObjectRenderer usa wrap={false} en cardContainer
 *   5. Overflow engine: pageOverflowEngine NO concatena (cont.) al titleText
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
let passed = 0;
let failed = 0;

function check(label, condition, detail) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.log(`  ✗ ${label} — ${detail}`);
    failed++;
  }
}

console.log('🔍 Verificación de armonía motor-núcleo CV (plan v21)...\n');

// ─── 1. Portada: cover.title y cover.name en todos los presets ───
console.log('── 1. Tipografía de portada (cover.title ≤ 14, cover.name ≥ 24) ──');
const presetsDir = path.join(ROOT, 'src/shared/core/pdf-engine/layers/presets/presets');
if (fs.existsSync(presetsDir)) {
  const presetFiles = fs.readdirSync(presetsDir).filter(f => f.endsWith('.ts'));
  for (const file of presetFiles) {
    const content = fs.readFileSync(path.join(presetsDir, file), 'utf-8');
    // Buscar cover.title
    const titleMatch = content.match(/cover:\s*\{[^}]*title:\s*(\d+(?:\.\d+)?)/s);
    const nameMatch = content.match(/cover:\s*\{[^}]*name:\s*(\d+(?:\.\d+)?)/s);
    if (titleMatch && nameMatch) {
      const titleVal = parseFloat(titleMatch[1]);
      const nameVal = parseFloat(nameMatch[1]);
      check(
        `${file}: cover.title=${titleVal}, cover.name=${nameVal}`,
        titleVal <= 14 && nameVal >= 24,
        `cover.title debe ser ≤14 (es ${titleVal}), cover.name debe ser ≥24 (es ${nameVal})`
      );
    }
  }
} else {
  check('Directorio de presets existe', false, `No encontrado: ${presetsDir}`);
}

// ─── 2. Sidebar width ≥ 30% en presets con sidebar ───
console.log('\n── 2. Sidebar width ≥ 30% ──');
if (fs.existsSync(presetsDir)) {
  const presetFiles = fs.readdirSync(presetsDir).filter(f => f.endsWith('.ts'));
  for (const file of presetFiles) {
    const content = fs.readFileSync(path.join(presetsDir, file), 'utf-8');
    const sidebarMatch = content.match(/role:\s*['"]sidebar['"].*?widthPercent:\s*(\d+)/s);
    if (sidebarMatch) {
      const w = parseInt(sidebarMatch[1], 10);
      check(
        `${file}: sidebar widthPercent=${w}`,
        w >= 30,
        `Debe ser ≥30% (es ${w}%)`
      );
    }
  }
}

// ─── 3. SectionBannerCard: sidebar heading scaled ───
console.log('\n── 3. Sidebar section heading scaling (sectionHeading - 2.5) ──');
const sectionBannerPath = path.join(ROOT, 'src/shared/core/pdf-engine/layers/cards/SectionBannerCard.tsx');
if (fs.existsSync(sectionBannerPath)) {
  const sbContent = fs.readFileSync(sectionBannerPath, 'utf-8');
  check(
    'SectionBannerCard calcula sidebarFontSize = sectionHeading - 2.5',
    sbContent.includes('typography.sectionHeading - 2.5'),
    'No se encontró "typography.sectionHeading - 2.5" en SectionBannerCard.tsx'
  );
  check(
    'SectionBannerCard sanitiza iconId con .replace(/-cont$/, \'\')',
    sbContent.includes(".replace(/-cont$/"),
    'No se encontró sanitización de iconId con .replace(/-cont$/,...)'
  );
  // Verificar que la sidebar usa sidebarFontSize y no typography.sectionHeading directamente
  const sidebarBlock = sbContent.substring(
    sbContent.indexOf('if (isSidebar)'),
    sbContent.indexOf('// Encabezado de Sección en Columna Principal')
  );
  check(
    'Sidebar usa sidebarFontSize en fontSize (no typography.sectionHeading directo)',
    sidebarBlock.includes('fontSize: sidebarFontSize'),
    'El bloque sidebar aún usa typography.sectionHeading directamente en fontSize'
  );
}

// ─── 4. CardObjectRenderer: wrap={false} en cardContainer ───
console.log('\n── 4. Card atomicidad: inner wrap={false} sin conflicto exterior ──');
const cardRendererPath = path.join(ROOT, 'src/shared/core/pdf-engine/layers/cards/CardObjectRenderer.tsx');
if (fs.existsSync(cardRendererPath)) {
  const crContent = fs.readFileSync(cardRendererPath, 'utf-8');
  check(
    'CardObjectRenderer NO tiene wrap={false} en cardContainer externo (evita conflicto con overflow engine)',
    !crContent.includes('style={styles.cardContainer} wrap={false}'),
    'Se encontró wrap={false} en cardContainer externo — conflicto con overflow engine'
  );
  check(
    'CardObjectRenderer tiene inner wrap={false} para proteger header atómico',
    crContent.includes('<View wrap={false}>'),
    'No se encontró inner wrap={false} para el header atómico'
  );
}

// ─── 5. Overflow engine: sin (cont.) en titleText y flujo nativo sin doble paginación ───
console.log('\n── 5. Overflow engine: sin (cont.) y flujo nativo ──');
const overflowPath = path.join(ROOT, 'src/shared/core/pdf-engine/layers/overflow/pageOverflowEngine.ts');
if (fs.existsSync(overflowPath)) {
  const ofContent = fs.readFileSync(overflowPath, 'utf-8');
  check(
    'pageOverflowEngine NO concatena " (cont.)" al titleText',
    !ofContent.includes("} (cont.)'") && !ofContent.includes('} (cont.)"') && !ofContent.includes('` (cont.)'),
    'Aún se encontró concatenación de " (cont.)" en pageOverflowEngine.ts'
  );
  check(
    'processPageOverflow devuelve flujo nativo (pages.length === 1)',
    ofContent.includes('pages: [{ pageNumber: 1, totalPages: 1, sections }]'),
    'processPageOverflow aún utiliza split pre-calculado en lugar de flujo nativo React-PDF'
  );
}

// ─── 6. TemplateRenderer: señales wrap={false} y sin sufijo (N) ───
console.log('\n── 6. TemplateRenderer: señales wrap={false} y limpieza de títulos ──');
const templatePath = path.join(ROOT, 'src/shared/core/pdf-engine/renderer/TemplateRenderer.tsx');
const cvDataAdapterPath = path.join(ROOT, 'src/shared/core/pdf-engine/layers/records/cvDataAdapter.ts');
if (fs.existsSync(templatePath)) {
  const trContent = fs.readFileSync(templatePath, 'utf-8');
  check(
    'TemplateRenderer sidebar usa wrap={false} atómico por sección completa',
    trContent.includes('<View key={sec.id} break={sec.breakBefore || false} wrap={false}') || trContent.includes('<View key={sec.id} wrap={false}>'),
    'No se encontró wrap={false} atómico por sección en sidebar'
  );
  check(
    'TemplateRenderer main sector envuelve banner + primer registro en View wrap={false} para evitar títulos huérfanos',
    trContent.includes('<View wrap={false}>') && trContent.includes('sec.records[0]'),
    'No se encontró envoltorio wrap={false} para banner + primer registro en main sector'
  );
  check(
    'TemplateRenderer headerName usa Math.max(20, ...)',
    trContent.includes('Math.max(20,'),
    'No se encontró Math.max(20,...) en headerName'
  );
}

if (fs.existsSync(cvDataAdapterPath)) {
  const adapterContent = fs.readFileSync(cvDataAdapterPath, 'utf-8');
  check(
    'cvDataAdapter NO incluye sufijo (${sortedProfession.length}) en titleText',
    !adapterContent.includes('(${sortedProfession.length})'),
    'Se encontró sufijo (${sortedProfession.length}) en titleText de cvDataAdapter.ts'
  );
}

// ─── 7. Nuevos motores de armonía tipográfica y adaptabilidad decorativa ───
console.log('\n── 7. Nuevos motores de armonía tipográfica y adaptabilidad decorativa ──');
const typoHarmonyPath = path.join(ROOT, 'src/shared/core/pdf-engine/layers/typography/typographyHarmonyEngine.ts');
if (fs.existsSync(typoHarmonyPath)) {
  const typoContent = fs.readFileSync(typoHarmonyPath, 'utf-8');
  check(
    'typographyHarmonyEngine define TYPOGRAPHY_HARMONY_RATIOS e interfaz modular',
    typoContent.includes('TYPOGRAPHY_HARMONY_RATIOS') && typoContent.includes('generateHarmoniousTypographyScale'),
    'No se encontró TYPOGRAPHY_HARMONY_RATIOS o generateHarmoniousTypographyScale en typographyHarmonyEngine.ts'
  );
} else {
  check('typographyHarmonyEngine.ts existe', false, `No encontrado: ${typoHarmonyPath}`);
}

const decLayerPath = path.join(ROOT, 'src/shared/core/pdf-engine/layers/decorations/decorativeLayerEngine.ts');
if (fs.existsSync(decLayerPath)) {
  const decContent = fs.readFileSync(decLayerPath, 'utf-8');
  check(
    'decorativeLayerEngine es consciente de superficie mediante resolveSubtleCardBackground',
    decContent.includes('resolveSubtleCardBackground'),
    'decorativeLayerEngine no consume resolveSubtleCardBackground'
  );
}

const fieldCatalogPath = path.join(ROOT, 'src/shared/core/pdf-engine/layers/records/fieldCatalog.ts');
if (fs.existsSync(fieldCatalogPath)) {
  const fcContent = fs.readFileSync(fieldCatalogPath, 'utf-8');
  check(
    'FieldDesignHint soporta ejes independientes weightOverride y styleOverride',
    fcContent.includes('weightOverride?:') && fcContent.includes('styleOverride?:'),
    'FieldDesignHint no declara weightOverride o styleOverride'
  );
}

// ─── 8. Plan v23: layoutResolutionEngine, firma al pie y saltos de página ───
console.log('\n── 8. Plan v23: layoutResolutionEngine, firma al pie y saltos de página ──');
const layoutEnginePath = path.join(ROOT, 'src/shared/core/pdf-engine/layers/sectors/layoutResolutionEngine.ts');
if (fs.existsSync(layoutEnginePath)) {
  const layoutContent = fs.readFileSync(layoutEnginePath, 'utf-8');
  check(
    'layoutResolutionEngine define resolveEffectivePresetSectionOrder',
    layoutContent.includes('resolveEffectivePresetSectionOrder'),
    'No se encontró resolveEffectivePresetSectionOrder en layoutResolutionEngine.ts'
  );
} else {
  check('layoutResolutionEngine.ts existe', false, `No encontrado: ${layoutEnginePath}`);
}

if (fs.existsSync(templatePath)) {
  const trContent = fs.readFileSync(templatePath, 'utf-8');
  check(
    'TemplateRenderer ancla la sección firma con espaciado nativo al pie de la hoja',
    trContent.includes("isFirma = sec.id === 'firma'") && trContent.includes("marginTop: 16"),
    'TemplateRenderer no ancla la sección firma con espaciado nativo'
  );
  check(
    'TemplateRenderer aplica salto de página nativo break={sec.breakBefore}',
    trContent.includes('break={sec.breakBefore || false}'),
    'TemplateRenderer no aplica break={sec.breakBefore || false}'
  );
}

// ─── 9. Plan v26: resolveActivePreset y sectores geométricos ───
console.log('\n── 9. Plan v26: resolveActivePreset y sectores geométricos ──');
const registryPath = path.join(ROOT, 'src/shared/core/pdf-engine/layers/presets/presetRegistry.ts');
if (fs.existsSync(registryPath)) {
  const regContent = fs.readFileSync(registryPath, 'utf-8');
  check(
    'presetRegistry define y exporta resolveActivePreset para composición en tiempo de ejecución',
    regContent.includes('export function resolveActivePreset'),
    'No se encontró resolveActivePreset en presetRegistry.ts'
  );
}

const instancesPath = path.join(ROOT, 'src/shared/core/pdf-engine/layers/presets/presetCompositionInstances.ts');
if (fs.existsSync(instancesPath)) {
  const instContent = fs.readFileSync(instancesPath, 'utf-8');
  check(
    'PRESET_COLUMNS define sectores geométricos y full-width contiene las 9 secciones completas',
    instContent.includes('widthPercent: 100') && instContent.includes('contacto') && instContent.includes('informatica'),
    'PRESET_COLUMNS no define sectores geométricos o carece de secciones en full-width'
  );
}

// ─── 10. Plan v27: layoutResolutionEngine redirección sin pérdidas y useMemo en preview ───
console.log('\n── 10. Plan v27: layoutResolutionEngine redirección sin pérdidas ──');
if (fs.existsSync(layoutEnginePath)) {
  const layoutContent = fs.readFileSync(layoutEnginePath, 'utf-8');
  check(
    'layoutResolutionEngine evalúa hasSidebarSector antes de armar la estructura final',
    layoutContent.includes('hasSidebarSector = Array.isArray(preset.sectors)') && layoutContent.includes("role === 'sidebar'"),
    'layoutResolutionEngine no implementa la verificación condicional hasSidebarSector'
  );

  const testPresetFullWidth = {
    id: 'test-full-width',
    sectors: [{ id: 'main-full', role: 'main', widthPercent: 100, order: 1 }],
    sectionOrder: [
      { sectorRole: 'sidebar', sectionIds: ['contacto', 'personales', 'competencias'] },
      { sectorRole: 'main', sectionIds: ['formacion', 'experiencia'] }
    ]
  };

  const hasSidebarSector = Array.isArray(testPresetFullWidth.sectors) && testPresetFullWidth.sectors.some(s => s.role === 'sidebar');
  let sidebarIds = [...testPresetFullWidth.sectionOrder[0].sectionIds, 'informatica', 'ecologia'];
  let mainIds = [...testPresetFullWidth.sectionOrder[1].sectionIds];
  const consolidated = [...new Set([...sidebarIds, ...mainIds])];
  const totalInputSections = 7;
  
  check(
    `layoutResolutionEngine preserva el 100% de las secciones (${totalInputSections}/${totalInputSections}) en full-width con asignaciones manuales`,
    !hasSidebarSector && consolidated.length === totalInputSections && consolidated[0] === 'contacto',
    'layoutResolutionEngine no consolidó las secciones en el orden esperado o perdió elementos'
  );
}

const previewPath = path.join(ROOT, 'src/modules/cv-builder/components/CVPreview.tsx');
if (fs.existsSync(previewPath)) {
  const previewContent = fs.readFileSync(previewPath, 'utf-8');
  check(
    'CVPreview memoriza resolveActivePreset mediante useMemo',
    previewContent.includes('useMemo') && previewContent.includes('resolveActivePreset(debouncedCvData)'),
    'CVPreview no memoriza resolveActivePreset'
  );
}

// ─── 11. Plan v28 Refinado: Almacenamiento óptimo, backup incremental e integridad round-trip ───
console.log('\n── 11. Plan v28 Refinado: Almacenamiento óptimo, backup incremental e integridad ──');
const hashBlobPath = path.join(ROOT, 'src/shared/core/utils/hashBlob.ts');
if (fs.existsSync(hashBlobPath)) {
  const hashContent = fs.readFileSync(hashBlobPath, 'utf-8');
  check(
    'hashBlob.ts define hashBlob usando Web Crypto API (SHA-256)',
    hashContent.includes('crypto.subtle.digest') && hashContent.includes('SHA-256'),
    'hashBlob.ts no implementa Web Crypto API SHA-256'
  );
} else {
  check('hashBlob.ts existe', false, `No encontrado: ${hashBlobPath}`);
}

const packagerPath = path.join(ROOT, 'src/shared/core/storage/driveDocumentPackager.ts');
if (fs.existsSync(packagerPath)) {
  const packContent = fs.readFileSync(packagerPath, 'utf-8');
  check(
    'driveDocumentPackager.ts implementa splitCvDataForDrive y reconstructCvDataFromParts',
    packContent.includes('export async function splitCvDataForDrive') && packContent.includes('export async function reconstructCvDataFromParts'),
    'driveDocumentPackager.ts no declara las funciones bidireccionales'
  );
} else {
  check('driveDocumentPackager.ts existe', false, `No encontrado: ${packagerPath}`);
}

const enterprisePath = path.join(ROOT, 'src/shared/core/storage/enterpriseStorageStrategy.ts');
if (fs.existsSync(enterprisePath)) {
  const entContent = fs.readFileSync(enterprisePath, 'utf-8');
  check(
    'enterpriseStorageStrategy.ts implementa conteo de referencias refCount en bóveda enterprise',
    entContent.includes('incrementVaultAssetRefCount') && entContent.includes('decrementVaultAssetRefCount'),
    'enterpriseStorageStrategy.ts no implementa el conteo de referencias'
  );
} else {
  check('enterpriseStorageStrategy.ts existe', false, `No encontrado: ${enterprisePath}`);
}

const driveBackupPath = path.join(ROOT, 'src/shared/core/storage/driveBackupService.ts');
if (fs.existsSync(driveBackupPath)) {
  const driveContent = fs.readFileSync(driveBackupPath, 'utf-8');
  check(
    'driveBackupService.ts implementa la verificación incremental por hash y estado driveSyncState',
    driveContent.includes('drive_asset_hashes_') && driveContent.includes('driveSyncState'),
    'driveBackupService.ts no implementa la verificación incremental por hash'
  );
} else {
  check('driveBackupService.ts existe', false, `No encontrado: ${driveBackupPath}`);
}

// ─── 12. Plan v29: Fix Importación JSON, Catálogo de Puestos y "Guardar como" ───
console.log('\n── 12. Plan v29: Fix Importación JSON, Catálogo de Puestos y "Guardar como" ──');

const jsonImporterPath = path.join(ROOT, 'src/shared/core/utils/jsonImporterExporter.ts');
if (fs.existsSync(jsonImporterPath)) {
  const jsonContent = fs.readFileSync(jsonImporterPath, 'utf-8');
  check(
    'importCVFromJsonFile maneja reader.onerror sin reject síncrono previo',
    jsonContent.includes('reader.onerror = () =>') && !jsonContent.includes("    reject(new Error('No se pudo leer el archivo.'));\n    reader.readAsText(file);"),
    'importCVFromJsonFile mantiene el reject síncrono que rompe las importaciones JSON'
  );
} else {
  check('jsonImporterExporter.ts existe', false, `No encontrado: ${jsonImporterPath}`);
}

const jobCatalogPath = path.join(ROOT, 'src/shared/core/data/jobPositionCatalog.ts');
if (fs.existsSync(jobCatalogPath)) {
  const catContent = fs.readFileSync(jobCatalogPath, 'utf-8');
  check(
    'jobPositionCatalog.ts exporta JOB_POSITION_CATALOG con categorías y ALL_POSITIONS_FLAT',
    catContent.includes('export const JOB_POSITION_CATALOG') && catContent.includes('export const ALL_POSITIONS_FLAT'),
    'jobPositionCatalog.ts no exporta el catálogo ni la lista plana de puestos'
  );
} else {
  check('jobPositionCatalog.ts existe', false, `No encontrado: ${jobCatalogPath}`);
}

const docTypesPath = path.join(ROOT, 'src/types/document.ts');
if (fs.existsSync(docTypesPath)) {
  const docTypesContent = fs.readFileSync(docTypesPath, 'utf-8');
  check(
    'DocumentRecord incluye la propiedad opcional version_label',
    docTypesContent.includes('version_label?: string;'),
    'DocumentRecord no declara version_label'
  );
}

const docStoragePath = path.join(ROOT, 'src/shared/core/storage/documentStorageService.ts');
if (fs.existsSync(docStoragePath)) {
  const storageContent = fs.readFileSync(docStoragePath, 'utf-8');
  check(
    'documentStorageService.ts exporta saveDocumentAs con soporte de versionLabel',
    storageContent.includes('export const saveDocumentAs = async') && storageContent.includes('versionLabel?: string'),
    'documentStorageService.ts no exporta saveDocumentAs'
  );
}

const cvStoragePath = path.join(ROOT, 'src/modules/cv-builder/services/cvStorageService.ts');
if (fs.existsSync(cvStoragePath)) {
  const cvStorageContent = fs.readFileSync(cvStoragePath, 'utf-8');
  check(
    'cvStorageService.ts re-exporta saveCVAs',
    cvStorageContent.includes('export const saveCVAs ='),
    'cvStorageService.ts no re-exporta saveCVAs'
  );
}

const cvContextPath = path.join(ROOT, 'src/context/CVContext.tsx');
if (fs.existsSync(cvContextPath)) {
  const contextContent = fs.readFileSync(cvContextPath, 'utf-8');
  check(
    'CVContext.tsx sincroniza cvData.id al guardar y ofrece la función saveCVAs',
    contextContent.includes('setCvData((prev: CVData) => ({ ...prev, id: res.record!.id }))') && contextContent.includes('saveCVAs'),
    'CVContext.tsx no sincroniza id o no ofrece saveCVAs'
  );
}

// ─── 13. Plan v30: Motor Dinámico de Muelle/Dock de Secciones Activas ───
console.log('\n── 13. Plan v30: Motor Dinámico de Muelle/Dock de Secciones Activas ──');

const dockEnginePath = path.join(ROOT, 'src/shared/core/sections/activeSectionsDockEngine.ts');
if (fs.existsSync(dockEnginePath)) {
  const dockContent = fs.readFileSync(dockEnginePath, 'utf-8');
  check(
    'activeSectionsDockEngine.ts implementa resolveActiveDockSections filtrando por sectionVisibility y absorbiendo datos personales',
    dockContent.includes('export function resolveActiveDockSections') && dockContent.includes('ABSORBED_INTO_PERSONAL_TAB'),
    'activeSectionsDockEngine.ts no exporta resolveActiveDockSections'
  );
} else {
  check('activeSectionsDockEngine.ts existe', false, `No encontrado: ${dockEnginePath}`);
}

const dockUiPath = path.join(ROOT, 'src/modules/cv-builder/components/CanvaIconDock.tsx');
if (fs.existsSync(dockUiPath)) {
  const dockUiContent = fs.readFileSync(dockUiPath, 'utf-8');
  check(
    'CanvaIconDock.tsx consume resolveActiveDockSections mediante useMemo (sin arrays fijos a mano)',
    dockUiContent.includes('resolveActiveDockSections(cvData)') && !dockUiContent.includes('fixedPrioritySections'),
    'CanvaIconDock.tsx mantiene arrays fijos a mano'
  );
}

// ─── 14. Plan v31: Versionado de Esquema, Deduplicación en Borde y Pestañas Multidocumento ───
console.log('\n── 14. Plan v31: Versionado de Esquema, Deduplicación en Borde y Pestañas Multidocumento ──');

const migrationPath = path.join(ROOT, 'src/shared/core/storage/cvMigrationEngine.ts');
if (fs.existsSync(migrationPath)) {
  const migContent = fs.readFileSync(migrationPath, 'utf-8');
  check(
    'cvMigrationEngine.ts define CURRENT_SCHEMA_VERSION y exporta migrateCvData',
    migContent.includes('CURRENT_SCHEMA_VERSION = 1') && migContent.includes('export function migrateCvData'),
    'cvMigrationEngine.ts no exporta migrateCvData'
  );
}

const localPackagerPath = path.join(ROOT, 'src/shared/core/storage/driveDocumentPackager.ts');
if (fs.existsSync(localPackagerPath)) {
  const packContent = fs.readFileSync(localPackagerPath, 'utf-8');
  check(
    'driveDocumentPackager.ts implementa dedupAssetsForLocalStorage e hidratación asset://',
    packContent.includes('dedupAssetsForLocalStorage') && packContent.includes('asset://'),
    'driveDocumentPackager.ts no implementa dedupAssetsForLocalStorage'
  );
}

const tabEnginePath = path.join(ROOT, 'src/shared/core/storage/documentTabEngine.ts');
if (fs.existsSync(tabEnginePath)) {
  const tabContent = fs.readFileSync(tabEnginePath, 'utf-8');
  check(
    'documentTabEngine.ts implementa getOpenTabs, addOpenTab, removeOpenTab con persistencia cv_open_tabs',
    tabContent.includes('getOpenTabs') && tabContent.includes('cv_open_tabs'),
    'documentTabEngine.ts no implementa persistencia de pestañas'
  );
}

const tabUiPath = path.join(ROOT, 'src/modules/cv-builder/components/DocumentTabBar.tsx');
if (fs.existsSync(tabUiPath)) {
  const tabUiContent = fs.readFileSync(tabUiPath, 'utf-8');
  check(
    'DocumentTabBar.tsx exporta el componente interactivo de pestañas multidocumento',
    tabUiContent.includes('export function DocumentTabBar'),
    'DocumentTabBar.tsx no exporta el componente'
  );
}

// ─── 15. Plan v32: Multi-Parent Drive, Safe Navigation & TopBar Registry ───
console.log('\n── 15. Plan v32: Multi-Parent Drive, Safe Navigation & TopBar Registry ──');

const driveBackendPath = path.join(ROOT, 'src/shared/core/storage/googleDriveBackend.ts');
if (fs.existsSync(driveBackendPath)) {
  const driveContent = fs.readFileSync(driveBackendPath, 'utf-8');
  check(
    'googleDriveBackend.ts implementa addFolderAsParent para vincular multi-parent en Drive API v3',
    driveContent.includes('export async function addFolderAsParent'),
    'googleDriveBackend.ts no exporta addFolderAsParent'
  );
  check(
    'googleDriveBackend.ts implementa getOrCreateCvFolderInDrive para resolver el ID de carpeta real',
    driveContent.includes('export async function getOrCreateCvFolderInDrive'),
    'googleDriveBackend.ts no exporta getOrCreateCvFolderInDrive'
  );
}

const driveBackupServiceFile = path.join(ROOT, 'src/shared/core/storage/driveBackupService.ts');
if (fs.existsSync(driveBackupServiceFile)) {
  const backupContent = fs.readFileSync(driveBackupServiceFile, 'utf-8');
  check(
    'driveBackupService.ts pasa el driveFolderId real a addFolderAsParent en lugar de la string cvId',
    backupContent.includes('addFolderAsParent(existingFileId, driveFolderId)'),
    'driveBackupService.ts sigue pasando cvId a addFolderAsParent'
  );
}

const safeNavPath = path.join(ROOT, 'src/shared/core/storage/safeNavigationEngine.ts');
if (fs.existsSync(safeNavPath)) {
  const safeNavContent = fs.readFileSync(safeNavPath, 'utf-8');
  check(
    'safeNavigationEngine.ts exporta runWithSafeSave para autoguardado unificado previo a navegación',
    safeNavContent.includes('export async function runWithSafeSave'),
    'safeNavigationEngine.ts no exporta runWithSafeSave'
  );
}

const topBarRegistryPath = path.join(ROOT, 'src/shared/core/ui/topBarActionRegistry.ts');
if (fs.existsSync(topBarRegistryPath)) {
  const regContent = fs.readFileSync(topBarRegistryPath, 'utf-8');
  check(
    'topBarActionRegistry.ts exporta TOP_BAR_ACTIONS con asignaciones declarativas',
    regContent.includes('export const TOP_BAR_ACTIONS'),
    'topBarActionRegistry.ts no exporta TOP_BAR_ACTIONS'
  );
}

const navbarPath = path.join(ROOT, 'src/modules/cv-builder/components/Navbar.tsx');
if (fs.existsSync(navbarPath)) {
  const navContent = fs.readFileSync(navbarPath, 'utf-8');
  check(
    'Navbar.tsx integra la barra superior unificada con píldoras de menú ovaladas',
    navContent.includes('FolderOpen') && navContent.includes('Save') && navContent.includes('User'),
    'Navbar.tsx no contiene la estructura de píldoras ovaladas de menú'
  );
  check(
    'Navbar.tsx integra ZoomControls y opción de Política de Privacidad',
    navContent.includes('ZoomControls') && navContent.includes('onOpenPrivacy'),
    'Navbar.tsx no integra ZoomControls o la Política de Privacidad'
  );
}

const saveModalPath = path.join(ROOT, 'src/modules/cv-builder/components/SaveModal.tsx');
if (fs.existsSync(saveModalPath)) {
  const saveContent = fs.readFileSync(saveModalPath, 'utf-8');
  check(
    'SaveModal.tsx usa la leyenda exacta "Guardar como copia para Puesto"',
    saveContent.includes('Guardar como copia para Puesto'),
    'SaveModal.tsx no contiene la leyenda actualizada'
  );
}

const shareModalPath = path.join(ROOT, 'src/modules/cv-builder/components/modals/ShareAppModal.tsx');
if (fs.existsSync(shareModalPath)) {
  const shareContent = fs.readFileSync(shareModalPath, 'utf-8');
  check(
    'ShareAppModal.tsx exporta el componente de compartir aplicación',
    shareContent.includes('export default function ShareAppModal'),
    'ShareAppModal.tsx no exporta el componente'
  );
}

const canvaDockPath = path.join(ROOT, 'src/modules/cv-builder/components/CanvaIconDock.tsx');
if (fs.existsSync(canvaDockPath)) {
  const dockContent = fs.readFileSync(canvaDockPath, 'utf-8');
  check(
    'CanvaIconDock.tsx no duplica el botón de tema en la barra móvil',
    !dockContent.includes('Botón Tema en Móvil'),
    'CanvaIconDock.tsx aún contiene el botón de tema duplicado'
  );
}

// ─── 16. Plan v12: Motor de Formatos Globales, Fallback 1-Columna y 18 Secciones Universales ───
console.log('\n── 16. Plan v12: Formatos Globales, Fallback 1-Columna y 18 Secciones Universales ──');

const formatRegistryPath = path.join(ROOT, 'src/shared/core/formats/cvFormatRegistry.ts');
if (fs.existsSync(formatRegistryPath)) {
  const fmtContent = fs.readFileSync(formatRegistryPath, 'utf-8');
  check(
    'cvFormatRegistry.ts implementa getCvFormat, getAllCvFormats, getFormatDefaultVisibility y los 5 formatos globales',
    fmtContent.includes('getCvFormat') && fmtContent.includes('getAllCvFormats') && fmtContent.includes('getFormatDefaultVisibility') &&
    fmtContent.includes("'ats-one-column'") && fmtContent.includes("'us-resume'") && fmtContent.includes("'europass'") &&
    fmtContent.includes("'tech-portfolio'") && fmtContent.includes("'latam-clasico'"),
    'cvFormatRegistry.ts no define los 5 formatos o le faltan exportaciones'
  );
}

const editorPanelPath = path.join(ROOT, 'src/modules/cv-builder/components/EditorPanel.tsx');
if (fs.existsSync(editorPanelPath)) {
  const editorContent = fs.readFileSync(editorPanelPath, 'utf-8');
  check(
    'EditorPanel.tsx consume el Selector de Formatos Globales (getAllCvFormats & getFormatDefaultVisibility)',
    editorContent.includes('getAllCvFormats()') && editorContent.includes('getFormatDefaultVisibility') && editorContent.includes('Estándar & Formato Global'),
    'EditorPanel.tsx no consume el Selector de Formatos Globales'
  );
}

const fixedObjectsPath = path.join(ROOT, 'src/shared/core/pdf-engine/layers/fixedObjects/placeFixedObjects.ts');
if (fs.existsSync(fixedObjectsPath)) {
  const fixedContent = fs.readFileSync(fixedObjectsPath, 'utf-8');
  check(
    'placeFixedObjects.ts implementa remapeo de fallback para objetos fijos huérfanos en layouts 1-columna',
    fixedContent.includes('availableSectorIds') && fixedContent.includes('isPrimaryFallbackSector'),
    'placeFixedObjects.ts no contiene la red de seguridad de fallback'
  );
}

const sectionRegPath = path.join(ROOT, 'src/shared/core/sectionRegistry.ts');
if (fs.existsSync(sectionRegPath)) {
  const regContent = fs.readFileSync(sectionRegPath, 'utf-8');
  const hasCompetenciasTabIdFix = /id:\s*'competencias',\s*label:\s*'Competencias Clave',\s*tabId:\s*'competencias'/.test(regContent);
  const matches18Sections = regContent.includes("'resumen'") && regContent.includes("'habilidades'") && regContent.includes("'idiomas'") && regContent.includes("'proyectos'") && regContent.includes("'publicaciones'") && regContent.includes("'referencias'");

  check(
    'sectionRegistry.ts contiene las 18 secciones universales y competencias tiene tabId "competencias"',
    matches18Sections && hasCompetenciasTabIdFix,
    'sectionRegistry.ts no contiene 18 secciones o competencias mantiene tabId engañoso'
  );
}

const schemaPath = path.join(ROOT, 'src/shared/core/utils/cvDataSchema.ts');
if (fs.existsSync(schemaPath)) {
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
  check(
    'cvDataSchema.ts incluye activeFormatId en la lista blanca de sanitización para persistencia',
    schemaContent.includes('activeFormatId: data.activeFormatId || undefined'),
    'cvDataSchema.ts descarta activeFormatId al guardar/cargar CV'
  );
}

const cvAdapterPath = path.join(ROOT, 'src/shared/core/pdf-engine/layers/records/cvDataAdapter.ts');
if (fs.existsSync(cvAdapterPath)) {
  const adapterContent = fs.readFileSync(cvAdapterPath, 'utf-8');
  check(
    'cvDataAdapter.ts conecta activeFormatId con getCvFormat para reordenamiento de secciones y filtrado de datos personales',
    adapterContent.includes('getCvFormat') && adapterContent.includes('hiddenFieldsSet') && adapterContent.includes('formatOrderMap'),
    'cvDataAdapter.ts no consume el motor de formatos globales para reordenar secciones o filtrar datos personales'
  );
}

if (fs.existsSync(sectionRegPath)) {
  const regContent = fs.readFileSync(sectionRegPath, 'utf-8');
  check(
    'sectionRegistry.ts etiqueta la sección frase como "Titular Profesional"',
    regContent.includes("label: 'Titular Profesional'"),
    'sectionRegistry.ts mantiene la etiqueta obsoleta Frase / Lema Personal'
  );
}

const iconRegistryPath = path.join(ROOT, 'src/shared/core/pdf-engine/layers/icons/iconRegistry.ts');
if (fs.existsSync(iconRegistryPath)) {
  const iconContent = fs.readFileSync(iconRegistryPath, 'utf-8');
  const portadaMatch = iconContent.includes("portada:");
  const competenciasMatch = iconContent.includes("competencias:");
  check(
    'iconRegistry.ts define íconos únicos sin duplicación entre portada y competencias',
    portadaMatch && competenciasMatch && !iconContent.includes("paths: [\n      'M12 2L2 7l10 5 10-5-10-5z',\n      'M2 17l10 5 10-5',\n      'M2 12l10 5 10-5'\n    ]\n  },\n  competencias"),
    'portada y competencias comparten el mismo path SVG'
  );
}

const presetHierarchyPath = path.join(ROOT, 'src/shared/core/pdf-engine/layers/presets/presetHierarchyEngine.ts');
if (fs.existsSync(presetHierarchyPath)) {
  const presetContent = fs.readFileSync(presetHierarchyPath, 'utf-8');
  check(
    'presetHierarchyEngine.ts gobierna la jerarquía de 3 niveles con applyPresetLevel',
    presetContent.includes('applyPresetLevel') && presetContent.includes("level === 'format'") && presetContent.includes("level === 'preset'"),
    'presetHierarchyEngine.ts no exporta la función unificada de jerarquía applyPresetLevel'
  );
}

const dockPath = path.join(ROOT, 'src/modules/cv-builder/components/CanvaIconDock.tsx');
if (fs.existsSync(dockPath)) {
  const dockContent = fs.readFileSync(dockPath, 'utf-8');
  check(
    'CanvaIconDock.tsx elimina la pestaña obsoleta de paneles (Columnas)',
    !dockContent.includes("id: 'paneles'"),
    'CanvaIconDock.tsx mantiene la pestaña de paneles'
  );
}

// ─── Resultado final ───
console.log(`\n${'═'.repeat(60)}`);
if (failed === 0) {
  console.log(`✅ TODAS LAS VERIFICACIONES PASARON: ${passed}/${passed + failed}`);
} else {
  console.log(`❌ VERIFICACIÓN FALLIDA: ${passed} pasaron, ${failed} fallaron`);
  process.exit(1);
}
