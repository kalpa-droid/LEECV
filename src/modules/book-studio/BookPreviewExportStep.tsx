import React, { useState } from 'react';
import { BookOpen, CheckCircle2, AlertTriangle, Printer, Sparkles, Download, AlertCircle, ChevronLeft, FileText, Layers, Languages } from 'lucide-react';
import { BookImpositionOptions, processBookImposition } from '../../shared/core/book-engine/impositionEngine';
import { calculateFinalBookPageCount, effectiveSourcePageCount, hasCustomCoverConfig } from '../../shared/core/book-engine/bookPageCount';
import { calculateSpineWidth, calculateCreepOffset, planBookletSignatures } from '../../shared/core/book-engine/impositionPlanner';
import { radius, elevationSystem } from '../../shared/core/uiDesignSystem';
import { useText } from '../../shared/i18n/useText';

import { useExportEntitlement } from '../../shared/core/entitlements/useExportEntitlement';
import PdfCheckoutModal from '../cv-builder/components/modals/PdfCheckoutModal';

interface BookPreviewExportStepProps {
  options: BookImpositionOptions;
  selectedFile: File | null;
  pdfPageCount: number;
  onPrevStep?: () => void;
  /** Resuelve refs de assets locales ('asset:...') a URLs cargables por Canvas. */
  assetResolver?: (ref: string) => Promise<string | null>;
  /** Necesario para editar el perfil de impresora casera desde este paso. */
  setOptions?: React.Dispatch<React.SetStateAction<BookImpositionOptions>>;
  /** Contraseña de apertura del PDF origen (protegido): solo memoria de sesión, JAMÁS se persiste. */
  pdfPassword?: string | null;
  /** El PDF origen está protegido contra edición: la salida automática es imágenes de alta nitidez. */
  sourceProtected?: boolean;
}

