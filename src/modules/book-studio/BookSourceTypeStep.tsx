import React from 'react';
import { Layers, BookOpen, Copy } from 'lucide-react';
import { BookImpositionOptions } from '../../shared/core/book-engine/impositionEngine';
import { radius, elevationSystem } from '../../shared/core/uiDesignSystem';

interface BookSourceTypeStepProps {
  options: BookImpositionOptions;
  setOptions: React.Dispatch<React.SetStateAction<BookImpositionOptions>>;
}

export const BookSourceTypeStep: React.FC<BookSourceTypeStepProps> = ({ options, setOptions }) => {
  return (
    <div className="space-y-6 text-[var(--ui-text-primary)]">
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-[var(--ui-text-primary)] flex items-center gap-2">
          <Layers className="w-5 h-5 text-[var(--color-accent-base)]" />
          <span>Tipo de Origen del PDF</span>
        </h2>
        <p className="text-xs text-[var(--ui-text-secondary)]">
          Indica el formato de las páginas en tu archivo PDF original para que el motor las organice correctamente.
        </p>
      </div>

      <div className="space-y-3">
        <label
          onClick={() => setOptions((prev) => ({ ...prev, mode: 'normal' }))}
          className={`flex items-start p-4 rounded-[${radius.card}] border-2 cursor-pointer transition-all ${
            options.mode !== 'fotocopia'
              ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-light)]/10 shadow-sm'
              : 'border-[var(--ui-border)] bg-[var(--ui-bg-surface)] hover:border-[var(--ui-dock-border)]'
          }`}
        >
          <input
            type="radio"
            name="bookMode"
            checked={options.mode !== 'fotocopia'}
            onChange={() => {}}
            className="mt-1 text-[var(--color-accent-base)]"
          />
          <div className="ml-3 space-y-1">
            <span className="font-bold block text-sm text-[var(--ui-text-primary)] flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[var(--color-accent-base)]" />
              PDF Estándar (1 pág. por hoja)
            </span>
            <span className="text-xs text-[var(--ui-text-secondary)] block">
              Ideal para documentos digitales creados en Word, Canva o InDesign exportados directamente a PDF.
            </span>
          </div>
        </label>

        <label
          onClick={() => setOptions((prev) => ({ ...prev, mode: 'fotocopia' }))}
          className={`flex items-start p-4 rounded-[${radius.card}] border-2 cursor-pointer transition-all ${
            options.mode === 'fotocopia'
              ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-light)]/10 shadow-sm'
              : 'border-[var(--ui-border)] bg-[var(--ui-bg-surface)] hover:border-[var(--ui-dock-border)]'
          }`}
        >
          <input
            type="radio"
            name="bookMode"
            checked={options.mode === 'fotocopia'}
            onChange={() => {}}
            className="mt-1 text-[var(--color-accent-base)]"
          />
          <div className="ml-3 space-y-1">
            <span className="font-bold block text-sm text-[var(--ui-text-primary)] flex items-center gap-2">
              <Copy className="w-4 h-4 text-[var(--color-accent-base)]" />
              Fotocopia / Escaneo (2 págs. por hoja)
            </span>
            <span className="text-xs text-[var(--ui-text-secondary)] block">
              Para PDF con 2 páginas escaneadas lado a lado en cada hoja. El motor las dividirá automáticamente al centro.
            </span>
          </div>
        </label>
      </div>
    </div>
  );
};
