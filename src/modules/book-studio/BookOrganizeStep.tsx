import React from 'react';
import { LayoutGrid, RotateCcw, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { BookImpositionOptions } from '../../shared/core/book-engine/impositionEngine';
import { calculateFinalBookPageCount } from '../../shared/core/book-engine/bookPageCount';
import { radius, elevationSystem, button } from '../../shared/core/uiDesignSystem';
import { useText } from '../../shared/i18n/useText';

interface BookOrganizeStepProps {
  pdfPageCount: number;
  options: BookImpositionOptions;
  setOptions: React.Dispatch<React.SetStateAction<BookImpositionOptions>>;
  onNextStep?: () => void;
  onPrevStep?: () => void;
}

export const BookOrganizeStep: React.FC<BookOrganizeStepProps> = ({
  pdfPageCount,
  options,
  setOptions,
  onNextStep,
  onPrevStep,
}) => {
  const t = useText();
  const deletedCount = (options.deletedPages || []).length;
  const rotatedCount = Object.values(options.pageRotations || {}).filter((r) => r > 0).length;

  const finalPageCount = calculateFinalBookPageCount(
    pdfPageCount,
    Boolean(options.customCover && options.customCover.type !== 'none'),
    Boolean(options.customBackCover && options.customBackCover.type !== 'none')
  );
  const totalSheetsToPrint = finalPageCount / 2;

  const handleRotateAllLeft90 = () => {
    setOptions((prev) => {
      const nextRotations = { ...(prev.pageRotations || {}) };
      for (let i = 1; i <= pdfPageCount; i++) {
        nextRotations[i] = ((nextRotations[i] || 0) - 90 + 360) % 360;
      }
      return { ...prev, pageRotations: nextRotations };
    });
  };

  const handleResetRotations = () => {
    setOptions((prev) => ({ ...prev, pageRotations: {} }));
  };

  const handleRestoreAllDeleted = () => {
    setOptions((prev) => ({ ...prev, deletedPages: [] }));
  };

  const handleResetOrder = () => {
    setOptions((prev) => ({ ...prev, pageOrder: [] }));
  };

  return (
    <div className="space-y-6 text-[var(--ui-text-primary)]">
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-[var(--ui-text-primary)] flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-[var(--color-secondary-bright)]" />
          <span>{t.bookStudio.organizeStep.title}</span>
        </h2>
        <p className="text-xs text-[var(--ui-text-secondary)]">
          {t.bookStudio.organizeStep.description}
        </p>
      </div>

      {/* Resumen Estructural Completo */}
      <div className={`p-4 rounded-[${radius.card}] bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] space-y-3 ${elevationSystem.raised}`}>
        <h3 className="text-xs font-bold text-[var(--ui-text-primary)] uppercase tracking-wider block">
          Estado del Documento
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          <div className={`p-2.5 rounded-[${radius.control}] bg-[var(--ui-bg-card)] border border-[var(--ui-border)]`}>
            <span className="text-[10px] text-[var(--ui-text-secondary)] block uppercase">Págs. PDF</span>
            <span className="text-base font-bold text-[var(--ui-text-primary)] mt-0.5 block">
              {pdfPageCount}
            </span>
          </div>
          <div className={`p-2.5 rounded-[${radius.control}] bg-[var(--ui-bg-card)] border border-[var(--ui-border)]`}>
            <span className="text-[10px] text-[var(--ui-text-secondary)] block uppercase">Págs. Libro</span>
            <span className="text-base font-bold text-[var(--color-secondary-bright)] mt-0.5 block">
              {finalPageCount}
            </span>
          </div>
          <div className={`p-2.5 rounded-[${radius.control}] bg-[var(--ui-bg-card)] border border-[var(--ui-border)]`}>
            <span className="text-[10px] text-[var(--ui-text-secondary)] block uppercase">Pliegos</span>
            <span className="text-base font-bold text-[var(--color-secondary-bright)] mt-0.5 block">
              {totalSheetsToPrint}
            </span>
          </div>
          <div className={`p-2.5 rounded-[${radius.control}] bg-[var(--ui-bg-card)] border border-[var(--ui-border)]`}>
            <span className="text-[10px] text-[var(--ui-text-secondary)] block uppercase">Rotaciones</span>
            <span className="text-base font-bold text-[var(--color-secondary-bright)] mt-0.5 block">
              {rotatedCount} págs.
            </span>
          </div>
          <div className={`p-2.5 rounded-[${radius.control}] bg-[var(--ui-bg-card)] border border-[var(--ui-border)] col-span-2 sm:col-span-1`}>
            <span className="text-[10px] text-[var(--ui-text-secondary)] block uppercase">Eliminadas</span>
            <span className="text-base font-bold text-[var(--color-status-danger-text)] mt-0.5 block">
              {deletedCount} págs.
            </span>
          </div>
        </div>
      </div>

      {/* Rotación Masiva Única */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-[var(--ui-text-primary)] uppercase tracking-wider block">
          Rotación de Lote
        </h3>

        <button
          type="button"
          onClick={handleRotateAllLeft90}
          className={`${button.base} ${button.secondary} w-full flex items-center justify-between transition cursor-pointer text-xs`}
        >
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-[var(--color-secondary-bright)]" />
            <span>Girar documento -90° (↺)</span>
          </div>
          <span className="text-[10px] text-[var(--ui-text-secondary)] font-normal">Corregir orientación global</span>
        </button>

        {rotatedCount > 0 && (
          <button
            type="button"
            onClick={handleResetRotations}
            className="w-full py-2 px-3 text-xs font-semibold text-[var(--color-secondary-bright)] hover:underline text-center cursor-pointer"
          >
            Restaurar todas las rotaciones a 0°
          </button>
        )}
      </div>

      {/* Restauración de Borrados y Orden */}
      <div className="space-y-3 pt-2 border-t border-[var(--ui-border)]">
        <h3 className="text-xs font-bold text-[var(--ui-text-primary)] uppercase tracking-wider block">
          Restauración
        </h3>

        {deletedCount > 0 ? (
          <button
            type="button"
            onClick={handleRestoreAllDeleted}
            className={`${button.base} ${button.secondary} w-full flex items-center justify-center gap-2 cursor-pointer text-xs`}
          >
            <RefreshCw className="w-4 h-4 text-[var(--color-status-success-bright)]" />
            <span>Restaurar {deletedCount} páginas eliminadas</span>
          </button>
        ) : (
          <p className="text-xs text-[var(--ui-text-secondary)]">No hay páginas eliminadas en este documento.</p>
        )}

        {(options.pageOrder || []).length > 0 && (
          <button
            type="button"
            onClick={handleResetOrder}
            className="w-full py-2 px-3 text-xs font-semibold text-[var(--ui-text-secondary)] hover:underline text-center cursor-pointer"
          >
            Restaurar orden original de páginas
          </button>
        )}
      </div>

      {/* Navegación Bidireccional */}
      <div className="pt-4 border-t border-[var(--ui-border)] flex items-center justify-between">
        {onPrevStep ? (
          <button
            type="button"
            onClick={onPrevStep}
            className={`${button.base} ${button.ghost} flex items-center gap-1.5`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Volver</span>
          </button>
        ) : <div />}

        {onNextStep && (
          <button
            type="button"
            onClick={onNextStep}
            className={`${button.base} ${button.primary} flex items-center gap-1.5`}
          >
            <span>Siguiente</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

