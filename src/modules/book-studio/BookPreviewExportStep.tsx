import React, { useState } from 'react';
import { BookOpen, CheckCircle2, Printer, Sparkles, Download, AlertCircle, ChevronLeft, FileText, Layers, Languages } from 'lucide-react';
import { BookImpositionOptions, processBookImposition, resolveSeparateCoverPlan } from './domain/impositionEngine';
import {
  BOOK_PRINT_PROFILES,
  clearBookFieldManual,
  inferBookPrintTarget,
  markBookFieldManual,
  resolveBookPaperSpec,
} from './domain/bookPrintProfileEngine';
import { isManuallyOverridden } from '../../shared/core/presets/configCascadeEngine';
import { PanelSection } from '../../shared/core/ui/PanelSection';
import { ContextualGuideBox } from '../../shared/core/ui/ContextualGuideBox';
import { SectionSwitch } from '../../shared/core/ui/SectionSwitch';
import { LidioHelpTrigger } from '../../shared/core/ui/LidioHelpTrigger';
import { ManualOverrideBadge } from '../../shared/core/ui/ManualOverrideBadge';
import { emitLidioMessage } from '../../shared/core/assistant/lidioBus';
import { calculateSpineWidth, calculateCreepOffset, planBookletSignatures } from '../../shared/kits/print-imposition/impositionPlanner';
import { computeBookPageBreakdown } from './domain/bookPageCount';
import { radius, elevationSystem } from '../../shared/core/uiDesignSystem';
import { useText } from '../../shared/i18n/useText';

import { useExportEntitlement } from '../../shared/core/entitlements/useExportEntitlement';
import PdfCheckoutModal from '../../shared/core/studio-host/PdfCheckoutModal';

