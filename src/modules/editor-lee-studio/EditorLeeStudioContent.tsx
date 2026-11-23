import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { AppShell } from '../../shared/core/ui/AppShell';
import StudioNavbar from '../../shared/core/studio-host/StudioNavbar';
import StudioDock from '../../shared/core/studio-host/StudioDock';
import { VectorDocViewer } from '../../shared/core/pdf-engine/VectorDocViewer';
import { EditorialPdfDocument } from './pdf/EditorialPdfDocument';
import { getEditorialPdfPreset } from './pdf/editorialPresets';
import { DEFAULT_EDITORIAL_PRESET } from './domain/editorialPresetCatalog';
import {
  applyEditorialGlobalConfig,
  formatEditorialGlobalPills,
} from './domain/editorialNormEngine';
import { countManualOverrides } from '../../shared/core/presets/configCascadeEngine';
import { PRODUCT_ICON_IDS, UI_ICON_IDS } from '../../shared/core/ui/iconCatalog';
import {
  EditorialGlobalAxis,
  EditorialGlobalNormModal,
} from './ui/EditorialGlobalNormModal';
import { EDITORIAL_PRESETS } from './pdf/editorialPresets';
import { DocumentTypeId } from '../../types/document';
import { useDocumentViewport, useViewportGestures, ScaledPaperSheet, quantizeRasterZoom } from '../../shared/core/viewport';
import { resolveDocumentCanvasPx } from '../../shared/core/pdf-engine/layers/page/pageSizes';
import { ErrorBoundary } from '../../shared/core/ui/ErrorBoundary';
import { OpenTab } from '../../shared/core/documents/tabStore';
import { AUTOSAVE_DEBOUNCE_MS, resolveDocumentIdWithHandoff, useRegisterDocumentTab } from '../../shared/core/documents/documentEngine';
import { sanitizeEditorialData } from './domain/sanitizeEditorialData';
import { saveDocumentDraftLocal, loadDocumentById } from '../../shared/core/storage/documentStorageService';
import { useToast } from '../../shared/core/ui/Toast';
import { withErrorHandling } from '../../shared/core/utils/errorHandler';
import { exportDocumentToPDF } from '../../shared/core/pdf-engine/pdfExporter';
import { useExportEntitlement } from '../../shared/core/entitlements/useExportEntitlement';
import PdfCheckoutModal from '../../shared/core/studio-host/PdfCheckoutModal';
import { elevationSystem, radius } from '../../shared/core/uiDesignSystem';
import { FloatingAssistant } from '../../shared/core/studio-host/FloatingAssistant';
import { EDITORIAL_STEP_SEQUENCE } from './domain/editorialStepSequence';
import { resolveSectionBadgeLabel } from './domain/editorialDockEngine';
import {
  saveDocumentToDisk,
  openDocumentFromDisk,
  getBoundNativeFileName,
} from '../../shared/core/storage/nativeFileDocumentService';
import { unpackDocumentFromDisk } from '../../shared/core/storage/leecvPackageCodec';
import { EditorialPresetInicioPanel } from './ui/EditorialPresetInicioPanel';
import { EditorialCoverPanel } from './ui/EditorialCoverPanel';
import { EditorialSectionsOverviewPanel } from './ui/EditorialSectionsOverviewPanel';
import { EditorialSectionFocusPanel } from './ui/EditorialSectionFocusPanel';
import { EditorialBibliographyPanel } from './ui/EditorialBibliographyPanel';
import {
  EditorialDisenoPanel,
  EditorialTocPanel,
  EditorialMetadataPanel,
  EditorialHistorialPanel,
} from './ui/EditorialDesignAndMetaPanels';
import { EditorialImportAiPanel } from './panels/EditorialImportAiPanel';
import type { EditorialSection } from './domain/editorialTypes';

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
  onOpenCreditsModal?: () => void;
}

