import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Copy,
  Upload,
  CheckCircle2,
  ChevronRight,
  FileText,
  Settings2,
  Sparkles,
  SlidersHorizontal,
  Printer,
  Download,
  AlertCircle,
} from 'lucide-react';
import { BookImpositionOptions, processBookImposition } from './domain/impositionEngine';
import { computeBookFinalPageCount } from './domain/bookPageCount';
import { OrientationConsensusResult } from './domain/bookOrientationAi';
import {
  BOOK_PRINT_PROFILES,
  clearBookFieldManual,
  inferBookPrintTarget,
  resolveBookPaperSpec,
} from './domain/bookPrintProfileEngine';
import { countManualOverrides } from '../../shared/core/presets/configCascadeEngine';
import { ManualOverrideBadge } from '../../shared/core/ui/ManualOverrideBadge';
import { PanelSection } from '../../shared/core/ui/PanelSection';
import { ActionGrid } from '../../shared/core/ui/ActionGrid';
import { ActionTileButton } from '../../shared/core/ui/ActionTileButton';
import { ContextualGuideBox } from '../../shared/core/ui/ContextualGuideBox';
import { emitLidioMessage } from '../../shared/core/assistant/lidioBus';
import { PdfSourceErrorCode, isPdfSourceError, isPdfLikeFile } from '../../shared/core/pdf-engine/pdfSourceClassifier';
import { bookAssetManager, markNativePickerFailedSession, isNativePickerFailedSession } from './domain/bookAssetManager';
import { useExportEntitlement } from '../../shared/core/entitlements/useExportEntitlement';
import PdfCheckoutModal from '../../shared/core/studio-host/PdfCheckoutModal';
import { button, elevationSystem, radius } from '../../shared/core/uiDesignSystem';
import { useText } from '../../shared/i18n/useText';

interface BookSourceTypeStepProps {
  options: BookImpositionOptions;
  setOptions: React.Dispatch<React.SetStateAction<BookImpositionOptions>>;
  selectedFile: File | null;
  pdfPageCount: number;
  onFileConfirmed: (file: File) => Promise<unknown>;
  onNextStep?: () => void;
  onSwitchToGuidedOrganize?: () => void;
  onOpenPrintTargetModal?: () => void;
  onOpenPaperModal?: () => void;
  pickerRef?: React.MutableRefObject<(() => Promise<void>) | null>;
  bookId?: string;
  assetResolver?: (ref: string) => Promise<string | null>;
  pdfPassword?: string | null;
  /** Estado de detección automática de orientación con IA en modo fotocopia */
  isAnalyzingOrientation?: boolean;
  orientationSummary?: string | null;
  mixedOrientationConsensus?: OrientationConsensusResult | null;
  fullOrientationScanProgress?: { done: number; total: number } | null;
  onRunFullOrientationScan?: () => void;
  onCancelFullOrientationScan?: () => void;
  onDismissMixedOrientation?: () => void;
}