export const BookPreviewExportStep: React.FC<BookPreviewExportStepProps> = ({
  options,
  selectedFile,
  pdfPageCount,
  onPrevStep,
  assetResolver,
  setOptions,
  pdfPassword,
  sourceProtected = false,
}) => {
  const t = useText();
  const { consumeCreditIfNeeded, loading: isGating } = useExportEntitlement();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [lastOutputIsZip, setLastOutputIsZip] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!selectedFile) {
    return (
      <div className="space-y-4 text-center py-12">
        <div className={`p-4 bg-[var(--color-accent-light)]/20 rounded-full text-[var(--color-accent-base)] w-16 h-16 mx-auto flex items-center justify-center`}>
          <Printer className="w-8 h-8" />
        </div>
        <div className="space-y-1 max-w-sm mx-auto">
          <h3 className="text-base font-bold text-[var(--ui-text-primary)]">{t.bookStudio.previewExportStep.emptyTitle}</h3>
          <p className="text-xs text-[var(--ui-text-secondary)]">
            {t.bookStudio.previewExportStep.emptyDescription}
          </p>
        </div>
      </div>
    );
  }

  const hasCover = options.hasCover || (options.customCover && options.customCover.type !== 'none');
  const hasBackCover = options.hasBackCover || (options.customBackCover && options.customBackCover.type !== 'none');

  const finalPageCount = calculateFinalBookPageCount({
    sourcePageCount: effectiveSourcePageCount(pdfPageCount, options.deletedPages, options.pageOrder),
    hasSourceCover: options.hasCover,
    hasCustomCover: hasCustomCoverConfig(options.customCover),
    hasCustomBackCover: hasCustomCoverConfig(options.customBackCover),
    hasSourceBackCover: options.hasBackCover,
    blankBehindCover: options.blankBehindCover,
    blankInFrontBackCover: options.blankInFrontBackCover,
    separateCover:
      (options.destination ?? 'A') !== 'A' &&
      (hasCustomCoverConfig(options.customCover) || hasCustomCoverConfig(options.customBackCover)),
    refPdfPage: options.refPdfPage,
    refBookPage: options.refBookPage,
    refPageSide: options.refPageSide,
  });

  const totalSheetsToPrint = finalPageCount / 2;

  // Resumen pre-impresión: derivaciones en texto sencillo (zonas técnicas entre paréntesis).
  const readingDirection = options.readingDirection ?? 'ltr';
  const unprintableMarginMm = options.unprintableMarginMm ?? 5;
  const homePrinter = unprintableMarginMm > 0;
  const isA3 = options.paperSize === 'A3';
  const isNormalMode = options.mode !== 'fotocopia';
  const spineWidthMm = calculateSpineWidth(finalPageCount, { paperThicknessMm: options.paperThicknessMm ?? 0 });
  const sheetsInSignature = Math.max(1, Math.floor(finalPageCount / 4));
  const creepMaxMm = options.applyCreep !== false
    ? calculateCreepOffset(0, sheetsInSignature, options.paperThicknessMm ?? 0)
    : 0;
  const zipPlan =
    options.zipByBooklet && (options.destination ?? 'A') === 'A' && isNormalMode
      ? planBookletSignatures(finalPageCount, 'multi-balanced', 4)
      : null;
  const multiSigs = zipPlan && zipPlan.signatures.length > 1 ? zipPlan.signatures : null;
  const destinationLabel =
    (options.destination ?? 'A') === 'A'
      ? t.bookStudio.previewExportStep.destinationA
      : (options.destination ?? 'A') === 'B'
        ? t.bookStudio.previewExportStep.destinationB
        : t.bookStudio.previewExportStep.destinationC;

  const handleDownloadOriginal = () => {
    if (!selectedFile) return;
    const url = URL.createObjectURL(selectedFile);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleStartExport = async () => {
    const allowed = await consumeCreditIfNeeded();
    if (!allowed) {
      setErrorMsg(t.bookStudio.previewExportStep.insufficientCredits);
      setIsCheckoutOpen(true);
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMsg(null);
      setPdfBlobUrl(null);

      const pdfBytes = await processBookImposition(selectedFile, {
        ...options,
        assetResolver,
        onProgress: (msg, pct) => {
          setStatusMessage(msg);
          setProgressPercent(pct);
        },
      }, pdfPassword);

      // El motor devuelve PDF normalmente; devuelve un ZIP cuando el usuario
      // pide un PDF por cuadernillo o la cubierta aparte (destinos B/C).
      const isZip = pdfBytes[0] === 0x50 && pdfBytes[1] === 0x4b;
      setLastOutputIsZip(isZip);

      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: isZip ? 'application/zip' : 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPdfBlobUrl(url);

      // Disparar descarga automática
      const a = document.createElement('a');
      a.href = url;
      const cleanName = selectedFile.name.replace(/\.(pdf|zip)$/i, '');
      a.download = `${cleanName}_IMPRESION_LIBRO${isZip ? '.zip' : '.pdf'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setIsProcessing(false);
    } catch (err) {
      console.error('Error al generar el libro imposicionado:', err);
      setErrorMsg(err instanceof Error ? err.message : t.bookStudio.previewExportStep.exportFailed);
      setIsProcessing(false);
    }
  };

  return (
    <div dir={readingDirection === 'rtl' ? 'rtl' : 'ltr'} className="space-y-6 text-[var(--ui-text-primary)]">
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-[var(--ui-text-primary)] flex items-center gap-2">
          <Printer className="w-5 h-5 text-[var(--color-accent-text)]" />
          <span>{t.bookStudio.previewExportStep.title}</span>
        </h2>
        <p className="text-xs text-[var(--ui-text-secondary)]">
          {t.bookStudio.previewExportStep.description}
        </p>
      </div>

      {sourceProtected && (
        <div className={`p-3 bg-[var(--color-accent-light)]/20 border border-[var(--color-accent-base)]/30 rounded-[${radius.control}]`}>
          <p className="text-xs font-semibold text-[var(--color-accent-text)]">
            {t.bookStudio.previewExportStep.protectionNotice}
          </p>
        </div>
      )}

      {/* Tarjeta Informativa Principal */}
      <div className={`p-5 rounded-[${radius.card}] bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] space-y-4 ${elevationSystem.raised}`}>
        <div className="flex items-center justify-between border-b border-[var(--ui-border)] pb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 bg-[var(--color-accent-light)]/20 rounded-[${radius.control}] text-[var(--color-accent-text)]`}>
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--ui-text-primary)]">{selectedFile.name}</h3>
              <p className="text-xs text-[var(--ui-text-secondary)]">
                {t.bookStudio.previewExportStep.modeSummaryLine
                  .replace('{mode}', options.mode === 'fotocopia' ? t.bookStudio.previewExportStep.modeFotocopiaShort : t.bookStudio.previewExportStep.modeStandardShort)
                  .replace('{where}', options.paperSize === 'A3' ? t.bookStudio.previewExportStep.printAtImprenta : t.bookStudio.previewExportStep.printAtHome)}
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-[var(--color-accent-light)]/20 text-[var(--color-accent-text)] font-bold text-[10px] uppercase">
            {t.bookStudio.previewExportStep.readyBadge}
          </span>
        </div>

        {/* Grilla de Métricas de Imprenta */}
        <div className="grid grid-cols-3 gap-3">
          <div className={`p-3 rounded-[${radius.control}] bg-[var(--ui-bg-card)] border border-[var(--ui-border)]`}>
            <span className="text-[10px] font-semibold text-[var(--ui-text-secondary)] block uppercase">
              {t.bookStudio.previewExportStep.metricPdfPages}
            </span>
            <span className="text-xl font-bold text-[var(--ui-text-primary)] mt-0.5 block">
              {pdfPageCount}
            </span>
          </div>

          <div className={`p-3 rounded-[${radius.control}] bg-[var(--ui-bg-card)] border border-[var(--ui-border)]`}>
            <span className="text-[10px] font-semibold text-[var(--ui-text-secondary)] block uppercase">
              {t.bookStudio.previewExportStep.metricBookPages}
            </span>
            <span className="text-xl font-bold text-[var(--color-secondary-bright)] mt-0.5 block">
              {finalPageCount}
            </span>
          </div>

          <div className={`p-3 rounded-[${radius.control}] bg-[var(--ui-bg-card)] border border-[var(--ui-border)]`}>
            <span className="text-[10px] font-semibold text-[var(--ui-text-secondary)] block uppercase">
              {t.bookStudio.previewExportStep.metricSheets}
            </span>
            <span className="text-xl font-bold text-[var(--color-secondary-bright)] mt-0.5 block">
              {totalSheetsToPrint} <span className="text-xs font-normal text-[var(--ui-text-secondary)]">{t.bookStudio.previewExportStep.sheetsUnit}</span>
            </span>
          </div>
        </div>

        {/* Detalle de Tapas */}
        <div className="space-y-1.5 pt-1 text-xs">
          <div className="flex items-center gap-2 text-[var(--ui-text-primary)]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-secondary-bright)] shrink-0" />
            <span>{t.bookStudio.previewExportStep.coverRowLabel} <strong>{hasCover ? (options.customCover ? t.bookStudio.previewExportStep.coverCustomPreset : t.bookStudio.previewExportStep.sourceCoverPage) : t.bookStudio.previewExportStep.noCover}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-[var(--ui-text-primary)]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-secondary-bright)] shrink-0" />
            <span>{t.bookStudio.previewExportStep.backCoverRowLabel} <strong>{hasBackCover ? (options.customBackCover ? t.bookStudio.previewExportStep.backCoverCustom : t.bookStudio.previewExportStep.sourceBackCoverPage) : t.bookStudio.previewExportStep.noBackCover}</strong></span>
          </div>
        </div>

        {/* Resumen de armado (antes de descargar) */}
        <div className="space-y-1.5 pt-2 border-t border-[var(--ui-border)] text-xs">
          <div className="flex items-center gap-2 text-[var(--ui-text-primary)]">
            <Languages className="w-3.5 h-3.5 text-[var(--ui-text-secondary)] shrink-0" />
            <span>{t.bookStudio.previewExportStep.readingDirectionRow} <strong>{readingDirection === 'rtl' ? t.bookStudio.previewExportStep.rtlValue : t.bookStudio.previewExportStep.ltrValue}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-[var(--ui-text-primary)]">
            <FileText className="w-3.5 h-3.5 text-[var(--ui-text-secondary)] shrink-0" />
            <span>{t.bookStudio.previewExportStep.destinationRowLabel} <strong>{destinationLabel}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-[var(--ui-text-primary)]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--ui-text-secondary)] shrink-0" />
            <span>{t.bookStudio.previewExportStep.spineRowLabel} <strong>{spineWidthMm.toFixed(1)} mm{spineWidthMm === 0 ? t.bookStudio.previewExportStep.spineNoThickness : ''}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-[var(--ui-text-primary)]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--ui-text-secondary)] shrink-0" />
            <span>{t.bookStudio.previewExportStep.creepRowLabel} <strong>{creepMaxMm > 0 ? t.bookStudio.previewExportStep.creepUpTo.replace('{max}', creepMaxMm.toFixed(1)) : t.bookStudio.previewExportStep.creepNotApply}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-[var(--ui-text-primary)]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--ui-text-secondary)] shrink-0" />
            <span>{t.bookStudio.previewExportStep.guidesRowLabel} <strong>{options.showGuides ? t.bookStudio.previewExportStep.guidesYes : t.bookStudio.previewExportStep.guidesNo}</strong></span>
          </div>
          {multiSigs && (
            <div className="flex items-center gap-2 text-[var(--ui-text-primary)]">
              <Layers className="w-3.5 h-3.5 text-[var(--ui-text-secondary)] shrink-0" />
              <span>{t.bookStudio.previewExportStep.zipPartsLead}<strong>{t.bookStudio.previewExportStep.zipPartsCount.replace('{count}', String(multiSigs.length))}</strong>: {multiSigs.join(' + ')}{t.bookStudio.previewExportStep.zipPagesJoin}</span>
            </div>
          )}
        </div>

        {/* Perfil de impresora casera (aplicable solo al papel grande de casa: A4) */}
        {!isA3 && setOptions && (
          <div className="space-y-2 pt-2 border-t border-[var(--ui-border)]">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={homePrinter}
                onChange={(e) => setOptions((prev) => ({ ...prev, unprintableMarginMm: e.target.checked ? 5 : 0 }))}
                className="h-4 w-4 accent-[var(--color-accent-base)]"
              />
              <span className="text-xs font-bold text-[var(--ui-text-primary)]">{t.bookStudio.previewExportStep.homePrinterNoBorders}</span>
            </label>
            {homePrinter && (
              <label className="flex flex-wrap items-center gap-2 text-xs text-[var(--ui-text-secondary)]">
                <span>{t.bookStudio.previewExportStep.homePrinterMinMargin}</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  step={0.5}
                  value={unprintableMarginMm}
                  onChange={(e) => setOptions((prev) => ({ ...prev, unprintableMarginMm: Number(e.target.value) || 5 }))}
                  className="w-20 px-2 py-1 rounded-[var(--radius-control,8px)] border border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-[var(--ui-text-primary)]"
                />
              </label>
            )}
            <p className="text-[11px] text-[var(--ui-text-secondary)]">
              {homePrinter
                ? t.bookStudio.previewExportStep.homePrinterShrinks.replace('{mm}', String(unprintableMarginMm))
                : t.bookStudio.previewExportStep.homePrinterToEdge}
            </p>
          </div>
        )}

        {/* Aviso de Imprenta */}
        <div className={`p-3 bg-[var(--color-status-warning-muted)] border border-[var(--color-status-warning-base)]/30 rounded-[${radius.control}] flex items-start gap-2 text-xs text-[var(--color-status-warning-text)]`}>
          <AlertTriangle className="w-4 h-4 text-[var(--color-status-warning-text)] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">{t.bookStudio.previewExportStep.printFoldHeading}</span>
            <span className="text-[11px] opacity-90 block">
              {t.bookStudio.previewExportStep.printFoldHint}
            </span>
          </div>
        </div>
      </div>

      {/* Estado de Procesamiento o Botón de Exportar */}
      {isProcessing ? (
        <div className={`p-6 rounded-[${radius.card}] bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] text-center space-y-4`}>
          <div className="w-8 h-8 border-3 border-[var(--color-accent-base)] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-[var(--ui-text-primary)]">{t.bookStudio.previewExportStep.generatingPdf}</p>
            <p className="text-xs text-[var(--ui-text-secondary)]">{statusMessage}</p>
          </div>
          <div className="w-full bg-[var(--ui-bg-card)] h-2 rounded-full overflow-hidden border border-[var(--ui-border)]">
            <div
              className="bg-[var(--color-accent-base)] h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      ) : errorMsg ? (
        <div className={`p-4 bg-[var(--color-status-danger-muted)] border border-[var(--color-status-danger-base)]/30 rounded-[${radius.card}] space-y-3 text-center`}>
          <AlertCircle className="w-8 h-8 text-[var(--color-status-danger-text)] mx-auto" />
          <p className="text-xs font-medium text-[var(--color-status-danger-text)]">{errorMsg}</p>
          <button
            type="button"
            onClick={handleStartExport}
            className={`px-4 py-2 text-xs font-bold bg-[var(--color-status-danger-muted)] text-[var(--color-status-danger-text)] border border-[var(--color-status-danger-base)]/40 rounded-[${radius.control}]`}
          >
            {t.bookStudio.previewExportStep.retryExport}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleStartExport}
            disabled={isGating}
            className={`w-full py-3.5 px-6 rounded-[${radius.control}] font-bold text-sm bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] hover:opacity-90 disabled:opacity-50 transition flex items-center justify-center gap-2 ${elevationSystem.floating}`}
          >
            <Printer className="w-4 h-4" />
            <span>{isGating ? t.bookStudio.previewExportStep.verifyingCredits : t.bookStudio.previewExportStep.downloadPrints.replace('{sheets}', String(totalSheetsToPrint))}</span>
            <Sparkles className="w-4 h-4" />
          </button>

          {isNormalMode && (
            <button
              type="button"
              onClick={handleDownloadOriginal}
              className={`w-full py-2.5 px-4 rounded-[${radius.control}] text-xs font-bold border border-[var(--ui-border)] text-[var(--ui-text-secondary)] hover:text-[var(--ui-text-primary)] hover:bg-[var(--ui-bg-card)] transition flex items-center justify-center gap-2`}
            >
              <Download className="w-4 h-4" />
              <span>{t.bookStudio.previewExportStep.downloadOriginal}</span>
            </button>
          )}

          {pdfBlobUrl && (
            <div className="flex gap-2">
              <a
                href={pdfBlobUrl}
                download={`${selectedFile.name.replace(/\.(pdf|zip)$/i, '')}_IMPRESION_LIBRO${lastOutputIsZip ? '.zip' : '.pdf'}`}
                className={`flex-1 py-2 px-4 rounded-[${radius.control}] text-xs font-bold border border-[var(--color-accent-text)] text-[var(--color-accent-text)] flex items-center justify-center gap-1.5`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t.bookStudio.previewExportStep.downloadAgain}</span>
              </a>
            </div>
          )}
        </div>
      )}

      {/* Navegación Bidireccional */}
      {onPrevStep && (
        <div className="pt-4 border-t border-[var(--ui-border)] flex justify-start">
          <button
            type="button"
            onClick={onPrevStep}
            className={`py-2 px-4 rounded-[${radius.control}] bg-[var(--ui-bg-card)] border border-[var(--ui-border)] hover:border-[var(--color-accent-base)] text-xs font-bold text-[var(--ui-text-secondary)] hover:text-[var(--ui-text-primary)] transition flex items-center gap-1.5 cursor-pointer`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>{t.bookStudio.backStep}</span>
          </button>
        </div>
      )}

      <PdfCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onConfirm={() => {
          setIsCheckoutOpen(false);
          handleStartExport();
        }}
      />
    </div>
  );
};

