import React, { useState } from 'react';
import { BookMarked } from 'lucide-react';
import { BookImpositionOptions, BackCoverConfig } from '../../shared/core/book-engine/impositionEngine';
import { radius, typeScale } from '../../shared/core/uiDesignSystem';

interface BookBackCoverStepProps {
  options: BookImpositionOptions;
  setOptions: React.Dispatch<React.SetStateAction<BookImpositionOptions>>;
}

export const BookBackCoverStep: React.FC<BookBackCoverStepProps> = ({ options, setOptions }) => {
  const [backCoverType, setBackCoverType] = useState<'source' | 'custom' | 'none'>(
    options.hasBackCover ? 'source' : options.customBackCover?.type === 'template' ? 'custom' : 'none'
  );

  const [backCoverData, setBackCoverData] = useState<BackCoverConfig>(
    options.customBackCover || {
      type: 'template',
      synopsis: '',
      publisher: '',
      isbn: '',
      coverStyle: options.customCover?.coverStyle || 'monica-classic',
    }
  );

  const handleBackCoverTypeChange = (type: 'source' | 'custom' | 'none') => {
    setBackCoverType(type);
    if (type === 'source') {
      setOptions((prev) => ({ ...prev, hasBackCover: true, customBackCover: null }));
    } else if (type === 'custom') {
      setOptions((prev) => ({ ...prev, hasBackCover: false, customBackCover: backCoverData }));
    } else {
      setOptions((prev) => ({ ...prev, hasBackCover: false, customBackCover: null }));
    }
  };

  const updateBackCoverField = (field: keyof BackCoverConfig, value: string) => {
    const updated = { ...backCoverData, type: 'template' as const, [field]: value };
    setBackCoverData(updated);
    if (backCoverType === 'custom') {
      setOptions((prev) => ({ ...prev, customBackCover: updated }));
    }
  };

  return (
    <div className="space-y-6 text-[var(--ui-text-primary)]">
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-[var(--ui-text-primary)] flex items-center gap-2">
          <BookMarked className="w-5 h-5 text-[var(--color-accent-base)]" />
          <span>Diseño de Contratapa</span>
        </h2>
        <p className="text-xs text-[var(--ui-text-secondary)]">
          Configura si la cara posterior de tu libro usará la última página del PDF o una contratapa custom (sinopsis, ISBN).
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => handleBackCoverTypeChange('source')}
          className={`p-3 rounded-[${radius.control}] border text-xs font-bold text-center transition-all ${
            backCoverType === 'source'
              ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-light)]/20 text-[var(--ui-text-primary)] shadow-sm'
              : 'border-[var(--ui-border)] bg-[var(--ui-bg-surface)] text-[var(--ui-text-secondary)] hover:border-[var(--ui-dock-border)]'
          }`}
        >
          Última pág. del PDF
        </button>

        <button
          type="button"
          onClick={() => handleBackCoverTypeChange('custom')}
          className={`p-3 rounded-[${radius.control}] border text-xs font-bold text-center transition-all ${
            backCoverType === 'custom'
              ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-light)]/20 text-[var(--ui-text-primary)] shadow-sm'
              : 'border-[var(--ui-border)] bg-[var(--ui-bg-surface)] text-[var(--ui-text-secondary)] hover:border-[var(--ui-dock-border)]'
          }`}
        >
          Contratapa Custom
        </button>

        <button
          type="button"
          onClick={() => handleBackCoverTypeChange('none')}
          className={`p-3 rounded-[${radius.control}] border text-xs font-bold text-center transition-all ${
            backCoverType === 'none'
              ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-light)]/20 text-[var(--ui-text-primary)] shadow-sm'
              : 'border-[var(--ui-border)] bg-[var(--ui-bg-surface)] text-[var(--ui-text-secondary)] hover:border-[var(--ui-dock-border)]'
          }`}
        >
          Sin Contratapa
        </button>
      </div>

      {backCoverType === 'custom' && (
        <div className={`space-y-4 p-4 rounded-[${radius.card}] bg-[var(--ui-bg-surface)] border border-[var(--ui-border)]`}>
          <p className="text-xs text-[var(--ui-text-secondary)]">
            La contratapa hereda automáticamente el preset visual elegido en la tapa para mantener la coherencia de diseño.
          </p>

          <div className="space-y-3">
            <div>
              <label className={typeScale.fieldLabel}>Sinopsis / Texto de Contratapa</label>
              <textarea
                rows={3}
                value={backCoverData.synopsis || ''}
                onChange={(e) => updateBackCoverField('synopsis', e.target.value)}
                placeholder="Breve reseña del contenido o dedicatoria..."
                className={`w-full px-3 py-2 rounded-[${radius.control}] border border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-xs text-[var(--ui-text-primary)] focus:border-[var(--color-accent-base)] outline-none resize-none`}
              />
            </div>

            <div>
              <label className={typeScale.fieldLabel}>ISBN / Código (opcional)</label>
              <input
                type="text"
                value={backCoverData.isbn || ''}
                onChange={(e) => updateBackCoverField('isbn', e.target.value)}
                placeholder="Ej. 978-987-0000-00-0"
                className={`w-full px-3 py-2 rounded-[${radius.control}] border border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-xs text-[var(--ui-text-primary)] focus:border-[var(--color-accent-base)] outline-none`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
