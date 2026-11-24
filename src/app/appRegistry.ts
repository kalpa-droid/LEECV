import React, { lazy } from 'react';
import {
  Layers,
  LayoutGrid,
  BookOpen,
  BookMarked,
  Bookmark,
  Hash,
  Scissors,
  Printer,
  Palette,
  Wallpaper,
  Settings,
  CheckSquare,
  CalendarDays,
  User,
  Store,
  ReceiptText,
  ListPlus,
  Boxes,
  Users,
  History,
  ShieldCheck,
  Sparkles,
  Library,
  FileText,
  Quote,
  Compass,
  Heart,
  FlaskConical,
  BarChart3,
  MessageSquareQuote,
  Paperclip,
  CheckCircle2,
  Feather,
  BookText,
  AlignLeft,
} from 'lucide-react';
import {
  DOCUMENT_TYPE_REGISTRY,
  RegisteredDocumentTypeId,
  getDocumentTypeConfig,
  getRouteForDocType,
  hasCapability,
  inferDocumentTypeId,
} from '../shared/core/capabilities/capabilityRegistry';
import {
  DockButtonRole,
  registerDockStepProvider,
  registerStepIds,
} from '../shared/core/studio-host/stepSequenceRegistry';
import {
  buildCvDockTabs,
  buildCoverLetterDockTabs,
} from '../modules/cv-builder/cvDockProvider';
import {
  CARD_STEP_IDS,
  buildCardDockTabs,
} from '../modules/card-studio/cardStepSequence';
import { BOOK_STEP_SEQUENCE } from '../modules/book-studio/domain/bookStepSequence';
import { buildEditorialDockTabs } from '../modules/editor-lee-studio/domain/editorialDockEngine';
import { PLANNER_STEP_SEQUENCE } from '../modules/planner-studio/plannerStepSequence';
import { FACTURADOR_STEP_SEQUENCE } from '../modules/facturador-studio/domain/facturadorStepSequence';
import { EDITORIAL_STEP_SEQUENCE } from '../modules/editor-lee-studio/domain/editorialStepSequence';
import type { OpenTab } from '../shared/core/documents/tabStore';
import type { DocumentTypeId } from '../types/document';

export interface StandaloneStudioProps {
  currentUiTheme?: string;
  onBackToHome?: () => void;
  documentTabs: OpenTab[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNavigateToDocument: (targetDocType: DocumentTypeId, id: string) => void;
  onNewDocument?: (docType: DocumentTypeId) => void;
  onNewCV?: () => void;
  onNewCard?: () => void;
  onNewBook?: () => void;
  onNewCoverLetter?: () => void;
  onNewPlanner?: () => void;
  onNewInvoice?: () => void;
  onNewEditorial?: () => void;
  cycleUITheme: () => void;
  onTabsChanged?: (tabs: OpenTab[]) => void;
  onOpenSavedCVsModal?: () => void;
  onOpenSaveAsModal?: () => void;
  onOpenJsonDownloadModal?: () => void;
  onOpenCreditsModal?: () => void;
  onOpenShareAppModal?: () => void;
  onOpenPrivacy?: () => void;
}

export interface NewDocumentCopy {
  confirmTitle?: string;
  confirmMessage?: string;
  confirmText?: string;
  confirmVariant?: 'info' | 'danger' | 'warning';
  successToast: string;
}

export interface AppRuntimeEntry {
  readonly id: RegisteredDocumentTypeId;
  readonly route: string;
  readonly effectiveRoute: string;
  readonly loadingLabel: string;
  readonly initialTabId: string;
  readonly usesSharedCvWorkspace: boolean;
  readonly autoCreateBlankTabOnRouteEnter: boolean;
  readonly managesOwnStore: boolean;
  readonly newDocumentCopy: NewDocumentCopy;
  readonly StudioComponent?: React.LazyExoticComponent<React.ComponentType<StandaloneStudioProps>>;
}

const BOOK_TAB_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  book_source_type: Layers,
  book_organize: LayoutGrid,
  book_cover: BookOpen,
  book_back_cover: BookMarked,
  book_dividers: Bookmark,
  book_foliado: Hash,
  book_imposition: Scissors,
  book_preview_export: Printer,
};

const BOOK_TAB_ROLES: Record<string, DockButtonRole> = {
  book_source_type: 'preset',
  book_imposition: 'preset',
  book_cover: 'preset',
  book_back_cover: 'preset',
  book_dividers: 'record',
  book_organize: 'record',
  book_foliado: 'record',
  book_preview_export: 'record',
};

