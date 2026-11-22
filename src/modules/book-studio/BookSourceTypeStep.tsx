import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, Copy, Upload, CheckCircle2, ChevronRight, FileText, Home, Printer } from 'lucide-react';
import { BookImpositionOptions } from './domain/impositionEngine';
import {
  BOOK_PAPER_SPECS,
  BOOK_PRINT_PROFILES,
  BookPaperSizeId,
  clearBookFieldManual,
  inferBookPrintTarget,
  markBookFieldManual,
} from './domain/bookPrintProfileEngine';
import { isManuallyOverridden } from '../../shared/core/presets/configCascadeEngine';
import { ManualOverrideBadge } from '../../shared/core/ui/ManualOverrideBadge';
import { PdfSourceErrorCode, isPdfSourceError, isPdfLikeFile } from '../../shared/core/pdf-engine/pdfSourceClassifier';
import { bookAssetManager, markNativePickerFailedSession, isNativePickerFailedSession } from './domain/bookAssetManager';
import { button, selectableCard, radius } from '../../shared/core/uiDesignSystem';
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
      // 'password' no se muestra acá: el contenedor despliega el cuadro inline
      // de contraseña (challenge) con su propio aviso y reintento.
      if (isPdfSourceError(err)) {
        if (err.code !== 'password') setErrorMsg(PDF_SOURCE_ERROR_TEXT[err.code]);
      } else {
        setErrorMsg(t.bookStudio.sourceStep.errorUnknown);
      }
    } finally {
      setIsLoadingFile(false);
    }
  };

  // Ref a la última versión de handleFileChange: las funciones que se exponen
  // hacia afuera (pickerRef, onClick de la tarjeta) no quedan atadas a un
  // closure viejo de cada render.
  const handleFileChangeRef = useRef(handleFileChange);
  useEffect(() => {
    handleFileChangeRef.current = handleFileChange;
  });

  // Un solo punto de decisión: selector nativo si el navegador lo permite y
  // el entorno no es un iframe cross-origin. Sin fallback JS después de un
  // await: si el selector nativo no se puede usar o falló en esta sesión, la
  // tarjeta es un <label htmlFor> nativo que abre el diálogo directamente.
  const canUseNativePicker = !nativePickerFailed && bookAssetManager.canUseNativeFilePicker();
  const triggerPick = async () => {
    setErrorMsg(null);
    if (!canUseNativePicker) return; // el <label> nativo abre el diálogo
    const result = await bookAssetManager.pickSourcePdf(bookId);
    if (result.status === 'picked') {
      await handleFileChangeRef.current(result.file);
    } else if (result.status === 'fallback-required') {
      // Recordar el fallo en la sesión: la tarjeta cae al <label> nativo.
      markNativePickerFailedSession();
      setNativePickerFailed(true);
    }
    // 'cancelled' = el usuario cerró el diálogo: no hay nada que hacer.
  };

  // Expone al contenedor el "elegir PDF" (con fallback) para "Cargar PDF Ahora".
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

  // Clases y contenido compartidos por las dos variantes de tarjeta
  // (<div role="button"> con selector nativo, o <label> nativo).
  const dropZoneClassName = `relative border-2 border-dashed rounded-[${radius.card}] p-3 text-center transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-base)] ${
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
          <Upload className="w-4.5 h-4.5 shrink-0" />
          <span className="text-xs font-bold text-[var(--ui-text-primary)]">
            {t.bookStudio.sourceStep.dragDropLabel}
          </span>
        </div>
      )}
    </>
  );

  return (
    <div className="space-y-6 text-[var(--ui-text-primary)]">
      {/* 1. Selección de Modo de Documento */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-[var(--ui-text-primary)] block">
          {t.bookStudio.sourceStep.modeQuestionLabel}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div
            onClick={() => setOptions((prev) => ({ ...prev, mode: 'normal' }))}
            className={`${selectableCard.base} ${
              options.mode !== 'fotocopia' ? selectableCard.selected : selectableCard.unselected
            } p-4 flex items-start space-x-3`}
          >
            <input
              type="radio"
              name="bookMode"
              checked={options.mode !== 'fotocopia'}
              onChange={() => {}}
              className="mt-1 text-[var(--color-accent-text)] cursor-pointer"
            />
            <div className="space-y-1">
              <span className="font-bold block text-sm text-[var(--ui-text-primary)] flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[var(--color-accent-text)] shrink-0" />
                {t.bookStudio.sourceStep.modeStandardTitle}
              </span>
              <span className="text-xs text-[var(--ui-text-secondary)] block leading-normal">
                {t.bookStudio.sourceStep.modeStandardDesc}
              </span>
            </div>
          </div>

          <div
            onClick={() => setOptions((prev) => ({ ...prev, mode: 'fotocopia' }))}
            className={`${selectableCard.base} ${
              options.mode === 'fotocopia' ? selectableCard.selected : selectableCard.unselected
            } p-4 flex items-start space-x-3`}
          >
            <input
              type="radio"
              name="bookMode"
              checked={options.mode === 'fotocopia'}
              onChange={() => {}}
              className="mt-1 text-[var(--color-accent-text)] cursor-pointer"
            />
            <div className="space-y-1">
              <span className="font-bold block text-sm text-[var(--ui-text-primary)] flex items-center gap-2">
                <Copy className="w-4 h-4 text-[var(--color-accent-text)] shrink-0" />
                {t.bookStudio.sourceStep.modeFotocopiaTitle}
              </span>
              <span className="text-xs text-[var(--ui-text-secondary)] block leading-normal">
                {t.bookStudio.sourceStep.modeFotocopiaDesc}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Selección de hoja según perfil global (En casa vs Imprenta) */}
      {(() => {
        const activeTarget = inferBookPrintTarget(options);
        const profile = BOOK_PRINT_PROFILES[activeTarget];
        const currentPaper: BookPaperSizeId = (options.paperSize || profile.defaults.paperSize) as BookPaperSizeId;
        const paperList: BookPaperSizeId[] = profile.allowedPaperSizes.includes(currentPaper)
          ? profile.allowedPaperSizes
          : [currentPaper, ...profile.allowedPaperSizes];
        const paperIsManual = isManuallyOverridden(options.manualOverrides, 'paperSize');
        const paperConflict = !profile.allowedPaperSizes.includes(currentPaper);
        const TargetIcon = activeTarget === 'home' ? Home : Printer;

        return (
          <div className="space-y-2.5 pt-2 border-t border-[var(--ui-border)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <label className="text-xs font-bold text-[var(--ui-text-primary)] block">
                  {t.bookStudio.sourceStep.paperSizeQuestionLabel}
                </label>
                <ManualOverrideBadge
                  isOverridden={paperIsManual}
                  globalLabel={profile.shortName}
                  hasConflict={paperConflict}
                  conflictHelpText={`Esta hoja se mantuvo manual cuando cambiaste el destino a "${profile.shortName}".`}
                  onReset={() => setOptions((prev) => clearBookFieldManual(prev, 'paperSize'))}
                />
              </div>

              {onOpenPrintTargetModal && (
                <button
                  type="button"
                  onClick={onOpenPrintTargetModal}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[var(--ui-border)] bg-[var(--ui-bg-surface)] hover:border-[var(--color-accent-base)] text-[11px] font-semibold text-[var(--ui-text-primary)] cursor-pointer transition-colors`}
                >
                  <TargetIcon className="w-3.5 h-3.5 text-[var(--color-accent-text)]" />
                  <span>{activeTarget === 'home' ? t.bookStudio.sourceStep.paperProfileBadgeHome : t.bookStudio.sourceStep.paperProfileBadgePrintShop}</span>
                  <span className="text-[var(--color-accent-text)] underline">{t.bookStudio.sourceStep.paperProfileSwitchHint}</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {paperList.map((paperId) => {
                const spec = BOOK_PAPER_SPECS[paperId] || BOOK_PAPER_SPECS.A4;
                const isSelected = currentPaper === paperId;
                return (
                  <button
                    key={paperId}
                    type="button"
                    onClick={() =>
                      setOptions((prev) => {
                        const updated = { ...prev, paperSize: paperId };
                        return paperId === profile.defaults.paperSize
                          ? clearBookFieldManual(updated, 'paperSize')
                          : markBookFieldManual(updated, 'paperSize');
                      })
                    }
                    aria-pressed={isSelected}
                    className={`${selectableCard.base} ${
                      isSelected ? selectableCard.selected : selectableCard.unselected
                    } p-3.5 flex items-start space-x-3 text-left cursor-pointer`}
                  >
                    <FileText className="w-4 h-4 text-[var(--color-accent-text)] shrink-0 mt-0.5" />
                    <div className="space-y-0.5 min-w-0">
                      <span className="font-bold block text-xs sm:text-sm text-[var(--ui-text-primary)]">
                        {spec.shortTitle}{' '}
                        <span className="font-medium text-[var(--ui-text-secondary)] text-[11px]">
                          {spec.technicalParen}
                        </span>
                      </span>
                      <span className="text-[11px] text-[var(--ui-text-secondary)] block leading-snug">
                        {spec.usageSubtitle}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* 3. Carga de Archivo PDF */}
      <div className="pt-2 border-t border-[var(--ui-border)] space-y-2">
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
          >
            {dropZoneInner}
          </div>
        ) : (
          /* Sin selector nativo utilizable: <label> que abre el diálogo sin JS. */
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
          >
            {dropZoneInner}
          </label>
        )}

        <p className="text-[10px] text-[var(--ui-text-secondary)] text-center leading-snug">
          {t.bookStudio.sourceStep.pdfPolicyNote}
        </p>

        {errorMsg && (
          <div className={`p-2.5 bg-[var(--color-status-danger-muted)] border border-[var(--color-status-danger-base)]/30 rounded-[${radius.control}] text-[var(--color-status-danger-text)] text-xs font-medium text-center`}>
            {errorMsg}
          </div>
        )}
      </div>

      {/* 4. Barra Inferior de Navegación Responsive */}
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

