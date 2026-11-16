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
}

export const BookPreviewExportStep: React.FC<BookPreviewExportStepProps> = ({
  options,
  selectedFile,
  pdfPageCount,
  onPrevStep,
  assetResolver,
  setOptions,
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
          <h3 className="text-base font-bold text-[var(--ui-text-primary)]">Ningún PDF cargado aún</h3>
          <p className="text-xs text-[var(--ui-text-secondary)]">
            Por favor carga un archivo PDF en la pestaña "1. Cargar PDF" para poder previsualizar y descargar tu libro.
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
      ? 'A: la cubierta va dentro del mismo archivo'
      : (options.destination ?? 'A') === 'B'
        ? 'B: la cubierta en un archivo aparte'
        : 'C: cubierta continua con lomo (contratapa|lomo|tapa)';

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
      setErrorMsg('No tenés créditos suficientes.');
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
      });

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
      setErrorMsg(err instanceof Error ? err.message : 'Ocurrió un error inesperado al procesar el libro.');
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
                Modo: {options.mode === 'fotocopia' ? 'Escaneo 2 págs./hoja' : 'PDF 1 pág./hoja'} • Se imprime {options.paperSize === 'A3' ? 'en una imprenta (A3)' : 'en tu casa (A4)'}
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-[var(--color-accent-light)]/20 text-[var(--color-accent-text)] font-bold text-[10px] uppercase">
            Listo
          </span>
        </div>

        {/* Grilla de Métricas de Imprenta */}
        <div className="grid grid-cols-3 gap-3">
          <div className={`p-3 rounded-[${radius.control}] bg-[var(--ui-bg-card)] border border-[var(--ui-border)]`}>
            <span className="text-[10px] font-semibold text-[var(--ui-text-secondary)] block uppercase">
              Págs. PDF
            </span>
            <span className="text-xl font-bold text-[var(--ui-text-primary)] mt-0.5 block">
              {pdfPageCount}
            </span>
          </div>

          <div className={`p-3 rounded-[${radius.control}] bg-[var(--ui-bg-card)] border border-[var(--ui-border)]`}>
            <span className="text-[10px] font-semibold text-[var(--ui-text-secondary)] block uppercase">
              Págs. Libro (Mult. 4)
            </span>
            <span className="text-xl font-bold text-[var(--color-secondary-bright)] mt-0.5 block">
              {finalPageCount}
            </span>
          </div>

          <div className={`p-3 rounded-[${radius.control}] bg-[var(--ui-bg-card)] border border-[var(--ui-border)]`}>
            <span className="text-[10px] font-semibold text-[var(--ui-text-secondary)] block uppercase">
              Hojas a imprimir
            </span>
            <span className="text-xl font-bold text-[var(--color-secondary-bright)] mt-0.5 block">
              {totalSheetsToPrint} <span className="text-xs font-normal text-[var(--ui-text-secondary)]">hojas</span>
            </span>
          </div>
        </div>

        {/* Detalle de Tapas */}
        <div className="space-y-1.5 pt-1 text-xs">
          <div className="flex items-center gap-2 text-[var(--ui-text-primary)]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-secondary-bright)] shrink-0" />
            <span>Tapa: <strong>{hasCover ? (options.customCover ? 'Tapa Custom con Preset' : 'Página 1 del PDF') : 'Sin Tapa'}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-[var(--ui-text-primary)]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-secondary-bright)] shrink-0" />
            <span>Contratapa: <strong>{hasBackCover ? (options.customBackCover ? 'Contratapa Custom' : 'Última pág. del PDF') : 'Sin Contratapa'}</strong></span>
          </div>
        </div>

        {/* Resumen de armado (antes de descargar) */}
        <div className="space-y-1.5 pt-2 border-t border-[var(--ui-border)] text-xs">
          <div className="flex items-center gap-2 text-[var(--ui-text-primary)]">
            <Languages className="w-3.5 h-3.5 text-[var(--ui-text-secondary)] shrink-0" />
            <span>Dirección de lectura: <strong>{readingDirection === 'rtl' ? 'De derecha a izquierda' : 'De izquierda a derecha'}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-[var(--ui-text-primary)]">
            <FileText className="w-3.5 h-3.5 text-[var(--ui-text-secondary)] shrink-0" />
            <span>Destino de la cubierta: <strong>{destinationLabel}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-[var(--ui-text-primary)]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--ui-text-secondary)] shrink-0" />
            <span>Lomo: <strong>{spineWidthMm.toFixed(1)} mm{spineWidthMm === 0 ? ' (sin grosor, para anillado o guillotina)' : ''}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-[var(--ui-text-primary)]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--ui-text-secondary)] shrink-0" />
            <span>Compensación para las hojas de adentro (creep): <strong>{creepMaxMm > 0 ? `hasta ${creepMaxMm.toFixed(1)} mm` : 'no aplica'}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-[var(--ui-text-primary)]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--ui-text-secondary)] shrink-0" />
            <span>Guías de armado: <strong>{options.showGuides ? 'sí' : 'no'}</strong></span>
          </div>
          {multiSigs && (
            <div className="flex items-center gap-2 text-[var(--ui-text-primary)]">
              <Layers className="w-3.5 h-3.5 text-[var(--ui-text-secondary)] shrink-0" />
              <span>Se baja un ZIP con <strong>{multiSigs.length} partes (cuadernillos)</strong>: {multiSigs.join(' + ')} páginas</span>
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
              <span className="text-xs font-bold text-[var(--ui-text-primary)]">Mi impresora de casa no imprime hasta el borde</span>
            </label>
            {homePrinter && (
              <label className="flex flex-wrap items-center gap-2 text-xs text-[var(--ui-text-secondary)]">
                <span>Margen mínimo que respeta tu impresora (mm):</span>
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
                ? `El contenido se achica para no usar los ${unprintableMarginMm} mm del borde y que no se corte nada.`
                : 'La impresora llega hasta el borde (perfil de imprenta o de borde a borde).'}
            </p>
          </div>
        )}

        {/* Aviso de Imprenta */}
        <div className={`p-3 bg-[var(--color-status-warning-muted)] border border-[var(--color-status-warning-base)]/30 rounded-[${radius.control}] flex items-start gap-2 text-xs text-[var(--color-status-warning-text)]`}>
          <AlertTriangle className="w-4 h-4 text-[var(--color-status-warning-text)] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Documento para Imprimir y Doblar</span>
            <span className="text-[11px] opacity-90 block">
              El archivo trae las hojas ya ordenadas. Imprimí de ambos lados y doblá por la mitad.
            </span>
          </div>
        </div>
      </div>

      {/* Estado de Procesamiento o Botón de Exportar */}
      {isProcessing ? (
        <div className={`p-6 rounded-[${radius.card}] bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] text-center space-y-4`}>
          <div className="w-8 h-8 border-3 border-[var(--color-accent-base)] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-[var(--ui-text-primary)]">Generando PDF de Imprenta...</p>
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
            Reintentar Exportación
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
            <span>{isGating ? 'Verificando créditos...' : `Descargar para imprimir (${totalSheetsToPrint} hojas)`}</span>
            <Sparkles className="w-4 h-4" />
          </button>

          {isNormalMode && (
            <button
              type="button"
              onClick={handleDownloadOriginal}
              className={`w-full py-2.5 px-4 rounded-[${radius.control}] text-xs font-bold border border-[var(--ui-border)] text-[var(--ui-text-secondary)] hover:text-[var(--ui-text-primary)] hover:bg-[var(--ui-bg-card)] transition flex items-center justify-center gap-2`}
            >
              <Download className="w-4 h-4" />
              <span>Descargar el PDF original (tal cual lo subiste)</span>
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
                <span>Volver a Descargar</span>
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

