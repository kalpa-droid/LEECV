#!/usr/bin/env tsx
/**
 * Fábrica de Apps (Fase 10) — Generador declarativo de cápsulas verticales en LEECV.
 *
 * Uso:
 *   npm run new-app -- --id=presupuesto --capsule=quote-studio --route=/crear-presupuesto --title="Presupuestos" --storage=local-only --privacy=full-summary
 *   npm run new-app -- --id=diploma --capsule=diploma-studio --route=/crear-diploma --title="Diplomas" --dry-run
 *   tsx scripts/new-app.ts --selftest
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export type NewAppStorageMode = 'local-only' | 'local-with-cloud-backup' | 'local-encrypted';
export type NewAppPrivacyMode = 'full-summary' | 'metadata-only';

export interface NewAppInput {
  id: string;
  capsule: string;
  route: string;
  title: string;
  storage: NewAppStorageMode;
  privacy: NewAppPrivacyMode;
}

export interface GeneratedFileSpec {
  readonly relativePath: string;
  readonly content: string;
}

export interface NewAppPlan {
  readonly input: NewAppInput;
  readonly files: readonly GeneratedFileSpec[];
  readonly registrationSnippets: {
    readonly documentTypeRegistryEntry: string;
    readonly appSurfaceManifestEntry: string;
    readonly appRegistryEntry: string;
    readonly dockProviderSnippet: string;
    readonly productIconSnippet: string;
    readonly pwaFileHandlerSnippet: string;
    readonly seoPrerenderSnippet: string;
    readonly landingCardSnippet: string;
    readonly lidioKnowledgeFile: string;
  };
}

const PURGED_IDS = new Set(['portfolio', 'certificate']);

function toPascalCase(raw: string): string {
  return raw
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

export function validateNewAppInput(input: NewAppInput): string[] {
  const errors: string[] = [];
  if (!/^[a-z][a-z0-9_]*$/.test(input.id)) {
    errors.push(`id inválido "${input.id}": usar snake_case en minúsculas (ej. "diploma_pro").`);
  }
  if (PURGED_IDS.has(input.id)) {
    errors.push(`id "${input.id}" está prohibido por decisión de plataforma.`);
  }
  if (!/^[a-z][a-z0-9-]*$/.test(input.capsule)) {
    errors.push(`capsule inválido "${input.capsule}": usar kebab-case (ej. "diploma-studio").`);
  }
  if (!input.route.startsWith('/') || input.route.length < 2) {
    errors.push(`route inválido "${input.route}": debe empezar con "/" (ej. "/crear-diploma").`);
  }
  if (!input.title.trim()) {
    errors.push('title no puede estar vacío.');
  }
  if (input.storage === 'local-encrypted' && input.privacy === 'full-summary') {
    errors.push(
      'Invariante de seguridad: las apps `local-encrypted` (bóveda cifrada) no pueden declarar `privacy: "full-summary"`; usar `metadata-only`.',
    );
  }
  return errors;
}

export function buildNewAppPlan(input: NewAppInput): NewAppPlan {
  const validationErrors = validateNewAppInput(input);
  if (validationErrors.length > 0) {
    throw new Error(validationErrors.join('\n'));
  }

  const pascal = toPascalCase(input.capsule.replace(/-studio$/, '')) || toPascalCase(input.id);
  const slug = input.id.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'doc';
  const capsuleDir = `src/modules/${input.capsule}`;
  const studioComponentName = `${pascal}StudioContent`;
  const stepSeqConst = `${input.id.toUpperCase()}_STEP_SEQUENCE`;

  const storageSnippet =
    input.storage === 'local-encrypted'
      ? `{ kind: 'local-encrypted' }`
      : input.storage === 'local-with-cloud-backup'
      ? `{ kind: 'local', cloudBackup: { projection: 'structured-text', maxBytes: 16384 } }`
      : `{ kind: 'local' }`;

  const manifestTs = `import type { DocumentTypeManifest } from '../../shared/contracts';

/**
 * Manifiesto puro de la cápsula \`${input.capsule}\`.
 * Cumple \`[manifest-purity]\`: solo importa tipos de \`src/shared/contracts/\`.
 */
