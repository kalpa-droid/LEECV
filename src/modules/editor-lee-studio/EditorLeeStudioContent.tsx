import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { AppShell } from '../../shared/core/ui/AppShell';
import StudioNavbar from '../../shared/core/studio-host/StudioNavbar';
import StudioDock from '../../shared/core/studio-host/StudioDock';
import { VectorDocViewer } from '../../shared/core/pdf-engine/VectorDocViewer';
import { Users, Lock, Save } from 'lucide-react';
import { dal } from '../../shared/core/storage/dataAccessLayer';
import { useAuth } from '../../shared/core/auth/AuthContext';
import { ActiveTeamRoomContext, EditorialTeamModal } from './ui/EditorialTeamModal';
import {
  EditorialTeamSectionRow,
  saveEditorialTeamSection,
} from './domain/editorialTeamClient';
import { EditorialPdfDocument } from './pdf/EditorialPdfDocument';
import { getEditorialPdfPreset } from './pdf/editorialPresets';
import { DEFAULT_EDITORIAL_PRESET } from './domain/editorialPresetCatalog';
import {
  applyEditorialGlobalConfig,
  formatEditorialGlobalPills,
} from './domain/editorialNormEngine';
import {
  areCourtesyMapsEqual,
  computePaginationWithCourtesyBlanks,
  resolveEffectiveEditorialPagination,
} from './domain/editorialPaginationEngine';
import { countManualOverrides, markManualOverride } from '../../shared/core/presets/configCascadeEngine';
import { PRODUCT_ICON_IDS, UI_ICON_IDS } from '../../shared/core/ui/iconCatalog';
import {
  EditorialGlobalAxis,
  EditorialGlobalNormModal,
} from './ui/EditorialGlobalNormModal';
import { EditorialPrintFlowModal } from './ui/EditorialPrintFlowModal';
import { EDITORIAL_PRESETS } from './pdf/editorialPresets';
import { DocumentTypeId } from '../../types/document';
import { useDocumentViewport, useViewportGestures, ScaledPaperSheet, quantizeRasterZoom } from '../../shared/core/viewport';
import { resolveDocumentCanvasPx } from '../../shared/core/pdf-engine/layers/page/pageSizes';
import { ErrorBoundary } from '../../shared/core/ui/ErrorBoundary';
import { OpenTab } from '../../shared/core/documents/tabStore';
import { AUTOSAVE_DEBOUNCE_MS, resolveDocumentIdWithHandoff, useRegisterDocumentTab } from '../../shared/core/documents/documentEngine';
import { useStudioHistory } from '../../shared/core/documents/session/useStudioHistory';
import { sanitizeEditorialData } from './domain/sanitizeEditorialData';
import { saveDocumentDraftLocal, loadDocumentById } from '../../shared/core/storage/documentStorageService';
import { hydrateInlineAssets } from '../../shared/core/storage/localAssetStore';
import { useToast } from '../../shared/core/ui/Toast';
import { withErrorHandling } from '../../shared/core/utils/errorHandler';
import { exportDocumentToPDF } from '../../shared/core/pdf-engine/pdfExporter';
import { useExportEntitlement } from '../../shared/core/entitlements/useExportEntitlement';
import PdfCheckoutModal from '../../shared/core/studio-host/PdfCheckoutModal';
import { elevationSystem, radius } from '../../shared/core/uiDesignSystem';
import { FloatingAssistant } from '../../shared/core/studio-host/FloatingAssistant';
import {
  EDITORIAL_STEP_SEQUENCE,
  getNextEditorialStepId,
  getPrevEditorialStepId,
} from './domain/editorialStepSequence';
import { resolveSectionBadgeLabel } from './domain/editorialDockEngine';
import {
  areTocMapsEqual,
  extractTocAnchorMapFromPageTexts,
} from './domain/editorialTocResolver';
import {
  saveDocumentToDisk,
  openDocumentFromDisk,
  getBoundNativeFileName,
} from '../../shared/core/storage/nativeFileDocumentService';
import { unpackDocumentFromDisk } from '../../shared/core/storage/leecvPackageCodec';
import { EditorialInicioArchivoPanel } from './ui/EditorialInicioArchivoPanel';
import { EditorialCoverPanel } from './ui/EditorialCoverPanel';
import { EditorialStructurePanel } from './ui/EditorialStructurePanel';
import { EditorialStylePanel } from './ui/EditorialStylePanel';
import { EditorialSectionsOverviewPanel } from './ui/EditorialSectionsOverviewPanel';
import { EditorialSectionFocusPanel } from './ui/EditorialSectionFocusPanel';
import { EditorialBibliographyPanel } from './ui/EditorialBibliographyPanel';
import { EditorialTocPanel } from './ui/EditorialDesignAndMetaPanels';
import {
  autoCleanEditorialPunctuation,
  EditorialPreflightIssue,
  EditorialPreflightReport,
  runEditorialPreflight,
} from './domain/editorialPreflightEngine';
import { EditorialPreflightModal } from './ui/EditorialPreflightModal';
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
      printSides: DEFAULT_EDITORIAL_PRESET.printSides,
      chapterBreakMode: DEFAULT_EDITORIAL_PRESET.chapterBreakMode,
      headerMode: DEFAULT_EDITORIAL_PRESET.headerMode,
      footerMode: DEFAULT_EDITORIAL_PRESET.footerMode,
      suppressHeaderOnChapterStart: DEFAULT_EDITORIAL_PRESET.suppressHeaderOnChapterStart,
      preliminaryRomanNumerals: DEFAULT_EDITORIAL_PRESET.preliminaryRomanNumerals,
      headersEvenOdd: DEFAULT_EDITORIAL_PRESET.printSides === 'duplex',
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
  const [preflightReport, setPreflightReport] = useState<EditorialPreflightReport | null>(null);
  const [isPreflightOpen, setIsPreflightOpen] = useState<boolean>(false);
  const [globalModalAxis, setGlobalModalAxis] = useState<EditorialGlobalAxis | null>(null);
  const [isPrintFlowModalOpen, setIsPrintFlowModalOpen] = useState<boolean>(false);
  const pendingExportFormatRef = useRef<'pdf' | 'docx'>('pdf');

  const { showSuccess, showError, showInfo } = useToast();
  const { user } = useAuth();
  const { consumeCreditIfNeeded } = useExportEntitlement('editorial');
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [activeTeamRoom, setActiveTeamRoom] = useState<ActiveTeamRoomContext | null>(null);
  const [onlineTeamEmails, setOnlineTeamEmails] = useState<string[]>([]);
  const localDraftBackupRef = useRef<any | null>(null);

  const editorialId = useMemo(
    () => resolveDocumentIdWithHandoff(activeTabId, 'editorial'),
    [activeTabId],
  );

  const sheetRef = useRef<HTMLDivElement>(null);
  const hydratedIdRef = useRef<string | null>(null);
  const hasEditedRef = useRef<boolean>(false);
  const [draft, setDraft] = useState<any>(() => createEmptyEditorial());
  const [debouncedDraft, setDebouncedDraft] = useState<any>(draft);

  const applyEditorialSnapshot = useCallback((snapshot: any) => {
    hasEditedRef.current = true;
    setDraft(snapshot);
  }, []);

  const history = useStudioHistory({
    docId: editorialId,
    state: draft,
    applyState: applyEditorialSnapshot,
    isHydrating: hydratedIdRef.current !== editorialId,
  });

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

  // Precarga de fuentes TTF Unicode locales (Tinos / Arimo) solo cuando cambia la familia o el preset
  const [fontsReadyTick, setFontsReadyTick] = useState<number>(0);
  const activeFontFamily =
    debouncedDraft?.design?.typography?.fontFamily || DEFAULT_EDITORIAL_PRESET.typography.fontFamily;
  const lastLoadedFontKeyRef = useRef<string>('');
  useEffect(() => {
    const fontKey = `${activeFontFamily}::${preset}`;
    if (lastLoadedFontKeyRef.current === fontKey) return;
    let active = true;
    void import('./pdf/editorialTwoPassRenderer')
      .then(({ ensureEditorialFontsReady }) =>
        ensureEditorialFontsReady({ design: { typography: { fontFamily: activeFontFamily }, presetId: preset } }, preset),
      )
      .then(() => {
        if (active) {
          lastLoadedFontKeyRef.current = fontKey;
          setFontsReadyTick((n) => n + 1);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [activeFontFamily, preset]);

  // Índice exacto y hojas blancas de cortesía en dos pasadas sobre la vista previa real de pdfjs-dist
  const [resolvedTocState, setResolvedTocState] = useState<{
    displayMap: Record<string, string>;
    bodyStartPage: number;
    courtesyBlankBeforeMap: Record<string, boolean>;
  }>({ displayMap: {}, bodyStartPage: 1, courtesyBlankBeforeMap: {} });
  const resolvedTocStateRef = useRef(resolvedTocState);
  resolvedTocStateRef.current = resolvedTocState;
  const tocPassCountRef = useRef<number>(0);

  useEffect(() => {
    tocPassCountRef.current = 0;
  }, [debouncedDraft, preset]);

  const handleDocumentTextScanned = useCallback(
    (pageTexts: Record<number, string>) => {
      const rawMap = extractTocAnchorMapFromPageTexts(pageTexts);
      if (Object.keys(rawMap).length === 0) return;

      const sections = Array.isArray(debouncedDraft?.sections) ? debouncedDraft.sections : [];
      const pagination = resolveEffectiveEditorialPagination(debouncedDraft);
      const prev = resolvedTocStateRef.current;
      const next = computePaginationWithCourtesyBlanks(
        sections,
        rawMap,
        prev.courtesyBlankBeforeMap,
        pagination,
        debouncedDraft?.design,
        debouncedDraft?.cover,
      );

      if (
        areTocMapsEqual(prev.displayMap, next.displayPageMap) &&
        prev.bodyStartPage === next.bodyStartPage &&
        areCourtesyMapsEqual(prev.courtesyBlankBeforeMap, next.courtesyBlankBeforeMap)
      ) {
        return;
      }
      if (tocPassCountRef.current >= 3) return;
      tocPassCountRef.current += 1;
      setResolvedTocState({
        displayMap: next.displayPageMap,
        bodyStartPage: next.bodyStartPage,
        courtesyBlankBeforeMap: next.courtesyBlankBeforeMap,
      });
    },
    [debouncedDraft],
  );

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
          const initialDraft = sanitized || createEmptyEditorial();
          history.resetSeed(initialDraft);
          setDraft(initialDraft);
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
    if (hydratedIdRef.current !== editorialId || !hasEditedRef.current || !draft || activeTeamRoom) return;
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
  }, [draft, editorialId, activeTeamRoom]);

  useEffect(() => {
    if (!activeTeamRoom?.project?.id || !user?.email) {
      setOnlineTeamEmails([]);
      return;
    }
    const unsub = dal.editorialTeams.subscribeToRoom(
      activeTeamRoom.project.id,
      user.email,
      (updatedRow: EditorialTeamSectionRow) => {
        setActiveTeamRoom((prev) => {
          if (!prev) return prev;
          const nextSections = prev.sections.map((s) =>
            s.section_key === updatedRow.section_key ? updatedRow : s
          );
          return { ...prev, sections: nextSections };
        });
        setDraft((prevDraft: any) => {
          if (!prevDraft || !Array.isArray(prevDraft.sections)) return prevDraft;
          return {
            ...prevDraft,
            sections: prevDraft.sections.map((s: any) =>
              s.id === updatedRow.section_key
                ? {
                    ...s,
                    title: updatedRow.title,
                    records: Array.isArray(updatedRow.records_json) ? updatedRow.records_json : s.records,
                  }
                : s
            ),
          };
        });
      },
      (emails) => setOnlineTeamEmails(emails),
    );
    return () => unsub();
  }, [activeTeamRoom?.project?.id, user?.email]);

  const handleEnterTeamRoom = useCallback(
    (ctx: ActiveTeamRoomContext, focusSectionKey?: string) => {
      if (!activeTeamRoom) {
        localDraftBackupRef.current = draft;
      }
      setActiveTeamRoom(ctx);
      hasEditedRef.current = false;
      const mappedSections = ctx.sections.map((sec, idx) => ({
        id: sec.section_key,
        sectionKey: sec.section_key,
        title: sec.title,
        category: sec.section_meta?.category || 'cuerpo',
        visible: sec.section_meta?.visible !== false,
        includeInToc: sec.section_meta?.includeInToc !== false,
        startNewPage: sec.section_meta?.startNewPage !== false,
        position: typeof sec.sort_order === 'number' ? sec.sort_order : idx,
        records: Array.isArray(sec.records_json) ? sec.records_json : [],
      }));
      setDraft((prev: any) => ({
        ...(prev || createEmptyEditorial()),
        id: `team_${ctx.project.id}`,
        cover: { ...(prev?.cover || {}), title: ctx.project.title },
        metadata: { ...(prev?.metadata || {}), title: ctx.project.title },
        sections: mappedSections.length > 0 ? mappedSections : prev?.sections || [],
      }));
      if (focusSectionKey) {
        setActiveStepTab(focusSectionKey);
        setIsPanelOpen(true);
      }
    },
    [activeTeamRoom, draft]
  );

  const handleExitTeamRoom = useCallback(() => {
    setActiveTeamRoom(null);
    if (localDraftBackupRef.current) {
      setDraft(localDraftBackupRef.current);
      localDraftBackupRef.current = null;
    }
    hasEditedRef.current = false;
    setActiveStepTab('editorial_inicio');
    showInfo('Volviste a tus borradores locales sin mezclar cambios del equipo.');
  }, [showInfo]);

  const handleSaveTeamChapter = useCallback(
    async (releaseAfterSave: boolean = false) => {
      const targetSec: EditorialSection | null = Array.isArray(draft?.sections)
        ? draft.sections.find((s: EditorialSection) => s.id === activeStepTab) || null
        : null;
      if (!activeTeamRoom || !targetSec) return;
      const teamSec = activeTeamRoom.sections.find(
        (s) => s.section_key === targetSec.id
      );
      if (!teamSec) return;
      try {
        const saved = await saveEditorialTeamSection({
          projectId: activeTeamRoom.project.id,
          sectionKey: teamSec.section_key,
          title: targetSec.title,
          records: targetSec.records || [],
          expectedVersion: teamSec.version,
          releaseAfterSave,
        });
        setActiveTeamRoom((prev) =>
          prev
            ? {
                ...prev,
                sections: prev.sections.map((s) =>
                  s.section_key === saved.section_key ? saved : s
                ),
              }
            : prev
        );
        showSuccess(
          releaseAfterSave
            ? `Capítulo "${saved.title}" guardado y liberado para el equipo.`
            : `Cambios guardados en vivo para el equipo (v${saved.version}).`
        );
      } catch (err: any) {
        showError(err?.message || 'No se pudieron guardar los cambios en el equipo.');
      }
    },
    [activeTeamRoom, draft?.sections, activeStepTab, showSuccess, showError]
  );

  const handleSaveTeamCopyLocally = useCallback(async () => {
    if (!draft) return;
    const copyId = `ed_teamcopy_${Date.now()}`;
    const res = await saveDocumentDraftLocal(
      {
        ...draft,
        id: copyId,
        title: `${activeTeamRoom?.project.title || 'Equipo'} (Copia local)`,
        updatedAt: Date.now(),
      },
      'editorial'
    );
    if (res?.success) {
      showSuccess('Copia local independiente guardada en tu dispositivo.');
    }
  }, [draft, activeTeamRoom, showSuccess]);

  const updateDraft = useCallback((updater: (prev: any) => any) => {
    hasEditedRef.current = true;
    setDraft((prev: any) => updater(prev || createEmptyEditorial()));
  }, []);

  const handleNewDraft = useCallback(() => {
    hasEditedRef.current = false;
    const blank = createEmptyEditorial();
    history.resetSeed(blank);
    setDraft(blank);
    setActiveStepTab('editorial_inicio');
    setIsPanelOpen(true);
    showInfo('Nuevo documento editorial listo para redactar.');
  }, [showInfo, history]);

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

  const handleExportPDF = useCallback(
    async (options?: { skipPreflight?: boolean } | unknown) => {
      if (!draft) return;
      pendingExportFormatRef.current = 'pdf';
      const skipPreflight = Boolean(
        options &&
          typeof options === 'object' &&
          'skipPreflight' in options &&
          (options as { skipPreflight?: boolean }).skipPreflight === true,
      );

      if (!skipPreflight) {
        const report = runEditorialPreflight(draft);
        if (!report.ok) {
          setPreflightReport(report);
          setIsPreflightOpen(true);
          return;
        }
      }

      const allowed = await consumeCreditIfNeeded('editorial');
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
    },
    [draft, preset, consumeCreditIfNeeded, showSuccess, showError],
  );

  const handleExportDocx = useCallback(
    async (options?: { skipPreflight?: boolean } | unknown) => {
      if (!draft) return;
      pendingExportFormatRef.current = 'docx';
      const skipPreflight = Boolean(
        options &&
          typeof options === 'object' &&
          'skipPreflight' in options &&
          (options as { skipPreflight?: boolean }).skipPreflight === true,
      );

      if (!skipPreflight) {
        const report = runEditorialPreflight(draft);
        if (!report.ok) {
          setPreflightReport(report);
          setIsPreflightOpen(true);
          return;
        }
      }

      const allowed = await consumeCreditIfNeeded('editorial');
      if (!allowed) {
        setIsCheckoutOpen(true);
        return;
      }

      setIsExporting(true);
      await withErrorHandling(
        async () => {
          const { exportEditorialToDocx } = await import('./domain/editorialDocxExporter');
          const fileName = await exportEditorialToDocx(draft, {
            resolvedTocMap: resolvedTocStateRef.current.displayMap,
            courtesyBlankBeforeMap: resolvedTocStateRef.current.courtesyBlankBeforeMap,
          });
          showSuccess(`Documento Word guardado (${fileName}).`);
        },
        {
          context: 'Exportación Word EditorLee',
          errorMessage: 'No pudimos generar el archivo Word (.docx).',
          notify: (msg) => showError(msg),
        },
      );
      setIsExporting(false);
    },
    [draft, consumeCreditIfNeeded, showSuccess, showError],
  );

  const handleGoToPreflightIssue = useCallback(
    (issue: EditorialPreflightIssue) => {
      setIsPreflightOpen(false);
      if (issue.code === 'default_or_empty_title') {
        setActiveStepTab('editorial_metadata');
        setIsPanelOpen(true);
        return;
      }
      if (issue.sectionId) {
        setActiveStepTab(issue.sectionId);
        setIsPanelOpen(true);
        focusSectionInPreview(issue.sectionId);
      }
    },
    [focusSectionInPreview],
  );

  const handleAutoCleanFromPreflight = useCallback(() => {
    if (!draft) return;
    const cleaned = autoCleanEditorialPunctuation(draft);
    setDraft(cleaned);
    const updatedReport = runEditorialPreflight(cleaned);
    setPreflightReport(updatedReport);
    showSuccess('Espacios y comas corregidos en tu manuscrito.');
  }, [draft, showSuccess]);

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

          const hydratedData = await hydrateInlineAssets(loadedData);
          const sanitized = sanitizeEditorialData(hydratedData);
          if (!sanitized) throw new Error('El archivo no contiene un documento editorial válido.');
          hasEditedRef.current = true;
          history.resetSeed(sanitized);
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

  const navigateStepTab = useCallback((nextTab: string) => {
    if (nextTab === 'editorial_import_ai' || nextTab === 'editorial_historial') {
      setActiveStepTab('editorial_inicio');
      return;
    }
    if (nextTab === 'editorial_metadata') {
      setActiveStepTab('editorial_portada');
      return;
    }
    setActiveStepTab(nextTab);
  }, []);

  const handleDuplicate = useCallback(
    async (saved: any) => {
      if (!saved?.id) return;
      await withErrorHandling(
        async () => {
          const loaded = await loadDocumentById(saved.id, 'editorial');
          const sanitized = sanitizeEditorialData(loaded);
          if (!sanitized) throw new Error('documento_editorial_invalido');
          const copyId = `ed_copy_${Date.now()}`;
          const prevTitle = String(sanitized?.metadata?.title || saved?.title || 'Mi obra').trim();
          const cloned = {
            ...sanitized,
            id: copyId,
            updatedAt: Date.now(),
            metadata: {
              ...(sanitized.metadata || {}),
              title: prevTitle.endsWith('(copia)') ? prevTitle : `${prevTitle} (copia)`,
            },
          };
          await saveDocumentDraftLocal(cloned, 'editorial');
          hasEditedRef.current = false;
          history.resetSeed(cloned);
          setDraft(cloned);
          setActiveStepTab('editorial_inicio');
          setIsPanelOpen(true);
          showSuccess('Copia completa creada y abierta.');
        },
        {
          context: 'Duplicar documento EditorLee',
          errorMessage: 'No pudimos duplicar el documento guardado.',
          notify: (msg) => showError(msg),
        },
      );
    },
    [history, showSuccess, showError],
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
          history.resetSeed(sanitized);
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
        key={`ed-pdf-${fontsReadyTick}`}
        data={debouncedDraft as any}
        preset={debouncedPreset}
        interactiveAnchors={true}
        resolvedTocMap={resolvedTocState.displayMap}
        bodyStartPage={resolvedTocState.bodyStartPage}
        courtesyBlankBeforeMap={resolvedTocState.courtesyBlankBeforeMap}
        emitTocAnchors={true}
      />
    ),
    [debouncedDraft, debouncedPreset, fontsReadyTick, resolvedTocState],
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
            undo={history.undo}
            redo={history.redo}
            canUndo={history.canUndo}
            canRedo={history.canRedo}
            currentCvData={draft}
            currentUiTheme={currentUiTheme}
            onOpenSavedCVsModal={() => {
              setActiveStepTab('editorial_inicio');
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
                mobileLabel: pillLabels.presetShort,
                tooltip: pillLabels.presetTooltip,
                ariaLabel: `Tipo de obra: ${pillLabels.presetShort}`,
                iconId: PRODUCT_ICON_IDS.editor,
                onClick: () => setGlobalModalAxis('preset'),
              },
              {
                id: 'editorial_print_flow',
                shortLabel: pillLabels.printFlowShort,
                mobileLabel: pillLabels.printFlowMobile,
                tooltip: pillLabels.printFlowTooltip,
                ariaLabel: `Impresión y saltos: ${pillLabels.printFlowShort}`,
                iconId: UI_ICON_IDS.disenoHoja,
                onClick: () => setIsPrintFlowModalOpen(true),
              },
              {
                id: 'editorial_norms',
                shortLabel: pillLabels.normsUnifiedShort,
                mobileLabel: pillLabels.normsUnifiedMobile,
                tooltip: pillLabels.normsUnifiedTooltip,
                ariaLabel: `Norma y citas: ${pillLabels.normsUnifiedShort}`,
                iconId: UI_ICON_IDS.editorialNorm,
                hasOverrides: designOverrideCount > 0,
                onClick: () => setGlobalModalAxis('norms'),
              },
            ]}
            zoomLevel={viewport.zoomLevel}
            setZoomLevel={viewport.setZoomLevel}
            triggerAutoFit={viewport.fitAndCenter}
            cycleUITheme={cycleUITheme}
            globalActions={[
              {
                id: 'editorial_team_room',
                label: activeTeamRoom ? 'Equipo en Vivo' : 'Equipo (10)',
                mobileLabel: activeTeamRoom ? 'En Vivo' : 'Equipo',
                tooltip: 'Sala de Equipo en vivo hasta 10 personas en EditorLee',
                icon: <Users className="w-3.5 h-3.5 shrink-0" />,
                tone: activeTeamRoom ? 'success' : 'secondary',
                active: Boolean(activeTeamRoom),
                onClick: () => setIsTeamModalOpen(true),
              },
            ]}
          />
        }
        dockSlot={
          <StudioDock
            docType="editorial"
            cvData={draft}
            activeTab={activeStepTab}
            setActiveTab={(tab) => {
              navigateStepTab(tab);
              setIsPanelOpen(true);
              focusSectionInPreview(tab);
            }}
            isPanelOpen={isPanelOpen}
            setIsPanelOpen={setIsPanelOpen}
          />
        }
        panelSlot={
          <ErrorBoundary
            compact
            resetKey={`${editorialId}_${activeStepTab}`}
            title="Inconveniente en este panel"
            subtitle="Ocurrió un problema temporal al mostrar esta sección. Tus capítulos y textos están resguardados."
          >
          <div className="p-4 pb-24 sm:pb-16 space-y-6 overflow-y-auto h-full max-h-full text-[var(--ui-text-primary)]">
            {activeTeamRoom && (
              <div
                className="p-3 bg-[var(--color-status-success-muted)] border border-[var(--color-status-success-base)]/40 text-[var(--color-status-success-text)] space-y-2 text-xs"
                style={{ borderRadius: radius.card }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-black">
                    👥 Sala en Vivo: {activeTeamRoom.project.title} ({onlineTeamEmails.length || 1} conectados)
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsTeamModalOpen(true)}
                    className="underline font-bold cursor-pointer"
                  >
                    Administrar
                  </button>
                </div>
                {activeDynamicSection && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => void handleSaveTeamChapter(false)}
                      className="px-2.5 py-1 bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                      style={{ borderRadius: radius.control }}
                    >
                      <Save className="w-3 h-3" />
                      <span>Guardar capítulo en equipo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSaveTeamChapter(true)}
                      className="px-2.5 py-1 bg-[var(--ui-bg-card)] border border-[var(--ui-border)] text-[var(--ui-text-primary)] font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                      style={{ borderRadius: radius.control }}
                    >
                      <Lock className="w-3 h-3" />
                      <span>Guardar y soltar</span>
                    </button>
                  </div>
                )}
                <div className="flex flex-wrap gap-3 text-[11px]">
                  <button
                    type="button"
                    onClick={() => void handleSaveTeamCopyLocally()}
                    className="underline font-bold cursor-pointer"
                  >
                    Guardar copia local en este equipo
                  </button>
                  <button
                    type="button"
                    onClick={handleExitTeamRoom}
                    className="underline font-bold cursor-pointer"
                  >
                    Salir a borradores locales
                  </button>
                </div>
              </div>
            )}
            {activeStepTab === 'editorial_inicio' && (
              <EditorialInicioArchivoPanel
                docId={editorialId}
                draft={draft}
                updateDraft={updateDraft}
                notify={notify}
                setActiveStepTab={navigateStepTab}
                boundFileName={getBoundNativeFileName(editorialId)}
                onNewDraft={handleNewDraft}
                onOpenSaved={handleOpenSaved}
                onDuplicateSaved={handleDuplicate}
                onSaveToDisk={() => void handleSaveToDisk(true)}
                onOpenDiskFile={handleOpenDiskFile}
              />
            )}
            {activeStepTab === 'editorial_portada' && (
              <EditorialCoverPanel
                draft={draft}
                updateDraft={updateDraft}
              />
            )}
            {activeStepTab === 'editorial_estructura' && (
              <EditorialStructurePanel
                draft={draft}
                updateDraft={updateDraft}
              />
            )}
            {activeStepTab === 'editorial_diseño' && (
              <EditorialStylePanel
                draft={draft}
                updateDraft={updateDraft}
              />
            )}
            {activeStepTab === 'editorial_toc' && (
              <EditorialTocPanel
                draft={draft}
                updateDraft={updateDraft}
                resolvedTocMap={resolvedTocState.displayMap}
              />
            )}
            {activeStepTab === 'editorial_secciones' && (
              <EditorialSectionsOverviewPanel
                draft={draft}
                updateDraft={updateDraft}
                setActiveStepTab={navigateStepTab}
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
            {activeDynamicSection && (
              <EditorialSectionFocusPanel
                key={activeDynamicSection.section.id}
                section={activeDynamicSection.section}
                draft={draft}
                badgeLabel={activeDynamicSection.badgeLabel}
                updateDraft={updateDraft}
                setActiveStepTab={navigateStepTab}
                notify={notify}
                onCommitHistoryBoundary={history.commitBoundary}
              />
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[var(--ui-border)]">
              {activeDynamicSection ? (
                <>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--ui-text-secondary)]">
                    Sección {activeDynamicSection.badgeLabel}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => navigateStepTab('editorial_secciones')}
                      className="px-3 py-1.5 text-xs font-bold border border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-[var(--ui-text-primary)] cursor-pointer"
                      style={{ borderRadius: radius.control }}
                    >
                      ← Capítulos
                    </button>
                    {(() => {
                      const allSecs: EditorialSection[] = Array.isArray(draft?.sections) ? draft.sections : [];
                      const curIdx = allSecs.findIndex((s) => s.id === activeDynamicSection.section.id);
                      const nextSec = curIdx >= 0 && curIdx + 1 < allSecs.length ? allSecs[curIdx + 1] : null;
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            if (nextSec) {
                              navigateStepTab(nextSec.id);
                              focusSectionInPreview(nextSec.id);
                            } else {
                              navigateStepTab('editorial_bibliografia');
                            }
                          }}
                          className="px-3.5 py-1.5 text-xs font-bold bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] cursor-pointer"
                          style={{ borderRadius: radius.control }}
                        >
                          {nextSec ? 'Siguiente cap. →' : 'Ir a Citas →'}
                        </button>
                      );
                    })()}
                  </div>
                </>
              ) : activeStepMeta?.id === 'editorial_toc' ? (
                <>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => navigateStepTab(getPrevEditorialStepId('editorial_toc'))}
                      className="px-2.5 py-1.5 text-xs font-bold border border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-[var(--ui-text-primary)] cursor-pointer"
                      style={{ borderRadius: radius.control }}
                    >
                      ← Anterior
                    </button>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--ui-text-secondary)]">
                      Paso 7 de {EDITORIAL_STEP_SEQUENCE.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleExportDocx()}
                      className="px-3 py-2 text-xs font-bold border border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-[var(--ui-text-primary)] cursor-pointer"
                      style={{ borderRadius: radius.control }}
                    >
                      Word (.docx)
                    </button>
                    <button
                      type="button"
                      onClick={handleExportPDF}
                      className="px-3.5 py-2 text-xs font-bold bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] cursor-pointer"
                      style={{ borderRadius: radius.control }}
                    >
                      Exportar PDF
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--ui-text-secondary)]">
                    Paso {activeStepMeta?.stepNumber || 1} de {EDITORIAL_STEP_SEQUENCE.length} ·{' '}
                    {activeStepMeta?.shortLabel || 'Inicio'}
                  </span>
                  <div className="flex items-center gap-2">
                    {(activeStepMeta?.stepNumber || 1) > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          navigateStepTab(getPrevEditorialStepId(activeStepMeta?.id || 'editorial_inicio'))
                        }
                        className="px-3 py-1.5 text-xs font-bold border border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-[var(--ui-text-primary)] cursor-pointer"
                        style={{ borderRadius: radius.control }}
                      >
                        ← Anterior
                      </button>
                    )}
                    {(() => {
                      const nextId = getNextEditorialStepId(activeStepMeta?.id || 'editorial_inicio');
                      const nextMeta = EDITORIAL_STEP_SEQUENCE.find((s) => s.id === nextId);
                      return (
                        <button
                          type="button"
                          onClick={() => navigateStepTab(nextId)}
                          className="px-3.5 py-1.5 text-xs font-bold bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] cursor-pointer"
                          style={{ borderRadius: radius.control }}
                        >
                          Siguiente: {nextMeta?.shortLabel || 'Continuar'} →
                        </button>
                      );
                    })()}
                  </div>
                </>
              )}
            </div>
          </div>
          </ErrorBoundary>
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
                  onDocumentTextScanned={handleDocumentTextScanned}
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
        docType="editorial"
        onConfirm={() => {
          setIsCheckoutOpen(false);
          if (pendingExportFormatRef.current === 'docx') {
            void handleExportDocx({ skipPreflight: true });
          } else {
            void handleExportPDF({ skipPreflight: true });
          }
        }}
      />
      <EditorialPreflightModal
        isOpen={isPreflightOpen}
        report={preflightReport}
        onClose={() => setIsPreflightOpen(false)}
        onGoToIssue={handleGoToPreflightIssue}
        onAutoCleanPunctuation={handleAutoCleanFromPreflight}
        onExportAnyway={() => {
          setIsPreflightOpen(false);
          if (pendingExportFormatRef.current === 'docx') {
            void handleExportDocx({ skipPreflight: true });
          } else {
            void handleExportPDF({ skipPreflight: true });
          }
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
      <EditorialPrintFlowModal
        isOpen={isPrintFlowModalOpen}
        onClose={() => setIsPrintFlowModalOpen(false)}
        draft={draft}
        onApplyPrintFlow={({ printSides, chapterBreakMode, breakOnH2 }) => {
          updateDraft((prev) => {
            let nextDesign = {
              ...(prev?.design || {}),
              printSides,
              headersEvenOdd: printSides === 'duplex',
              chapterBreakMode,
              breakOnH2,
              ...(printSides === 'duplex' &&
              (!prev?.design?.headerMode || prev.design.headerMode === 'auto')
                ? { headerMode: 'mirror_book_chapter' }
                : {}),
            };
            nextDesign = markManualOverride(nextDesign, 'printSides');
            nextDesign = markManualOverride(nextDesign, 'chapterBreakMode');
            return {
              ...prev,
              design: nextDesign,
            };
          });
          showSuccess(
            printSides === 'duplex'
              ? 'Modo doble faz (2 caras) aplicado; recalculando índice.'
              : 'Modo simple faz (1 cara) aplicado sin páginas en blanco.',
          );
        }}
      />
      <EditorialTeamModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        draft={draft}
        activeTeamRoom={activeTeamRoom}
        onlineEmails={onlineTeamEmails}
        onEnterTeamRoom={handleEnterTeamRoom}
        onExitTeamRoom={handleExitTeamRoom}
        onSyncTeamSections={(nextSections) =>
          setActiveTeamRoom((prev) => (prev ? { ...prev, sections: nextSections } : prev))
        }
      />
    </>
  );
};

export default EditorLeeStudioContent;
