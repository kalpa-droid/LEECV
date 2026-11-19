import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from '../../shared/core/ui/AppShell';
import Navbar from '../cv-builder/components/Navbar';
import CanvaIconDock from '../cv-builder/components/CanvaIconDock';
import { VectorDocViewer } from '../../shared/core/pdf-engine/VectorDocViewer';
import { InvoicePdfDocument } from '../../shared/core/pdf-engine/renderer/InvoicePdfDocument';
import { getInvoicePreset } from '../../shared/core/pdf-engine/layers/presets/facturadorPresets';
import { DocumentTypeId } from '../../types/document';
import { useDocumentViewport, useViewportGestures } from '../../shared/core/viewport';
import { OpenTab } from '../../shared/core/documents/tabStore';
import { resolveDocumentIdWithHandoff, useRegisterDocumentTab } from '../../shared/core/documents/documentEngine';
import { saveInvoiceShell } from '../../shared/core/storage/documentStorageService';
import { useToast } from '../../shared/core/ui/Toast';
import { withErrorHandling } from '../../shared/core/utils/errorHandler';
import { exportDocumentToPDF } from '../../shared/core/pdf-engine/pdfExporter';
import { useExportEntitlement } from '../../shared/core/entitlements/useExportEntitlement';
import PdfCheckoutModal from '../cv-builder/components/modals/PdfCheckoutModal';
import { elevationSystem, radius } from '../../shared/core/uiDesignSystem';
import { downloadBlob } from '../../shared/core/utils/downloadUtils';
import { useFacturadorVault } from './useFacturadorVault';
import { VaultLockScreen } from './VaultLockScreen';
import { FACTURADOR_STEP_SEQUENCE } from '../../shared/core/facturador-engine/facturadorStepSequence';
import {
  EMPTY_EMPRESA,
  EMPTY_FACTURADOR_VAULT,
  createEmptyInvoice,
} from '../../shared/core/facturador-engine/facturadorDefaults';
import {
  FacturadorVaultData,
  InvoiceDraft,
  SavedInvoice,
} from '../../shared/core/facturador-engine/facturadorTypes';
import {
  computeInvoiceTotals,
  computeLineRow,
  describeComprobante,
} from '../../shared/core/facturador-engine/invoiceMath';
import {
  exportPortablePackage,
  loadEnvelope,
  readPortablePackage,
} from '../../shared/core/facturador-engine/vaultStorage';
import {
  exportVaultToXlsx,
  importCatalogAndClientsFromXlsx,
} from '../../shared/core/facturador-engine/xlsxBackupEngine';
import { FactNotify, nextNumberPreview } from './facturadorStepsShared';
import { FactEmisorStep } from './steps/FactEmisorStep';
import { FactComprobanteStep } from './steps/FactComprobanteStep';
import { FactItemsStep } from './steps/FactItemsStep';
import { FactCatalogoStep } from './steps/FactCatalogoStep';
import { FactClientesStep } from './steps/FactClientesStep';
import { FactHistorialStep } from './steps/FactHistorialStep';
import { FactDisenoStep } from './steps/FactDisenoStep';
import { FactRespaldoStep } from './steps/FactRespaldoStep';

export interface FacturadorStudioContentProps {
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
  cycleUITheme: () => void;
  onTabsChanged?: (tabs: OpenTab[]) => void;
  onOpenShareAppModal?: () => void;
  onOpenPrivacy?: () => void;
}

function buildInvoiceTitle(vault: FacturadorVaultData | null): string {
  if (!vault) return 'FacturLee - Mis comprobantes';
  const negocio = vault.empresa.nombreFantasia || vault.empresa.razonSocial;
  return negocio ? `FacturLee - ${negocio}` : 'FacturLee - Mis comprobantes';
}

/**
 * Estudio de FacturLee (/crear-factura).
 *
 * Shell mínimo: la pestaña guarda solo id + título. Toda la información fiscal
 * vive cifrada en la bóveda local (`useFacturadorVault`) y nunca toca Supabase.
 */