const PLANNER_TAB_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  planner_design: Palette,
  planner_background: Wallpaper,
  planner_structure: Settings,
  planner_sections: CheckSquare,
  planner_months: CalendarDays,
  planner_personal: User,
};

const PLANNER_TAB_ROLES: Record<string, DockButtonRole> = {
  planner_design: 'preset',
  planner_background: 'preset',
  planner_structure: 'preset',
  planner_sections: 'record',
  planner_months: 'record',
  planner_personal: 'record',
};

const FACTURADOR_TAB_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  fact_emisor: Store,
  fact_comprobante: ReceiptText,
  fact_items: ListPlus,
  fact_catalogo: Boxes,
  fact_clientes: Users,
  fact_historial: History,
  fact_diseno: Palette,
  fact_respaldo: ShieldCheck,
};

const FACTURADOR_TAB_ROLES: Record<string, DockButtonRole> = {
  fact_emisor: 'record',
  fact_comprobante: 'record',
  fact_items: 'record',
  fact_catalogo: 'catalog',
  fact_clientes: 'catalog',
  fact_historial: 'record',
  fact_diseno: 'preset',
  fact_respaldo: 'record',
};

const EDITORIAL_TAB_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  editorial_inicio: BookOpen,
  editorial_portada: BookMarked,
  editorial_secciones: Layers,
  editorial_bibliografia: Library,
  editorial_diseño: Palette,
  editorial_toc: LayoutGrid,
  editorial_metadata: Settings,
  editorial_import_ai: Sparkles,
};

const EDITORIAL_SECTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  prologo: Quote,
  dedicatoria: Heart,
  agradecimientos: Users,
  resumen: FileText,
  introduccion: Compass,
  capitulo: BookMarked,
  unidad: Layers,
  desarrollo: AlignLeft,
  marco_teorico: BookOpen,
  metodologia: FlaskConical,
  resultados: BarChart3,
  discusion: MessageSquareQuote,
  conclusiones: CheckCircle2,
  epilogo: Feather,
  bibliografia: Library,
  glosario: BookText,
  anexo: Paperclip,
};

let dockProvidersRegistered = false;

/**
 * Registra de forma idempotente todos los proveedores de pasos del Dock lateral
 * para las 7 aplicaciones activas sin que `StudioDock` ni `assistantTips`
 * importen lógica de módulos ni motores específicos.
 */
export function registerAllDockProviders(): void {
  if (dockProvidersRegistered) return;
  dockProvidersRegistered = true;

  registerDockStepProvider('cv', buildCvDockTabs);
  registerDockStepProvider('business_card', () => buildCardDockTabs());
  registerStepIds('business_card', [...CARD_STEP_IDS]);
  registerDockStepProvider('cover_letter', () => buildCoverLetterDockTabs());

  registerDockStepProvider('book', ({ bookMode }) =>
    BOOK_STEP_SEQUENCE
      .filter((step) => !(bookMode !== 'fotocopia' && step.skipWhenNormal))
      .map((step) => ({
        id: step.id,
        label: step.label,
        stepNumber: step.stepNumber,
        icon: BOOK_TAB_ICONS[step.id] || Layers,
        isLarge: false,
        variant: 'accent' as const,
        role: BOOK_TAB_ROLES[step.id] || 'record',
      })),
  );
  registerStepIds('book', BOOK_STEP_SEQUENCE.map((s) => s.id));

  registerDockStepProvider('planner', () =>
    PLANNER_STEP_SEQUENCE.map((step) => ({
      id: step.id,
      label: step.label,
      stepNumber: step.stepNumber,
      icon: PLANNER_TAB_ICONS[step.id] || Layers,
      isLarge: true,
      variant: 'accent' as const,
      role: PLANNER_TAB_ROLES[step.id] || 'record',
    })),
  );
  registerStepIds('planner', PLANNER_STEP_SEQUENCE.map((s) => s.id));

  registerDockStepProvider('invoice', () =>
    FACTURADOR_STEP_SEQUENCE.filter((step) => !step.hideFromDock).map((step) => ({
      id: step.id,
      label: step.label,
      stepNumber: step.stepNumber,
      icon: FACTURADOR_TAB_ICONS[step.id] || Layers,
      isLarge: false,
      variant: FACTURADOR_TAB_ROLES[step.id] === 'preset' ? ('accent' as const) : FACTURADOR_TAB_ROLES[step.id] === 'catalog' ? ('success' as const) : ('secondary' as const),
      role: FACTURADOR_TAB_ROLES[step.id] || 'record',
    })),
  );
  registerStepIds('invoice', FACTURADOR_STEP_SEQUENCE.map((s) => s.id));

  registerDockStepProvider('editorial', (ctx) =>
    buildEditorialDockTabs(ctx, {
      steps: EDITORIAL_TAB_ICONS,
      sections: EDITORIAL_SECTION_ICONS,
      fallback: Layers,
    }),
  );
  registerStepIds('editorial', [
    ...EDITORIAL_STEP_SEQUENCE.map((s) => s.id),
    'editorial_historial',
  ]);
}

