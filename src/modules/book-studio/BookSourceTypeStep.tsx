import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, Copy, Upload, CheckCircle2, ChevronRight, FileText, Settings2 } from 'lucide-react';
import { BookImpositionOptions } from './domain/impositionEngine';
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
import { button, radius } from '../../shared/core/uiDesignSystem';
import { useText } from '../../shared/i18n/useText';

interface BookSourceTypeStepProps {
  options: BookImpositionOptions;
  setOptions: React.Dispatch<React.SetStateAction<BookImpositionOptions>>;
  selectedFile: File | null;
  pdfPageCount: number;
  /** Carga el PDF completo (instancia pdf.js única en el contenedor). Lanza si no se puede abrir. El retorno (el doc cargado) es opcional para el llamador. */
  onFileConfirmed: (file: File) => Promise<unknown>;
  onNextStep?: () => void;
  /** Abre el selector global de impresora en casa vs imprenta. */
  onOpenPrintTargetModal?: () => void;
  /** Abre el selector global de hoja donde imprimir. */
  onOpenPaperModal?: () => void;
  /** Expone el "elegir PDF" (con fallback a input) al contenedor (botón externo). */
  pickerRef?: React.MutableRefObject<(() => Promise<void>) | null>;
  /** Libro activo: el handle del PDF se guarda asociado a este id (con fallback a la clave global). */
  bookId?: string;
}

export const BookSourceTypeStep: React.FC<BookSourceTypeStepProps> = ({
  options,
  setOptions,
  selectedFile,
  pdfPageCount,
  onFileConfirmed,
  onNextStep,
  onOpenPrintTargetModal,
  onOpenPaperModal,
  pickerRef,
  bookId,
}) => {
  const t = useText();
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Si el selector nativo falló en esta sesión, la tarjeta pasa a <label>
  // nativo (un clic = un diálogo garantizado, sin JS).
  const [nativePickerFailed, setNativePickerFailed] = useState(() => isNativePickerFailedSession());

  /** Texto visible por código tipado (pdfSourceClassifier): cada PDF problemático con SU aviso. */
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

  const activeTarget = inferBookPrintTarget(options);
  const profile = BOOK_PRINT_PROFILES[activeTarget];
  const paperSpec = resolveBookPaperSpec(options.paperSize);
  const overrideCount = countManualOverrides(options.manualOverrides);

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
      {/* 1.a. Formato del PDF de origen */}
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
                body: 'Cada hoja se corta al medio automáticamente para separar dos páginas.',
              });
            }}
          />
        </ActionGrid>
      </PanelSection>

      {/* Resumen compacto de las 2 píldoras globales (sin duplicar selectores en el panel) */}
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

      {/* 1.b. Archivo PDF a cargar */}
      <PanelSection
        icon={<Upload className="w-4 h-4" />}
        title="1.b. Cargar archivo"
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

      {/* Navegación siguiente */}
      {onNextStep && (
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
    </div>
  );
};