interface BookPreviewExportStepProps {
  options: BookImpositionOptions;
  selectedFile: File | null;
  pdfPageCount: number;
  onPrevStep?: () => void;
  assetResolver?: (ref: string) => Promise<string | null>;
  setOptions?: React.Dispatch<React.SetStateAction<BookImpositionOptions>>;
  pdfPassword?: string | null;
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
  const { consumeCreditIfNeeded, loading: isGating } = useExportEntitlement('book');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [lastOutputIsZip, setLastOutputIsZip] = useState(false);
  const [lastExportSignature, setLastExportSignature] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!selectedFile) {
    return (
      <div className="space-y-4 text-center py-12">
        <div className="p-4 bg-[var(--color-accent-light)]/20 rounded-full text-[var(--color-accent-base)] w-16 h-16 mx-auto flex items-center justify-center">
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

  const breakdown = computeBookPageBreakdown(options, pdfPageCount);
  const separatePlan = resolveSeparateCoverPlan(options, breakdown.activePdfPages);
  const finalPageCount = breakdown.totalBookPages;
  const totalSheetsToPrint = breakdown.totalSheetsToPrint;

  const hasCover =
    options.hasCover ||
    Boolean(options.customCover && options.customCover.type !== 'none') ||
    separatePlan.frontSource === 'pdf-first';
  const hasBackCover =
    options.hasBackCover ||
    Boolean(options.customBackCover && options.customBackCover.type !== 'none') ||
    separatePlan.backSource === 'pdf-last';

  const readingDirection = options.readingDirection ?? 'ltr';
  const unprintableMarginMm = options.unprintableMarginMm ?? 5;
  const homePrinter = unprintableMarginMm > 0;
  const activeTarget = inferBookPrintTarget(options);
  const activeProfile = BOOK_PRINT_PROFILES[activeTarget];
  const paperSpec = resolveBookPaperSpec(options.paperSize);
  const isNormalMode = options.mode !== 'fotocopia';
  const effectiveThickness = activeTarget === 'home' ? 0 : (options.paperThicknessMm ?? 0);
  const spineWidthMm = calculateSpineWidth(finalPageCount, { paperThicknessMm: effectiveThickness });
  const sheetsInSignature = Math.max(1, Math.floor(finalPageCount / 4));
  const creepMaxMm = activeTarget === 'print_shop' && options.applyCreep !== false
    ? calculateCreepOffset(0, sheetsInSignature, effectiveThickness)
    : 0;
  const zipPlan =
    options.zipByBooklet && (options.destination ?? 'A') === 'A' && isNormalMode
      ? planBookletSignatures(finalPageCount, 'multi-balanced', 4)
      : null;
  const multiSigs = zipPlan && zipPlan.signatures.length > 1 ? zipPlan.signatures : null;
  const effectiveDest = activeTarget === 'home' && options.destination === 'C' ? 'B' : (options.destination ?? 'A');
  const destinationLabel =
    effectiveDest === 'A'
      ? t.bookStudio.previewExportStep.destinationA
      : effectiveDest === 'B'
        ? (activeTarget === 'home' ? t.bookStudio.impositionStep.destinationBSubHome : t.bookStudio.previewExportStep.destinationB)
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

  const currentSignature = JSON.stringify({
    name: selectedFile.name,
    size: selectedFile.size,
    options,
  });
  const hasReadyCachedExport = Boolean(pdfBlobUrl && lastExportSignature === currentSignature);

  const handleStartExport = async (forceRegenerate = false) => {
    if (!forceRegenerate && hasReadyCachedExport && pdfBlobUrl) {
      const a = document.createElement('a');
      a.href = pdfBlobUrl;
      const cleanName = selectedFile.name.replace(/\.(pdf|zip)$/i, '');
      a.download = `${cleanName}_IMPRESION_LIBRO${lastOutputIsZip ? '.zip' : '.pdf'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    const allowed = await consumeCreditIfNeeded('book');
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

      const isZip = pdfBytes[0] === 0x50 && pdfBytes[1] === 0x4b;
      setLastOutputIsZip(isZip);

      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: isZip ? 'application/zip' : 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPdfBlobUrl(url);
      setLastExportSignature(currentSignature);

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
    <div className="space-y-5 text-[var(--ui-text-primary)]">
      <PanelSection
        icon={<Printer className="w-4 h-4" />}
        title={t.bookStudio.previewExportStep.title}
        helpTitle="Resumen final del libro"
        helpText={t.bookStudio.previewExportStep.description}
      >
        {sourceProtected && (
          <div
            className="p-3 bg-[var(--color-accent-light)]/20 border border-[var(--color-accent-base)]/30"
            style={{ borderRadius: radius.control }}
          >
            <p className="text-xs font-semibold text-[var(--color-accent-text)]">
              {t.bookStudio.previewExportStep.protectionNotice}
            </p>
          </div>
        )}

        <div
          className={`p-4 bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] space-y-4 ${elevationSystem.raised}`}
          style={{ borderRadius: radius.card }}
        >
          <div className="flex items-center justify-between border-b border-[var(--ui-border)] pb-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="p-2.5 bg-[var(--color-accent-light)]/20 text-[var(--color-accent-text)] shrink-0"
                style={{ borderRadius: radius.control }}
              >
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-[var(--ui-text-primary)] truncate">{selectedFile.name}</h3>
                <p className="text-xs text-[var(--ui-text-secondary)]">
                  {t.bookStudio.previewExportStep.modeSummaryLine
                    .replace('{mode}', options.mode === 'fotocopia' ? t.bookStudio.previewExportStep.modeFotocopiaShort : t.bookStudio.previewExportStep.modeStandardShort)
                    .replace(
                      '{where}',
                      activeTarget === 'print_shop'
                        ? t.bookStudio.previewExportStep.printAtImprenta.replace('{paper}', paperSpec.pageSize.name)
                        : t.bookStudio.previewExportStep.printAtHome.replace('{paper}', paperSpec.pageSize.name),
                    )}
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-[var(--color-accent-light)]/20 text-[var(--color-accent-text)] font-bold text-[10px] uppercase shrink-0">
              {t.bookStudio.previewExportStep.readyBadge}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-2.5 bg-[var(--ui-bg-card)] border border-[var(--ui-border)]" style={{ borderRadius: radius.control }}>
              <span className="text-[10px] font-semibold text-[var(--ui-text-secondary)] block uppercase">
                {t.bookStudio.previewExportStep.metricPdfPages}
              </span>
              <span className="text-lg font-bold text-[var(--ui-text-primary)] mt-0.5 block">
                {pdfPageCount}
              </span>
            </div>

            <div className="p-2.5 bg-[var(--ui-bg-card)] border border-[var(--ui-border)]" style={{ borderRadius: radius.control }}>
              <span className="text-[10px] font-semibold text-[var(--ui-text-secondary)] block uppercase">
                {t.bookStudio.previewExportStep.metricBookPages}
              </span>
              <span className="text-lg font-bold text-[var(--color-secondary-bright)] mt-0.5 block">
                {finalPageCount}
              </span>
            </div>

            <div className="p-2.5 bg-[var(--ui-bg-card)] border border-[var(--ui-border)]" style={{ borderRadius: radius.control }}>
              <span className="text-[10px] font-semibold text-[var(--ui-text-secondary)] block uppercase">
                {t.bookStudio.previewExportStep.metricSheets}
              </span>
              <span className="text-lg font-bold text-[var(--color-secondary-bright)] mt-0.5 block">
                {totalSheetsToPrint} <span className="text-xs font-normal text-[var(--ui-text-secondary)]">{t.bookStudio.previewExportStep.sheetsUnit}</span>
              </span>
            </div>
          </div>

          {separatePlan.isSeparate && (
            <p className="text-[11px] font-semibold text-[var(--color-accent-text)]">
              Incluye {breakdown.interiorSheets} hojas del interior + 1 hoja aparte de tapa y contratapa (
              {separatePlan.layout === 'home-guillotine'
                ? 'Contratapa a la izquierda y Tapa a la derecha para guillotinar'
                : 'Contratapa, Lomo y Tapa'}
              ).
            </p>
          )}

          <div className="space-y-1.5 pt-1 text-xs">
            <div className="flex items-center gap-2 text-[var(--ui-text-primary)]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-secondary-bright)] shrink-0" />
              <span>{t.bookStudio.previewExportStep.coverRowLabel} <strong>{hasCover ? (options.customCover ? t.bookStudio.previewExportStep.coverCustomPreset : t.bookStudio.previewExportStep.sourceCoverPage) : t.bookStudio.previewExportStep.noCover}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-[var(--ui-text-primary)]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-secondary-bright)] shrink-0" />
              <span>{t.bookStudio.previewExportStep.backCoverRowLabel} <strong>{hasBackCover ? (options.customBackCover ? t.bookStudio.previewExportStep.backCoverCustom : t.bookStudio.previewExportStep.sourceBackCoverPage) : t.bookStudio.previewExportStep.noBackCover}</strong></span>
            </div>
            {(options.sectionDividers || []).length > 0 && (
              <div className="flex items-center gap-2 text-[var(--ui-text-primary)]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-secondary-bright)] shrink-0" />
                <span>Separadores de capítulo: <strong>{(options.sectionDividers || []).length} ({breakdown.dividerPages} págs.)</strong></span>
              </div>
            )}
          </div>

          <div className="space-y-1.5 pt-2 border-t border-[var(--ui-border)] text-xs">
            <div className="flex items-center gap-2 text-[var(--ui-text-primary)]">
              <Languages className="w-3.5 h-3.5 text-[var(--ui-text-secondary)] shrink-0" />
              <span>{t.bookStudio.previewExportStep.readingDirectionRow} <strong>{readingDirection === 'rtl' ? t.bookStudio.previewExportStep.rtlValue : t.bookStudio.previewExportStep.ltrValue}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-[var(--ui-text-primary)]">
              <FileText className="w-3.5 h-3.5 text-[var(--ui-text-secondary)] shrink-0" />
              <span>{t.bookStudio.previewExportStep.destinationRowLabel} <strong>{destinationLabel}</strong></span>
            </div>
            {activeTarget === 'print_shop' && (
              <>
                <div className="flex items-center gap-2 text-[var(--ui-text-primary)]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[var(--ui-text-secondary)] shrink-0" />
                  <span>{t.bookStudio.previewExportStep.spineRowLabel} <strong>{spineWidthMm.toFixed(1)} mm{spineWidthMm === 0 ? t.bookStudio.previewExportStep.spineNoThickness : ''}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-[var(--ui-text-primary)]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[var(--ui-text-secondary)] shrink-0" />
                  <span>{t.bookStudio.previewExportStep.creepRowLabel} <strong>{creepMaxMm > 0 ? t.bookStudio.previewExportStep.creepUpTo.replace('{max}', creepMaxMm.toFixed(1)) : t.bookStudio.previewExportStep.creepNotApply}</strong></span>
                </div>
              </>
            )}
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

          {setOptions && (
            <div className="space-y-2 pt-2 border-t border-[var(--ui-border)]">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  <span className="text-xs font-bold text-[var(--ui-text-primary)]">
                    {t.bookStudio.previewExportStep.homePrinterNoBorders}
                  </span>
                  <LidioHelpTrigger
                    title={t.bookStudio.previewExportStep.homePrinterNoBorders}
                    text={homePrinter ? t.bookStudio.previewExportStep.homePrinterShrinks.replace('{mm}', String(unprintableMarginMm)) : t.bookStudio.previewExportStep.homePrinterToEdge}
                    groupKey="book-home-printer-margin"
                  />
                  <ManualOverrideBadge
                    isOverridden={isManuallyOverridden(options, 'unprintableMarginMm')}
                    globalLabel={activeProfile.shortName}
                    onReset={() => setOptions((prev) => clearBookFieldManual(prev, 'unprintableMarginMm'))}
                  />
                </div>
                <SectionSwitch
                  checked={homePrinter}
                  onChange={(checked) => {
                    const nextVal = checked ? 5 : 0;
                    setOptions((prev) => {
                      const updated = { ...prev, unprintableMarginMm: nextVal };
                      return nextVal === activeProfile.defaults.unprintableMarginMm
                        ? clearBookFieldManual(updated, 'unprintableMarginMm')
                        : markBookFieldManual(updated, 'unprintableMarginMm');
                    });
                    emitLidioMessage({
                      kind: 'state',
                      groupKey: 'book-home-printer-margin',
                      title: checked ? 'Margen de seguridad activado' : 'Impresión hasta el borde',
                      body: checked
                        ? 'Se reservan unos milímetros en los bordes para que la impresora de casa no recorte el texto.'
                        : 'El armado aprovecha toda la hoja hasta el borde.',
                    });
                  }}
                  label={t.bookStudio.previewExportStep.homePrinterNoBorders}
                  size="sm"
                />
              </div>
              {homePrinter && (
                <label className="flex flex-wrap items-center gap-2 text-xs text-[var(--ui-text-secondary)]">
                  <span>{t.bookStudio.previewExportStep.homePrinterMinMargin}</span>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    step={0.5}
                    value={unprintableMarginMm}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 5;
                      setOptions((prev) => markBookFieldManual({ ...prev, unprintableMarginMm: val }, 'unprintableMarginMm'));
                    }}
                    className="w-20 px-2 py-1 border border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-[var(--ui-text-primary)]"
                    style={{ borderRadius: radius.control }}
                  />
                </label>
              )}
            </div>
          )}
        </div>

        <ContextualGuideBox title={t.bookStudio.previewExportStep.printFoldHeading}>
          {t.bookStudio.previewExportStep.printFoldHint}
        </ContextualGuideBox>
      </PanelSection>

      {isProcessing ? (
        <div
          className="p-6 bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] text-center space-y-4"
          style={{ borderRadius: radius.card }}
        >
          <div className="w-8 h-8 border-3 border-[var(--color-accent-base)] border-t-transparent rounded-full animate-spin mx-auto" />
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
        <div
          className="p-4 bg-[var(--color-status-danger-muted)] border border-[var(--color-status-danger-base)]/30 space-y-3 text-center"
          style={{ borderRadius: radius.card }}
        >
          <AlertCircle className="w-8 h-8 text-[var(--color-status-danger-text)] mx-auto" />
          <p className="text-xs font-medium text-[var(--color-status-danger-text)]">{errorMsg}</p>
          <button
            type="button"
            onClick={() => void handleStartExport(false)}
            className="px-4 py-2 text-xs font-bold bg-[var(--color-status-danger-muted)] text-[var(--color-status-danger-text)] border border-[var(--color-status-danger-base)]/40 cursor-pointer"
            style={{ borderRadius: radius.control }}
          >
            {t.bookStudio.previewExportStep.retryExport}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => void handleStartExport(false)}
            disabled={isGating}
            className={`w-full py-3.5 px-6 font-bold text-sm bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] hover:opacity-90 disabled:opacity-50 transition flex items-center justify-center gap-2 cursor-pointer ${elevationSystem.floating}`}
            style={{ borderRadius: radius.control }}
          >
            <Printer className="w-4 h-4" />
            <span>
              {isGating
                ? t.bookStudio.previewExportStep.verifyingCredits
                : hasReadyCachedExport
                  ? `Descargar archivo listo (${totalSheetsToPrint} hojas · sin gastar crédito)`
                  : t.bookStudio.previewExportStep.downloadPrints.replace('{sheets}', String(totalSheetsToPrint))}
            </span>
            <Sparkles className="w-4 h-4" />
          </button>

          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            {hasReadyCachedExport && (
              <button
                type="button"
                onClick={() => void handleStartExport(true)}
                className="text-[11px] font-semibold text-[var(--ui-text-secondary)] hover:text-[var(--color-accent-text)] underline cursor-pointer"
              >
                Volver a generar
              </button>
            )}
            {isNormalMode && (
              <button
                type="button"
                onClick={handleDownloadOriginal}
                className="text-[11px] font-semibold text-[var(--ui-text-secondary)] hover:text-[var(--ui-text-primary)] inline-flex items-center gap-1 underline cursor-pointer ml-auto"
              >
                <Download className="w-3 h-3" />
                <span>{t.bookStudio.previewExportStep.downloadOriginal}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {onPrevStep && (
        <div className="pt-4 border-t border-[var(--ui-border)] flex justify-start">
          <button
            type="button"
            onClick={onPrevStep}
            className="py-2 px-4 bg-[var(--ui-bg-card)] border border-[var(--ui-border)] hover:border-[var(--color-accent-base)] text-xs font-bold text-[var(--ui-text-secondary)] hover:text-[var(--ui-text-primary)] transition flex items-center gap-1.5 cursor-pointer"
            style={{ borderRadius: radius.control }}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>{t.bookStudio.backStep}</span>
          </button>
        </div>
      )}

      <PdfCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        docType="book"
        onConfirm={() => {
          setIsCheckoutOpen(false);
          handleStartExport();
        }}
      />
    </div>
  );
};
