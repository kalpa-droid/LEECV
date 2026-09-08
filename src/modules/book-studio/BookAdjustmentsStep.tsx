import React from 'react';
import { Sliders, RotateCw } from 'lucide-react';
import { BookImpositionOptions } from '../../shared/core/book-engine/impositionEngine';
import { radius, typeScale } from '../../shared/core/uiDesignSystem';

interface BookAdjustmentsStepProps {
  options: BookImpositionOptions;
  setOptions: React.Dispatch<React.SetStateAction<BookImpositionOptions>>;
}

export const BookAdjustmentsStep: React.FC<BookAdjustmentsStepProps> = ({ options, setOptions }) => {
  return (
    <div className="space-y-6 text-[var(--ui-text-primary)]">
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-[var(--ui-text-primary)] flex items-center gap-2">
          <Sliders className="w-5 h-5 text-[var(--color-accent-base)]" />
          <span>Ajustes & Páginas en Blanco</span>
        </h2>
        <p className="text-xs text-[var(--ui-text-secondary)]">
          Controla la colocación de hojas en blanco (retiro de tapa) y la orientación de la imposición en pliegos.
        </p>
      </div>

      <div className="space-y-4">
        <label className={`flex items-center justify-between p-4 rounded-[${radius.card}] border border-[var(--ui-border)] bg-[var(--ui-bg-surface)] cursor-pointer hover:border-[var(--ui-dock-border)] transition-all`}>
          <div className="space-y-0.5 pr-4">
            <span className="font-bold block text-sm text-[var(--ui-text-primary)]">Hoja en blanco detrás de la Tapa</span>
            <span className="text-xs text-[var(--ui-text-secondary)] block">
              Deja el retiro de la tapa sin imprimir (tapa limpia en blanco al abrir el libro).
            </span>
          </div>
          <input
            type="checkbox"
            checked={options.blankBehindCover !== false}
            onChange={(e) => setOptions((prev) => ({ ...prev, blankBehindCover: e.target.checked }))}
            className="w-4 h-4 text-[var(--color-accent-base)] rounded focus:ring-0"
          />
        </label>

        <label className={`flex items-center justify-between p-4 rounded-[${radius.card}] border border-[var(--ui-border)] bg-[var(--ui-bg-surface)] cursor-pointer hover:border-[var(--ui-dock-border)] transition-all`}>
          <div className="space-y-0.5 pr-4">
            <span className="font-bold block text-sm text-[var(--ui-text-primary)]">Hoja en blanco delante de la Contratapa</span>
            <span className="text-xs text-[var(--ui-text-secondary)] block">
              Asegura que el reverso de la última hoja del cuerpo del libro quede limpio antes de la contratapa.
            </span>
          </div>
          <input
            type="checkbox"
            checked={options.blankInFrontBackCover !== false}
            onChange={(e) => setOptions((prev) => ({ ...prev, blankInFrontBackCover: e.target.checked }))}
            className="w-4 h-4 text-[var(--color-accent-base)] rounded focus:ring-0"
          />
        </label>
      </div>
    </div>
  );
};
