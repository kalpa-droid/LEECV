import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from '../../shared/core/ui/AppShell';
import Navbar from '../cv-builder/components/Navbar';
import CanvaIconDock from '../cv-builder/components/CanvaIconDock';
import { VectorDocViewer } from '../../shared/core/pdf-engine/VectorDocViewer';
import { EditorialPdfDocument } from '../../shared/core/pdf-engine/renderer/EditorialPdfDocument';
import { DEFAULT_EDITORIAL_PRESET, getEditorialPreset } from '../../shared/core/editorial-engine/editorialPresetCatalog';
import { EDITORIAL_PRESETS } from '../../shared/core/pdf-engine/layers/presets/editorialPresets';
import { DocumentTypeId } from '../../types/document';
import { useDocumentViewport, useViewportGestures } from '../../shared/core/viewport';
import { OpenTab } from '../../shared/core/documents/tabStore';
import { resolveDocumentIdWithHandoff, useRegisterDocumentTab } from '../../shared/core/documents/documentEngine';
import { saveDocumentDraftLocal } from '../../shared/core/storage/documentStorageService';
import { useToast } from '../../shared/core/ui/Toast';
import { withErrorHandling } from '../../shared/core/utils/errorHandler';
import { exportDocumentToPDF } from '../../shared/core/pdf-engine/pdfExporter';
import { useExportEntitlement } from '../../shared/core/entitlements/useExportEntitlement';
import PdfCheckoutModal from '../cv-builder/components/modals/PdfCheckoutModal';
import { elevationSystem, radius } from '../../shared/core/uiDesignSystem';
import { FloatingAssistant } from '../cv-builder/components/FloatingAssistant';
import { EDITORIAL_STEP_SEQUENCE } from '../../shared/core/editorial-engine/editorialStepSequence';

export interface EditorLeeStudioContentProps {
  currentUiTheme?: string;
  documentTabs: OpenTab[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNavigateToDocument: (targetDocType: DocumentTypeId, id: string) => void;
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
  const obra = data?.metadata?.title || 'EditorLee';
  return obra ? `${obra} - Mi obra` : 'EditorLee - Mis documentos';
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
  onSelectTab: _onSelectTab,
  onCloseTab,
  onNavigateToDocument,
  onNewCV,
  onNewCard,
  onNewBook,
  onNewPlanner,
  onNewInvoice,
  onNewEditorial,
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
  const [draft, setDraft] = useState<any>(() => createEmptyEditorial());
  const preset = draft?.design?.presetId || DEFAULT_EDITORIAL_PRESET.id;

  const viewport = useDocumentViewport({ pageSizeId: preset });

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
    void saveDocumentDraftLocal({ id: editorialId, title: editorialTitle });
  }, [editorialId, editorialTitle]);

  const updateDraft = useCallback(
    (updater: (prev: any) => any) => {
      setDraft((prev: any) => updater(prev || createEmptyEditorial()));
    },
    []
  );

  const handleNewDraft = useCallback(() => {
    setDraft(createEmptyEditorial());
    setActiveStepTab('editorial_inicio');
    setIsPanelOpen(true);
    showInfo('Nuevo documento editorial listo para redactar.');
  }, [showInfo]);

  const handleSaveDocument = useCallback(async () => {
    if (!draft) return;
    try {
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
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Error desconocido');
    }
  }, [draft, preset, showSuccess, showError]);

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

  const pdfElement = useMemo(
    () => <EditorialPdfDocument data={draft as any} preset={preset} />,
    [draft, preset]
  );

  const stepProps: StepProps = {
    draft,
    updateDraft,
    notify: { success: showSuccess, error: showError },
    setActiveStepTab,
    onDuplicate: handleDuplicate,
  };

  return (
    <>
      <AppShell
        docType="editorial"
        isPanelOpen={isPanelOpen}
        containerRef={viewport.containerRef}
        navbarSlot={
          <Navbar
            docType="editorial"
            currentCvData={{}}
            currentUiTheme={currentUiTheme}
            onOpenSavedCVsModal={() => {
              setActiveStepTab('editorial_historial');
              setIsPanelOpen(true);
            }}
            onSaveCVClick={() => {}}
            onOpenSaveAsModal={() => {}}
            onOpenJsonDownloadModal={() => {}}
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
          <CanvaIconDock
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
          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-[var(--ui-bg-panel)] relative overflow-hidden">
            <div
              ref={sheetRef}
              className={`flex-1 w-full max-w-4xl overflow-hidden border border-[var(--ui-border)] bg-[var(--ui-bg-card)] ${elevationSystem.floating}`}
              style={{ borderRadius: radius.card }}
            >
              <VectorDocViewer
                document={pdfElement}
                zoomLevel={viewport.zoomLevel}
                activeTab={activeStepTab}
                preset={EDITORIAL_PRESETS.find((p) => p.id === preset) || EDITORIAL_PRESETS[0]}
              />
            </div>
          </div>
        }
        tabsBarProps={{
          tabs: documentTabs,
          activeId: editorialId,
          docType: 'editorial',
          onSwitch: () => {},
          onNavigateToDocument: (targetType, id) => onNavigateToDocument(targetType, id),
          onAdd: handleNewDraft,
          onNewCV,
          onNewCard,
          onNewBook,
          onNewPlanner,
          onNewInvoice,
          onNewEditorial: handleNewDraft,
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
  onDuplicate?: (saved: any) => void;
}

function InicioEditorialStep({ setActiveStepTab }: StepProps) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Bienvenido/a a EditorLee</h2>
      <p className="text-base mb-6">
        Elegí el tipo de documento que querés crear y los parámetros de diseño.
      </p>
      <div className="space-y-4">
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
    </div>
  );
}

