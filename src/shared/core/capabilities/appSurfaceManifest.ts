import { DocumentTypeId } from '../../../types/document';

export interface AppSurfaceFeatures {
  hasLandingCard: boolean;
  hasDockStepSequence: boolean;
  hasPdfPreset: boolean;
  hasStorageAdapter: boolean;
  hasCreditGating: boolean;
}

export interface AppSurfaceSpec {
  id: DocumentTypeId;
  name: string;
  route: string;
  primaryStudioFile: string;
  menuAction: string;
  tabsBarAction: string;
  features: AppSurfaceFeatures;
  requiredFiles: string[];
}

/**
 * APP_SURFACE_MANIFEST
 * Fuente única canónica de la superficie completa requerida para cada DocumentTypeId en LEECV.
 * Garantiza que ninguna app quede huérfana, sin ruta o incompletamente cableada (Pilar 8 Regla 10).
 */
export const APP_SURFACE_MANIFEST: Record<DocumentTypeId, AppSurfaceSpec> = {
  cv: {
    id: 'cv',
    name: 'Currículum Vitae',
    route: '/crear-cv',
    primaryStudioFile: 'src/app/App.tsx',
    menuAction: 'onSelectCV',
    tabsBarAction: 'onNewCV',
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
  },
  business_card: {
    id: 'business_card',
    name: 'Tarjetas Personales',
    route: '/crear-tarjeta',
    primaryStudioFile: 'src/modules/card-studio/CardStudioContent.tsx',
    menuAction: 'onSelectCard',
    tabsBarAction: 'onNewCard',
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
  },
  book: {
    id: 'book',
    name: 'Libro / Folleto',
    route: '/crear-libro',
    primaryStudioFile: 'src/app/App.tsx',
    menuAction: 'onSelectBook',
    tabsBarAction: 'onNewBook',
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
  },
  cover_letter: {
    id: 'cover_letter',
    name: 'Carta de Presentación',
    route: '/crear-carta',
    primaryStudioFile: 'src/app/App.tsx',
    menuAction: 'onSelectCoverLetter',
    tabsBarAction: 'onNewCoverLetter',
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
  },
  planner: {
    id: 'planner',
    name: 'Agenda / Planificador',
    route: '/crear-agenda',
    primaryStudioFile: 'src/app/App.tsx',
    menuAction: 'onSelectPlanner',
    tabsBarAction: 'onNewPlanner',
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
  },
  invoice: {
    id: 'invoice',
    name: 'Presupuestos y Facturas (FacturLee)',
    route: '/crear-factura',
    primaryStudioFile: 'src/modules/facturador-studio/FacturadorStudioContent.tsx',
    menuAction: 'onSelectInvoice',
    tabsBarAction: 'onNewInvoice',
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
  },
  editorial: {
    id: 'editorial',
    name: 'Editor de Libros e Informes (EditorLee)',
    route: '/crear-editor',
    primaryStudioFile: 'src/modules/editor-lee-studio/EditorLeeStudioContent.tsx',
    menuAction: 'onSelectEditorial',
    tabsBarAction: 'onNewEditorial',
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
  },
};