export const BookSourceTypeStep: React.FC<BookSourceTypeStepProps> = ({
  options,
  setOptions,
  selectedFile,
  pdfPageCount,
  onFileConfirmed,
  onNextStep,
  onSwitchToGuidedOrganize,
  onOpenPrintTargetModal,
  onOpenPaperModal,
  pickerRef,
  bookId,
  assetResolver,
  pdfPassword,
  isAnalyzingOrientation = false,
  orientationSummary = null,
  mixedOrientationConsensus = null,
  fullOrientationScanProgress = null,
  onRunFullOrientationScan,
  onCancelFullOrientationScan,
  onDismissMixedOrientation,
}) => {
  const t = useText();
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [nativePickerFailed, setNativePickerFailed] = useState(() => isNativePickerFailedSession());

  // Estado de exportación directa en Modo Automático
  const { consumeCreditIfNeeded, loading: isGating } = useExportEntitlement();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isExportingAuto, setIsExportingAuto] = useState(false);
  const [exportProgressPct, setExportProgressPct] = useState(0);
  const [exportStatusMsg, setExportStatusMsg] = useState('');
  const [autoPdfBlobUrl, setAutoPdfBlobUrl] = useState<string | null>(null);
  const [autoOutputIsZip, setAutoOutputIsZip] = useState(false);

  const isAutoMode = options.workflowMode !== 'guided';

  const PDF_SOURCE_ERROR_TEXT: Record<PdfSourceErrorCode, string> = {
    'empty-file': t.bookStudio.sourceStep.errorEmptyFile,
    password: t.bookStudio.sourceStep.passwordRequiredTitle,
    corrupt: t.bookStudio.sourceStep.errorCorrupt,
    missing: t.bookStudio.sourceStep.errorMissing,
    'empty-pdf': t.bookStudio.sourceStep.errorEmptyPdf,
    unknown: t.bookStudio.sourceStep.errorUnknown,
  };

  const handleFileChange = async (file: File) => {
    if (!isPdfLikeFile(file)) {
      setErrorMsg(t.bookStudio.sourceStep.errorInvalidFile);
      return;
    }

    setErrorMsg(null);
    setAutoPdfBlobUrl(null);
    setIsLoadingFile(true);

    try {
      await onFileConfirmed(file);
    } catch (err) {
      console.error(err);
      if (isPdfSourceError(err)) {
        if (err.code !== 'password') setErrorMsg(PDF_SOURCE_ERROR_TEXT[err.code]);
      } else {
        setErrorMsg(t.bookStudio.sourceStep.errorUnknown);
      }
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleFileChangeRef = useRef(handleFileChange);
  useEffect(() => {
    handleFileChangeRef.current = handleFileChange;
  });

  const canUseNativePicker = !nativePickerFailed && bookAssetManager.canUseNativeFilePicker();
  const triggerPick = async () => {
    setErrorMsg(null);
    if (!canUseNativePicker) return;
    const result = await bookAssetManager.pickSourcePdf(bookId);
    if (result.status === 'picked') {
      await handleFileChangeRef.current(result.file);
    } else if (result.status === 'fallback-required') {
      markNativePickerFailedSession();
      setNativePickerFailed(true);
    }
  };

  useEffect(() => {
    if (!pickerRef) return;
    pickerRef.current = triggerPick;
    return () => {
      pickerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickerRef, bookId, nativePickerFailed]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChangeRef.current(e.dataTransfer.files[0]);
    }
  };

  const handleStartAutoExport = async () => {
    if (!selectedFile) return;
    const allowed = await consumeCreditIfNeeded();
    if (!allowed) {
      setIsCheckoutOpen(true);
      return;
    }

    try {
      setIsExportingAuto(true);
      setErrorMsg(null);
      setAutoPdfBlobUrl(null);

      // En Modo Automático puro solo maqueta/ordena las páginas sin tapas adicionales
      const autoEffectiveOptions: BookImpositionOptions = {
        ...options,
        hasCover: false,
        customCover: null,
        hasBackCover: false,
        customBackCover: null,
        sectionDividers: [],
        assetResolver,
        onProgress: (msg, pct) => {
          setExportStatusMsg(msg);
          setExportProgressPct(pct);
        },
      };

      const pdfBytes = await processBookImposition(selectedFile, autoEffectiveOptions, pdfPassword);
      const isZip = pdfBytes[0] === 0x50 && pdfBytes[1] === 0x4b;
      setAutoOutputIsZip(isZip);

      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], {
        type: isZip ? 'application/zip' : 'application/pdf',
      });
      const url = URL.createObjectURL(blob);
      setAutoPdfBlobUrl(url);

      const a = document.createElement('a');
      a.href = url;
      const cleanName = selectedFile.name.replace(/\.(pdf|zip)$/i, '');
      a.download = `${cleanName}_IMPRESION_LIBRO${isZip ? '.zip' : '.pdf'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t.bookStudio.previewExportStep.exportFailed);
    } finally {
      setIsExportingAuto(false);
    }
  };

  const activeTarget = inferBookPrintTarget(options);
  const profile = BOOK_PRINT_PROFILES[activeTarget];
  const paperSpec = resolveBookPaperSpec(options.paperSize);
  const overrideCount = countManualOverrides(options.manualOverrides);

  const autoOptionsForCount: BookImpositionOptions = isAutoMode
    ? {
        ...options,
        hasCover: false,
        customCover: null,
        hasBackCover: false,
        customBackCover: null,
        sectionDividers: [],
      }
    : options;
  const finalPageCount = computeBookFinalPageCount(autoOptionsForCount, pdfPageCount);
  const totalSheetsToPrint = finalPageCount / 2;

  const dropZoneClassName = `relative border-2 border-dashed p-3.5 text-center transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-base)] ${
    isDragging
      ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-light)]/20 scale-[1.01]'
      : selectedFile
      ? 'border-[var(--color-accent-base)]/50 bg-[var(--color-accent-light)]/10'
      : 'border-[var(--ui-border)] bg-[var(--ui-bg-surface)] hover:border-[var(--color-accent-base)]/50'
  }`;

  const dropZoneInner = (
    <>
      {isLoadingFile ? (
        <div className="flex items-center justify-center gap-2 py-1">
          <div className="w-4 h-4 border-2 border-[var(--color-accent-base)] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-[var(--ui-text-secondary)] font-medium">{t.bookStudio.sourceStep.loadingPdf}</p>
        </div>
      ) : selectedFile ? (
        <div className="flex items-center justify-between gap-2 px-1 py-0.5">
          <div className="flex items-center gap-2 text-left min-w-0">
            <CheckCircle2 className="w-5 h-5 text-[var(--color-accent-text)] shrink-0" />
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-[var(--ui-text-primary)] truncate">{selectedFile.name}</h3>
              <p className="text-[10px] text-[var(--ui-text-secondary)]">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {pdfPageCount} págs.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-[var(--color-accent-text)] underline shrink-0">
            {t.bookStudio.sourceStep.changePdf}
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 py-1.5 text-[var(--color-accent-text)]">
          <Upload className="w-4 h-4 shrink-0" />
          <span className="text-xs font-bold text-[var(--ui-text-primary)]">
            {t.bookStudio.sourceStep.dragDropLabel}
          </span>
        </div>
      )}
    </>
  );

  return (
    <div className="space-y-5 text-[var(--ui-text-primary)]">
      {/* 1.a. Modo Automático (Directo) vs Guiado (Personalizado) */}
      <PanelSection
        icon={<Sparkles className="w-4 h-4" />}
        title="1.a. ¿Cómo querés armar tu libro?"
        helpTitle="Modo Automático vs Guiado"
        helpText="El Modo Automático ordena las páginas listo para imprimir y doblar sin pasos extra. El Modo Guiado te permite sumar tapa, separadores de capítulos, contratapa o calibrar numeración."
      >
        <ActionGrid columns={2}>
          <ActionTileButton
            role="preset"
            icon={<Sparkles className="w-5 h-5" />}
            label="Automático (Directo)"
            helpText="Solo ordena las páginas para imprimir y doblar sin hacer preguntas. En fotocopia vertical la IA endereza las hojas automáticamente."
            helpGroupKey="book-workflow-auto"
            active={isAutoMode}
            onClick={() => {
              setOptions((prev) => ({ ...prev, workflowMode: 'auto' }));
              emitLidioMessage({
                kind: 'state',
                groupKey: 'book-workflow-mode',
                title: 'Modo Automático activado',
                body: 'Subís tu PDF y lo descargás ordenado para imprimir y doblar al instante.',
              });
            }}
          />
          <ActionTileButton
            role="record"
            icon={<SlidersHorizontal className="w-5 h-5" />}
            label="Guiado (Paso a paso)"
            helpText="Ideal para agregar tapa, carátulas por capítulo, contratapa o calibrar el número de página 1."
            helpGroupKey="book-workflow-guided"
            active={!isAutoMode}
            onClick={() => {
              setOptions((prev) => ({ ...prev, workflowMode: 'guided' }));
              emitLidioMessage({
                kind: 'state',
                groupKey: 'book-workflow-mode',
                title: 'Modo Guiado activado',
                body: 'Habilitamos todos los pasos en la barra lateral para personalizar tu libro.',
              });
            }}
          />
        </ActionGrid>
      </PanelSection>

      {/* 1.b. Formato del PDF de origen */}
      <PanelSection
        icon={<FileText className="w-4 h-4" />}
        title={t.bookStudio.sourceStep.modeQuestionLabel}
        helpTitle="Tipo de PDF de entrada"
        helpText="Tocá el signo ? de cada botón para ver cuándo usar PDF estándar o escaneo doble página."
      >
        <ActionGrid columns={2}>
          <ActionTileButton
            role="record"
            icon={<BookOpen className="w-5 h-5" />}
            label={t.bookStudio.sourceStep.modeStandardTitle}
            helpText={t.bookStudio.sourceStep.modeStandardDesc}
            helpGroupKey="book-source-mode-normal"
            active={options.mode !== 'fotocopia'}
            onClick={() => {
              setOptions((prev) => ({ ...prev, mode: 'normal' }));
              emitLidioMessage({
                kind: 'state',
                groupKey: 'book-source-mode',
                title: 'PDF estándar activado',
                body: 'Cada página del archivo pasa derecho para armar el libro.',
              });
            }}
          />
          <ActionTileButton
            role="record"
            icon={<Copy className="w-5 h-5" />}
            label={t.bookStudio.sourceStep.modeFotocopiaTitle}
            helpText={t.bookStudio.sourceStep.modeFotocopiaDesc}
            helpGroupKey="book-source-mode-fotocopia"
            active={options.mode === 'fotocopia'}
            onClick={() => {
              setOptions((prev) => ({ ...prev, mode: 'fotocopia' }));
              emitLidioMessage({
                kind: 'state',
                groupKey: 'book-source-mode',
                title: 'Modo escaneo activado',
                body: 'Cada hoja se corta al medio automáticamente y la IA verifica el giro.',
              });
            }}
          />
        </ActionGrid>
      </PanelSection>

      {/* Resumen compacto de las 2 píldoras globales */}
      <div
        className="p-3 border border-[var(--ui-border)] bg-[var(--ui-bg-card)] flex flex-wrap items-center justify-between gap-2"
        style={{ borderRadius: radius.control }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <Settings2 className="w-4 h-4 text-[var(--color-accent-text)] shrink-0" />
          <span className="text-xs font-bold text-[var(--ui-text-primary)] truncate">
            {profile.shortName} · Hoja ({paperSpec.pageSize.name})
          </span>
          <ManualOverrideBadge
            isOverridden={overrideCount > 0}
            globalLabel={profile.shortName}
            onReset={() => setOptions((prev) => clearBookFieldManual(prev, 'paperSize'))}
          />
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {onOpenPrintTargetModal && (
            <button
              type="button"
              onClick={onOpenPrintTargetModal}
              className="px-2.5 py-1 rounded-full border border-[var(--ui-border)] bg-[var(--ui-bg-surface)] text-[11px] font-bold text-[var(--color-accent-text)] cursor-pointer hover:border-[var(--color-accent-base)]"
            >
              Destino
            </button>
          )}
          {onOpenPaperModal && (
            <button
              type="button"
              onClick={onOpenPaperModal}
              className="px-2.5 py-1 rounded-full border border-[var(--ui-border)] bg-[var(--ui-bg-surface)] text-[11px] font-bold text-[var(--color-accent-text)] cursor-pointer hover:border-[var(--color-accent-base)]"
            >
              Hoja
            </button>
          )}
        </div>
      </div>

      {/* 1.c. Archivo PDF a cargar */}
      <PanelSection
        icon={<Upload className="w-4 h-4" />}
        title="1.c. Cargar archivo"
        helpTitle="Privacidad de tu PDF"
        helpText={t.bookStudio.sourceStep.pdfPolicyNote}
      >
        <ContextualGuideBox title="Qué archivo elegir">
          Subí el PDF terminado de tu libro, apunte o manual. Queda solo en tu equipo y podés cambiarlo cuando quieras.
        </ContextualGuideBox>

        {canUseNativePicker ? (
          <div
            onClick={triggerPick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                void triggerPick();
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={t.bookStudio.sourceStep.ariaPickPdf}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            className={dropZoneClassName}
            style={{ borderRadius: radius.card }}
          >
            {dropZoneInner}
          </div>
        ) : (
          <label
            htmlFor="book-source-pdf-input"
            aria-label={t.bookStudio.sourceStep.ariaPickPdf}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            className={`${dropZoneClassName} block`}
            style={{ borderRadius: radius.card }}
          >
            {dropZoneInner}
          </label>
        )}

        {errorMsg && (
          <div
            className="p-2.5 bg-[var(--color-status-danger-muted)] border border-[var(--color-status-danger-base)]/30 text-[var(--color-status-danger-text)] text-xs font-medium text-center"
            style={{ borderRadius: radius.control }}
          >
            {errorMsg}
          </div>
        )}
      </PanelSection>

      {/* Estado de orientación IA en modo Fotocopia */}
      {selectedFile && options.mode === 'fotocopia' && isAnalyzingOrientation && (
        <div
          className="p-3.5 border border-[var(--color-accent-base)]/40 bg-[var(--color-accent-muted)] flex items-center gap-2.5 text-xs font-semibold text-[var(--color-accent-text)]"
          style={{ borderRadius: radius.card }}
        >
          <div className="w-4 h-4 border-2 border-[var(--color-accent-base)] border-t-transparent rounded-full animate-spin shrink-0" />
          <span>
            Verificando con IA hacia qué lado giran las hojas (páginas 2, 5, 10 y 15) para que ninguna quede patas para arriba...
          </span>
        </div>
      )}

      {selectedFile && options.mode === 'fotocopia' && fullOrientationScanProgress && (
        <div
          className="p-3.5 border border-[var(--color-accent-base)]/40 bg-[var(--color-accent-muted)] space-y-2"
          style={{ borderRadius: radius.card }}
        >
          <div className="flex items-center justify-between text-xs font-bold text-[var(--color-accent-text)]">
            <span>
              IA revisando página por página ({fullOrientationScanProgress.done} de {fullOrientationScanProgress.total})...
            </span>
            {onCancelFullOrientationScan && (
              <button
                type="button"
                onClick={onCancelFullOrientationScan}
                className="underline text-[var(--color-status-danger-text)] cursor-pointer"
              >
                Detener
              </button>
            )}
          </div>
          <div className="w-full h-1.5 rounded-full bg-[var(--ui-bg-card)] overflow-hidden">
            <div
              className="h-full bg-[var(--color-accent-base)] transition-all"
              style={{
                width: `${Math.min(100, Math.round((fullOrientationScanProgress.done / Math.max(1, fullOrientationScanProgress.total)) * 100))}%`,
              }}
            />
          </div>
        </div>
      )}

      {selectedFile && options.mode === 'fotocopia' && mixedOrientationConsensus && !fullOrientationScanProgress && (
        <div
          className="p-3.5 border-2 border-[var(--color-status-warning-base)] bg-[var(--color-status-warning-muted)] space-y-2.5"
          style={{ borderRadius: radius.card }}
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-[var(--color-status-warning-text)] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-[var(--color-status-warning-text)]">
                {mixedOrientationConsensus.summaryText}
              </p>
              <p className="text-[11px] text-[var(--color-status-warning-text)]">
                Como hay páginas giradas para distintos lados, elegí cómo preferís enderezarlas:
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            {onRunFullOrientationScan && (
              <button
                type="button"
                onClick={onRunFullOrientationScan}
                className={`${button.base} ${button.primary} flex-1 flex items-center justify-center gap-1.5 text-xs font-bold`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Que la IA revise cada página (imagen comprimida)</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onDismissMixedOrientation?.();
                setOptions((prev) => ({ ...prev, workflowMode: 'guided' }));
                onSwitchToGuidedOrganize?.();
              }}
              className={`${button.base} ${button.secondary} text-xs font-bold`}
            >
              Girar manualmente
            </button>
          </div>
        </div>
      )}

      {/* MODO AUTOMÁTICO: Tarjeta directa de descarga sin preguntas extra */}
      {isAutoMode && selectedFile && !isAnalyzingOrientation && !fullOrientationScanProgress && !mixedOrientationConsensus && (
        <div
          className={`p-4 bg-[var(--ui-bg-surface)] border-2 border-[var(--color-accent-base)] space-y-3.5 ${elevationSystem.raised}`}
          style={{ borderRadius: radius.card }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-extrabold text-[var(--ui-text-primary)] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[var(--color-accent-text)]" />
              Armado automático listo para imprimir
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-[var(--color-status-success-muted)] text-[var(--color-status-success-text)] font-bold text-[10px] uppercase">
              Directo
            </span>
          </div>

          {options.mode === 'fotocopia' && orientationSummary && (
            <p className="text-[11px] font-semibold text-[var(--color-status-success-text)] bg-[var(--color-status-success-muted)] px-2.5 py-1.5 rounded-lg border border-[var(--color-status-success-base)]/30">
              ✓ {orientationSummary}
            </p>
          )}

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-[var(--ui-bg-card)] border border-[var(--ui-border)]" style={{ borderRadius: radius.control }}>
              <span className="text-[9px] font-semibold text-[var(--ui-text-secondary)] block uppercase">Págs. PDF</span>
              <span className="text-base font-bold text-[var(--ui-text-primary)]">{pdfPageCount}</span>
            </div>
            <div className="p-2 bg-[var(--ui-bg-card)] border border-[var(--ui-border)]" style={{ borderRadius: radius.control }}>
              <span className="text-[9px] font-semibold text-[var(--ui-text-secondary)] block uppercase">Págs. Libro</span>
              <span className="text-base font-bold text-[var(--color-secondary-bright)]">{finalPageCount}</span>
            </div>
            <div className="p-2 bg-[var(--ui-bg-card)] border border-[var(--ui-border)]" style={{ borderRadius: radius.control }}>
              <span className="text-[9px] font-semibold text-[var(--ui-text-secondary)] block uppercase">Hojas a imprimir</span>
              <span className="text-base font-bold text-[var(--color-secondary-bright)]">{totalSheetsToPrint}</span>
            </div>
          </div>

          {isExportingAuto ? (
            <div className="p-3 bg-[var(--ui-bg-card)] border border-[var(--ui-border)] text-center space-y-2" style={{ borderRadius: radius.control }}>
              <p className="text-xs font-bold text-[var(--ui-text-primary)]">{exportStatusMsg || t.bookStudio.previewExportStep.generatingPdf}</p>
              <div className="w-full bg-[var(--ui-bg-surface)] h-2 rounded-full overflow-hidden border border-[var(--ui-border)]">
                <div
                  className="bg-[var(--color-accent-base)] h-full transition-all duration-300"
                  style={{ width: `${exportProgressPct}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => void handleStartAutoExport()}
                disabled={isGating}
                className={`w-full py-3 px-4 font-bold text-xs bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] hover:opacity-90 disabled:opacity-50 transition flex items-center justify-center gap-2 cursor-pointer ${elevationSystem.floating}`}
                style={{ borderRadius: radius.control }}
              >
                <Printer className="w-4 h-4" />
                <span>
                  {isGating
                    ? t.bookStudio.previewExportStep.verifyingCredits
                    : t.bookStudio.previewExportStep.downloadPrints.replace('{sheets}', String(totalSheetsToPrint))}
                </span>
              </button>

              {autoPdfBlobUrl && (
                <a
                  href={autoPdfBlobUrl}
                  download={`${selectedFile.name.replace(/\.(pdf|zip)$/i, '')}_IMPRESION_LIBRO${autoOutputIsZip ? '.zip' : '.pdf'}`}
                  className="w-full py-2 px-4 text-xs font-bold border border-[var(--color-accent-text)] text-[var(--color-accent-text)] flex items-center justify-center gap-1.5"
                  style={{ borderRadius: radius.control }}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t.bookStudio.previewExportStep.downloadAgain}</span>
                </a>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setOptions((prev) => ({ ...prev, workflowMode: 'guided' }));
              onNextStep?.();
            }}
            className="w-full text-center text-[11px] font-bold text-[var(--color-accent-text)] hover:underline cursor-pointer pt-1"
          >
            Quiero agregar tapa, separadores o calibrar número (Modo Guiado) →
          </button>
        </div>
      )}

      {/* Navegación siguiente (solo visible en Modo Guiado) */}
      {!isAutoMode && onNextStep && (
        <div className="pt-4 border-t border-[var(--ui-border)] flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs text-[var(--ui-text-secondary)] font-medium text-center sm:text-left">
            {selectedFile
              ? options.mode === 'fotocopia'
                ? t.bookStudio.sourceStep.readyForOrganize
                : t.bookStudio.sourceStep.readyForCover
              : options.mode === 'fotocopia'
              ? t.bookStudio.sourceStep.nextStepOrganize
              : t.bookStudio.sourceStep.nextStepCover}
          </span>
          <button
            type="button"
            onClick={onNextStep}
            className={`${button.base} ${button.primary} flex items-center justify-center gap-1.5 w-full sm:w-auto`}
          >
            <span>{options.mode === 'fotocopia' ? t.bookStudio.sourceStep.nextStepOrganize : t.bookStudio.sourceStep.nextStepCover}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <PdfCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onConfirm={() => {
          setIsCheckoutOpen(false);
          void handleStartAutoExport();
        }}
      />
    </div>
  );
};
