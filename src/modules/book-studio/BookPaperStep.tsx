import React from 'react';
import { Settings, FileText, Info, ChevronRight } from 'lucide-react';
import { BookImpositionOptions } from '../../shared/core/book-engine/impositionEngine';
import { radius } from '../../shared/core/uiDesignSystem';
import { useText } from '../../shared/i18n/useText';

interface BookPaperStepProps {
  options: BookImpositionOptions;
  setOptions: React.Dispatch<React.SetStateAction<BookImpositionOptions>>;
  onNextStep?: () => void;
}

export const BookPaperStep: React.FC<BookPaperStepProps> = ({ options, setOptions, onNextStep }) => {
  const t = useText();
  return (
    <div className="space-y-6 text-[var(--ui-text-primary)]">
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-[var(--ui-text-primary)] flex items-center gap-2">
          <Settings className="w-5 h-5 text-[var(--color-accent-text)]" />
          <span>{t.bookStudio.paperStep.title}</span>
        </h2>
        <p className="text-xs text-[var(--ui-text-secondary)]">
          {t.bookStudio.paperStep.description}
        </p>
      </div>

      <div className={`p-3.5 bg-[var(--color-accent-light)]/20 border border-[var(--color-accent-base)]/30 rounded-[${radius.card}] flex items-start gap-3 text-xs text-[var(--ui-text-primary)]`}>
        <Info className="w-4 h-4 text-[var(--color-accent-text)] shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block">Relación de Tamaño Imprenta:</span>
          <span>Imprimís en hojas A4 ➔ tu libro final sale en tamaño A5. Imprimís en hojas A3 ➔ tu libro sale en A4.</span>
        </div>
      </div>

      <div className="space-y-3">
        <label
          onClick={() => setOptions((prev) => ({ ...prev, paperSize: 'A4' }))}
          className={`flex items-start p-4 rounded-[${radius.card}] border-2 cursor-pointer transition-all ${
            options.paperSize !== 'A3'
              ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-light)]/10 shadow-sm'
              : 'border-[var(--ui-border)] bg-[var(--ui-bg-surface)] hover:border-[var(--ui-dock-border)]'
          }`}
        >
          <input
            type="radio"
            name="paperSize"
            checked={options.paperSize !== 'A3'}
            onChange={() => {}}
            className="mt-1 text-[var(--color-accent-text)]"
          />
          <div className="ml-3 space-y-1">
            <span className="font-bold block text-sm text-[var(--ui-text-primary)] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[var(--color-accent-text)]" />
              Hoja A4 (Libro final A5)
            </span>
            <span className="text-xs text-[var(--ui-text-secondary)] block">
              Imprime en hojas A4 y dobla al medio. Formato bolsillo/estándar A5 (148 x 210 mm).
            </span>
          </div>
        </label>

        <label
          onClick={() => setOptions((prev) => ({ ...prev, paperSize: 'A3' }))}
          className={`flex items-start p-4 rounded-[${radius.card}] border-2 cursor-pointer transition-all ${
            options.paperSize === 'A3'
              ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-light)]/10 shadow-sm'
              : 'border-[var(--ui-border)] bg-[var(--ui-bg-surface)] hover:border-[var(--ui-dock-border)]'
          }`}
        >
          <input
            type="radio"
            name="paperSize"
            checked={options.paperSize === 'A3'}
            onChange={() => {}}
            className="mt-1 text-[var(--color-accent-text)]"
          />
          <div className="ml-3 space-y-1">
            <span className="font-bold block text-sm text-[var(--ui-text-primary)] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[var(--color-accent-text)]" />
              Hoja A3 (Libro final A4)
            </span>
            <span className="text-xs text-[var(--ui-text-secondary)] block">
              Imprime en hojas grandes A3 y dobla al medio. Formato grande A4 (210 x 297 mm).
            </span>
          </div>
        </label>
      </div>

      {onNextStep && (
        <div className="pt-4 border-t border-[var(--ui-border)] flex justify-end">
          <button
            type="button"
            onClick={onNextStep}
            className={`py-2 px-4 rounded-[${radius.control}] bg-[var(--ui-bg-card)] border border-[var(--ui-border)] hover:border-[var(--color-accent-base)] text-xs font-bold text-[var(--color-accent-text)] transition flex items-center gap-1.5 cursor-pointer`}
          >
            <span>Siguiente: 5. Tapa</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
