import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from '../../shared/core/ui/AppShell';
import StudioNavbar from '../../shared/core/studio-host/StudioNavbar';
import StudioDock from '../../shared/core/studio-host/StudioDock';
import { VectorDocViewer } from '../../shared/core/pdf-engine/VectorDocViewer';
import { InvoicePdfDocument } from './pdf/InvoicePdfDocument';
import { getInvoicePreset } from './pdf/facturadorPresets';
import { DocumentTypeId } from '../../types/document';
import { useDocumentViewport, useViewportGestures } from '../../shared/core/viewport';
import { OpenTab } from '../../shared/core/documents/tabStore';
import { resolveDocumentIdWithHandoff, useRegisterDocumentTab } from '../../shared/core/documents/documentEngine';
import { useStudioHistory } from '../../shared/core/documents/session/useStudioHistory';
import { saveInvoiceShell } from '../../shared/core/storage/documentStorageService';
import { useToast } from '../../shared/core/ui/Toast';
import { LocalBackupShieldBanner } from '../../shared/core/ui/LocalBackupShieldBanner';
import { Modal } from '../../shared/core/ui/Modal';
import { Field } from '../../shared/core/ui/Field';
import { withErrorHandling } from '../../shared/core/utils/errorHandler';
import { exportDocumentToPDF } from '../../shared/core/pdf-engine/pdfExporter';
import { useExportEntitlement } from '../../shared/core/entitlements/useExportEntitlement';
import PdfCheckoutModal from '../../shared/core/studio-host/PdfCheckoutModal';
import { button, elevationSystem, radius } from '../../shared/core/uiDesignSystem';
import { downloadBlob } from '../../shared/core/utils/downloadUtils';
import { useFacturadorVault } from './useFacturadorVault';
import { VaultLockScreen } from './VaultLockScreen';
import { FACTURADOR_STEP_SEQUENCE } from './domain/facturadorStepSequence';
import { Store, UserRound, Hash, FilePlus2, Save } from 'lucide-react';
import { isManuallyOverridden } from '../../shared/core/presets/configCascadeEngine';
import { useUnsavedChangesGuard } from '../../shared/core/hooks/useUnsavedChangesGuard';
import {
  EMPTY_EMPRESA,
  EMPTY_FACTURADOR_VAULT,
  createEmptyInvoice,
} from './domain/facturadorDefaults';
import {
  FacturadorVaultData,
  InvoiceDraft,
  SavedInvoice,
} from './domain/facturadorTypes';
import {
  computeInvoiceTotals,
  computeLineRow,
  describeComprobante,
  formatCompNro,
  formatPointOfSale,
} from './domain/invoiceMath';
import {
  commitVoucherEmissionToVault,
  getNextVoucherNumber,
  hasDuplicateVoucherNumber,
} from './domain/voucherCascadeEngine';
import {
  exportPortablePackage,
  isBackupDue,
  loadEnvelope,
  readPortablePackage,
} from './domain/vaultStorage';
import { FactEmisorModal } from './ui/FactEmisorModal';
import { FactClientPickerModal } from './ui/FactClientPickerModal';
import { FactVoucherConfigModal } from './ui/FactVoucherConfigModal';
import {
  exportVaultToXlsx,
  importCatalogAndClientsFromXlsx,
} from './domain/xlsxBackupEngine';
import { FactNotify, nextNumberPreview } from './facturadorStepsShared';
import { FactEmisorStep } from './steps/FactEmisorStep';
import { FloatingAssistant } from '../../shared/core/studio-host/FloatingAssistant';
import {
  assessFacturadorCompleteness,
  buildFacturadorMetadataOnlyContext,
} from './domain/facturadorCompleteness';
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
  onNewDocument?: (docType: DocumentTypeId) => void;
  onNewCV?: () => void;
  onNewCard?: () => void;
  onNewBook?: () => void;
  onNewPlanner?: () => void;
  onNewInvoice?: () => void;
  onNewEditorial?: () => void;
  cycleUITheme: () => void;
  onTabsChanged?: (tabs: OpenTab[]) => void;
  onOpenCreditsModal?: () => void;
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
  onSelectTab,
  onCloseTab,
  onNavigateToDocument,
  onNewDocument,
  onNewCV,
  onNewCard,
  onNewBook,
  onNewPlanner,
  onNewInvoice,
  onNewEditorial,
  cycleUITheme,
  onTabsChanged = () => {},
  onOpenCreditsModal,
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

  const [activeStepTab, setActiveStepTab] = useState<string>('fact_items');
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [isEmisorModalOpen, setIsEmisorModalOpen] = useState<boolean>(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState<boolean>(false);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState<boolean>(false);
  const [rememberHabitualForClient, setRememberHabitualForClient] = useState<boolean>(false);
  const [pendingRestoreFile, setPendingRestoreFile] = useState<File | null>(null);
  const [restorePassword, setRestorePassword] = useState<string>('');

  useUnsavedChangesGuard({
    isDirty: phase === 'unlocked' && Boolean(vault?.draftActual?.items?.length),
    onFlush: flush,
  });

  const { consumeCreditIfNeeded } = useExportEntitlement('invoice');

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

  const applyVaultSnapshot = useCallback(
    (snap: FacturadorVaultData | null) => {
      if (snap) updateVault(() => snap);
    },
    [updateVault],
  );

  const history = useStudioHistory<FacturadorVaultData | null>({
    docId: invoiceId,
    state: vault,
    applyState: applyVaultSnapshot,
    isHydrating: phase !== 'unlocked' || !vault,
    isActive: phase === 'unlocked',
  });

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
    setRememberHabitualForClient(false);
    updateDraft((prev) =>
      createEmptyInvoice({
        tipo: prev.tipo,
        letra: prev.letra,
        puntoVenta: prev.puntoVenta || '00001',
        numero: getNextVoucherNumber(vault, prev.puntoVenta || '00001', prev.tipo, prev.letra),
        cliente: prev.cliente,
      })
    );
    setActiveStepTab('fact_items');
    setIsPanelOpen(true);
    showInfo('Comprobante nuevo listo para agregar ítems.');
  }, [updateDraft, vault, showInfo]);

  const handleSaveComprobante = useCallback(async () => {
    if (!vault) return;
    if (draft.readonlyHistorical) {
      showInfo('Este comprobante ya fue emitido y es de solo lectura. Usá "Repetir" en Historial para crear uno nuevo.');
      return;
    }
    if (!vault.empresa.razonSocial.trim()) {
      showError('Completá la razón social de tu negocio antes de guardar.');
      setIsEmisorModalOpen(true);
      return;
    }
    if (draft.items.length === 0) {
      showError('Agregá al menos un ítem al comprobante.');
      setActiveStepTab('fact_items');
      setIsPanelOpen(true);
      return;
    }
    if (draft.estado !== 'borrador' && hasDuplicateVoucherNumber(vault, draft)) {
      showError('Ese número de comprobante ya fue emitido. Ajustalo desde Tipo y N° arriba.');
      setIsVoucherModalOpen(true);
      return;
    }

    const effectiveNumber = draft.numero?.trim()
      ? formatCompNro(draft.numero)
      : getNextVoucherNumber(vault, draft.puntoVenta || '00001', draft.tipo, draft.letra);
    const effectivePv = formatPointOfSale(draft.puntoVenta || '00001');

    const totals = computeInvoiceTotals(draft.items.map(computeLineRow), 21, draft.letra);
    const existing = vault.comprobantes.find((comp) => comp.id === draft.id);
    const firstEmission = draft.estado !== 'borrador' && !draft.stockDeducido;

    const saved: SavedInvoice = {
      ...draft,
      puntoVenta: effectivePv,
      numero: effectiveNumber,
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

      const comprobantes = existing
        ? prev.comprobantes.map((comp) => (comp.id === draft.id ? saved : comp))
        : [...prev.comprobantes, saved];

      const withCommittedSeries = commitVoucherEmissionToVault(
        { ...prev, catalogo, comprobantes },
        saved,
        rememberHabitualForClient,
      );

      const nextNum = getNextVoucherNumber(
        withCommittedSeries,
        effectivePv,
        draft.tipo,
        draft.letra,
      );

      return {
        ...withCommittedSeries,
        draftActual: createEmptyInvoice({
          tipo: draft.tipo,
          letra: draft.letra,
          puntoVenta: effectivePv,
          numero: nextNum,
          cliente: draft.cliente,
        }),
      };
    });

    setRememberHabitualForClient(false);
    await flush();
    await saveInvoiceShell({ id: invoiceId, title: buildInvoiceTitle(vault) });
    showSuccess(`Guardado: ${describeComprobante(saved)}`);
    setActiveStepTab('fact_historial');
  }, [vault, draft, updateVault, flush, invoiceId, showSuccess, showError, showInfo, rememberHabitualForClient]);

  const FACTURLEE_FREE_PROOFS_LIMIT = 3;
  const FACTURLEE_FREE_PROOFS_KEY = 'leecv_facturlee_free_proofs_v1';

  const handleExportPDF = useCallback(async () => {
    if (!vault) return;

    let localFreeCount = 0;
    try {
      localFreeCount = Number(localStorage.getItem(FACTURLEE_FREE_PROOFS_KEY) || 0) || 0;
    } catch {
      localFreeCount = 0;
    }
    const usedFreeCount = Math.max(Number(vault.backup?.freeExportsUsed || 0), localFreeCount);
    const usingFreeProof = usedFreeCount < FACTURLEE_FREE_PROOFS_LIMIT;

    if (!usingFreeProof) {
      const allowed = await consumeCreditIfNeeded('invoice');
      if (!allowed) {
        setIsCheckoutOpen(true);
        return;
      }
    }

    setIsExporting(true);
    await withErrorHandling(
      async () => {
        const ok = await exportDocumentToPDF(
          { draft, empresa: vault.empresa, design: vault.design },
          vault.design.presetId
        );
        if (!ok) throw new Error('pdf_sin_documento');

        if (usingFreeProof) {
          const nextFree = Math.min(FACTURLEE_FREE_PROOFS_LIMIT, usedFreeCount + 1);
          try {
            localStorage.setItem(FACTURLEE_FREE_PROOFS_KEY, String(nextFree));
          } catch {
            // Ignorar storage restringido
          }
          updateVault((prev) => ({
            ...prev,
            backup: { ...prev.backup, freeExportsUsed: nextFree },
          }));
          showSuccess(`Comprobante gratis ${nextFree} de ${FACTURLEE_FREE_PROOFS_LIMIT} descargado.`);
        } else {
          showSuccess('Comprobante exportado en PDF.');
        }
      },
      {
        context: 'Exportación FacturLee',
        errorMessage: 'No pudimos generar el PDF del comprobante.',
        notify: (msg) => showError(msg),
      }
    );
    setIsExporting(false);
  }, [vault, draft, consumeCreditIfNeeded, updateVault, showSuccess, showError]);

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
      updateDraft(() =>
        createEmptyInvoice({
          tipo: saved.tipo,
          letra: saved.letra,
          puntoVenta: saved.puntoVenta || '00001',
          numero: getNextVoucherNumber(vault, saved.puntoVenta || '00001', saved.tipo, saved.letra),
          cliente: saved.cliente,
          items: saved.items.map((item) => ({ ...item })),
          observaciones: saved.observaciones,
          estado: 'borrador',
          stockDeducido: false,
          readonlyHistorical: false,
        })
      );
      setActiveStepTab('fact_items');
      setIsPanelOpen(true);
      showInfo('Comprobante repetido como borrador nuevo.');
    },
    [vault, updateDraft, showInfo]
  );

  const handleOpenHistorical = useCallback(
    (saved: SavedInvoice) => {
      const isReadonly = saved.estado !== 'borrador';
      updateDraft(() => ({
        ...saved,
        items: saved.items.map((item) => ({ ...item })),
        readonlyHistorical: isReadonly,
      }));
      setActiveStepTab('fact_items');
      setIsPanelOpen(true);
      showInfo(
        isReadonly
          ? `Abierto ${describeComprobante(saved)} para reimprimir (solo lectura).`
          : `Borrador ${describeComprobante(saved)} abierto para editar.`,
      );
    },
    [updateDraft, showInfo],
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

  const lidioMetadataContext = useMemo(
    () =>
      buildFacturadorMetadataOnlyContext({
        activeStepId: activeStepTab,
        vaultLocked: phase !== 'unlocked',
        report: phase === 'unlocked' ? assessFacturadorCompleteness({ empresa, draft }, activeStepTab) : null,
      }),
    [activeStepTab, phase, empresa, draft]
  );

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
          <StudioNavbar
            docType="invoice"
            undo={history.undo}
            redo={history.redo}
            canUndo={history.canUndo}
            canRedo={history.canRedo}
            currentCvData={{}}
            currentUiTheme={currentUiTheme}
            onOpenSavedCVsModal={() => {
              setActiveStepTab('fact_historial');
              setIsPanelOpen(true);
            }}
            onSaveCVClick={handleSaveComprobante}
            saveActionLabel={draft.readonlyHistorical ? 'Reimprimir comprobante' : 'Guardar comprobante actual'}
            backupHealth={
              vault
                ? isBackupDue(vault.backup)
                  ? {
                      status: 'warning',
                      label: 'Respaldar bóveda en disco/pendrive',
                      tooltip: 'Hace varios días que no descargás copia de tu bóveda. Tocá para ir a Bóveda y Pendrive.',
                      onClick: () => {
                        setActiveStepTab('fact_respaldo');
                        setIsPanelOpen(true);
                      },
                    }
                  : {
                      status: 'ok',
                      label: 'Bóveda cifrada y respaldada',
                      tooltip: 'Tus datos fiscales están cifrados y tu último respaldo está al día.',
                      onClick: () => {
                        setActiveStepTab('fact_respaldo');
                        setIsPanelOpen(true);
                      },
                    }
                : undefined
            }
            globalContextPills={[
              {
                id: 'fact_emisor_pill',
                shortLabel: empresa.razonSocial?.trim() || 'Tu negocio',
                mobileLabel: empresa.razonSocial?.trim() ? empresa.razonSocial.trim().slice(0, 9) : 'Negocio',
                tooltip: 'Configurar datos de tu negocio, CUIT y logo',
                icon: <Store className="w-3.5 h-3.5 shrink-0" />,
                onClick: () => setIsEmisorModalOpen(true),
              },
              {
                id: 'fact_cliente_pill',
                shortLabel: draft.cliente?.nombre?.trim() || 'Consumidor Final',
                mobileLabel: draft.cliente?.nombre?.trim() ? draft.cliente.nombre.trim().slice(0, 9) : 'Cliente',
                tooltip: 'Elegir cliente guardado o crear uno nuevo para este comprobante',
                icon: <UserRound className="w-3.5 h-3.5 shrink-0" />,
                onClick: () => setIsClientModalOpen(true),
              },
              {
                id: 'fact_voucher_pill',
                shortLabel: `${
                  draft.tipo === 'presupuesto'
                    ? 'Presup.'
                    : draft.tipo === 'nota_credito'
                      ? 'NC'
                      : draft.tipo === 'remito'
                        ? 'Remito'
                        : draft.tipo === 'recibo'
                          ? 'Recibo'
                          : 'Factura'
                } ${draft.letra}`,
                mobileLabel: `${
                  draft.tipo === 'presupuesto'
                    ? 'Presup.'
                    : draft.tipo === 'nota_credito'
                      ? 'NC'
                      : draft.tipo === 'remito'
                        ? 'Remito'
                        : draft.tipo === 'recibo'
                          ? 'Recibo'
                          : 'Fact.'
                } ${draft.letra}`,
                tooltip: 'Cambiar tipo de comprobante, letra (A/B/C/X/R) o numeración',
                icon: <Hash className="w-3.5 h-3.5 shrink-0" />,
                hasOverrides: isManuallyOverridden(draft, 'voucherType') || isManuallyOverridden(draft, 'numero'),
                onClick: () => setIsVoucherModalOpen(true),
              },
            ]}
            globalActions={[
              {
                id: 'fact_new_action',
                label: 'Nuevo',
                mobileLabel: 'Nuevo',
                tooltip: 'Iniciar un comprobante nuevo limpio',
                tone: 'neutral',
                icon: <FilePlus2 className="w-3.5 h-3.5 shrink-0" />,
                onClick: handleNewDraft,
              },
              {
                id: 'fact_save_action',
                label: draft.readonlyHistorical ? 'Reimprimir' : 'Guardar',
                mobileLabel: draft.readonlyHistorical ? 'PDF' : 'Guardar',
                tooltip: draft.readonlyHistorical ? 'Descargar PDF del comprobante emitido' : 'Guardar comprobante actual en el historial',
                tone: 'success',
                icon: <Save className="w-3.5 h-3.5 shrink-0" />,
                onClick: draft.readonlyHistorical ? handleExportPDF : handleSaveComprobante,
              },
            ]}
            onOpenSaveAsModal={() => {}}
            onOpenJsonDownloadModal={() => {}}
            driveBackupHandlers={{
              getEditableBlob: async () => {
                await flush();
                const envelope = await loadEnvelope();
                if (!envelope) return null;
                const blob = await exportPortablePackage(envelope);
                return { blob, fileName: 'FacturLee-Respaldo.leecv-fact' };
              },
              onRestoreEditableFile: async (file: File) => {
                setRestorePassword('');
                setPendingRestoreFile(file);
              },
            }}
            onPrint={handleExportPDF}
            isSaving={isExporting}
            onOpenCreditsModal={onOpenCreditsModal}
            onOpenShareAppModal={onOpenShareAppModal || (() => {})}
            onOpenPrivacy={onOpenPrivacy || (() => {})}
            zoomLevel={viewport.zoomLevel}
            setZoomLevel={viewport.setZoomLevel}
            triggerAutoFit={viewport.fitAndCenter}
            isAutoFitMode={viewport.isAutoFitMode}
            cycleUITheme={cycleUITheme}
            isPanelOpen={isPanelOpen}
            onCloseMobilePanel={() => {
              setIsPanelOpen(false);
              viewport.fitAndCenter();
            }}
          />
        }
        dockSlot={
          <StudioDock
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
            <LocalBackupShieldBanner
              visible={isBackupDue(vault.backup)}
              title="Resguardá tu bóveda fuera del navegador"
              description="Exportá una copia cifrada .leecv-fact en tu equipo o Google Drive para proteger clientes e historial."
              onBackupNow={() => {
                setActiveStepTab('fact_respaldo');
                setIsPanelOpen(true);
              }}
              dismissKey="leecv_facturlee_shield_dismissed"
            />
            {activeStepTab === 'fact_emisor' && <FactEmisorStep {...stepProps} />}
            {activeStepTab === 'fact_comprobante' && <FactComprobanteStep {...stepProps} />}
            {activeStepTab === 'fact_items' && (
              <FactItemsStep
                {...stepProps}
                onSaveComprobante={handleSaveComprobante}
                onNewDraft={handleNewDraft}
                onExportPDF={handleExportPDF}
              />
            )}
            {activeStepTab === 'fact_catalogo' && <FactCatalogoStep {...stepProps} />}
            {activeStepTab === 'fact_clientes' && (
              <FactClientesStep
                {...stepProps}
                onSelectForBilling={() => {
                  setActiveStepTab('fact_items');
                  setIsPanelOpen(true);
                }}
              />
            )}
            {activeStepTab === 'fact_historial' && (
              <FactHistorialStep
                {...stepProps}
                onDuplicate={handleDuplicate}
                onOpenHistorical={handleOpenHistorical}
              />
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
          onSwitch: onSelectTab,
          onNavigateToDocument: (targetType, id) => onNavigateToDocument(targetType, id),
          onAdd: handleNewDraft,
          onNewDocument,
          onNewCV,
          onNewCard,
          onNewBook,
          onNewPlanner,
          onNewInvoice: onNewInvoice || handleNewDraft,
          onNewEditorial,
          onClose: (e, id) => onCloseTab(id),
        }}
      />
      <FloatingAssistant
        docType="invoice"
        activeTab={activeStepTab}
        metadataOnlyContext={lidioMetadataContext}
        onNavigate={(stepId) => {
          if (stepId === 'fact_emisor') {
            setIsEmisorModalOpen(true);
            return;
          }
          if (stepId === 'fact_comprobante') {
            setIsVoucherModalOpen(true);
            return;
          }
          setActiveStepTab(stepId);
          setIsPanelOpen(true);
        }}
      />
      {stepProps && (
        <>
          <FactEmisorModal
            isOpen={isEmisorModalOpen}
            onClose={() => setIsEmisorModalOpen(false)}
            {...stepProps}
          />
          <FactClientPickerModal
            isOpen={isClientModalOpen}
            onClose={() => setIsClientModalOpen(false)}
            {...stepProps}
          />
          <FactVoucherConfigModal
            isOpen={isVoucherModalOpen}
            onClose={() => setIsVoucherModalOpen(false)}
            onOpenNewClientPicker={() => setIsClientModalOpen(true)}
            rememberHabitualForClient={rememberHabitualForClient}
            onToggleRememberHabitual={setRememberHabitualForClient}
            {...stepProps}
          />
        </>
      )}
      <PdfCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        docType="invoice"
        onConfirm={() => {
          setIsCheckoutOpen(false);
          void handleExportPDF();
        }}
      />
      <Modal
        isOpen={Boolean(pendingRestoreFile)}
        onClose={() => setPendingRestoreFile(null)}
        title="Abrir copia cifrada de FacturLee"
        size="sm"
        footer={
          <div className="w-full flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPendingRestoreFile(null)}
              className={`${button.base} ${button.secondary}`}
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!restorePassword.trim()}
              onClick={() => {
                if (!pendingRestoreFile) return;
                const file = pendingRestoreFile;
                setPendingRestoreFile(null);
                void handleImportPortable(file, restorePassword);
              }}
              className={`${button.base} ${button.primary}`}
            >
              Abrir bóveda
            </button>
          </div>
        }
      >
        <div className="space-y-3 text-xs text-[var(--ui-text-primary)]">
          <p className="text-[var(--ui-text-secondary)]">
            Ingresá la contraseña con la que creaste la copia <strong>{pendingRestoreFile?.name}</strong>:
          </p>
          <Field
            label="Contraseña de la bóveda"
            type="password"
            value={restorePassword}
            onChange={setRestorePassword}
            placeholder="Tu contraseña de bóveda"
          />
        </div>
      </Modal>
    </>
  );
};

export default FacturadorStudioContent;
