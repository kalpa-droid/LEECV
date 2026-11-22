import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from '../../shared/core/ui/AppShell';
import StudioNavbar from '../../shared/core/studio-host/StudioNavbar';
import StudioDock from '../../shared/core/studio-host/StudioDock';
import { VectorDocViewer } from '../../shared/core/pdf-engine/VectorDocViewer';
import { EditorialPdfDocument } from './pdf/EditorialPdfDocument';
import { DEFAULT_EDITORIAL_PRESET, getEditorialPreset } from './domain/editorialPresetCatalog';
import { EDITORIAL_PRESETS } from './pdf/editorialPresets';
import { DocumentTypeId } from '../../types/document';
import { useDocumentViewport, useViewportGestures, ScaledPaperSheet, quantizeRasterZoom } from '../../shared/core/viewport';
import { resolveDocumentCanvasPx } from '../../shared/core/pdf-engine/layers/page/pageSizes';
import { ErrorBoundary } from '../../shared/core/ui/ErrorBoundary';
import { OpenTab } from '../../shared/core/documents/tabStore';
import { AUTOSAVE_DEBOUNCE_MS, resolveDocumentIdWithHandoff, useRegisterDocumentTab } from '../../shared/core/documents/documentEngine';
import { sanitizeEditorialData } from './domain/sanitizeEditorialData';
import { saveDocumentDraftLocal, loadDocumentById, getSavedEditorialsList } from '../../shared/core/storage/documentStorageService';
import { useToast } from '../../shared/core/ui/Toast';
import { withErrorHandling } from '../../shared/core/utils/errorHandler';
import { exportDocumentToPDF } from '../../shared/core/pdf-engine/pdfExporter';
import { useExportEntitlement } from '../../shared/core/entitlements/useExportEntitlement';
import PdfCheckoutModal from '../../shared/core/studio-host/PdfCheckoutModal';
import { elevationSystem, radius } from '../../shared/core/uiDesignSystem';
import { FloatingAssistant } from '../../shared/core/studio-host/FloatingAssistant';
import { EDITORIAL_STEP_SEQUENCE } from './domain/editorialStepSequence';
import { Field } from '../../shared/core/ui/Field';
import { PAGE_SIZES } from '../../shared/core/pdf-engine/layers/page/pageSizes';
import { EDITORIAL_SECTION_CATALOG } from './domain/editorialSectionCatalog';
import { generateSectionAnchors } from './domain/editorialTocResolver';
import { EditorialImportAiPanel } from './panels/EditorialImportAiPanel';
import {
  saveDocumentToDisk,
  openDocumentFromDisk,
  getBoundNativeFileName,
} from '../../shared/core/storage/nativeFileDocumentService';
import { unpackDocumentFromDisk } from '../../shared/core/storage/leecvPackageCodec';
import { encodeImageFileWithinBudget } from '../../shared/core/cv-import/pageImageEncoder';
import { FolderOpen, Save, Trash2 } from 'lucide-react';

export interface EditorLeeStudioContentProps {
  currentUiTheme?: string;
  documentTabs: OpenTab[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNavigateToDocument: (targetDocType: DocumentTypeId, id: string) => void;
  onNewDocument?: (docType: DocumentTypeId) => void;
  onNewCV?: () => void;
  onNewCard?: () => void;
  onNewBook?: () => void;
  onNewPlanner?: () => void;
  onNewInvoice?: () => void;
  onNewEditorial?: () => void;
  cycleUITheme: () => void;
  onTabsChanged?: (tabs: OpenTab[]) => void;
  onOpenShareAppModal?: () => void;
  onOpenPrivacy?: () => void;
}

function buildEditorialTitle(data: any): string {
  const obra = String(data?.metadata?.title || '').trim();
  if (!obra || obra === 'Mi obra') return 'EditorLee - Mi obra';
  return obra.toLowerCase().startsWith('editorlee') ? obra : `EditorLee - ${obra}`;
}

/**
 * Estudio de EditorLee (/crear-editor).
 *
 * Shell mínimo: la pestaña guarda solo id + título. Toda la información
 * vive en el documento editorial estructurado. Motor PDF nativo
 * @react-pdf/renderer con visor VectorDocViewer idéntico al CV/FacturLee.
 */
export const EditorLeeStudioContent: React.FC<EditorLeeStudioContentProps> = ({
  currentUiTheme = 'day',
  documentTabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNavigateToDocument,
  onNewDocument,
  onNewCV,
  onNewCard,
  onNewBook,
  onNewPlanner,
  onNewInvoice,
  onNewEditorial: _onNewEditorial,
  cycleUITheme,
  onTabsChanged = () => {},
  onOpenShareAppModal,
  onOpenPrivacy,
}) => {
  const [activeStepTab, setActiveStepTab] = useState<string>('editorial_inicio');
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);

  const { showSuccess, showError, showInfo } = useToast();
  const { consumeCreditIfNeeded } = useExportEntitlement();

  const editorialId = useMemo(
    () => resolveDocumentIdWithHandoff(activeTabId, 'editorial'),
    [activeTabId]
  );