function PortadaEditorialStep({ updateDraft, setActiveStepTab }: StepProps) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Portada / Carátula</h2>
      <p className="text-base mb-4">
        Elegí el modo de tapa para tu obra.
      </p>
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => {
            updateDraft((prev: any) => ({
              ...prev,
              cover: { mode: 'libro' as const, title: prev?.metadata?.title || 'Mi obra' }
            }));
            setActiveStepTab('editorial_secciones');
          }}
          className="w-full py-3 px-4 bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] rounded text-sm font-medium cursor-pointer"
        >
          Tapa de Libro (título, autor, editorial, QR opcional)
        </button>
        <button
          type="button"
          onClick={() => {
            updateDraft((prev: any) => ({
              ...prev,
              cover: { mode: 'academica' as const, title: prev?.metadata?.title || 'Mi obra' }
            }));
            setActiveStepTab('editorial_secciones');
          }}
          className="w-full py-3 px-4 bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] rounded text-sm font-medium cursor-pointer"
        >
          Carátula Académica (institución, carrera, docente, legajo)
        </button>
        <button
          type="button"
          onClick={() => {
            updateDraft((prev: any) => ({
              ...prev,
              cover: { mode: 'ejecutiva' as const, title: prev?.metadata?.title || 'Mi obra' }
            }));
            setActiveStepTab('editorial_secciones');
          }}
          className="w-full py-3 px-4 bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] rounded text-sm font-medium cursor-pointer"
        >
          Tapa Ejecutiva limpia (organización, fecha)
        </button>
        <button
          type="button"
          onClick={() => setActiveStepTab('editorial_secciones')}
          className="w-full py-3 px-4 bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] rounded text-sm font-medium cursor-pointer"
        >
          Sin carátula
        </button>
      </div>
    </div>
  );
}

function SeccionesEditorialStep({ setActiveStepTab }: StepProps) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Secciones y Capítulos</h2>
      <p className="text-base mb-4">
        Agregá las secciones que conformarán tu obra. Podés agregar hasta 5 secciones personalizadas.
      </p>
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setActiveStepTab('editorial_diseño')}
          className="w-full py-3 px-4 bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] rounded text-sm font-medium cursor-pointer"
        >
          Continuar al Diseño
        </button>
        <button
          type="button"
          onClick={() => setActiveStepTab('editorial_toc')}
          className="w-full py-3 px-4 bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] rounded text-sm font-medium cursor-pointer"
        >
          Ver Índice Automático
        </button>
      </div>
      <div className="mt-6 p-4 bg-[var(--ui-bg-card)] rounded">
        <h3 className="font-medium mb-3">Secciones rápidas</h3>
        <div className="space-y-2">
          <button type="button" className="w-full py-2 px-3 text-sm hover:bg-[var(--ui-bg-hover)] rounded text-left">
            Capítulo 1
          </button>
          <button type="button" className="w-full py-2 px-3 text-sm hover:bg-[var(--ui-bg-hover)] rounded text-left">
            Capítulo 2
          </button>
          <button type="button" className="w-full py-2 px-3 text-sm hover:bg-[var(--ui-bg-hover)] rounded text-left">
            Introducción
          </button>
          <button type="button" className="w-full py-2 px-3 text-sm hover:bg-[var(--ui-bg-hover)] rounded text-left">
            Conclusiones
          </button>
        </div>
      </div>
    </div>
  );
}