registerAllDockProviders();

const LazyCardStudio = lazy(() =>
  import('../modules/card-studio/CardStudioContent').then((m) => ({
    default: m.CardStudioContent as React.ComponentType<StandaloneStudioProps>,
  })),
);

const LazyBookStudio = lazy(() =>
  import('../modules/book-studio/BookStudio').then((m) => ({
    default: m.BookStudio as React.ComponentType<StandaloneStudioProps>,
  })),
);

const LazyPlannerStudio = lazy(() =>
  import('../modules/planner-studio/PlannerStudioContent').then((m) => ({
    default: m.PlannerStudioContent as React.ComponentType<StandaloneStudioProps>,
  })),
);

const LazyFacturadorStudio = lazy(() =>
  import('../modules/facturador-studio/FacturadorStudioContent').then((m) => ({
    default: m.FacturadorStudioContent as React.ComponentType<StandaloneStudioProps>,
  })),
);

const LazyEditorLeeStudio = lazy(() =>
  import('../modules/editor-lee-studio/EditorLeeStudioContent').then((m) => ({
    default: m.EditorLeeStudioContent as React.ComponentType<StandaloneStudioProps>,
  })),
);

/**
 * Composition Root único de aplicaciones activas (Fase 6).
 * Exhaustividad verificada en compilación (`satisfies Record<RegisteredDocumentTypeId, AppRuntimeEntry>`).
 */