  const sheetRef = useRef<HTMLDivElement>(null);
  const hydratedIdRef = useRef<string | null>(null);
  const hasEditedRef = useRef<boolean>(false);
  const [draft, setDraft] = useState<any>(() => createEmptyEditorial());
  const [debouncedDraft, setDebouncedDraft] = useState<any>(draft);
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedDraft(draft), 300);
    return () => window.clearTimeout(t);
  }, [draft]);

  const preset = draft?.design?.presetId || DEFAULT_EDITORIAL_PRESET.id;
  const activeEditorialPreset = getEditorialPreset(preset) || DEFAULT_EDITORIAL_PRESET;
  const pageSizeId = draft?.design?.pageSizeId || draft?.design?.pageSize || activeEditorialPreset.pageSize || 'a4';

  const viewport = useDocumentViewport({ pageSizeId });
  const { widthPx, heightPx } = useMemo(() => resolveDocumentCanvasPx(pageSizeId), [pageSizeId]);
  const rasterZoom = quantizeRasterZoom(viewport.zoomLevel);

  const [focusedAnchorId, setFocusedAnchorId] = useState<string>(activeStepTab);
  useEffect(() => {
    setFocusedAnchorId(activeStepTab);
  }, [activeStepTab]);

  const focusSectionInPreview = useCallback((sectionId: string) => {
    setFocusedAnchorId(sectionId);
    window.dispatchEvent(
      new CustomEvent('pdf-anchor-scroll', {
        detail: { tabId: sectionId, forcePostRender: true },
      }),
    );
  }, []);

  useViewportGestures({
    containerRef: viewport.containerRef,
    sheetRef,
    onZoomChange: viewport.setZoomLevel,
    zoomLevel: viewport.zoomLevel,
  });

  const editorialTitle = buildEditorialTitle(draft);

  useRegisterDocumentTab({
    id: editorialId,
    docType: 'editorial',
    title: editorialTitle,
    documentTabs,
    onTabsChanged,
  });

  useEffect(() => {
    let active = true;
    hydratedIdRef.current = null;
    hasEditedRef.current = false;
    void (async () => {
      try {
        const loaded = await loadDocumentById(editorialId, 'editorial');
        const sanitized = sanitizeEditorialData(loaded);
        if (active) {
          setDraft(sanitized || createEmptyEditorial());
        }
      } catch (err) {
        console.warn('Error cargando documento editorial:', err);
      } finally {
        if (active) {
          hydratedIdRef.current = editorialId;
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [editorialId]);

  useEffect(() => {
    if (hydratedIdRef.current !== editorialId || !hasEditedRef.current || !draft) return;
    const timer = window.setTimeout(() => {
      const fullDoc = {
        ...draft,
        id: editorialId,
        type: 'editorial',
        updatedAt: Date.now(),
      };
      void saveDocumentDraftLocal(fullDoc, 'editorial');
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [draft, editorialId]);

  const updateDraft = useCallback(
    (updater: (prev: any) => any) => {
      hasEditedRef.current = true;
      setDraft((prev: any) => updater(prev || createEmptyEditorial()));
    },
    []
  );

  const handleNewDraft = useCallback(() => {
    hasEditedRef.current = false;
    setDraft(createEmptyEditorial());
    setActiveStepTab('editorial_inicio');
    setIsPanelOpen(true);
    showInfo('Nuevo documento editorial listo para redactar.');
  }, [showInfo]);

  const handleSaveDocument = useCallback(async () => {
    if (!draft) return;
    await withErrorHandling(
      async () => {
        const fullDoc = {
          ...draft,
          id: editorialId,
          type: 'editorial',
          updatedAt: Date.now(),
        };
        const res = await saveDocumentDraftLocal(fullDoc, 'editorial');
        if (!res?.success) throw new Error('No se pudo guardar el documento.');
        showSuccess('Borrador guardado en esta computadora.');
      },
      {
        context: 'Guardado EditorLee',
        errorMessage: 'No pudimos guardar el documento.',
        notify: (msg) => showError(msg),
      }
    );
  }, [draft, editorialId, showSuccess, showError]);

  const handleExportPDF = useCallback(async () => {
    if (!draft) return;
    const allowed = await consumeCreditIfNeeded();
    if (!allowed) {
      setIsCheckoutOpen(true);
      return;
    }

    setIsExporting(true);
    await withErrorHandling(
      async () => {
        const ok = await exportDocumentToPDF(
          { draft, preset },
          preset
        );
        if (!ok) throw new Error('pdf_sin_documento');
        showSuccess('Documento exportado en PDF.');
      },
      {
        context: 'Exportación EditorLee',
        errorMessage: 'No pudimos generar el PDF del documento.',
        notify: (msg) => showError(msg),
      }
    );
    setIsExporting(false);
  }, [draft, preset, consumeCreditIfNeeded, showSuccess, showError]);

  const handleSaveToDisk = useCallback(
    async (forceSaveAs: boolean = false) => {
      if (!draft) return;
      await withErrorHandling(
        async () => {
          const res = await saveDocumentToDisk(editorialId, 'editorial', draft, { forceSaveAs });
          if (res.status === 'saved') {
            showSuccess(
              res.overwroteExisting
                ? `Archivo actualizado en disco (${res.fileName}).`
                : `Documento guardado en archivo (${res.fileName}).`,
            );
          }
        },
        {
          context: 'Guardar archivo EditorLee',
          errorMessage: 'No pudimos guardar el archivo en la computadora.',
          notify: (msg) => showError(msg),
        },
      );
    },
    [draft, editorialId, showSuccess, showError],
  );

  const handleOpenDiskFile = useCallback(
    async (fallbackFile?: File) => {
      await withErrorHandling(
        async () => {
          let loadedData: any = null;
          let openedName = '';

          if (fallbackFile) {
            const unpacked = await unpackDocumentFromDisk(fallbackFile);
            loadedData = unpacked.data;
            openedName = fallbackFile.name;
          } else {
            const picked = await openDocumentFromDisk();
            if (picked.status === 'cancelled') return;
            if (picked.status === 'fallback-required') return 'needs-input';
            loadedData = picked.data;
            openedName = picked.fileName;
          }

          const sanitized = sanitizeEditorialData(loadedData);
          if (!sanitized) throw new Error('El archivo no contiene un documento editorial válido.');
          hasEditedRef.current = true;
          setDraft(sanitized);
          setActiveStepTab('editorial_secciones');
          setIsPanelOpen(true);
          showSuccess(`Documento abierto (${openedName}).`);
          return 'ok';
        },
        {
          context: 'Abrir archivo EditorLee',
          errorMessage: 'No pudimos abrir el archivo seleccionado.',
          notify: (msg) => showError(msg),
        },
      );
    },
    [showSuccess, showError],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (getBoundNativeFileName(editorialId)) {
          void handleSaveToDisk(false);
        } else {
          void handleSaveDocument();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editorialId, handleSaveToDisk, handleSaveDocument]);

  const handleDuplicate = useCallback(
    (saved: any) => {
      if (!draft) return;
      updateDraft((prev: any) => ({
        ...prev,
        sections: [
          ...prev.sections,
          {
            id: `ed_seccion_${Date.now()}`,
            title: saved?.title || 'Nueva sección',
            visible: true,
            includeInToc: true,
            startNewPage: true,
            position: prev.sections.length,
            records: [],
          },
        ],
      }));
      setActiveStepTab('editorial_secciones');
      setIsPanelOpen(true);
      showInfo('Documento repetido como nuevo borrador.');
    },
    [draft, updateDraft, showInfo]
  );

  const handleOpenSaved = useCallback(
    async (saved: any) => {
      if (!saved?.id) return;
      await withErrorHandling(
        async () => {
          const loaded = await loadDocumentById(saved.id, 'editorial');
          const sanitized = sanitizeEditorialData(loaded);
          if (!sanitized) throw new Error('documento_editorial_invalido');
          hasEditedRef.current = false;
          setDraft(sanitized);
          setActiveStepTab('editorial_secciones');
          setIsPanelOpen(true);
          showSuccess('Documento cargado correctamente.');
        },
        {
          context: 'Abrir documento EditorLee',
          errorMessage: 'No pudimos abrir el documento guardado.',
          notify: (msg) => showError(msg),
        }
      );
    },
    [showSuccess, showError]
  );

  const debouncedPreset = debouncedDraft?.design?.presetId || DEFAULT_EDITORIAL_PRESET.id;
  const pdfElement = useMemo(
    () => (
      <EditorialPdfDocument
        data={debouncedDraft as any}
        preset={debouncedPreset}
        interactiveAnchors={true}
      />
    ),
    [debouncedDraft, debouncedPreset]
  );

  const stepProps: StepProps = {
    draft,
    updateDraft,
    notify: { success: showSuccess, error: showError },
    setActiveStepTab,
    onFocusSection: focusSectionInPreview,
    onOpenSaved: handleOpenSaved,
    onDuplicate: handleDuplicate,
    onExportPDF: handleExportPDF,
    onSaveToDisk: () => void handleSaveToDisk(true),
    onOpenDiskFile: handleOpenDiskFile,
  };

  return (
    <>
      <AppShell
        docType="editorial"
        isPanelOpen={isPanelOpen}
        containerRef={viewport.containerRef}
        navbarSlot={
          <StudioNavbar
            docType="editorial"
            currentCvData={{}}
            currentUiTheme={currentUiTheme}
            onOpenSavedCVsModal={() => {
              setActiveStepTab('editorial_historial');
              setIsPanelOpen(true);
            }}
            onSaveCVClick={handleSaveDocument}
            onOpenSaveAsModal={() => {
              void handleSaveToDisk(true);
            }}
            onOpenJsonDownloadModal={() => {
              void handleSaveToDisk(true);
            }}
            onPrint={handleExportPDF}
            isSaving={isExporting}
            onOpenShareAppModal={onOpenShareAppModal || (() => {})}
            onOpenPrivacy={onOpenPrivacy || (() => {})}
            zoomLevel={viewport.zoomLevel}
            setZoomLevel={viewport.setZoomLevel}
            triggerAutoFit={viewport.fitAndCenter}
            cycleUITheme={cycleUITheme}
          />
        }
        dockSlot={
          <StudioDock
            docType="editorial"
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
          <div className="p-4 pb-24 sm:pb-16 space-y-6 overflow-y-auto h-full max-h-full text-[var(--ui-text-primary)]">
            {activeStepTab === 'editorial_inicio' && <InicioEditorialStep {...stepProps} />}
            {activeStepTab === 'editorial_portada' && <PortadaEditorialStep {...stepProps} />}
            {activeStepTab === 'editorial_secciones' && <SeccionesEditorialStep {...stepProps} />}
            {activeStepTab === 'editorial_diseño' && <DiseñoEditorialStep {...stepProps} />}
            {activeStepTab === 'editorial_toc' && <TocEditorialStep {...stepProps} />}
            {activeStepTab === 'editorial_metadata' && <MetadatosEditorialStep {...stepProps} />}
            {activeStepTab === 'editorial_import_ai' && <ImportAiEditorialStep {...stepProps} />}
            {activeStepTab === 'editorial_historial' && (
              <HistorialEditorialStep {...stepProps} onDuplicate={handleDuplicate} />
            )}

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-[var(--ui-border)]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--ui-text-secondary)]">
                Paso {EDITORIAL_STEP_SEQUENCE.find((step) => step.id === activeStepTab)?.stepNumber || 1} de{' '}
                {EDITORIAL_STEP_SEQUENCE.length}
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={handleNewDraft}
                  className="px-3 py-2 text-xs font-bold bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] text-[var(--ui-text-primary)] cursor-pointer"
                  style={{ borderRadius: radius.control }}
                >
                  Documento nuevo
                </button>
                <button
                  type="button"
                  onClick={handleSaveDocument}
                  className="px-3 py-2 text-xs font-bold bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] text-[var(--ui-text-primary)] cursor-pointer"
                  style={{ borderRadius: radius.control }}
                >
                  Guardar borrador
                </button>
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="px-3 py-2 text-xs font-bold bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] cursor-pointer"
                  style={{ borderRadius: radius.control }}
                >
                  Exportar PDF
                </button>
              </div>
            </div>
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
                subtitle="Ocurrió un problema al procesar la plantilla del PDF. Tu información guardada no se ve afectada."
              >
                <VectorDocViewer
                  document={pdfElement}
                  zoomLevel={rasterZoom}
                  activeTab={focusedAnchorId}
                  preset={EDITORIAL_PRESETS.find((p) => p.id === preset) || EDITORIAL_PRESETS[0]}
                />
              </ErrorBoundary>
            </ScaledPaperSheet>
          </div>
        }
        tabsBarProps={{
          tabs: documentTabs,
          activeId: editorialId,
          docType: 'editorial',
          onSwitch: onSelectTab,
          onNavigateToDocument: (targetType, id) => onNavigateToDocument(targetType, id),
          onAdd: () => (onNewDocument ? onNewDocument('editorial') : handleNewDraft()),
          onNewDocument,
          onNewCV,
          onNewCard,
          onNewBook,
          onNewPlanner,
          onNewInvoice,
          onNewEditorial: () => (onNewDocument ? onNewDocument('editorial') : handleNewDraft()),
          onClose: (_e, id) => onCloseTab(id),
        }}
      />
      <FloatingAssistant
        activeTab={activeStepTab}
        onNavigate={(tabId) => {
          setActiveStepTab(tabId);
          setIsPanelOpen(true);
        }}
        docType="editorial"
        cvData={draft}
      />
      <PdfCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onConfirm={() => {
          setIsCheckoutOpen(false);
          void handleExportPDF();
        }}
      />
    </>
  );
};

function createEmptyEditorial(initialPatch: Partial<any> = {}): any {
  return {
    id: `editorial_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'editorial',
    metadata: {
      title: initialPatch.title || 'Mi obra',
      author: initialPatch.author || '',
      editor: initialPatch.editor || '',
      year: initialPatch.year || new Date().getFullYear(),
      isbn: initialPatch.isbn || '',
    },
    design: {
      presetId: DEFAULT_EDITORIAL_PRESET.id,
      pageSizeId: DEFAULT_EDITORIAL_PRESET.pageSize,
      marginTop: 20,
      marginBottom: 20,
      marginLeft: 20,
      marginRight: 20,
      gutter: 20, // lomo interior
      typography: {
        fontFamily: DEFAULT_EDITORIAL_PRESET.typography.fontFamily,
        fontSize: DEFAULT_EDITORIAL_PRESET.typography.fontSize,
        lineHeight: DEFAULT_EDITORIAL_PRESET.typography.lineHeight,
      },
    },
    sections: initialPatch.sections || [],
    cover: initialPatch.cover || { mode: 'libro', title: 'Mi obra' },
    tocConfig: {
      enabled: true,
      title: 'Índice Automático',
      showSubtitles: true,
      position: 'tras-caratula',
    },
    manifestRules: {
      preserveScenes: true,
      preservePoems: true,
      preserveCitations: true,
      typographyCleanup: true,
      qrQuietZone: 4,
      qrMinSize: 20,
    },
    legalFields: {},
  };
}

interface StepProps {
  draft: any;
  updateDraft: (updater: (prev: any) => any) => void;
  notify: { success: (msg: string) => void; error: (msg: string) => void };
  setActiveStepTab: (tab: string) => void;
  onFocusSection?: (sectionId: string) => void;
  onOpenSaved?: (saved: any) => void;
  onDuplicate?: (saved: any) => void;
  onExportPDF?: () => void;
  onSaveToDisk?: () => void;
  onOpenDiskFile?: (fallbackFile?: File) => Promise<any>;
}

function InicioEditorialStep({ setActiveStepTab, onSaveToDisk, onOpenDiskFile }: StepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpen = async () => {
    const res = await onOpenDiskFile?.();
    if (res?.data === 'needs-input' || res === 'needs-input') {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-2">Bienvenido/a a EditorLee</h2>
        <p className="text-sm text-[var(--ui-text-secondary)]">
          Creá libros, informes, apuntes o documentos extensos con capítulos e imágenes. Guardá un archivo <code>.leedoc</code> en tu computadora como en Word o abrí uno existente.
        </p>
      </div>
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setActiveStepTab('editorial_portada')}
          className="w-full py-3 px-4 bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] rounded text-sm font-medium cursor-pointer"
        >
          Comenzar con Portada / Carátula
        </button>
        <button
          type="button"
          onClick={() => setActiveStepTab('editorial_secciones')}
          className="w-full py-3 px-4 bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] rounded text-sm font-medium cursor-pointer"
        >
          Comenzar directamente con Secciones
        </button>
      </div>

      <div className="pt-4 border-t border-[var(--ui-border)] space-y-2.5">
        <span className="block text-xs font-bold uppercase tracking-wider text-[var(--ui-text-secondary)]">
          Archivo en esta computadora (.leedoc / .json / .zip)
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleOpen}
            className="py-2.5 px-3 bg-[var(--ui-bg-card)] border border-[var(--ui-border)] hover:border-[var(--color-accent-base)] rounded text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <FolderOpen className="w-4 h-4 text-[var(--color-accent-text)]" />
            Abrir archivo…
          </button>
          <button
            type="button"
            onClick={() => onSaveToDisk?.()}
            className="py-2.5 px-3 bg-[var(--ui-bg-card)] border border-[var(--ui-border)] hover:border-[var(--color-accent-base)] rounded text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Save className="w-4 h-4 text-[var(--color-accent-text)]" />
            Guardar .leedoc en PC
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".leedoc,.leecv-editor,.json,.zip"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.currentTarget.value = '';
            if (f) void onOpenDiskFile?.(f);
          }}
        />
      </div>
    </div>
  );
}

function PortadaEditorialStep({ draft, updateDraft, setActiveStepTab }: StepProps) {
  const coverMode = draft?.cover?.mode || 'libro';

  const setCoverMode = (mode: string) => {
    updateDraft((prev: any) => ({
      ...prev,
      cover: { ...(prev?.cover || {}), mode },
    }));
  };

  const updateMeta = (field: string, val: string) => {
    updateDraft((prev: any) => ({
      ...prev,
      metadata: { ...(prev?.metadata || {}), [field]: val },
    }));
  };

  const updateLegal = (field: string, val: string) => {
    updateDraft((prev: any) => ({
      ...prev,
      legalFields: { ...(prev?.legalFields || {}), [field]: val },
    }));
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h2 className="text-lg font-bold">Portada / Carátula</h2>
        <p className="text-xs text-[var(--ui-text-secondary)]">
          Elegí el estilo de carátula para tu obra o informe y completá los datos principales.
        </p>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--ui-text-secondary)]">
          Estilo de Tapa
        </label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'libro', label: 'Tapa de Libro' },
            { id: 'academica', label: 'Carátula Académica' },
            { id: 'ejecutiva', label: 'Tapa Ejecutiva' },
            { id: 'sin-caratula', label: 'Sin carátula' },
          ].map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setCoverMode(mode.id)}
              className={`py-2 px-3 text-xs font-bold rounded border transition cursor-pointer text-left ${
                coverMode === mode.id
                  ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-muted)] text-[var(--color-accent-text)]'
                  : 'border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-[var(--ui-text-primary)] hover:bg-[var(--ui-bg-panel)]'
              }`}
              style={{ borderRadius: radius.control }}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {coverMode !== 'sin-caratula' && (
        <div className="space-y-3 p-3.5 rounded border border-[var(--ui-border)] bg-[var(--ui-bg-card)]">
          <Field
            label="Título de la obra o informe"
            value={draft?.metadata?.title || ''}
            onChange={(e: any) => updateMeta('title', e.target.value)}
            placeholder="Ej: Análisis de Sistemas Complejos"
          />
          <Field
            label="Subtítulo (opcional)"
            value={draft?.metadata?.subtitle || ''}
            onChange={(e: any) => updateMeta('subtitle', e.target.value)}
            placeholder="Ej: Un enfoque práctico y moderno"
          />
          <Field
            label="Autor o Autores"
            value={draft?.metadata?.author || ''}
            onChange={(e: any) => updateMeta('author', e.target.value)}
            placeholder="Ej: María López"
          />
          {coverMode === 'libro' && (
            <Field
              label="Editorial o Sello"
              value={draft?.metadata?.editorial || ''}
              onChange={(e: any) => updateMeta('editorial', e.target.value)}
              placeholder="Ej: Editorial Independiente"
            />
          )}
          {coverMode === 'academica' && (
            <>
              <Field
                label="Institución educativa"
                value={draft?.legalFields?.institucion || ''}
                onChange={(e: any) => updateLegal('institucion', e.target.value)}
                placeholder="Ej: Universidad Nacional"
              />
              <Field
                label="Carrera o Cátedra"
                value={draft?.legalFields?.catedra || ''}
                onChange={(e: any) => updateLegal('catedra', e.target.value)}
                placeholder="Ej: Ingeniería en Informática"
              />
              <Field
                label="Docente o Titular"
                value={draft?.legalFields?.docente || ''}
                onChange={(e: any) => updateLegal('docente', e.target.value)}
                placeholder="Ej: Prof. Dr. Alejandro Gómez"
              />
              <Field
                label="Integrantes del equipo"
                value={draft?.legalFields?.integrantes || ''}
                onChange={(e: any) => updateLegal('integrantes', e.target.value)}
                placeholder="Ej: Juan Pérez (Legajo 12345)"
              />
            </>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setActiveStepTab('editorial_secciones')}
        className="w-full py-2.5 px-4 bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] rounded text-xs font-bold cursor-pointer"
        style={{ borderRadius: radius.control }}
      >
        Continuar a Secciones y Capítulos →
      </button>
    </div>
  );
}

function SeccionesEditorialStep({ draft, updateDraft, setActiveStepTab, onFocusSection }: StepProps) {
  const sections = draft?.sections || [];

  const addSectionFromCatalog = (catalogItem: any) => {
    const newId = `sec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newSec = {
      id: newId,
      title: catalogItem.defaultValues?.title || catalogItem.label || 'Nueva Sección',
      visible: true,
      includeInToc: catalogItem.defaultValues?.includeInToc ?? true,
      startNewPage: catalogItem.defaultValues?.startNewPage ?? true,
      position: sections.length,
      records: [
        {
          id: `rec_${Date.now()}_1`,
          type: 'paragraph' as const,
          content: 'Escribí aquí el contenido inicial de esta sección.',
        },
      ],
    };
    updateDraft((prev: any) => ({
      ...prev,
      sections: [...(prev?.sections || []), newSec],
    }));
    onFocusSection?.(newId);
  };

  const removeSection = (secId: string) => {
    updateDraft((prev: any) => ({
      ...prev,
      sections: (prev?.sections || []).filter((s: any) => s.id !== secId),
    }));
  };

  const updateSectionProp = (secId: string, prop: string, val: any) => {
    updateDraft((prev: any) => ({
      ...prev,
      sections: (prev?.sections || []).map((s: any) => (s.id === secId ? { ...s, [prop]: val } : s)),
    }));
  };

  const addRecord = (secId: string, type: string) => {
    updateDraft((prev: any) => ({
      ...prev,
      sections: (prev?.sections || []).map((s: any) => {
        if (s.id !== secId) return s;
        const newRec = {
          id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          type,
          content: '',
          quoteAttribution: '',
          subtitleLevel: 2,
        };
        return { ...s, records: [...(s.records || []), newRec] };
      }),
    }));
  };

  const updateRecord = (secId: string, recId: string, patch: any) => {
    updateDraft((prev: any) => ({
      ...prev,
      sections: (prev?.sections || []).map((s: any) => {
        if (s.id !== secId) return s;
        return {
          ...s,
          records: (s.records || []).map((r: any) => (r.id === recId ? { ...r, ...patch } : r)),
        };
      }),
    }));
  };

  const removeRecord = (secId: string, recId: string) => {
    updateDraft((prev: any) => ({
      ...prev,
      sections: (prev?.sections || []).map((s: any) => {
        if (s.id !== secId) return s;
        return { ...s, records: (s.records || []).filter((r: any) => r.id !== recId) };
      }),
    }));
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h2 className="text-lg font-bold">Secciones y Capítulos</h2>
        <p className="text-xs text-[var(--ui-text-secondary)]">
          Estructurá tu publicación en partes, capítulos o apartados independientes.
        </p>
      </div>

      <div className="space-y-4">
        {sections.length === 0 ? (
          <div className="p-6 text-center rounded border border-dashed border-[var(--ui-border)] text-xs text-[var(--ui-text-secondary)]">
            No hay secciones añadidas aún. Agregá un capítulo o parte con los botones de abajo.
          </div>
        ) : (
          sections.map((sec: any, idx: number) => (
            <div
              key={sec.id}
              onClick={() => onFocusSection?.(sec.id)}
              onFocus={() => onFocusSection?.(sec.id)}
              className="p-3.5 rounded border border-[var(--ui-border)] bg-[var(--ui-bg-card)] hover:border-[var(--color-accent-base)]/60 transition space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase text-[var(--color-accent-amber-bright)]">
                  Sección {idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeSection(sec.id)}
                  className="p-1 text-[var(--color-status-danger-text)] hover:opacity-80 cursor-pointer"
                  title="Eliminar sección"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <Field
                label="Título de la sección"
                value={sec.title || ''}
                onChange={(e: any) => updateSectionProp(sec.id, 'title', e.target.value)}
              />

              <div className="flex flex-wrap items-center gap-4 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sec.visible !== false}
                    onChange={(e) => updateSectionProp(sec.id, 'visible', e.target.checked)}
                    className="rounded"
                  />
                  <span>Mostrar en PDF</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sec.includeInToc !== false}
                    onChange={(e) => updateSectionProp(sec.id, 'includeInToc', e.target.checked)}
                    className="rounded"
                  />
                  <span>Incluir en índice</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sec.startNewPage !== false}
                    onChange={(e) => updateSectionProp(sec.id, 'startNewPage', e.target.checked)}
                    className="rounded"
                  />
                  <span>Página nueva</span>
                </label>
              </div>

              {/* Records */}
              <div className="pt-2 border-t border-[var(--ui-border)] space-y-2.5">
                <span className="block text-[11px] font-bold text-[var(--ui-text-secondary)]">
                  Bloques de texto
                </span>

                {(sec.records || []).map((rec: any, rIdx: number) => (
                  <div
                    key={rec.id || rIdx}
                    className="p-2.5 rounded bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] space-y-2"
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold uppercase text-[var(--ui-text-secondary)]">
                        {rec.type === 'subtitle'
                          ? 'Subtítulo'
                          : rec.type === 'quote'
                            ? 'Cita'
                            : rec.type === 'image'
                              ? 'Imagen'
                              : 'Párrafo'}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeRecord(sec.id, rec.id)}
                        className="text-[var(--color-status-danger-text)] hover:underline cursor-pointer"
                      >
                        Quitar
                      </button>
                    </div>

                    {rec.type === 'image' ? (
                      <div className="space-y-2">
                        {rec.imagePath && (
                          <img
                            src={rec.imagePath}
                            alt={rec.imageCaption || 'Imagen del documento'}
                            className="max-h-36 rounded border border-[var(--ui-border)] object-contain bg-[var(--ui-bg-card)]"
                          />
                        )}
                        <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold rounded bg-[var(--ui-bg-card)] border border-[var(--ui-border)] hover:border-[var(--color-accent-base)] cursor-pointer">
                          <span>{rec.imagePath ? 'Cambiar imagen…' : 'Elegir imagen (se guarda local)…'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const picked = e.target.files?.[0];
                              e.currentTarget.value = '';
                              if (!picked) return;
                              const encoded = await encodeImageFileWithinBudget(picked);
                              updateRecord(sec.id, rec.id, {
                                imagePath: `data:${encoded.mimeType};base64,${encoded.base64}`,
                              });
                            }}
                          />
                        </label>
                        <Field
                          label="Epígrafe o descripción (opcional)"
                          value={rec.imageCaption || ''}
                          onChange={(e: any) => updateRecord(sec.id, rec.id, { imageCaption: e.target.value })}
                          placeholder="Ej: Figura 1 — Diagrama..."
                        />
                      </div>
                    ) : rec.type === 'subtitle' ? (
                      <Field
                        value={rec.content || ''}
                        onChange={(e: any) => updateRecord(sec.id, rec.id, { content: e.target.value })}
                        placeholder="Subtítulo o apartado..."
                      />
                    ) : rec.type === 'quote' ? (
                      <div className="space-y-1.5">
                        <Field
                          as="textarea"
                          rows={2}
                          value={rec.content || ''}
                          onChange={(e: any) => updateRecord(sec.id, rec.id, { content: e.target.value })}
                          placeholder="Texto de la cita..."
                        />
                        <Field
                          label="Autor o atribución de la cita"
                          value={rec.quoteAttribution || ''}
                          onChange={(e: any) => updateRecord(sec.id, rec.id, { quoteAttribution: e.target.value })}
                          placeholder="Ej: Jorge Luis Borges"
                        />
                      </div>
                    ) : (
                      <Field
                        as="textarea"
                        rows={3}
                        value={rec.content || ''}
                        onChange={(e: any) => updateRecord(sec.id, rec.id, { content: e.target.value })}
                        placeholder="Escribí aquí tu texto..."
                      />
                    )}
                  </div>
                ))}

                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => addRecord(sec.id, 'paragraph')}
                    className="px-2.5 py-1 text-[11px] font-bold rounded bg-[var(--ui-bg-card)] border border-[var(--ui-border)] hover:bg-[var(--ui-bg-hover)] cursor-pointer"
                  >
                    + Párrafo
                  </button>
                  <button
                    type="button"
                    onClick={() => addRecord(sec.id, 'subtitle')}
                    className="px-2.5 py-1 text-[11px] font-bold rounded bg-[var(--ui-bg-card)] border border-[var(--ui-border)] hover:bg-[var(--ui-bg-hover)] cursor-pointer"
                  >
                    + Subtítulo
                  </button>
                  <button
                    type="button"
                    onClick={() => addRecord(sec.id, 'quote')}
                    className="px-2.5 py-1 text-[11px] font-bold rounded bg-[var(--ui-bg-card)] border border-[var(--ui-border)] hover:bg-[var(--ui-bg-hover)] cursor-pointer"
                  >
                    + Cita
                  </button>
                  <button
                    type="button"
                    onClick={() => addRecord(sec.id, 'image')}
                    className="px-2.5 py-1 text-[11px] font-bold rounded bg-[var(--ui-bg-card)] border border-[var(--ui-border)] hover:bg-[var(--ui-bg-hover)] cursor-pointer"
                  >
                    + Imagen
                  </button>
                </div>
              </div>
            </div>
          ))
        )}

        <div className="space-y-2 pt-2">
          <span className="block text-xs font-bold text-[var(--ui-text-secondary)]">
            Añadir secciones desde plantilla
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {EDITORIAL_SECTION_CATALOG.slice(0, 6).map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => addSectionFromCatalog(cat)}
                className="py-1.5 px-2 text-xs font-medium rounded border border-[var(--ui-border)] bg-[var(--ui-bg-card)] hover:bg-[var(--ui-bg-panel)] text-left truncate cursor-pointer"
                title={cat.description}
              >
                + {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setActiveStepTab('editorial_diseño')}
        className="w-full py-2.5 px-4 bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] rounded text-xs font-bold cursor-pointer"
        style={{ borderRadius: radius.control }}
      >
        Continuar al Diseño →
      </button>
    </div>
  );
}

