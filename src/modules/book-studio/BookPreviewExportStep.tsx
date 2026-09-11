import React, { useState } from 'react';
import { BookOpen, CheckCircle2, AlertTriangle, Printer, Sparkles, Download, AlertCircle, ChevronLeft } from 'lucide-react';
import { BookImpositionOptions, processBookImposition } from '../../shared/core/book-engine/impositionEngine';
import { calculateFinalBookPageCount } from '../../shared/core/book-engine/bookPageCount';
import { radius, elevationSystem } from '../../shared/core/uiDesignSystem';
import { useText } from '../../shared/i18n/useText';

import { usePageAwareCreditGate } from '../../shared/core/hooks/usePageAwareCreditGate';

interface BookPreviewExportStepProps {
  options: BookImpositionOptions;
  selectedFile: File | null;
  pdfPageCount: number;
  onPrevStep?: () => void;
  isLoggedIn?: boolean;
  onAuthToggle?: () => void;
}

export const BookPreviewExportStep: React.FC<BookPreviewExportStepProps> = ({
  options,
  selectedFile,
  pdfPageCount,
  onPrevStep,
  isLoggedIn,
  onAuthToggle,
}) => {
  const t = useText();
  const { consumeCredits, isGating, gateError } = usePageAwareCreditGate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
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
            Por favor carga un archivo PDF en la pestaña "1. Cargar PDF" para poder previsualizar y exportar la imposición.
          </p>
        </div>
      </div>
    );
  }

  const hasCover = options.hasCover || (options.customCover && options.customCover.type !== 'none');
  const hasBackCover = options.hasBackCover || (options.customBackCover && options.customBackCover.type !== 'none');

  const finalPageCount = calculateFinalBookPageCount(
    pdfPageCount,
    Boolean(options.customCover && options.customCover.type !== 'none'),
    Boolean(options.customBackCover && options.customBackCover.type !== 'none')
  );

  const totalSheetsToPrint = finalPageCount / 2;

  const handleStartExport = async () => {
    const allowed = await consumeCredits(finalPageCount);
    if (!allowed) {
      if (gateError) setErrorMsg(gateError);
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMsg(null);
      setPdfBlobUrl(null);

      const pdfBytes = await processBookImposition(selectedFile, {
        ...options,
        onProgress: (msg, pct) => {
          setStatusMessage(msg);
          setProgressPercent(pct);
        },
      });

      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPdfBlobUrl(url);

      // Disparar descarga automática
      const a = document.createElement('a');
      a.href = url;
      const cleanName = selectedFile.name.replace(/\.pdf$/i, '');
      a.download = `${cleanName}_IMPRESION_LIBRO.pdf`;
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
    <div className="space-y-6 text-[var(--ui-text-primary)]">
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
                Modo: {options.mode === 'fotocopia' ? 'Escaneo 2 págs./hoja' : 'PDF 1 pág./hoja'} • Papel: {options.paperSize || 'A4'}
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
              Pliegos Físicos
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

        {/* Aviso de Imprenta */}
        <div className={`p-3 bg-[var(--color-status-warning-muted)] border border-[var(--color-status-warning-base)]/30 rounded-[${radius.control}] flex items-start gap-2 text-xs text-[var(--color-status-warning-text)]`}>
          <AlertTriangle className="w-4 h-4 text-[var(--color-status-warning-text)] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Documento para Imprimir y Doblar</span>
            <span className="text-[11px] opacity-90 block">
              El PDF resultante impone las hojas en pliegos dobles (caballete). Imprime en doble faz y dobla por la mitad.
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
          {!isLoggedIn ? (
            <button
              type="button"
              onClick={onAuthToggle}
              className={`px-4 py-2 text-xs font-bold bg-[var(--color-status-danger-base)] text-[var(--color-status-danger-on-base)] border border-[var(--color-status-danger-base)]/40 rounded-[${radius.control}]`}
            >
              Iniciar Sesión con Google
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartExport}
              className={`px-4 py-2 text-xs font-bold bg-[var(--color-status-danger-muted)] text-[var(--color-status-danger-text)] border border-[var(--color-status-danger-base)]/40 rounded-[${radius.control}]`}
            >
              Reintentar Exportación
            </button>
          )}
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
            <span>{isGating ? 'Verificando créditos...' : `Generar y Descargar PDF (${totalSheetsToPrint} pliegos)`}</span>
            <Sparkles className="w-4 h-4" />
          </button>

          {pdfBlobUrl && (
            <div className="flex gap-2">
              <a
                href={pdfBlobUrl}
                download={`${selectedFile.name.replace(/\.pdf$/i, '')}_IMPRESION_LIBRO.pdf`}
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
            <span>Volver</span>
          </button>
        </div>
      )}
    </div>
  );
};

