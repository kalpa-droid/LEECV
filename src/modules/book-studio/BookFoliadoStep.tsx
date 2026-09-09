import React from 'react';
import { Hash, CheckCircle2, RefreshCw, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
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
          <span>5. Encuentro un número</span>
        </h2>
        <p className="text-xs text-[var(--ui-text-secondary)] leading-relaxed">
          Necesitamos que solo encuentres un número de página y lo escribas en la vista previa del visor. No necesitamos más.
        </p>
      </div>

      {/* Instrucción Simple */}
      <div className="p-4 bg-[var(--ui-bg-card)] border border-[var(--ui-border)] rounded-[12px] space-y-2">
        <h4 className="text-xs font-bold text-[var(--ui-text-primary)] flex items-center gap-1.5">
          <ZoomIn className="w-4 h-4 text-[var(--color-accent-text)]" />
          <span>¿Cómo ingresar el número?</span>
        </h4>
        <p className="text-xs text-[var(--ui-text-secondary)] leading-relaxed">
          Haz clic en cualquier miniatura de página en el visor principal para abrirla a pantalla completa, escribe el número que ves impreso en ella y presiona <strong>Encontrado</strong>.
        </p>
      </div>

      {/* Estado de Calibración Compacto (si está activo) */}
      {isCalibrated && (
        <div
          className={`p-4 rounded-[${radius.card}] bg-[var(--color-status-success-muted)] border border-[var(--color-status-success-base)]/40 text-[var(--color-status-success-text)] ${elevationSystem.raised} space-y-2`}
        >
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-[var(--color-status-success-bright)] shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <h3 className="font-bold text-sm">Número Calibrado</h3>
              <p>
                Pág. PDF #{refPdfPage} ➔ Pág. Impresa #{refBookPage} ({refPageSide === 'derecha' ? 'Derecha / Impar' : 'Izquierda / Par'}).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className={`${button.base} ${button.ghost} w-full flex items-center justify-center gap-1.5 text-xs text-[var(--color-status-danger-text)] mt-2`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Eliminar Calibración</span>
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
