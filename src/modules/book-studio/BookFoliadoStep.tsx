import React from 'react';
import { Hash, CheckCircle2, Info, RefreshCw, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import { BookImpositionOptions } from '../../shared/core/book-engine/impositionEngine';
import { radius, elevationSystem, button } from '../../shared/core/uiDesignSystem';

interface BookFoliadoStepProps {
  pdfPageCount: number;
  options: BookImpositionOptions;
  setOptions: React.Dispatch<React.SetStateAction<BookImpositionOptions>>;
  onNextStep?: () => void;
  onPrevStep?: () => void;
}

export const BookFoliadoStep: React.FC<BookFoliadoStepProps> = ({
  options,
  setOptions,
  onNextStep,
  onPrevStep,
}) => {
  const refPdfPage = options.refPdfPage || 0;
  const refBookPage = options.refBookPage || 0;
  const refPageSide = options.refPageSide || 'derecha';

  const isCalibrated = refPdfPage > 0 && refBookPage > 0;

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
          <span>5. Foliado de Referencia</span>
        </h2>
        <p className="text-xs text-[var(--ui-text-secondary)]">
          Sincroniza los números de página de tu PDF con el foliado impreso del libro original.
        </p>
      </div>

      {/* Tarjeta de Estado de Calibración */}
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
              {isCalibrated ? 'Foliado Calibrado' : 'Foliado No Calibrado'}
            </h3>
            <p className={isCalibrated ? 'text-[var(--color-status-success-text)]' : 'text-[var(--ui-text-secondary)]'}>
              {isCalibrated
                ? `Pág. PDF #${refPdfPage} ➔ Pág. Impresa #${refBookPage} (${refPageSide === 'derecha' ? 'Derecha / Impar' : 'Izquierda / Par'}). El motor calcula automáticamente la paridad y espacios en blanco.`
                : 'No se ha fijado una página de referencia. El motor asumirá que la página 1 del PDF inicia en el pliego 1.'}
            </p>
          </div>
        </div>
      </div>

      {/* Instrucción Visual sobre cómo calibrar */}
      <div className="p-4 bg-[var(--ui-bg-card)] border border-[var(--ui-border)] rounded-[12px] space-y-3">
        <h4 className="text-xs font-bold text-[var(--ui-text-primary)] flex items-center gap-1.5">
          <ZoomIn className="w-4 h-4 text-[var(--color-accent-text)]" />
          <span>¿Cómo calibrar la referencia?</span>
        </h4>
        <ol className="text-xs text-[var(--ui-text-secondary)] space-y-2 list-decimal list-inside leading-relaxed">
          <li>Haz clic en cualquier miniatura de página en el visor central.</li>
          <li>En la vista ampliada (lightbox), introduce el número impreso real.</li>
          <li>El motor derivará automáticamente si el pliego va a la <strong>Derecha (Impar)</strong> o <strong>Izquierda (Par)</strong>.</li>
        </ol>
      </div>

      {/* Acción Desactivar */}
      {isCalibrated && (
        <div className="pt-2 border-t border-[var(--ui-border)]">
          <button
            type="button"
            onClick={handleReset}
            className={`${button.base} ${button.ghost} w-full flex items-center justify-center gap-1.5 text-xs text-[var(--color-status-danger-text)]`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Eliminar Calibración de Referencia</span>
          </button>
        </div>
      )}

      {/* Navegación Bidireccional */}
      <div className="pt-4 border-t border-[var(--ui-border)] flex items-center justify-between gap-3">
        {onPrevStep ? (
          <button
            type="button"
            onClick={onPrevStep}
            className={`${button.base} ${button.secondary} flex items-center gap-1.5 text-xs font-bold`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Volver</span>
          </button>
        ) : <div />}

        {onNextStep && (
          <button
            type="button"
            onClick={onNextStep}
            className={`${button.base} ${button.primary} flex items-center gap-1.5 text-xs font-bold`}
          >
            <span>Siguiente: 6. Exportar</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};