export const ${input.id.toUpperCase()}_CAPSULE_MANIFEST: Pick<
  DocumentTypeManifest,
  'id' | 'capsuleId' | 'route' | 'defaultTitle' | 'storage' | 'assistant'
> & { readonly stepIds: readonly string[] } = {
  id: '${input.id}',
  capsuleId: '${input.capsule}',
  route: '${input.route}',
  defaultTitle: '${input.title}',
  storage: ${storageSnippet},
  assistant: {
    knowledgeId: '${input.id}',
    privacy: '${input.privacy}',
  },
  stepIds: ['${input.id}_inicio', '${input.id}_diseno'],
};
`;

  const typesTs = `export interface ${pascal}DocumentData {
  id: string;
  docType: '${input.id}';
  title: string;
  activePresetId: string;
  updatedAt?: string;
}

export function createEmpty${pascal}Data(id: string): ${pascal}DocumentData {
  return {
    id,
    docType: '${input.id}',
    title: '${input.title}',
    activePresetId: '${input.id}-clasico',
  };
}
`;

  const stepsTs = `export interface ${pascal}StepItem {
  readonly id: string;
  readonly stepNumber: number;
  readonly label: string;
  readonly shortLabel: string;
  readonly description: string;
}

export const ${stepSeqConst}: readonly ${pascal}StepItem[] = [
  {
    id: '${input.id}_inicio',
    stepNumber: 1,
    label: '1. Contenido',
    shortLabel: 'Contenido',
    description: 'Configuración principal del documento',
  },
  {
    id: '${input.id}_diseno',
    stepNumber: 2,
    label: '2. Estilo',
    shortLabel: 'Estilo',
    description: 'Colores y presentación',
  },
];
`;

  const studioTsx = `import React, { useMemo, useRef, useState } from 'react';
import { AppShell } from '../../shared/core/ui/AppShell';
import StudioNavbar from '../../shared/core/studio-host/StudioNavbar';
import StudioDock from '../../shared/core/studio-host/StudioDock';
import { FloatingAssistant } from '../../shared/core/studio-host/FloatingAssistant';
import { ErrorBoundary } from '../../shared/core/ui/ErrorBoundary';
import {
  useDocumentViewport,
  useViewportGestures,
  ScaledPaperSheet,
  quantizeRasterZoom,
} from '../../shared/core/viewport';
import { resolveDocumentCanvasPx } from '../../shared/core/pdf-engine/layers/page/pageSizes';
import { OpenTab } from '../../shared/core/documents/tabStore';
import {
  resolveDocumentIdWithHandoff,
  useRegisterDocumentTab,
} from '../../shared/core/documents/documentEngine';
import { useToast } from '../../shared/core/ui/Toast';
import { elevationSystem, radius } from '../../shared/core/uiDesignSystem';
import { DocumentTypeId } from '../../types/document';
import { createEmpty${pascal}Data } from './domain/${input.id}Types';