function DiseñoEditorialStep({ setActiveStepTab }: StepProps) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Diseño y Hoja</h2>
      <p className="text-base mb-4">
        Configurá el tamaño de hoja, márgenes, lomo y tipografía. {/* plain-language:allow */}
      </p>
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setActiveStepTab('editorial_metadata')}
          className="w-full py-3 px-4 bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] rounded text-sm font-medium cursor-pointer"
        >
          Continuar a Metadatos
        </button>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Tamaño de hoja {/* plain-language:allow */}</label>
            <select className="w-full rounded border p-2">
              <option value="a4">A4 (hoja común) {/* plain-language:allow */}</option>
              <option value="a5">A5 (media hoja) {/* plain-language:allow */}</option>
              <option value="carta">Carta</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Lomo (mm)</label>
            <input type="number" className="w-full rounded border p-2" placeholder="Ej: 12" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Tipografía</label>
          <select className="w-full rounded border p-2">
            <option value="times">Times New Roman</option>
            <option value="helvetica">Helvetica</option>
            <option value="arial">Arial</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function TocEditorialStep({ setActiveStepTab }: StepProps) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Índice Automático</h2>
      <p className="text-base mb-4">
        Encendé o apagá el índice automático y elegí su posición.
      </p>
      <div className="space-y-4">
        <label className="flex items-center gap-2">
          <input type="checkbox" defaultChecked className="rounded border p-1" />
          <span>Mostrar índice automático</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="tocPosition" value="tras-caratula" defaultChecked className="rounded border p-1" />
          <span>Tras carátula</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="tocPosition" value="tras-preliminares" className="rounded border p-1" />
          <span>Tras preliminares</span>
        </label>
        <button
          type="button"
          onClick={() => setActiveStepTab('editorial_metadata')}
          className="w-full py-3 px-4 bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] rounded text-sm font-medium cursor-pointer"
        >
          Continuar a Metadatos
        </button>
      </div>
    </div>
  );
}

function MetadatosEditorialStep({ draft, setActiveStepTab }: StepProps) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Metadatos y Legales</h2>
      <p className="text-base mb-4">
        Completá los datos de la ficha de la obra y los pares clave-valor.
      </p>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Título</label>
          <input type="text" defaultValue={draft.metadata?.title || ''} className="w-full rounded border p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Autor</label>
          <input type="text" defaultValue={draft.metadata?.author || ''} className="w-full rounded border p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Año</label>
          <input type="number" defaultValue={draft.metadata?.year || ''} className="w-full rounded border p-2" placeholder="Ej: 2024" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">ISBN</label>
          <input type="text" defaultValue={draft.metadata?.isbn || ''} className="w-full rounded border p-2" />
        </div>
        <button
          type="button"
          onClick={() => setActiveStepTab('editorial_import_ai')}
          className="w-full py-3 px-4 bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] rounded text-sm font-medium cursor-pointer"
        >
          Importar / IA
        </button>
      </div>
    </div>
  );
}

function ImportAiEditorialStep({ setActiveStepTab }: StepProps) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Importar y Asistente IA</h2>
      <p className="text-base mb-4">
        Subí tu manuscrito (.docx, .txt o .md) o usá los flujos IA para estructurar, reescribir o pulir secciones.
      </p>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Subir manuscrito</label>
          <input type="file" accept=".docx,.txt,.md" className="w-full rounded border p-2" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <button type="button" className="w-full py-2 px-3 text-sm bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] rounded cursor-pointer">
              Estructurar manuscrito
            </button>
          </div>
          <div>
            <button type="button" className="w-full py-2 px-3 text-sm bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] rounded cursor-pointer">
              Reescribir sección
            </button>
          </div>
        </div>
        <div className="mt-4 p-4 bg-[var(--ui-bg-card)] rounded">
          <h3 className="font-medium mb-3">Flujos IA disponibles</h3>
          <ul className="space-y-2 text-sm">
            <li>Estructura: divide el manuscrito en secciones y metadatos detectados.</li>
            <li>Reescritura: convierte texto crudo en los 9 tipos de registros.</li>
            <li>Refinamiento: aplica instrucción puntual sobre un registro o sección.</li>
          </ul>
        </div>
        <button
          type="button"
          onClick={() => setActiveStepTab('editorial_diseño')}
          className="w-full py-3 px-4 bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] rounded text-sm font-medium cursor-pointer"
        >
          Volver al Diseño
        </button>
      </div>
    </div>
  );
}

function HistorialEditorialStep({ setActiveStepTab }: StepProps) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Historial y Versiones</h2>
      <p className="text-base mb-4">
        Aquí verías los documentos guardados previamente.
      </p>
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setActiveStepTab('editorial_secciones')}
          className="w-full py-3 px-4 bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] rounded text-sm font-medium cursor-pointer"
        >
          Volver a editar
        </button>
      </div>
    </div>
  );
}