export const FacturadorStudioContent: React.FC<FacturadorStudioContentProps> = ({
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
  cycleUITheme,
  onTabsChanged = () => {},
  onOpenShareAppModal,
  onOpenPrivacy,
}) => {
  const {
    phase,
    vault,
    session,
    error,
    isBusy,
    createWithPassword,
    unlock,
    unlockRecovery,
    updateVault,
    flush,
    lock,
    regenerateRecoveryKey,
    changePassword,
    restoreFromEnvelope,
  } = useFacturadorVault();

  const { showSuccess, showError, showInfo } = useToast();
  const notify: FactNotify = useMemo(
    () => ({ success: showSuccess, error: showError, info: showInfo }),
    [showSuccess, showError, showInfo]
  );

  const [activeStepTab, setActiveStepTab] = useState<string>('fact_comprobante');
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);

  const { consumeCreditIfNeeded } = useExportEntitlement();

  const invoiceId = useMemo(
    () => resolveDocumentIdWithHandoff(activeTabId, 'invoice'),
    [activeTabId]
  );

  const sheetRef = useRef<HTMLDivElement>(null);
  const fallbackDraftRef = useRef<InvoiceDraft>(createEmptyInvoice());
  const fallbackDraft = fallbackDraftRef.current;

  const draft = vault?.draftActual || fallbackDraft;
  const design = vault?.design || EMPTY_FACTURADOR_VAULT.design;
  const empresa = vault?.empresa || EMPTY_EMPRESA;
  const preset = getInvoicePreset(design.presetId);

  const viewport = useDocumentViewport({ pageSizeId: design.pageSizeId });

  useViewportGestures({
    containerRef: viewport.containerRef,
    sheetRef,
    onZoomChange: viewport.setZoomLevel,
    zoomLevel: viewport.zoomLevel,
  });

  const invoiceTitle = buildInvoiceTitle(vault);

  useRegisterDocumentTab({
    id: invoiceId,
    docType: 'invoice',
    title: invoiceTitle,
    documentTabs,
    onTabsChanged,
  });

  // Persistir el sobre mínimo de la pestaña (nunca datos fiscales).
  useEffect(() => {
    if (phase !== 'unlocked') return;
    void saveInvoiceShell({ id: invoiceId, title: buildInvoiceTitle(vault) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, invoiceId]);

  const updateDraft = useCallback(
    (updater: (prev: InvoiceDraft) => InvoiceDraft) => {
      updateVault((prev) => ({
        ...prev,
        draftActual: updater(prev.draftActual || fallbackDraftRef.current),
      }));
    },
    [updateVault]
  );

  const handleNewDraft = useCallback(() => {
    if (!vault) return;
    updateDraft((prev) =>
      createEmptyInvoice({
        letra: prev.letra,
        puntoVenta: vault.numeracion[prev.letra]?.puntoVenta || prev.puntoVenta,
        numero: nextNumberPreview(vault, prev.letra),
        cliente: prev.cliente,
      })
    );
    setActiveStepTab('fact_comprobante');
    setIsPanelOpen(true);
    showInfo('Comprobante nuevo listo para completar.');
  }, [updateDraft, vault, showInfo]);

  const handleSaveComprobante = useCallback(async () => {
    if (!vault) return;
    if (!vault.empresa.razonSocial.trim()) {
      showError('Completá la razón social de tu negocio antes de guardar.');
      setActiveStepTab('fact_emisor');
      setIsPanelOpen(true);
      return;
    }
    if (draft.items.length === 0) {
      showError('Agregá al menos un ítem al comprobante.');
      setActiveStepTab('fact_items');
      setIsPanelOpen(true);
      return;
    }

    const totals = computeInvoiceTotals(draft.items.map(computeLineRow), 21, draft.letra);
    const existing = vault.comprobantes.find((comp) => comp.id === draft.id);
    const firstEmission = draft.estado !== 'borrador' && !draft.stockDeducido;

    const saved: SavedInvoice = {
      ...draft,
      total: totals.total,
      emitidaAt:
        draft.estado === 'borrador'
          ? existing?.emitidaAt
          : existing?.emitidaAt || new Date().toISOString(),
      stockDeducido: firstEmission ? true : draft.stockDeducido,
    };

    updateVault((prev) => {
      let catalogo = prev.catalogo;
      if (firstEmission) {
        catalogo = prev.catalogo.map((item) => {
          const qty = draft.items
            .filter((line) => line.catalogItemId === item.id)
            .reduce((acc, line) => acc + (Number(line.cantidad) || 0), 0);
          return qty > 0 ? { ...item, stock: Math.max(0, (Number(item.stock) || 0) - qty) } : item;
        });
      }

      const numeracion = { ...prev.numeracion };
      const usedNumber = Number(draft.numero) || 0;
      const currentNumber = numeracion[draft.letra]?.ultimoNumero || 0;
      if (usedNumber > currentNumber) {
        numeracion[draft.letra] = {
          puntoVenta: draft.puntoVenta || numeracion[draft.letra]?.puntoVenta || '00001',
          ultimoNumero: usedNumber,
        };
      }

      const comprobantes = existing
        ? prev.comprobantes.map((comp) => (comp.id === draft.id ? saved : comp))
        : [...prev.comprobantes, saved];

      return {
        ...prev,
        catalogo,
        numeracion,
        comprobantes,
        draftActual: createEmptyInvoice({
          letra: draft.letra,
          puntoVenta: numeracion[draft.letra]?.puntoVenta || draft.puntoVenta,
          numero: String((numeracion[draft.letra]?.ultimoNumero || 0) + 1).padStart(8, '0'),
          cliente: draft.cliente,
        }),
      };
    });

    await flush();
    await saveInvoiceShell({ id: invoiceId, title: buildInvoiceTitle(vault) });
    showSuccess(`Guardado: ${describeComprobante(saved)}`);
    setActiveStepTab('fact_historial');
  }, [vault, draft, updateVault, flush, invoiceId, showSuccess, showError]);

  const handleExportPDF = useCallback(async () => {
    if (!vault) return;
    const allowed = await consumeCreditIfNeeded();
    if (!allowed) {
      setIsCheckoutOpen(true);
      return;
    }

    setIsExporting(true);
    await withErrorHandling(
      async () => {
        const ok = await exportDocumentToPDF(
          { draft, empresa: vault.empresa, design: vault.design },
          vault.design.presetId
        );
        if (!ok) throw new Error('pdf_sin_documento');
        showSuccess('Comprobante exportado en PDF.');
      },
      {
        context: 'Exportación FacturLee',
        errorMessage: 'No pudimos generar el PDF del comprobante.',
        notify: (msg) => showError(msg),
      }
    );
    setIsExporting(false);
  }, [vault, draft, consumeCreditIfNeeded, showSuccess, showError]);

  const handleExportPortable = useCallback(async () => {
    await flush();
    const envelope = await loadEnvelope();
    if (!envelope) {
      showError('Todavía no hay una bóveda para respaldar.');
      return;
    }
    const blob = await exportPortablePackage(envelope);
    downloadBlob(blob, 'FacturLee-Respaldo.leecv-fact');
    showSuccess('Copia cifrada descargada. Guardala en tu pendrive.');
  }, [flush, showSuccess, showError]);

  const handleImportPortable = useCallback(
    async (file: File, password: string) => {
      try {
        const envelope = await readPortablePackage(file);
        await restoreFromEnvelope(envelope, password);
        showSuccess('Copia restaurada. Ya podés usar tus datos.');
      } catch (err: any) {
        showError(
          err?.message === 'clave_incorrecta'
            ? 'Esa contraseña no abre la copia. Probá con la que tenía la bóveda cuando la guardaste.'
            : 'No pudimos abrir esa copia. Revisá que sea un archivo .leecv-fact.'
        );
      }
    },
    [restoreFromEnvelope, showSuccess, showError]
  );

  const handleExportXlsx = useCallback(async () => {
    if (!vault) return;
    await withErrorHandling(
      async () => {
        const blob = await exportVaultToXlsx(vault);
        downloadBlob(blob, 'FacturLee-Datos.xlsx');
        showSuccess('Planilla Excel descargada con 5 hojas.');
      },
      {
        context: 'Respaldo Excel FacturLee',
        errorMessage: 'No pudimos generar la planilla Excel.',
        notify: (msg) => showError(msg),
      }
    );
  }, [vault, showSuccess, showError]);

  const handleImportXlsx = useCallback(
    async (file: File) => {
      try {
        const result = await importCatalogAndClientsFromXlsx(file);
        updateVault((prev) => ({
          ...prev,
          catalogo: [...prev.catalogo, ...result.catalogo],
          clientes: [...prev.clientes, ...result.clientes],
        }));
        showSuccess(
          `Importado: ${result.catalogo.length} producto(s) y ${result.clientes.length} cliente(s).`
        );
      } catch {
        showError('No pudimos leer esa planilla. Usá una descargada desde FacturLee.');
      }
    },
    [updateVault, showSuccess, showError]
  );

  const handleDuplicate = useCallback(
    (saved: SavedInvoice) => {
      if (!vault) return;
      updateDraft((prev) =>
        createEmptyInvoice({
          tipo: saved.tipo,
          letra: saved.letra,
          puntoVenta: vault.numeracion[saved.letra]?.puntoVenta || saved.puntoVenta,
          numero: nextNumberPreview(vault, saved.letra),
          cliente: saved.cliente,
          items: saved.items.map((item) => ({ ...item })),
          observaciones: saved.observaciones,
          estado: 'borrador',
          stockDeducido: false,
        })
      );
      setActiveStepTab('fact_items');
      setIsPanelOpen(true);
      showInfo('Comprobante repetido como borrador nuevo.');
    },
    [vault, updateDraft, showInfo]
  );

  const handleLock = useCallback(async () => {
    await flush();
    await lock();
    setIsPanelOpen(true);
    showInfo('Bóveda bloqueada.');
  }, [flush, lock, showInfo]);

  const pdfElement = useMemo(
    () => <InvoicePdfDocument draft={draft} empresa={empresa} design={design} />,
    [draft, empresa, design]
  );

  const stepProps = vault
    ? { vault, updateVault, draft, updateDraft, notify }
    : null;

  if (phase === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen text-sm opacity-60 animate-pulse">
        Abriendo tu bóveda cifrada…
      </div>
    );
  }

  if (phase === 'needs_setup' || phase === 'locked') {
    return (
      <VaultLockScreen
        phase={phase}
        error={error}
        isBusy={isBusy}
        onCreate={createWithPassword}
        onUnlock={unlock}
        onUnlockRecovery={unlockRecovery}
      />
    );
  }

  if (!vault || !session || !stepProps) {
    return (
      <div className="flex items-center justify-center h-screen text-sm opacity-60 animate-pulse">
        Preparando FacturLee…
      </div>
    );
  }

  return (
    <>
      <AppShell
        docType="invoice"
        isPanelOpen={isPanelOpen}
        containerRef={viewport.containerRef}
        navbarSlot={
          <Navbar
            docType="invoice"
            currentCvData={{}}
            currentUiTheme={currentUiTheme}
            onOpenSavedCVsModal={() => {
              setActiveStepTab('fact_historial');
              setIsPanelOpen(true);
            }}
            onSaveCVClick={handleSaveComprobante}
            onOpenSaveAsModal={() => {}}
            onOpenJsonDownloadModal={() => {}}
            onPrint={handleExportPDF}
            isSaving={isExporting}
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
          <CanvaIconDock
            docType="invoice"
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
            {activeStepTab === 'fact_emisor' && <FactEmisorStep {...stepProps} />}
            {activeStepTab === 'fact_comprobante' && <FactComprobanteStep {...stepProps} />}
            {activeStepTab === 'fact_items' && <FactItemsStep {...stepProps} />}
            {activeStepTab === 'fact_catalogo' && <FactCatalogoStep {...stepProps} />}
            {activeStepTab === 'fact_clientes' && <FactClientesStep {...stepProps} />}
            {activeStepTab === 'fact_historial' && (
              <FactHistorialStep {...stepProps} onDuplicate={handleDuplicate} />
            )}
            {activeStepTab === 'fact_diseno' && <FactDisenoStep {...stepProps} />}
            {activeStepTab === 'fact_respaldo' && (
              <FactRespaldoStep
                {...stepProps}
                session={session}
                onExportPortable={handleExportPortable}
                onExportXlsx={handleExportXlsx}
                onImportXlsx={handleImportXlsx}
                onImportPortable={handleImportPortable}
                onRegenerateRecoveryKey={regenerateRecoveryKey}
                onChangePassword={changePassword}
                onLock={handleLock}
              />
            )}

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-[var(--ui-border)]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--ui-text-secondary)]">
                Paso {FACTURADOR_STEP_SEQUENCE.find((step) => step.id === activeStepTab)?.stepNumber || 2} de{' '}
                {FACTURADOR_STEP_SEQUENCE.length}
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={handleNewDraft}
                  className="px-3 py-2 text-xs font-bold bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] text-[var(--ui-text-primary)]"
                  style={{ borderRadius: radius.control }}
                >
                  Comprobante nuevo
                </button>
                <button
                  type="button"
                  onClick={handleSaveComprobante}
                  className="px-3 py-2 text-xs font-bold bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)]"
                  style={{ borderRadius: radius.control }}
                >
                  Guardar comprobante
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
                preset={preset}
              />
            </div>
          </div>
        }
        tabsBarProps={{
          tabs: documentTabs,
          activeId: invoiceId,
          docType: 'invoice',
          onSwitch: () => {},
          onNavigateToDocument: (targetType, id) => onNavigateToDocument(targetType, id),
          onAdd: handleNewDraft,
          onNewCV,
          onNewCard,
          onNewBook,
          onNewPlanner,
          onNewInvoice: onNewInvoice || handleNewDraft,
          onClose: (e, id) => onCloseTab(id),
        }}
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

export default FacturadorStudioContent;
