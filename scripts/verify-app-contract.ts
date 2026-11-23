#!/usr/bin/env tsx
/**
 * verify-app-contract.ts — Auditoría unificada de Contrato por Aplicación (Fase 10).
 *
 * Verifica en una única pasada sobre `ALL_DOCUMENT_TYPE_IDS` que cada app cumple:
 *   1. Contrato completo en `DOCUMENT_TYPE_REGISTRY`, `APP_SURFACE_MANIFEST` y `APP_REGISTRY`.
 *   2. Existencia en disco del Studio primario declarado y ausencia de tipos purgados (`portfolio`, `certificate`).
 *   3. Dock registrado con >= 1 paso en `stepSequenceRegistry`.
 *   4. Conocimiento modular de Lidio en servidor (`APP_KNOWLEDGE_BY_ID`) + tips locales no vacíos (`getAllTips`).
 *   5. Invariantes de almacenamiento Local-First y privacidad (`local-encrypted` nunca permite nube ni `full-summary`).
 *   6. Grafo AST de fronteras y ciclos limpio (`import-graph-baseline.json` en 0/0).
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  ALL_DOCUMENT_TYPE_IDS,
  DOCUMENT_TYPE_REGISTRY,
  isEncryptedVaultDocumentType,
  matchesAnotherDocumentTypeId,
  matchesDocumentTypeId,
} from '../src/shared/core/capabilities/capabilityRegistry';
import { APP_SURFACE_MANIFEST } from '../src/shared/core/capabilities/appSurfaceManifest';
import { APP_REGISTRY } from '../src/app/appRegistry';
import {
  getDockTabsForDocType,
  hasDockStepProvider,
} from '../src/shared/core/studio-host/stepSequenceRegistry';
import { getAllTips, pickAlwaysTip } from '../src/shared/core/assistant/assistantTips';
import { APP_KNOWLEDGE_BY_ID } from '../api/_lib/aiTasks/appKnowledge/index';
import {
  getCloudBackupProjector,
  validateCloudBackupProjection,
} from '../src/shared/core/storage/cloudBackupProjections';
import { ICON_REGISTRY } from '../src/shared/core/pdf-engine/layers/icons/iconRegistry';
import { resolveDocumentIdWithHandoff } from '../src/shared/core/documents/useRegisterDocumentTab';
import { deriveDocumentTitle, generateDocumentId } from '../src/shared/core/documents/documentEngine/titleEngine';
import { TOPBAR_BUDGET } from '../src/shared/contracts/appContract';
import { hasLeadingEmoji } from '../src/shared/core/ui/topBarActionRegistry';
import { BOOK_PRINT_PROFILES } from '../src/modules/book-studio/domain/bookPrintProfileEngine';

console.log('🔍 Verificando contrato de plataforma por app (Fase 10 — verify:app-contract)...\n');

const ROOT = process.cwd();
const errors: string[] = [];

const manifestPath = path.join(ROOT, 'public/manifest.json');
const pwaManifest = fs.existsSync(manifestPath)
  ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  : { file_handlers: [] };
const pwaFileHandlers: Array<{ action?: string; accept?: Record<string, string[]> }> = Array.isArray(
  pwaManifest?.file_handlers,
)
  ? pwaManifest.file_handlers
  : [];

const prerenderMetaPath = path.join(ROOT, 'scripts/prerenderMeta.mjs');
const prerenderMetaSrc = fs.existsSync(prerenderMetaPath)
  ? fs.readFileSync(prerenderMetaPath, 'utf8')
  : '';
const seenExtensions = new Set<string>();

for (const forbidden of ['portfolio', 'certificate']) {
  if (forbidden in DOCUMENT_TYPE_REGISTRY) {
    errors.push(`Tipo purgado presente en DOCUMENT_TYPE_REGISTRY: "${forbidden}".`);
  }
  if (forbidden in APP_SURFACE_MANIFEST) {
    errors.push(`Tipo purgado presente en APP_SURFACE_MANIFEST: "${forbidden}".`);
  }
}

const baselinePath = path.join(ROOT, 'scripts/import-graph-baseline.json');
if (fs.existsSync(baselinePath)) {
  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  const bv = Array.isArray(baseline.boundaryViolations) ? baseline.boundaryViolations.length : -1;
  const cy = Array.isArray(baseline.cycles) ? baseline.cycles.length : -1;
  if (bv !== 0 || cy !== 0) {
    errors.push(`import-graph-baseline.json debe permanecer en 0/0 (actual: ${bv} fronteras, ${cy} ciclos).`);
  }
} else {
  errors.push('Falta scripts/import-graph-baseline.json.');
}

for (const id of ALL_DOCUMENT_TYPE_IDS) {
  const manifest = DOCUMENT_TYPE_REGISTRY[id];
  const surface = APP_SURFACE_MANIFEST[id];
  const runtime = APP_REGISTRY[id];

  if (!surface) {
    errors.push(`[${id}] Falta en APP_SURFACE_MANIFEST.`);
  } else {
    const studioPath = path.join(ROOT, surface.primaryStudioFile);
    if (!fs.existsSync(studioPath)) {
      errors.push(`[${id}] Studio primario inexistente en disco: ${surface.primaryStudioFile}.`);
    }
    if (surface.route !== manifest.route) {
      errors.push(`[${id}] Ruta inconsistente entre registro ("${manifest.route}") y superficie ("${surface.route}").`);
    }
  }

  if (!runtime) {
    errors.push(`[${id}] Falta en APP_REGISTRY.`);
  } else if (!runtime.usesSharedCvWorkspace && !runtime.StudioComponent) {
    errors.push(`[${id}] App standalone sin StudioComponent en APP_REGISTRY.`);
  }

  if (!hasDockStepProvider(id) || getDockTabsForDocType(id, { bookMode: 'normal' }).length === 0) {
    errors.push(`[${id}] Dock sin pasos registrados en stepSequenceRegistry.`);
  }

  const knowledgeId = manifest.assistant.knowledgeId as keyof typeof APP_KNOWLEDGE_BY_ID;
  if (!APP_KNOWLEDGE_BY_ID[knowledgeId]) {
    errors.push(`[${id}] Falta conocimiento modular de Lidio ("${manifest.assistant.knowledgeId}").`);
  }
  if (getAllTips(id).length === 0 || !pickAlwaysTip(undefined, [], id)) {
    errors.push(`[${id}] Tips locales vacíos para Lidio.`);
  }

  if (isEncryptedVaultDocumentType(id)) {
    if (manifest.storage.kind !== 'local-encrypted') {
      errors.push(`[${id}] Debe declarar storage.kind === "local-encrypted".`);
    }
    if ('cloudBackup' in manifest.storage && manifest.storage.cloudBackup) {
      errors.push(`[${id}] Bóveda cifrada no puede habilitar cloudBackup.`);
    }
    if (manifest.assistant.privacy !== 'metadata-only') {
      errors.push(`[${id}] Bóveda cifrada debe usar assistant.privacy === "metadata-only".`);
    }
  } else if ('cloudBackup' in manifest.storage && manifest.storage.cloudBackup) {
    const projector = getCloudBackupProjector(id);
    if (!projector) {
      errors.push(`[${id}] Declara cloudBackup pero falta proyector en cloudBackupProjections.ts.`);
    } else {
      const sampleProj = projector.toCloudProjection({
        personalInfo: { fullName: 'Demo', profilePhoto: 'data:image/png;base64,AAA' },
      });
      if (!validateCloudBackupProjection(id, sampleProj).valid) {
        errors.push(`[${id}] Proyección de respaldo opt-in inválida.`);
      }
    }
  }

  // 6. Aislamiento de pestañas e IDs (anti-fuga "CV") en todas las apps standalone
  if (runtime && !runtime.usesSharedCvWorkspace) {
    if (matchesDocumentTypeId('draft_cv', id) || matchesDocumentTypeId('doc_cv_12345', id)) {
      errors.push(`[${id}] matchesDocumentTypeId aceptó un ID de CV.`);
    }
    if (!matchesAnotherDocumentTypeId('draft_cv', id)) {
      errors.push(`[${id}] matchesAnotherDocumentTypeId('draft_cv', '${id}') debe devolver true.`);
    }
    const resolvedFromCv = resolveDocumentIdWithHandoff('doc_cv_12345', id);
    if (resolvedFromCv === 'doc_cv_12345' || !matchesDocumentTypeId(resolvedFromCv, id)) {
      errors.push(`[${id}] resolveDocumentIdWithHandoff adoptó ID de CV ("${resolvedFromCv}").`);
    }
    const sampleId = generateDocumentId(id);
    const sampleTitle = deriveDocumentTitle(id, { id: sampleId });
    if (!sampleTitle.startsWith(`${manifest.titlePrefix} - `) || sampleTitle.startsWith('CV - ')) {
      errors.push(`[${id}] deriveDocumentTitle generó título inesperado: "${sampleTitle}".`);
    }
    if (surface) {
      const studioAbs = path.join(ROOT, surface.primaryStudioFile);
      if (fs.existsSync(studioAbs)) {
        const studioSrc = fs.readFileSync(studioAbs, 'utf8');
        if (!studioSrc.includes('useRegisterDocumentTab')) {
          errors.push(`[${id}] ${surface.primaryStudioFile} no invoca useRegisterDocumentTab.`);
        }
        if (/activeId\s*:\s*activeTabId\b/.test(studioSrc)) {
          errors.push(`[${id}] ${surface.primaryStudioFile} usa activeId: activeTabId (fuga de pestaña CV).`);
        }
      }
    }
  }

  // 7. Paridad de ícono de producto y textos de menú
  if (!manifest.ui?.productIconId || !ICON_REGISTRY[manifest.ui.productIconId]) {
    errors.push(`[${id}] ui.productIconId ("${manifest.ui?.productIconId}") no existe en ICON_REGISTRY.`);
  }
  if (!manifest.ui?.menuTitle?.trim() || !manifest.ui?.menuSubtitle?.trim()) {
    errors.push(`[${id}] ui.menuTitle / ui.menuSubtitle vacíos.`);
  }

  // 8. Paridad de formato portable y PWA file_handlers
  if ('fileFormat' in manifest && manifest.fileFormat) {
    const ext = manifest.fileFormat.extension.toLowerCase();
    if (!ext.startsWith('.')) {
      errors.push(`[${id}] fileFormat.extension inválida: "${ext}".`);
    } else if (seenExtensions.has(ext)) {
      errors.push(`[${id}] Extensión portable duplicada: "${ext}".`);
    } else {
      seenExtensions.add(ext);
    }
    if (manifest.fileFormat.pwaFileHandler) {
      const handlerMatch = pwaFileHandlers.some(
        (h) =>
          h.action === manifest.route &&
          Object.values(h.accept || {}).some((exts) =>
            Array.isArray(exts) && exts.map((x) => x.toLowerCase()).includes(ext),
          ),
      );
      if (!handlerMatch) {
        errors.push(
          `[${id}] Declara pwaFileHandler=true (${ext}), pero falta en public/manifest.json bajo action="${manifest.route}".`,
        );
      }
    }
  }

  // 9. Paridad SEO y título de pestaña del navegador
  if (!manifest.seo?.title?.trim()) {
    errors.push(`[${id}] Falta seo.title para el título de pestaña del navegador.`);
  } else if (
    manifest.seo.prerender &&
    !prerenderMetaSrc.includes(`'${manifest.route}'`) &&
    !prerenderMetaSrc.includes(`"${manifest.route}"`)
  ) {
    errors.push(`[${id}] Declara seo.prerender=true pero "${manifest.route}" falta en scripts/prerenderMeta.mjs.`);
  }
}

// 10. Gobernanza TopBar, reubicación de tema, anti emoji+ícono y Docks compactos
if (TOPBAR_BUDGET.maxGlobalContextPills !== 3 || TOPBAR_BUDGET.maxGlobalActions !== 2) {
  errors.push('TOPBAR_BUDGET debe fijar maxGlobalContextPills=3 y maxGlobalActions=2.');
}
for (const profileId of ['home', 'print_shop'] as const) {
  const pillText = BOOK_PRINT_PROFILES[profileId].pillText;
  if (hasLeadingEmoji(pillText)) {
    errors.push(`BOOK_PRINT_PROFILES.${profileId}.pillText ("${pillText}") no debe llevar emoji inicial.`);
  }
}
const studioNavbarSrc = fs.readFileSync(
  path.join(ROOT, 'src/shared/core/studio-host/StudioNavbar.tsx'),
  'utf8',
);
if (studioNavbarSrc.includes('<ThemeToggleButton') || studioNavbarSrc.includes('ThemeToggleButton')) {
  errors.push('StudioNavbar.tsx no debe incluir ThemeToggleButton en barra superior; el tema vive en Cuenta & Preferencias.');
}
if (!studioNavbarSrc.includes('onCloseMobilePanel') || !studioNavbarSrc.includes('UI_THEME_CYCLE')) {
  errors.push('StudioNavbar.tsx debe incluir selector de tema en popover y transición Ver móvil unificada.');
}
const studioHostSrc = fs.readFileSync(
  path.join(ROOT, 'src/shared/core/studio-host/StudioHost.tsx'),
  'utf8',
);
if (!studioHostSrc.includes('<StudioNavbar') || !studioHostSrc.includes('<StudioDock')) {
  errors.push('StudioHost.tsx debe delegar en <StudioNavbar /> y <StudioDock />.');
}

if (errors.length > 0) {
  console.error(`❌ FALLO verify:app-contract (${errors.length} error/es):`);
  for (const err of errors) console.error(`   - ${err}`);
  process.exit(1);
}

console.log(
  `✅ Contrato de plataforma verificado al 100%: ${ALL_DOCUMENT_TYPE_IDS.length}/${ALL_DOCUMENT_TYPE_IDS.length} apps cumplen registro, cápsula, Dock, Lidio y Local-First.\n`,
);
process.exit(0);