function buildEditorialTitle(data: any): string {
  const obra = String(data?.metadata?.title || '').trim();
  if (!obra || obra === 'Mi obra') return 'EditorLee - Mi obra';
  return obra.toLowerCase().startsWith('editorlee') ? obra : `EditorLee - ${obra}`;
}

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
      marginTop: DEFAULT_EDITORIAL_PRESET.margins.top,
      marginBottom: DEFAULT_EDITORIAL_PRESET.margins.bottom,
      marginLeft: DEFAULT_EDITORIAL_PRESET.margins.left,
      marginRight: DEFAULT_EDITORIAL_PRESET.margins.right,
      gutter: DEFAULT_EDITORIAL_PRESET.margins.gutter,
      structuralNormId: DEFAULT_EDITORIAL_PRESET.structuralNormId,
      normId: DEFAULT_EDITORIAL_PRESET.normId,
      bibliographyStyle: DEFAULT_EDITORIAL_PRESET.bibliographyStyle,
      firstLineIndent: DEFAULT_EDITORIAL_PRESET.firstLineIndent,
      bibliographyHangingIndent: DEFAULT_EDITORIAL_PRESET.bibliographyHangingIndent,
      manualOverrides: {},
      typography: {
        fontFamily: DEFAULT_EDITORIAL_PRESET.typography.fontFamily,
        fontSize: DEFAULT_EDITORIAL_PRESET.typography.fontSize,
        lineHeight: DEFAULT_EDITORIAL_PRESET.typography.lineHeight,
      },
    },
    sections: initialPatch.sections || [],
    cover: initialPatch.cover || {
      mode: DEFAULT_EDITORIAL_PRESET.coverMode,
      coverStyleId: DEFAULT_EDITORIAL_PRESET.coverStyleId,
      coverPaletteKey: DEFAULT_EDITORIAL_PRESET.coverPaletteKey,
      title: 'Mi obra',
    },
    tocConfig: {
      enabled: true,
      title: 'Índice General',
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

/**
 * Estudio de EditorLee (/crear-editor).
 *
 * Delega sus paneles en módulos ligeros bajo `ui/` e inyecta el documento en
 * `<StudioDock cvData={draft} />` para desplegar los capítulos numerados (`1`, `2`, `i`, `ii`, `A`).
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
  onOpenCreditsModal,
}) => {
  const [activeStepTab, setActiveStepTab] = useState<string>('editorial_inicio');
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [globalModalAxis, setGlobalModalAxis] = useState<EditorialGlobalAxis | null>(null);

  const { showSuccess, showError, showInfo } = useToast();
  const { consumeCreditIfNeeded } = useExportEntitlement();

  const editorialId = useMemo(
    () => resolveDocumentIdWithHandoff(activeTabId, 'editorial'),
    [activeTabId],
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
  const pageSizeId = draft?.design?.pageSizeId || draft?.design?.pageSize || 'a4';

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

  const updateDraft = useCallback((updater: (prev: any) => any) => {
    hasEditedRef.current = true;
    setDraft((prev: any) => updater(prev || createEmptyEditorial()));
  }, []);

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
      },
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
        const ok = await exportDocumentToPDF({ draft, preset }, getEditorialPdfPreset(preset) as any);
        if (!ok) throw new Error('pdf_sin_documento');
        showSuccess('Documento exportado en PDF.');
      },
      {
        context: 'Exportación EditorLee',
        errorMessage: 'No pudimos generar el PDF del documento.',
        notify: (msg) => showError(msg),
      },
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
      return withErrorHandling(
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
      showInfo('Sección agregada al borrador.');
    },
    [draft, updateDraft, showInfo],
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
        },
      );
    },
    [showSuccess, showError],
  );

  // Resolver sección enfocada cuando el usuario toca uno de los botones numerados del Dock
  const activeDynamicSection = useMemo(() => {
    const sections: EditorialSection[] = Array.isArray(draft?.sections) ? draft.sections : [];
    const counters = { prelim: 0, body: 0, annex: 0 };
    for (const sec of sections) {
      const { badgeLabel } = resolveSectionBadgeLabel(sec, counters);
      if (sec.id === activeStepTab) {
        return { section: sec, badgeLabel };
      }
    }
    return null;
  }, [draft?.sections, activeStepTab]);

  const debouncedPreset = debouncedDraft?.design?.presetId || DEFAULT_EDITORIAL_PRESET.id;
  const pdfElement = useMemo(
    () => (
      <EditorialPdfDocument
        data={debouncedDraft as any}
        preset={debouncedPreset}
        interactiveAnchors={true}
      />
    ),
    [debouncedDraft, debouncedPreset],
  );

  const notify = { success: showSuccess, error: showError };
  const activeStepMeta = EDITORIAL_STEP_SEQUENCE.find((step) => step.id === activeStepTab);
  const pillLabels = formatEditorialGlobalPills(draft);
  const designOverrideCount = countManualOverrides(draft?.design);

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
            onOpenSaveAsModal={() => void handleSaveToDisk(true)}
            onOpenJsonDownloadModal={() => void handleSaveToDisk(true)}
            onPrint={handleExportPDF}
            isSaving={isExporting}
            onOpenShareAppModal={onOpenShareAppModal || (() => {})}
            onOpenPrivacy={onOpenPrivacy || (() => {})}
            onOpenCreditsModal={onOpenCreditsModal}
            isPanelOpen={isPanelOpen}
            onCloseMobilePanel={() => {
              setIsPanelOpen(false);
              viewport.fitAndCenter();
            }}
            globalContextPills={[
              {
                id: 'editorial_preset',
                shortLabel: pillLabels.presetShort,
                tooltip: pillLabels.presetTooltip,
                ariaLabel: `Tipo de obra: ${pillLabels.presetShort}`,
                iconId: PRODUCT_ICON_IDS.editor,
                onClick: () => setGlobalModalAxis('preset'),
              },
              {
                id: 'editorial_norm',
                shortLabel: pillLabels.normShort,
                tooltip: pillLabels.normTooltip,
                ariaLabel: `Norma visual: ${pillLabels.normShort}`,
                iconId: UI_ICON_IDS.editorialNorm,
                hasOverrides: designOverrideCount > 0,
                onClick: () => setGlobalModalAxis('structural_norm'),
              },
              {
                id: 'editorial_bibliography',
                shortLabel: pillLabels.bibShort,
                tooltip: pillLabels.bibTooltip,
                ariaLabel: `Estilo de citas: ${pillLabels.bibShort}`,
                iconId: UI_ICON_IDS.editorialCitations,
                onClick: () => setGlobalModalAxis('bibliography'),
              },
            ]}
            zoomLevel={viewport.zoomLevel}
            setZoomLevel={viewport.setZoomLevel}
            triggerAutoFit={viewport.fitAndCenter}
            cycleUITheme={cycleUITheme}
          />
        }
        dockSlot={
          <StudioDock
            docType="editorial"
            cvData={draft}
            activeTab={activeStepTab}
            setActiveTab={(tab) => {
              setActiveStepTab(tab);
              setIsPanelOpen(true);
              focusSectionInPreview(tab);
            }}
            isPanelOpen={isPanelOpen}
            setIsPanelOpen={setIsPanelOpen}
          />
        }
        panelSlot={
          <div className="p-4 pb-24 sm:pb-16 space-y-6 overflow-y-auto h-full max-h-full text-[var(--ui-text-primary)]">
            {activeStepTab === 'editorial_inicio' && (
              <EditorialPresetInicioPanel
                draft={draft}
                onOpenGlobalPresetModal={() => setGlobalModalAxis('preset')}
                onOpenImportAi={() => setActiveStepTab('editorial_import_ai')}
                onSaveToDisk={() => void handleSaveToDisk(true)}
                onOpenDiskFile={handleOpenDiskFile}
              />
            )}
            {activeStepTab === 'editorial_portada' && (
              <EditorialCoverPanel
                draft={draft}
                updateDraft={updateDraft}
                setActiveStepTab={setActiveStepTab}
              />
            )}
            {activeStepTab === 'editorial_secciones' && (
              <EditorialSectionsOverviewPanel
                draft={draft}
                updateDraft={updateDraft}
                setActiveStepTab={setActiveStepTab}
                onFocusSection={focusSectionInPreview}
              />
            )}
            {activeStepTab === 'editorial_bibliografia' && (
              <EditorialBibliographyPanel
                draft={draft}
                updateDraft={updateDraft}
                notify={notify}
                onOpenGlobalBibModal={() => setGlobalModalAxis('bibliography')}
              />
            )}
            {activeStepTab === 'editorial_diseño' && (
              <EditorialDisenoPanel
                draft={draft}
                updateDraft={updateDraft}
                setActiveStepTab={setActiveStepTab}
                onOpenGlobalNormModal={() => setGlobalModalAxis('structural_norm')}
              />
            )}
            {activeStepTab === 'editorial_toc' && (
              <EditorialTocPanel
                draft={draft}
                updateDraft={updateDraft}
                setActiveStepTab={setActiveStepTab}
              />
            )}
            {activeStepTab === 'editorial_metadata' && (
              <EditorialMetadataPanel
                draft={draft}
                updateDraft={updateDraft}
                setActiveStepTab={setActiveStepTab}
              />
            )}
            {activeStepTab === 'editorial_import_ai' && (
              <EditorialImportAiPanel
                draft={draft}
                updateDraft={updateDraft}
                notify={notify}
                setActiveStepTab={setActiveStepTab}
                onExportPDF={handleExportPDF}
              />
            )}
            {activeStepTab === 'editorial_historial' && (
              <EditorialHistorialPanel
                setActiveStepTab={setActiveStepTab}
                onOpenSaved={handleOpenSaved}
                onDuplicate={handleDuplicate}
              />
            )}
            {activeDynamicSection && (
              <EditorialSectionFocusPanel
                key={activeDynamicSection.section.id}
                section={activeDynamicSection.section}
                draft={draft}
                badgeLabel={activeDynamicSection.badgeLabel}
                updateDraft={updateDraft}
                setActiveStepTab={setActiveStepTab}
                notify={notify}
              />
            )}

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-[var(--ui-border)]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--ui-text-secondary)]">
                {activeDynamicSection
                  ? `Sección ${activeDynamicSection.badgeLabel}`
                  : `Paso ${activeStepMeta?.stepNumber || 1} de ${EDITORIAL_STEP_SEQUENCE.length}`}
              </span>
              <button
                type="button"
                onClick={handleExportPDF}
                className="px-3.5 py-2 text-xs font-bold bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] cursor-pointer"
                style={{ borderRadius: radius.control }}
              >
                Exportar PDF
              </button>
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
      <EditorialGlobalNormModal
        isOpen={globalModalAxis !== null}
        axis={globalModalAxis || 'preset'}
        onClose={() => setGlobalModalAxis(null)}
        draft={draft}
        onApplyGlobalConfig={(params) => {
          updateDraft((prev) => applyEditorialGlobalConfig(prev, params));
          showSuccess('Configuración global aplicada.');
        }}
      />
    </>
  );
};

export default EditorLeeStudioContent;