function DiseñoEditorialStep({ draft, updateDraft, setActiveStepTab }: StepProps) {
  const design = draft?.design || {};

  const updateDesignField = (field: string, val: any) => {
    updateDraft((prev: any) => ({
      ...prev,
      design: { ...(prev?.design || {}), [field]: val },
    }));
  };

  const updateTypography = (field: string, val: any) => {
    updateDraft((prev: any) => ({
      ...prev,
      design: {
        ...(prev?.design || {}),
        typography: { ...(prev?.design?.typography || {}), [field]: val },
      },
    }));
  };

  const documentPageSizes = Object.values(PAGE_SIZES).filter((p) => p.category === 'documento');

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h2 className="text-lg font-bold">Diseño y Hoja</h2>
        <p className="text-xs text-[var(--ui-text-secondary)]">
          Elegí la hoja para imprimir, los márgenes de página y la tipografía de tu publicación.
        </p>
      </div>

      <div className="space-y-4 p-3.5 rounded border border-[var(--ui-border)] bg-[var(--ui-bg-card)]">
        <div>
          <label className="block text-xs font-bold text-[var(--ui-text-primary)] mb-1">
            ¿En qué hoja vas a imprimir? (Tamaño de hoja) {/* plain-language:allow */}
          </label>
          <select
            value={design.pageSizeId || 'a4'}
            onChange={(e) => updateDesignField('pageSizeId', e.target.value)}
            className="w-full rounded border border-[var(--ui-border)] bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] px-3 py-2 text-xs"
          >
            {documentPageSizes.map((ps) => (
              <option key={ps.id} value={ps.id}>
                {ps.appLabel}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Margen superior (mm)"
            type="number"
            value={design.marginTop ?? 20}
            onChange={(e: any) => updateDesignField('marginTop', Number(e.target.value))}
          />
          <Field
            label="Margen inferior (mm)"
            type="number"
            value={design.marginBottom ?? 20}
            onChange={(e: any) => updateDesignField('marginBottom', Number(e.target.value))}
          />
          <Field
            label="Margen exterior (mm)"
            type="number"
            value={design.marginRight ?? 20}
            onChange={(e: any) => updateDesignField('marginRight', Number(e.target.value))}
          />
          <Field
            label="Lomo interior (mm)"
            type="number"
            value={design.gutter ?? 20}
            onChange={(e: any) => updateDesignField('gutter', Number(e.target.value))}
          />
        </div>

        <div className="pt-2 border-t border-[var(--ui-border)] space-y-3">
          <span className="block text-xs font-bold text-[var(--ui-text-secondary)]">
            Tipografía y lectura
          </span>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--ui-text-primary)] mb-1">
                Fuente
              </label>
              <select
                value={design.typography?.fontFamily || 'Times-Roman'}
                onChange={(e) => updateTypography('fontFamily', e.target.value)}
                className="w-full rounded border border-[var(--ui-border)] bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] px-3 py-2 text-xs"
              >
                <option value="Times-Roman">Clásica Serif (Times-Roman)</option>
                <option value="Helvetica">Moderna Sans (Helvetica)</option>
              </select>
            </div>
            <Field
              label="Tamaño (pt)"
              type="number"
              value={design.typography?.fontSize ?? 11}
              onChange={(e: any) => updateTypography('fontSize', Number(e.target.value))}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={design.pageNumbers !== false}
              onChange={(e) => updateDesignField('pageNumbers', e.target.checked)}
              className="rounded"
            />
            <span>Numeración de páginas</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={design.headersEvenOdd !== false}
              onChange={(e) => updateDesignField('headersEvenOdd', e.target.checked)}
              className="rounded"
            />
            <span>Encabezados pares e impares</span>
          </label>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setActiveStepTab('editorial_toc')}
        className="w-full py-2.5 px-4 bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] rounded text-xs font-bold cursor-pointer"
        style={{ borderRadius: radius.control }}
      >
        Continuar al Índice Automático →
      </button>
    </div>
  );
}

