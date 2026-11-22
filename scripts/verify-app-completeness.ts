/**
 * SCRIPT DE AUTOCOMPROBACIÓN Y AUDITORÍA DE SUPERFICIE (PILAR 8 REGLA 10)
 * Verifica que cada DocumentTypeId activo
 * esté completamente integrado en la aplicación (rutas, menú, tabs, persistencia,
 * landing, catálogo de textos y manifiesto canónico).
 */

import fs from 'fs';
import path from 'path';
import { DOCUMENT_TYPE_REGISTRY } from '../src/shared/core/capabilities/capabilityRegistry';
import { APP_SURFACE_MANIFEST } from '../src/shared/core/capabilities/appSurfaceManifest';
import { DocumentTypeId } from '../src/types/document';

console.log('🔍 Iniciando auditoría de completitud de superficie por app (Pilar 8 Regla 10)...\n');

let totalChecks = 0;
let failedChecks = 0;

const rootDir = process.cwd();

// Archivos nucleares a inspeccionar
const appTsxContent = fs.readFileSync(path.join(rootDir, 'src/app/App.tsx'), 'utf8');
const appRegistryContent = fs.readFileSync(path.join(rootDir, 'src/app/appRegistry.ts'), 'utf8');
const tabsBarContent = fs.readFileSync(path.join(rootDir, 'src/shared/core/ui/DocumentTabsBar.tsx'), 'utf8');
const newDocMenuContent = fs.readFileSync(path.join(rootDir, 'src/shared/core/ui/NewDocumentMenu.tsx'), 'utf8');
const productsGridContent = fs.readFileSync(path.join(rootDir, 'src/shared/core/ui/marketing/PortalProductsGrid.tsx'), 'utf8');
const storageServiceContent = fs.readFileSync(path.join(rootDir, 'src/shared/core/storage/documentStorageService.ts'), 'utf8');

// 7 tipos de documento canónicos activos en producción
const CANONICAL_DOC_TYPES: DocumentTypeId[] = [
  'cv',
  'business_card',
  'book',
  'cover_letter',
  'planner',
  'invoice',
  'editorial'
];

for (const docType of CANONICAL_DOC_TYPES) {
  totalChecks++;
  const manifestEntry = APP_SURFACE_MANIFEST[docType];
  if (!manifestEntry) {
    console.error(`❌ FALLO SUPERFICIE: DocumentTypeId "${docType}" no está registrado en APP_SURFACE_MANIFEST.`);
    failedChecks++;
    continue;
  }
  console.log(`  ✓ Manifiesto Canónico: "${docType}" registrado como "${manifestEntry.name}".`);

  // a. Verificar presencia en DOCUMENT_TYPE_REGISTRY
  totalChecks++;
  if (!DOCUMENT_TYPE_REGISTRY[docType]) {
    console.error(`❌ FALLO SUPERFICIE [${docType}]: Ausente en DOCUMENT_TYPE_REGISTRY de capabilityRegistry.ts.`);
    failedChecks++;
  } else {
    console.log(`  ✓ Registro Canónico [${docType}]: Presente en capabilityRegistry.ts.`);
  }

  // b. Verificar existencia de archivos obligatorios
  for (const reqFile of manifestEntry.requiredFiles) {
    totalChecks++;
    const fullPath = path.join(rootDir, reqFile);
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ FALLO SUPERFICIE [${docType}]: Archivo requerido no existe -> ${reqFile}`);
      failedChecks++;
    }
  }

  // c. Verificar primaryStudioFile
  totalChecks++;
  const studioFullPath = path.join(rootDir, manifestEntry.primaryStudioFile);
  if (!fs.existsSync(studioFullPath)) {
    console.error(`❌ FALLO SUPERFICIE [${docType}]: Archivo primario de estudio no existe -> ${manifestEntry.primaryStudioFile}`);
    failedChecks++;
  } else {
    console.log(`  ✓ Studio Primario [${docType}]: ${manifestEntry.primaryStudioFile} existe.`);
  }

  // d. Verificar ruta en App.tsx o Composition Root (appRegistry.ts)
  totalChecks++;
  if (!appTsxContent.includes(manifestEntry.route) && !appRegistryContent.includes(manifestEntry.route)) {
    console.error(`❌ FALLO SUPERFICIE [${docType}]: Ruta "${manifestEntry.route}" no está cableada en App.tsx ni appRegistry.ts.`);
    failedChecks++;
  } else {
    console.log(`  ✓ Enrutamiento [${docType}]: Ruta "${manifestEntry.route}" registrada en appRegistry/App.`);
  }

  // e. Verificar callback en NewDocumentMenu y DocumentTabsBar
  totalChecks++;
  if (!newDocMenuContent.includes(manifestEntry.menuAction)) {
    console.error(`❌ FALLO SUPERFICIE [${docType}]: Callback de creación "${manifestEntry.menuAction}" ausente en NewDocumentMenu.tsx.`);
    failedChecks++;
  } else {
    console.log(`  ✓ Menú Nuevo Documento [${docType}]: "${manifestEntry.menuAction}" cableado.`);
  }

  totalChecks++;
  if (!tabsBarContent.includes(manifestEntry.tabsBarAction)) {
    console.error(`❌ FALLO SUPERFICIE [${docType}]: Callback "${manifestEntry.tabsBarAction}" ausente en DocumentTabsBar.tsx.`);
    failedChecks++;
  } else {
    console.log(`  ✓ Barra de Pestañas [${docType}]: "${manifestEntry.tabsBarAction}" propagado.`);
  }

  // f. Verificar presencia en Landing (PortalProductsGrid)
  if (manifestEntry.features.hasLandingCard) {
    totalChecks++;
    if (!productsGridContent.includes(manifestEntry.route)) {
      console.error(`❌ FALLO SUPERFICIE [${docType}]: Tarjeta de producto con ruta "${manifestEntry.route}" ausente en PortalProductsGrid.tsx.`);
      failedChecks++;
    } else {
      console.log(`  ✓ Landing Portal [${docType}]: Tarjeta apuntando a "${manifestEntry.route}" activa.`);
    }
  }

  // g. Verificar soporte en documentStorageService
  if (manifestEntry.features.hasStorageAdapter) {
    totalChecks++;
    if (!storageServiceContent.includes(`'${docType}'`) && !storageServiceContent.includes(`"${docType}"`)) {
      console.error(`❌ FALLO SUPERFICIE [${docType}]: Tipo "${docType}" ausente en documentStorageService.ts.`);
      failedChecks++;
    } else {
      console.log(`  ✓ Almacenamiento Local [${docType}]: Soporte persistente verificado.`);
    }
  }
}

console.log('\n════════════════════════════════════════════════════════════');
if (failedChecks > 0) {
  console.error(`❌ AUDITORÍA DE SUPERFICIE DE APPS FALLIDA: ${failedChecks} de ${totalChecks} verificaciones no pasaron.`);
  process.exit(1);
} else {
  console.log(`✅ AUDITORÍA DE SUPERFICIE DE APPS EXITOSA: ${totalChecks} verificaciones pasaron al 100%.`);
  process.exit(0);
}
