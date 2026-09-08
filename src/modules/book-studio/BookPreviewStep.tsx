import React from 'react';
import { BookOpen, Printer, Sparkles } from 'lucide-react';
import { BookImpositionOptions } from '../../shared/core/book-engine/impositionEngine';
import { calculateFinalBookPageCount } from '../../shared/core/book-engine/bookPageCount';
import { radius, elevationSystem } from '../../shared/core/uiDesignSystem';
import { PdfPreviewStrip } from './components/PdfPreviewStrip';

interface BookPreviewStepProps {
  options: BookImpositionOptions;
  setOptions: React.Dispatch<React.SetStateAction<BookImpositionOptions>>;
  selectedFile: File | null;
  pdfPageCount: number;
  zoomScale?: number;
  onConfirm: () => void;
}

export const BookPreviewStep: React.FC<BookPreviewStepProps> = ({
  options,
  setOptions,
  selectedFile,
  pdfPageCount,
  zoomScale = 1.0,
  onConfirm,
}) => {
  const finalPageCount = calculateFinalBookPageCount(
    pdfPageCount,
    Boolean(options.customCover && options.customCover.type !== 'none'),
    Boolean(options.customBackCover && options.customBackCover.type !== 'none')
  );

  const totalSheetsToPrint = finalPageCount / 2;

  return (
    <div className="w-full h-full flex flex-col space-y-4 overflow-y-auto p-4 text-[var(--ui-text-primary)]">
      {/* Barra de Métricas Compacta de Imprenta */}
      <div className={`p-4 rounded-[${radius.card}] bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] flex flex-wrap items-center justify-between gap-4 ${elevationSystem.raised} shrink-0`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 bg-[var(--color-accent-light)]/20 rounded-[${radius.control}] text-[var(--color-accent-base)]`}>
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--ui-text-primary)]">
              {selectedFile?.name || 'Documento PDF'}
            </h3>
            <p className="text-[11px] text-[var(--ui-text-secondary)]">
              Modo: {options.mode === 'fotocopia' ? 'Escaneo 2 págs./hoja' : 'PDF 1 pág./hoja'} • Papel: {options.paperSize || 'A4'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="text-center px-3 py-1 rounded bg-[var(--ui-bg-card)] border border-[var(--ui-border)]">
            <span className="text-[10px] text-[var(--ui-text-secondary)] block uppercase">Págs. PDF</span>
            <span className="font-bold text-[var(--ui-text-primary)]">{pdfPageCount}</span>
          </div>

          <div className="text-center px-3 py-1 rounded bg-[var(--ui-bg-card)] border border-[var(--ui-border)]">
            <span className="text-[10px] text-[var(--ui-text-secondary)] block uppercase">Págs. Libro</span>
            <span className="font-bold text-[var(--color-accent-base)]">{finalPageCount}</span>
          </div>

          <div className="text-center px-3 py-1 rounded bg-[var(--ui-bg-card)] border border-[var(--ui-border)]">
            <span className="text-[10px] text-[var(--ui-text-secondary)] block uppercase">Pliegos</span>
            <span className="font-bold text-[var(--color-accent-base)]">{totalSheetsToPrint}</span>
          </div>

          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-[${radius.control}] font-bold text-xs bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] hover:opacity-90 transition flex items-center gap-1.5 cursor-pointer shadow-xs`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Exportar PDF</span>
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Grilla Visual de Miniaturas de Páginas */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <PdfPreviewStrip
          selectedFile={selectedFile}
          pdfPageCount={pdfPageCount}
          options={options}
          setOptions={setOptions}
          zoomScale={zoomScale}
        />
      </div>
    </div>
  );
};