function TocEditorialStep({ draft, updateDraft, setActiveStepTab }: StepProps) {
  const tocConfig = draft?.tocConfig || { enabled: true, title: 'Índice', showSubtitles: true, position: 'tras-caratula' };

  const updateToc = (field: string, val: any) => {
    updateDraft((prev: any) => ({
      ...prev,
      tocConfig: { ...(prev?.tocConfig || {}), [field]: val },
    }));
  };

  const calculatedAnchors = useMemo(() => {
    return generateSectionAnchors(draft?.sections || [], {});
  }, [draft?.sections]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h2 className="text-lg font-bold">Índice Automático</h2>
        <p className="text-xs text-[var(--ui-text-secondary)]">
          El índice calcula automáticamente la numeración de páginas para cada capítulo y apartado.
        </p>
      </div>

      <div className="space-y-4 p-3.5 rounded border border-[var(--ui-border)] bg-[var(--ui-bg-card)]">
        <label className="flex items-center gap-2 cursor-pointer font-bold text-xs">
          <input
            type="checkbox"
            checked={tocConfig.enabled !== false}
            onChange={(e) => updateToc('enabled', e.target.checked)}
            className="rounded"
          />
          <span>Mostrar índice en la publicación</span>
        </label>

        {tocConfig.enabled !== false && (
          <div className="space-y-3 pt-2 border-t border-[var(--ui-border)]">
            <Field
              label="Título del índice"
              value={tocConfig.title || 'Índice'}
              onChange={(e: any) => updateToc('title', e.target.value)}
              placeholder="Ej: Tabla de Contenidos"
            />

            <label className="flex items-center gap-2 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={tocConfig.showSubtitles !== false}
                onChange={(e) => updateToc('showSubtitles', e.target.checked)}
                className="rounded"
              />
              <span>Incluir subtítulos secundarios</span>
            </label>

            <div>
              <label className="block text-xs font-bold mb-1">Ubicación del índice</label>
              <select
                value={tocConfig.position || 'tras-caratula'}
                onChange={(e) => updateToc('position', e.target.value)}
                className="w-full rounded border border-[var(--ui-border)] bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] px-3 py-2 text-xs"
              >
                <option value="tras-caratula">Inmediatamente tras la carátula</option>
                <option value="tras-preliminares">Luego de dedicatorias y prólogo</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {tocConfig.enabled !== false && (
        <div className="space-y-2 p-3.5 rounded border border-[var(--ui-border)] bg-[var(--ui-bg-panel)]">
          <span className="block text-xs font-bold text-[var(--ui-text-secondary)]">
            Vista previa del índice calculado
          </span>
          {calculatedAnchors.length === 0 ? (
            <p className="text-xs text-[var(--ui-text-secondary)]">
              Agregá secciones en el paso anterior para ver las páginas estimadas.
            </p>
          ) : (
            <div className="divide-y divide-[var(--ui-border)] text-xs">
              {calculatedAnchors.map((item, i) => (
                <div key={item.anchorId || i} className="py-1.5 flex items-center justify-between">
                  <span className="font-medium text-[var(--ui-text-primary)]">{item.label}</span>
                  <span className="font-mono text-[var(--ui-text-secondary)]">pág. {item.pageNumber}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setActiveStepTab('editorial_metadata')}
        className="w-full py-2.5 px-4 bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] rounded text-xs font-bold cursor-pointer"
        style={{ borderRadius: radius.control }}
      >
        Continuar a Información de la Obra →
      </button>
    </div>
  );
}

function MetadatosEditorialStep({ draft, updateDraft, setActiveStepTab }: StepProps) {
  const meta = draft?.metadata || {};

  const updateMeta = (field: string, val: any) => {
    updateDraft((prev: any) => ({
      ...prev,
      metadata: { ...(prev?.metadata || {}), [field]: val },
    }));
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h2 className="text-lg font-bold">Información de la Obra</h2>
        <p className="text-xs text-[var(--ui-text-secondary)]">
          Completá los datos legales, registro de autores y ficha bibliográfica.
        </p>
      </div>

      <div className="space-y-3 p-3.5 rounded border border-[var(--ui-border)] bg-[var(--ui-bg-card)]">
        <Field
          label="Título principal"
          value={meta.title || ''}
          onChange={(e: any) => updateMeta('title', e.target.value)}
        />
        <Field
          label="Autor o Creador"
          value={meta.author || ''}
          onChange={(e: any) => updateMeta('author', e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Año de publicación"
            type="number"
            value={meta.year || ''}
            onChange={(e: any) => updateMeta('year', Number(e.target.value))}
            placeholder="Ej: 2026"
          />
          <Field
            label="ISBN impreso (opcional)"
            value={meta.isbn || ''}
            onChange={(e: any) => updateMeta('isbn', e.target.value)}
            placeholder="Ej: 978-987-..."
          />
        </div>
        <Field
          label="ISBN digital (opcional)"
          value={meta.isbnDigital || ''}
          onChange={(e: any) => updateMeta('isbnDigital', e.target.value)}
        />
        <Field
          as="textarea"
          rows={3}
          label="Nota legal y derechos"
          value={meta.legalNote || ''}
          onChange={(e: any) => updateMeta('legalNote', e.target.value)}
          placeholder="Ej: Todos los derechos reservados..."
        />
      </div>

      <button
        type="button"
        onClick={() => setActiveStepTab('editorial_import_ai')}
        className="w-full py-2.5 px-4 bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] rounded text-xs font-bold cursor-pointer"
        style={{ borderRadius: radius.control }}
      >
        Continuar a Importar y Asistente IA →
      </button>
    </div>
  );
}

function ImportAiEditorialStep({ draft, updateDraft, notify, setActiveStepTab, onExportPDF }: StepProps) {
  return (
    <div className="space-y-4">
      <EditorialImportAiPanel
        draft={draft}
        updateDraft={updateDraft}
        notify={notify}
        onExportPDF={onExportPDF}
      />
      <div className="px-4 pb-4">
        <button
          type="button"
          onClick={() => setActiveStepTab('editorial_diseño')}
          className="w-full py-2.5 px-4 bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] rounded text-xs font-bold cursor-pointer"
        >
          Volver a Configuración de Diseño
        </button>
      </div>
    </div>
  );
}

function HistorialEditorialStep({ draft: _draft, setActiveStepTab, onOpenSaved, onDuplicate }: StepProps) {
  const [savedList, setSavedList] = useState<any[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const list = await getSavedEditorialsList();
        setSavedList(list || []);
      } catch (err) {
        console.warn('Error listando documentos guardados:', err);
      }
    })();
  }, []);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h2 className="text-lg font-bold">Documentos Guardados</h2>
        <p className="text-xs text-[var(--ui-text-secondary)]">
          Borradores y versiones de libros o informes almacenados localmente en esta computadora.
        </p>
      </div>

      {savedList.length === 0 ? (
        <div className="p-6 text-center rounded border border-dashed border-[var(--ui-border)] text-xs text-[var(--ui-text-secondary)]">
          No tenés documentos guardados todavía. Guardá tu borrador actual desde la barra superior.
        </div>
      ) : (
        <div className="space-y-2">
          {savedList.map((doc) => (
            <div
              key={doc.id}
              className="p-3 rounded border border-[var(--ui-border)] bg-[var(--ui-bg-card)] flex items-center justify-between gap-2"
            >
              <div>
                <span className="block font-bold text-xs text-[var(--ui-text-primary)]">
                  {doc.title || 'Documento sin título'}
                </span>
                <span className="block text-[10px] text-[var(--ui-text-secondary)]">
                  Actualizado: {doc.updated_at ? new Date(doc.updated_at).toLocaleDateString() : 'Recientemente'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {onOpenSaved && (
                  <button
                    type="button"
                    onClick={() => void onOpenSaved(doc)}
                    className="px-2.5 py-1 text-xs font-bold bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] rounded cursor-pointer"
                  >
                    Abrir
                  </button>
                )}
                {onDuplicate && (
                  <button
                    type="button"
                    onClick={() => onDuplicate(doc)}
                    className="px-2.5 py-1 text-xs font-bold bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] rounded hover:bg-[var(--ui-bg-hover)] cursor-pointer"
                  >
                    Repetir
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setActiveStepTab('editorial_secciones')}
        className="w-full py-2.5 px-4 bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] rounded text-xs font-bold cursor-pointer"
        style={{ borderRadius: radius.control }}
      >
        Volver a la edición
      </button>
    </div>
  );
}