export const APP_REGISTRY = {
  cv: {
    id: 'cv',
    route: '/crear-cv',
    effectiveRoute: getRouteForDocType('cv'),
    loadingLabel: 'Cargando Editor de CV...',
    initialTabId: 'importar_datos',
    usesSharedCvWorkspace: true,
    autoCreateBlankTabOnRouteEnter: false,
    managesOwnStore: false,
    newDocumentCopy: {
      confirmTitle: '¿Iniciar nuevo currículum?',
      confirmMessage:
        '¿Deseas iniciar un nuevo currículum en blanco? Se guardará un borrador automático de tu currículum actual.',
      confirmText: 'Sí, crear nuevo',
      successToast:
        'Tu borrador anterior ha sido resguardado con éxito. Ahora estás editando un currículum en blanco.',
    },
  },
  cover_letter: {
    id: 'cover_letter',
    route: '/crear-carta',
    effectiveRoute: getRouteForDocType('cover_letter'),
    loadingLabel: 'Cargando Carta de Presentación...',
    initialTabId: 'source_data',
    usesSharedCvWorkspace: true,
    autoCreateBlankTabOnRouteEnter: false,
    managesOwnStore: false,
    newDocumentCopy: {
      confirmTitle: '¿Crear una nueva postulación?',
      confirmMessage:
        'Se creará una copia independiente de este CV para completar la vacante y su carta. El perfil de origen se conservará.',
      confirmText: 'Crear postulación',
      confirmVariant: 'info',
      successToast:
        'Postulación creada. Completá la vacante y redactá la carta dentro de esta versión.',
    },
  },
  business_card: {
    id: 'business_card',
    route: '/crear-tarjeta',
    effectiveRoute: getRouteForDocType('business_card'),
    loadingLabel: 'Cargando Estudio de Tarjetas...',
    initialTabId: 'card_front',
    usesSharedCvWorkspace: false,
    autoCreateBlankTabOnRouteEnter: true,
    managesOwnStore: false,
    StudioComponent: LazyCardStudio,
    newDocumentCopy: {
      confirmTitle: '¿Iniciar nueva Tarjeta Personal?',
      confirmMessage:
        '¿Deseas iniciar una tarjeta personal en blanco? Se guardará un borrador automático de tu documento actual.',
      confirmText: 'Sí, crear tarjeta',
      successToast: 'Tarjeta personal creada en blanco.',
    },
  },
  book: {
    id: 'book',
    route: '/crear-libro',
    effectiveRoute: getRouteForDocType('book'),
    loadingLabel: 'Cargando Creador de Libros...',
    initialTabId: 'book_source_type',
    usesSharedCvWorkspace: false,
    autoCreateBlankTabOnRouteEnter: true,
    managesOwnStore: false,
    StudioComponent: LazyBookStudio,
    newDocumentCopy: {
      confirmTitle: '¿Iniciar nuevo Libro / Folleto?',
      confirmMessage: '¿Querés empezar un libro nuevo? Se resguardará tu borrador actual.',
      confirmText: 'Sí, crear libro',
      confirmVariant: 'info',
      successToast: 'Nuevo libro / folleto listo para procesar.',
    },
  },
  planner: {
    id: 'planner',
    route: '/crear-agenda',
    effectiveRoute: getRouteForDocType('planner'),
    loadingLabel: 'Cargando Estudio de Agendas...',
    initialTabId: 'planner_design',
    usesSharedCvWorkspace: false,
    autoCreateBlankTabOnRouteEnter: true,
    managesOwnStore: false,
    StudioComponent: LazyPlannerStudio,
    newDocumentCopy: {
      confirmTitle: '¿Iniciar nueva Agenda / Planificador?',
      confirmMessage: '¿Querés empezar una agenda nueva? Se resguardará tu borrador actual.',
      confirmText: 'Sí, crear agenda',
      confirmVariant: 'info',
      successToast: 'Nueva agenda lista para configurar.',
    },
  },
  invoice: {
    id: 'invoice',
    route: '/crear-factura',
    effectiveRoute: getRouteForDocType('invoice'),
    loadingLabel: 'Cargando FacturLee…',
    initialTabId: 'fact_items',
    usesSharedCvWorkspace: false,
    autoCreateBlankTabOnRouteEnter: false,
    managesOwnStore: true,
    StudioComponent: LazyFacturadorStudio,
    newDocumentCopy: {
      successToast: 'FacturLee lista. Tus datos quedan solo en esta computadora.',
    },
  },
  editorial: {
    id: 'editorial',
    route: '/crear-editor',
    effectiveRoute: getRouteForDocType('editorial'),
    loadingLabel: 'Cargando EditorLee…',
    initialTabId: 'editorial_inicio',
    usesSharedCvWorkspace: false,
    autoCreateBlankTabOnRouteEnter: false,
    managesOwnStore: true,
    StudioComponent: LazyEditorLeeStudio,
    newDocumentCopy: {
      successToast: 'EditorLee listo. Tu libro o informe está listo para redactar.',
    },
  },
} as const satisfies Record<RegisteredDocumentTypeId, AppRuntimeEntry>;

const ALL_APP_ENTRIES: readonly AppRuntimeEntry[] = Object.values(APP_REGISTRY);

export function getAppRuntimeEntry(docType: RegisteredDocumentTypeId | string): AppRuntimeEntry {
  const normalized = getDocumentTypeConfig(docType).id;
  return APP_REGISTRY[normalized];
}

export function findStandaloneStudioByRoute(route?: string | null): AppRuntimeEntry | null {
  if (!route) return null;
  const clean = route.split(/[?#]/, 1)[0].toLowerCase().trim().replace(/\/+$/, '') || '/';
  return (
    ALL_APP_ENTRIES.find(
      (entry) =>
        !entry.usesSharedCvWorkspace &&
        Boolean(entry.StudioComponent) &&
        entry.effectiveRoute === clean,
    ) || null
  );
}

export function isKnownAppRoute(path: string): boolean {
  if (!path) return false;
  if (path.startsWith('/blog') || path.startsWith('/cv/')) return true;
  const clean = path.split(/[?#]/, 1)[0].toLowerCase().trim().replace(/\/+$/, '') || '/';
  return ALL_APP_ENTRIES.some(
    (entry) => entry.route === clean || entry.effectiveRoute === clean,
  );
}

export function resolveInitialTabForDocument(
  docType: RegisteredDocumentTypeId,
  cvData?: any,
): string {
  if (
    hasCapability(docType, 'experience') &&
    (cvData?.sourceCvTabId || cvData?.body?.hookParagraph)
  ) {
    return 'carta';
  }
  return APP_REGISTRY[docType].initialTabId;
}

export function resolveActiveDocTypeForRoute(
  currentRoute?: string,
  cvData?: any,
): RegisteredDocumentTypeId {
  const standalone = findStandaloneStudioByRoute(currentRoute);
  if (standalone) return standalone.id;
  return inferDocumentTypeId(cvData);
}

export { DOCUMENT_TYPE_REGISTRY };