interface ${studioComponentName}Props {
  currentUiTheme?: string;
  documentTabs: OpenTab[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNavigateToDocument: (targetDocType: DocumentTypeId, id: string) => void;
  onNewDocument?: (docType: DocumentTypeId) => void;
  cycleUITheme: () => void;
  onTabsChanged?: (tabs: OpenTab[]) => void;
  onOpenSavedCVsModal?: () => void;
  onOpenSaveAsModal?: () => void;
  onOpenJsonDownloadModal?: () => void;
  onOpenShareAppModal?: () => void;
  onOpenPrivacy?: () => void;
}

export const ${studioComponentName}: React.FC<${studioComponentName}Props> = ({
  currentUiTheme = 'day',
  documentTabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNavigateToDocument,
  onNewDocument,
  cycleUITheme,
  onTabsChanged = () => {},
  onOpenSavedCVsModal,
  onOpenSaveAsModal,
  onOpenJsonDownloadModal,
  onOpenShareAppModal,
  onOpenPrivacy,
}) => {
  const { showInfo } = useToast();
  const [activeStepTab, setActiveStepTab] = useState<string>('${input.id}_inicio');
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(true);
  const docId = useMemo(() => resolveDocumentIdWithHandoff(activeTabId, '${input.id}'), [activeTabId]);
  const [docData] = useState(() => createEmpty${pascal}Data(docId));
  const viewport = useDocumentViewport({ pageSizeId: 'a4' });
  const { widthPx, heightPx } = useMemo(() => resolveDocumentCanvasPx('a4'), []);
  const rasterZoom = quantizeRasterZoom(viewport.zoomLevel);
  const sheetRef = useRef<HTMLDivElement>(null);

  useViewportGestures({
    containerRef: viewport.containerRef,
    sheetRef,
    onZoomChange: viewport.setZoomLevel,
    zoomLevel: viewport.zoomLevel,
  });

  useRegisterDocumentTab({
    id: docId,
    docType: '${input.id}' as DocumentTypeId,
    title: \`${pascal} - \${docData.title}\`,
    documentTabs,
    onTabsChanged,
  });

  return (
    <>
      <AppShell
        docType={'${input.id}' as DocumentTypeId}
        isPanelOpen={isPanelOpen}
        containerRef={viewport.containerRef}
        navbarSlot={
          <StudioNavbar
            docType={'${input.id}' as DocumentTypeId}
            currentCvData={docData}
            currentUiTheme={currentUiTheme}
            onOpenSavedCVsModal={onOpenSavedCVsModal || (() => {})}
            onSaveCVClick={() => showInfo('Guardado local listo.')}
            onOpenSaveAsModal={onOpenSaveAsModal || (() => {})}
            onOpenJsonDownloadModal={onOpenJsonDownloadModal || (() => {})}
            onPrint={() => showInfo('Conectar exportador PDF + useExportEntitlement.')}
            onOpenShareAppModal={onOpenShareAppModal || (() => {})}
            onOpenPrivacy={onOpenPrivacy || (() => {})}
            zoomLevel={viewport.zoomLevel}
            setZoomLevel={viewport.setZoomLevel}
            triggerAutoFit={viewport.fitAndCenter}
            isAutoFitMode={viewport.isAutoFitMode}
            cycleUITheme={cycleUITheme}
          />
        }
        dockSlot={
          <StudioDock
            docType={'${input.id}' as DocumentTypeId}
            activeTab={activeStepTab}
            setActiveTab={(tab) => {
              setActiveStepTab(tab);
              setIsPanelOpen(true);
            }}
            isPanelOpen={isPanelOpen}
            setIsPanelOpen={setIsPanelOpen}
          />
        }
        panelSlot={
          <div className="p-4 sm:p-5 space-y-4">
            <h2 className="text-base font-bold text-[var(--ui-text-primary)]">${input.title}</h2>
            <p className="text-xs text-[var(--ui-text-secondary)]">
              Paso activo: {activeStepTab}
            </p>
          </div>
        }
        mainSlot={
          <div className="w-full flex flex-col items-start justify-start print-wrapper relative touch-pan-x touch-pan-y">
            <ScaledPaperSheet
              widthPx={widthPx}
              heightPx={heightPx}
              zoomLevel={viewport.zoomLevel}
              managed={true}
              sheetRef={sheetRef}
              className={elevationSystem.overlay}
            >
              <ErrorBoundary
                compact
                title="Inconveniente en la vista previa"
                subtitle="Ocurrió un problema al procesar el documento."
              >
                <div
                  data-raster-zoom={rasterZoom}
                  className={\`w-full min-h-[560px] bg-[var(--ui-bg-card)] border border-[var(--ui-border)] rounded-[\${radius.card}] flex items-center justify-center p-6 text-xs text-[var(--ui-text-secondary)]\`}
                >
                  Conectar componente @react-pdf/renderer desde ./pdf/ con VectorDocViewer
                </div>
              </ErrorBoundary>
            </ScaledPaperSheet>
          </div>
        }
        tabsBarProps={{
          tabs: documentTabs,
          activeId: docId,
          docType: '${input.id}' as DocumentTypeId,
          onSwitch: onSelectTab,
          onNavigateToDocument,
          onAdd: () => onNewDocument?.('${input.id}' as DocumentTypeId),
          onNewDocument,
          onClose: (_e, id) => onCloseTab(id),
        }}
      />
      <FloatingAssistant
        docType={'${input.id}' as any}
        activeTab={activeStepTab}
        onNavigate={(tabId) => {
          setActiveStepTab(tabId);
          setIsPanelOpen(true);
        }}
      />
    </>
  );
};

export default ${studioComponentName};
`;

  const knowledgeSnippet = `// api/_lib/aiTasks/appKnowledge/${input.id}.ts (y exportar en index.ts)
export const ${input.id.toUpperCase()}_KNOWLEDGE = \`CONOCÉS ESTOS PASOS DE ${input.title.toUpperCase()} (docType ${input.id}): ${input.id}_inicio (1. Contenido), ${input.id}_diseno (2. Estilo).

BLOQUE DE CONOCIMIENTO — ${input.title.toUpperCase()} (responde SIEMPRE que pregunten por esto, docType ${input.id}):
- ${input.title} (${input.route}) permite crear documentos profesionales en el navegador con flujo guiado.
- Privacidad: ${input.privacy}. Almacenamiento: ${input.storage}.
- Flujo de pasos: 1. Contenido (carga de datos), 2. Estilo (ajuste visual) y exportación final en PDF.\`;
`;

  const files: GeneratedFileSpec[] = [
    { relativePath: `${capsuleDir}/manifest.ts`, content: manifestTs },
    { relativePath: `${capsuleDir}/domain/${input.id}Types.ts`, content: typesTs },
    { relativePath: `${capsuleDir}/domain/${input.id}StepSequence.ts`, content: stepsTs },
    { relativePath: `${capsuleDir}/${studioComponentName}.tsx`, content: studioTsx },
    { relativePath: `${capsuleDir}/pdf/.gitkeep`, content: '' },
    { relativePath: `${capsuleDir}/ui/.gitkeep`, content: '' },
  ];

  const fileFormatSnippet =
    input.storage === 'local-encrypted'
      ? ''
      : `\n    fileFormat: {\n      extension: '.lee${slug}',\n      label: '${input.title} LEECV',\n      mimeType: 'application/vnd.leecv.${slug}+json',\n      pwaFileHandler: true,\n    },`;

  const documentTypeRegistryEntry = `  ${input.id}: {
    id: '${input.id}',
    capsuleId: '${input.capsule}',
    name: '${input.title}',
    description: 'Descripción visible de ${input.title}.',
    iconName: 'FileText',
    ui: {
      productIconId: '${input.id}',
      menuTitle: 'Nuevo ${input.title}',
      menuSubtitle: 'Edición local paso a paso en esta computadora',
      menuBadgeTone: 'accent',
    },${fileFormatSnippet}
    route: '${input.route}',
    defaultTitle: 'Mi ${input.title}',
    titlePrefix: '${pascal}',
    draftIdPrefix: 'draft_${input.id}',
    storage: ${storageSnippet},
    assistant: {
      knowledgeId: '${input.id}',
      privacy: '${input.privacy}',
    },
    creationStrategy: 'blank',
    capabilities: ['theme', 'paper_size', 'json_backup', 'nameable_title'],
    exportFormats: ['pdf', 'json'],
    stepSequenceId: '${input.id}_steps',
    defaultPaperSize: 'a4',
    defaultActivePresetId: '${input.id}-clasico',
    idPrefixes: ['${input.id}_', 'doc_${input.id}_'],
    presetPrefixes: ['${input.id}-'],
    seo: {
      title: '${input.title} | LEECV',
      description: 'Crea ${input.title} en minutos y expórtalo listo para imprimir en PDF.',
      prerender: true,
    },
  },`;

  const appSurfaceManifestEntry = `  ${input.id}: {
    id: '${input.id}',
    name: '${input.title}',
    route: '${input.route}',
    primaryStudioFile: '${capsuleDir}/${studioComponentName}.tsx',
    menuAction: 'onSelectDocument',
    tabsBarAction: 'onNewDocument',
    features: {
      hasLandingCard: true,
      hasDockStepSequence: true,
      hasPdfPreset: true,
      hasStorageAdapter: true,
      hasCreditGating: true,
    },
    requiredFiles: [
      'src/shared/core/capabilities/capabilityRegistry.ts',
      'src/app/App.tsx',
      'src/shared/core/ui/DocumentTabsBar.tsx',
      'src/shared/core/ui/NewDocumentMenu.tsx',
      'src/shared/core/pdf-engine/layers/presets/presetRegistry.ts',
      'src/shared/core/storage/documentStorageService.ts',
      'src/shared/core/ui/marketing/PortalProductsGrid.tsx',
      'src/shared/i18n/catalog/landing.ts',
    ],
  },`;

  const appRegistryEntry = `  ${input.id}: {
    id: '${input.id}',
    route: '${input.route}',
    effectiveRoute: getRouteForDocType('${input.id}'),
    loadingLabel: 'Cargando ${input.title}...',
    initialTabId: '${input.id}_inicio',
    usesSharedCvWorkspace: false,
    autoCreateBlankTabOnRouteEnter: false,
    managesOwnStore: true,
    StudioComponent: lazy(() => import('../modules/${input.capsule}/${studioComponentName}')),
    newDocumentCopy: {
      successToast: '${input.title} listo para editar en esta computadora.',
    },
  },`;

  const dockProviderSnippet = `// src/app/appRegistry.ts -> registerAllDockProviders()
import { ${stepSeqConst} } from '../modules/${input.capsule}/domain/${input.id}StepSequence';
// ...
registerStepIds('${input.id}', ${stepSeqConst}.map((s) => s.id));
registerDockStepProvider('${input.id}', () =>
  ${stepSeqConst}.map((s) => ({
    id: s.id,
    label: s.label,
    stepNumber: s.stepNumber,
    isLarge: s.stepNumber <= 2,
    variant: s.stepNumber <= 2 ? ('accent' as const) : undefined,
  })),
);`;

  const productIconSnippet = `// src/shared/core/pdf-engine/layers/icons/iconRegistry.ts (+ PRODUCT_ICON_IDS en iconCatalog.ts)
  ${input.id}: {
    id: '${input.id}',
    viewBox: '0 0 24 24',
    paths: ['M4 4h16v16H4z', 'M8 9h8', 'M8 13h5'],
  },`;

  const pwaFileHandlerSnippet =
    input.storage === 'local-encrypted'
      ? `// (${input.id} es bóveda cifrada local: no expone file_handler externo por seguridad)`
      : `// public/manifest.json -> file_handlers[]
    {
      "action": "${input.route}",
      "accept": {
        "application/vnd.leecv.${slug}+json": [".lee${slug}"]
      },
      "icons": [
        { "src": "/brand/pwa-192x192.png", "sizes": "192x192", "type": "image/png" },
        { "src": "/brand/pwa-512x512.png", "sizes": "512x512", "type": "image/png" }
      ],
      "launch_type": "single-client"
    }`;

  const seoPrerenderSnippet = `// scripts/prerenderMeta.mjs -> ROUTES + metaMap
// En ROUTES: '${input.route}',
// En metaMap:
  '${input.route}': {
    title: '${input.title} | LEECV',
    description: 'Crea ${input.title} en minutos y expórtalo listo para imprimir en PDF.',
    content: ['<h1>${input.title}</h1>'],
    type: 'WebPage'
  },`;

  const landingCardSnippet = `// src/shared/core/ui/marketing/PortalProductsGrid.tsx (opcional tarjeta pública en portada)
  {
    id: '${input.id}',
    icon: FileText,
    badge: 'Nuevo',
    badgeColor: 'bg-[var(--color-accent-muted)] text-[var(--color-accent-text)] border-[var(--color-accent-base)]/30',
    title: '${input.title}',
    tagline: 'Creación rápida local paso a paso',
    description: 'Genera tu ${input.title} profesional y descárgalo listo para compartir o imprimir.',
    bullets: ['Edición paso a paso en vivo', 'Exportación vectorial a PDF'],
    route: '${input.route}',
    cta: 'Crear ${input.title}',
  },`;

  return {
    input,
    files,
    registrationSnippets: {
      documentTypeRegistryEntry,
      appSurfaceManifestEntry,
      appRegistryEntry,
      dockProviderSnippet,
      productIconSnippet,
      pwaFileHandlerSnippet,
      seoPrerenderSnippet,
      landingCardSnippet,
      lidioKnowledgeFile: knowledgeSnippet,
    },
  };
}

export function scaffoldNewApp(rootDir: string, plan: NewAppPlan): string[] {
  const written: string[] = [];
  for (const spec of plan.files) {
    const abs = path.join(rootDir, spec.relativePath);
    if (fs.existsSync(abs)) {
      throw new Error(`El archivo ya existe: ${spec.relativePath}`);
    }
  }
  for (const spec of plan.files) {
    const abs = path.join(rootDir, spec.relativePath);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, spec.content, 'utf8');
    written.push(spec.relativePath);
  }
  return written;
}

function parseCliArgs(argv: string[]): {
  selftest: boolean;
  dryRun: boolean;
  flags: Record<string, string>;
} {
  const flags: Record<string, string> = {};
  let selftest = false;
  let dryRun = false;

  for (const arg of argv) {
    if (arg === '--selftest') selftest = true;
    else if (arg === '--dry-run') dryRun = true;
    else if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      if (eq > 2) {
        flags[arg.slice(2, eq)] = arg.slice(eq + 1);
      }
    }
  }
  return { selftest, dryRun, flags };
}

function runSelfTest(): void {
  console.log('🧪 Ejecutando Self-Test de scripts/new-app.ts...');

  // 1. Debe rechazar tipos purgados
  for (const forbidden of ['portfolio', 'certificate']) {
    const errs = validateNewAppInput({
      id: forbidden,
      capsule: `${forbidden}-studio`,
      route: `/crear-${forbidden}`,
      title: 'Test',
      storage: 'local-only',
      privacy: 'full-summary',
    });
    if (errs.length === 0) {
      throw new Error(`Self-test falló: permitió docType prohibido "${forbidden}".`);
    }
  }

  // 2. Debe rechazar bóveda cifrada con full-summary
  const privErrs = validateNewAppInput({
    id: 'clinica',
    capsule: 'clinica-studio',
    route: '/crear-ficha',
    title: 'Fichas',
    storage: 'local-encrypted',
    privacy: 'full-summary',
  });
  if (privErrs.length === 0) {
    throw new Error('Self-test falló: permitió local-encrypted con privacy=full-summary.');
  }

  // 3. Debe materializar un esqueleto en directorio temporal
  const plan = buildNewAppPlan({
    id: 'diploma',
    capsule: 'diploma-studio',
    route: '/crear-diploma',
    title: 'Diplomas',
    storage: 'local-only',
    privacy: 'full-summary',
  });
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'leecv-new-app-'));
  try {
    const written = scaffoldNewApp(tmpDir, plan);
    if (written.length !== 6) {
      throw new Error(`Self-test falló: esperaba 6 archivos, escribió ${written.length}.`);
    }
    const studioFile = path.join(tmpDir, 'src/modules/diploma-studio/DiplomaStudioContent.tsx');
    if (!fs.existsSync(studioFile)) {
      throw new Error('Self-test falló: falta DiplomaStudioContent.tsx.');
    }
    const manifestSrc = fs.readFileSync(path.join(tmpDir, 'src/modules/diploma-studio/manifest.ts'), 'utf8');
    const studioSrc = fs.readFileSync(studioFile, 'utf8');
    if (!manifestSrc.includes('DocumentTypeManifest') || manifestSrc.includes('CapsuleManifest')) {
      throw new Error('Self-test falló: manifest.ts debe importar DocumentTypeManifest.');
    }
    if (studioSrc.includes('activeId: activeTabId') || !studioSrc.includes('activeId: docId') || !studioSrc.includes('ScaledPaperSheet')) {
      throw new Error('Self-test falló: studio generado debe usar activeId: docId y ScaledPaperSheet.');
    }
    if (
      !plan.registrationSnippets.documentTypeRegistryEntry.includes('ui:') ||
      !plan.registrationSnippets.documentTypeRegistryEntry.includes('seo:') ||
      !plan.registrationSnippets.appRegistryEntry.includes('managesOwnStore: true') ||
      !plan.registrationSnippets.appRegistryEntry.includes('autoCreateBlankTabOnRouteEnter: false') ||
      !plan.registrationSnippets.appSurfaceManifestEntry.includes("menuAction: 'onSelectDocument'") ||
      plan.registrationSnippets.lidioKnowledgeFile.includes('AppKnowledgeDefinition')
    ) {
      throw new Error('Self-test falló: snippets de registro incompletos o con contratos desactualizados.');
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  console.log('✅ Self-Test de new-app superado (4 invariantes verificadas).\n');
}

function main(): void {
  const { selftest, dryRun, flags } = parseCliArgs(process.argv.slice(2));
  if (selftest) {
    runSelfTest();
    return;
  }

  const input: NewAppInput = {
    id: flags.id || '',
    capsule: flags.capsule || (flags.id ? `${flags.id.replace(/_/g, '-')}-studio` : ''),
    route: flags.route || (flags.id ? `/crear-${flags.id.replace(/_/g, '-')}` : ''),
    title: flags.title || '',
    storage: (flags.storage as NewAppStorageMode) || 'local-only',
    privacy: (flags.privacy as NewAppPrivacyMode) || 'full-summary',
  };

  if (!input.id || !input.title) {
    console.error(
      'Uso: npm run new-app -- --id=<id> --title="<Nombre>" [--capsule=<slug>-studio] [--route=/crear-<slug>] [--storage=local-only|local-with-cloud-backup|local-encrypted] [--privacy=full-summary|metadata-only] [--dry-run]',
    );
    process.exit(1);
  }

  const plan = buildNewAppPlan(input);
  if (dryRun) {
    console.log('🔍 DRY RUN — Estructura de cápsula a crear:');
    for (const f of plan.files) console.log(`  + ${f.relativePath}`);
  } else {
    const created = scaffoldNewApp(process.cwd(), plan);
    console.log('✅ Cápsula generada en disco:');
    for (const rel of created) console.log(`  + ${rel}`);
  }

  console.log('\n📋 Pasos declarativos de registro (0 ediciones en shared/core/ui):');
  console.log('1) DOCUMENT_TYPE_REGISTRY:\n' + plan.registrationSnippets.documentTypeRegistryEntry);
  console.log('\n2) APP_SURFACE_MANIFEST:\n' + plan.registrationSnippets.appSurfaceManifestEntry);
  console.log('\n3) APP_REGISTRY:\n' + plan.registrationSnippets.appRegistryEntry);
  console.log('\n4) Dock Provider:\n' + plan.registrationSnippets.dockProviderSnippet);
  console.log('\n5) Product Icon (iconRegistry + iconCatalog):\n' + plan.registrationSnippets.productIconSnippet);
  console.log('\n6) PWA File Handler (public/manifest.json):\n' + plan.registrationSnippets.pwaFileHandlerSnippet);
  console.log('\n7) SEO Prerender (scripts/prerenderMeta.mjs):\n' + plan.registrationSnippets.seoPrerenderSnippet);
  console.log('\n8) PortalProductsGrid (opcional):\n' + plan.registrationSnippets.landingCardSnippet);
  console.log('\n9) Lidio Server Knowledge:\n' + plan.registrationSnippets.lidioKnowledgeFile);
}

const isCliEntry =
  !process.env.VITEST &&
  Boolean(process.argv[1]) &&
  path.basename(process.argv[1]).toLowerCase() === 'new-app.ts';

if (isCliEntry) {
  main();
}
