import React from 'react';
import { BookOpen, CheckCircle2, AlertTriangle, Printer, Sparkles } from 'lucide-react';
import { BookImpositionOptions } from '../../shared/core/book-engine/impositionEngine';
import { calculateFinalBookPageCount } from '../../shared/core/book-engine/bookPageCount';
import { radius, elevationSystem } from '../../shared/core/uiDesignSystem';

interface BookPreviewStepProps {
  options: BookImpositionOptions;
  selectedFile: File | null;
  pdfPageCount: number;
  onBack: () => void;
  onConfirm: () => void;
}

export const BookPreviewStep: React.FC<BookPreviewStepProps> = ({
  options,
  selectedFile,
  pdfPageCount,
  onConfirm,
}) => {
  const hasCover = options.hasCover || (options.customCover && options.customCover.type !== 'none');
  const hasBackCover = options.hasBackCover || (options.customBackCover && options.customBackCover.type !== 'none');

  const finalPageCount = calculateFinalBookPageCount(
    pdfPageCount,
    Boolean(options.customCover && options.customCover.type !== 'none'),
    Boolean(options.customBackCover && options.customBackCover.type !== 'none')
  );

  const totalSheetsToPrint = finalPageCount / 2;

  return (
    <div className="max-w-3xl mx-auto space-y-6 text-[var(--ui-text-primary)] w-full">
      {/* Tarjeta Informativa Principal */}
      <div className={`p-6 rounded-[${radius.card}] bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] space-y-5 ${elevationSystem.raised}`}>
        <div className="flex items-center justify-between border-b border-[var(--ui-border)] pb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 bg-[var(--color-accent-light)]/20 rounded-[${radius.control}] text-[var(--color-accent-base)]`}>
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--ui-text-primary)]">{selectedFile?.name || 'Documento PDF'}</h3>
              <p className="text-xs text-[var(--ui-text-secondary)]">
                Modo: {options.mode === 'fotocopia' ? 'Escaneo 2 págs./hoja' : 'PDF 1 pág./hoja'} • Papel imprenta: {options.paperSize || 'A4'}
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-[var(--color-accent-light)]/20 text-[var(--color-accent-base)] font-bold text-[10px] uppercase">
            Pliegos Listos
          </span>
        </div>

        {/* Grilla de Métricas de Imprenta */}
        <div className="grid grid-cols-3 gap-3">
          <div className={`p-4 rounded-[${radius.control}] bg-[var(--ui-bg-card)] border border-[var(--ui-border)]`}>
            <span className="text-[10px] font-semibold text-[var(--ui-text-secondary)] block uppercase">
              Páginas PDF
            </span>
            <span className="text-2xl font-bold text-[var(--ui-text-primary)] mt-1 block">
              {pdfPageCount}
            </span>
          </div>

          <div className={`p-4 rounded-[${radius.control}] bg-[var(--ui-bg-card)] border border-[var(--ui-border)]`}>
            <span className="text-[10px] font-semibold text-[var(--ui-text-secondary)] block uppercase">
              Páginas Libro (Mult. 4)
            </span>
            <span className="text-2xl font-bold text-[var(--color-accent-base)] mt-1 block">
              {finalPageCount}
            </span>
          </div>

          <div className={`p-4 rounded-[${radius.control}] bg-[var(--ui-bg-card)] border border-[var(--ui-border)]`}>
            <span className="text-[10px] font-semibold text-[var(--ui-text-secondary)] block uppercase">
              Pliegos Físicos
            </span>
            <span className="text-2xl font-bold text-[var(--color-accent-base)] mt-1 block">
              {totalSheetsToPrint} <span className="text-xs font-normal text-[var(--ui-text-muted)]">hojas</span>
            </span>
          </div>
        </div>

        {/* Resumen de Ajustes de Tapas */}
        <div className="space-y-2 pt-1 text-xs">
          <div className="flex items-center gap-2 text-[var(--ui-text-primary)]">
            <CheckCircle2 className="w-4 h-4 text-[var(--color-accent-base)] shrink-0" />
            <span>Tapa: <strong>{hasCover ? (options.customCover ? 'Tapa Tipográfica Custom' : 'Página 1 del PDF') : 'Sin Tapa'}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-[var(--ui-text-primary)]">
            <CheckCircle2 className="w-4 h-4 text-[var(--color-accent-base)] shrink-0" />
            <span>Contratapa: <strong>{hasBackCover ? (options.customBackCover ? 'Contratapa Custom' : 'Última página del PDF') : 'Sin Contratapa'}</strong></span>
          </div>
        </div>

        {/* Botón de Acción */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onConfirm}
            className={`px-6 py-3 rounded-[${radius.control}] font-bold text-xs bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] hover:opacity-90 transition flex items-center gap-2 ${elevationSystem.floating}`}
          >
            <Printer className="w-4 h-4" />
            <span>Exportar PDF para Imprenta</span>
            <Sparkles className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
