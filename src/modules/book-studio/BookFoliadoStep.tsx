import React from 'react';
import { Hash, CheckCircle2, Info, RefreshCw } from 'lucide-react';
import { BookImpositionOptions } from '../../shared/core/book-engine/impositionEngine';
import { radius, elevationSystem } from '../../shared/core/uiDesignSystem';
import { useText } from '../../shared/i18n/useText';

interface BookFoliadoStepProps {
  pdfPageCount: number;
  options: BookImpositionOptions;
  setOptions: React.Dispatch<React.SetStateAction<BookImpositionOptions>>;
}

export const BookFoliadoStep: React.FC<BookFoliadoStepProps> = ({
  pdfPageCount,
  options,
  setOptions,
}) => {
  const t = useText();
  const refPdfPage = options.refPdfPage || 0;
  const refBookPage = options.refBookPage || 0;
  const refPageSide = options.refPageSide || 'derecha';

  const isCalibrated = refPdfPage > 0 && refBookPage > 0;

  const handlePdfPageChange = (val: number) => {
    const clamped = Math.max(0, Math.min(pdfPageCount || 999, val));
    setOptions((prev) => ({ ...prev, refPdfPage: clamped }));
  };

  const handleBookPageChange = (val: number) => {
    const clamped = Math.max(0, val);
    setOptions((prev) => ({ ...prev, refBookPage: clamped }));
  };

  const handleSideChange = (side: 'derecha' | 'izquierda') => {
    setOptions((prev) => ({ ...prev, refPageSide: side }));
  };

  const handleReset = () => {
    setOptions((prev) => ({
      ...prev,
      refPdfPage: 0,
      refBookPage: 0,
      refPageSide: 'derecha',
    }));
  };

  return (
    <div className="space-y-6 text-[var(--ui-text-primary)]">
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-[var(--ui-text-primary)] flex items-center gap-2">
          <Hash className="w-5 h-5 text-[var(--color-secondary-bright)]" />
          <span>{t.bookStudio.foliadoStep.title}</span>
        </h2>
        <p className="text-xs text-[var(--ui-text-secondary)]">
          {t.bookStudio.foliadoStep.description}
        </p>
      </div>

      {/* Estado de Calibración */}
      <div
        className={`p-4 rounded-[${radius.card}] border transition-all ${
          isCalibrated
            ? 'bg-[var(--color-status-success-muted)] border-[var(--color-status-success-base)]/40 text-[var(--color-status-success-text)]'
            : 'bg-[var(--ui-bg-surface)] border border-[var(--ui-border)]'
        } ${elevationSystem.raised}`}
      >
        <div className="flex items-start gap-3">
          {isCalibrated ? (
            <CheckCircle2 className="w-5 h-5 text-[var(--color-status-success-bright)] shrink-0 mt-0.5" />
          ) : (
            <Info className="w-5 h-5 text-[var(--color-secondary-bright)] shrink-0 mt-0.5" />
          )}
          <div className="space-y-1 text-xs">
            <h3 className="font-bold text-sm">
              {isCalibrated ? 'Foliado Calibrado Correctamente' : 'Foliado de Referencia Sin Configurar'}
            </h3>
            <p className={isCalibrated ? 'text-[var(--color-status-success-text)]' : 'text-[var(--ui-text-secondary)]'}>
              {isCalibrated
                ? `La pág. PDF #${refPdfPage} corresponde a la pág. #${refBookPage} (${refPageSide === 'derecha' ? 'Derecha / Impar' : 'Izquierda / Par'}). El motor ajustará automáticamente los blancos detras de tapa.`
                : 'Indica el número impreso en una hoja para sincronizar el PDF con los pliegos físicos de imprenta.'}
            </p>
          </div>
        </div>
      </div>

      {/* Controles de Configuración */}
      <div className="space-y-4">
        {/* Input 1: Página PDF */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[var(--ui-text-primary)] block">
            Página del PDF de Referencia
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={pdfPageCount || 9999}
              value={refPdfPage === 0 ? '' : refPdfPage}
              placeholder="Ej: 3 (0 = desactivado)"
              onChange={(e) => handlePdfPageChange(parseInt(e.target.value || '0', 10))}
              className={`w-full p-2.5 rounded-[${radius.control}] bg-[var(--ui-bg-input)] border border-[var(--ui-border)] text-xs text-[var(--ui-text-primary)] focus:outline-none focus:border-[var(--color-accent-base)]`}
            />
          </div>
          <span className="text-[10px] text-[var(--ui-text-secondary)] block">
            Número de hoja en la secuencia del PDF cargado (1 a {pdfPageCount || 'N'}).
          </span>
        </div>

        {/* Input 2: Número impreso en el libro */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[var(--ui-text-primary)] block">
            Número Impreso en esa Hoja (Foliado Real)
          </label>
          <input
            type="number"
            min={0}
            value={refBookPage === 0 ? '' : refBookPage}
            placeholder="Ej: 15"
            onChange={(e) => handleBookPageChange(parseInt(e.target.value || '0', 10))}
            className={`w-full p-2.5 rounded-[${radius.control}] bg-[var(--ui-bg-input)] border border-[var(--ui-border)] text-xs text-[var(--ui-text-primary)] focus:outline-none focus:border-[var(--color-accent-base)]`}
          />
          <span className="text-[10px] text-[var(--ui-text-secondary)] block">
            El número de página original impreso que ves en el papel escaneado.
          </span>
        </div>

        {/* Radio: Lado (Derecha / Izquierda) */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[var(--ui-text-primary)] block">
            Lado en el Libro Impreso
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleSideChange('derecha')}
              className={`p-2.5 rounded-[${radius.control}] border text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                refPageSide === 'derecha'
                  ? 'bg-[var(--color-accent-base)] border-[var(--color-accent-base)] text-[var(--color-accent-on-base)]'
                  : 'bg-[var(--ui-bg-card)] border-[var(--ui-border)] text-[var(--ui-text-secondary)] hover:text-[var(--ui-text-primary)]'
              }`}
            >
              Derecha (Impar)
            </button>

            <button
              type="button"
              onClick={() => handleSideChange('izquierda')}
              className={`p-2.5 rounded-[${radius.control}] border text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                refPageSide === 'izquierda'
                  ? 'bg-[var(--color-accent-base)] border-[var(--color-accent-base)] text-[var(--color-accent-on-base)]'
                  : 'bg-[var(--ui-bg-card)] border-[var(--ui-border)] text-[var(--ui-text-secondary)] hover:text-[var(--ui-text-primary)]'
              }`}
            >
              Izquierda (Par)
            </button>
          </div>
        </div>
      </div>

      {/* Botón Reset */}
      {isCalibrated && (
        <div className="pt-2 border-t border-[var(--ui-border)]">
          <button
            type="button"
            onClick={handleReset}
            className="w-full py-2 px-3 text-xs font-semibold text-[var(--color-secondary-bright)] hover:underline flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Desactivar Foliado de Referencia</span>
          </button>
        </div>
      )}
    </div>
  );
};
