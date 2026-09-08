import React, { useState } from 'react';
import { BookOpen, Check, Palette } from 'lucide-react';
import { BookImpositionOptions, CoverConfig } from '../../shared/core/book-engine/impositionEngine';
import { COVER_PRESETS } from '../../shared/core/pdf-engine/layers/presets/coverPresetCatalog';
import { radius, typeScale } from '../../shared/core/uiDesignSystem';

interface BookCoverStepProps {
  options: BookImpositionOptions;
  setOptions: React.Dispatch<React.SetStateAction<BookImpositionOptions>>;
}

export const BookCoverStep: React.FC<BookCoverStepProps> = ({ options, setOptions }) => {
  const [coverType, setCoverType] = useState<'source' | 'custom' | 'none'>(
    options.hasCover ? 'source' : options.customCover?.type === 'template' ? 'custom' : 'none'
  );

  const [coverData, setCoverData] = useState<CoverConfig>(
    options.customCover || {
      type: 'template',
      title: '',
      author: '',
      publisher: '',
      coverStyle: 'monica-classic',
    }
  );

  const handleCoverTypeChange = (type: 'source' | 'custom' | 'none') => {
    setCoverType(type);
    if (type === 'source') {
      setOptions((prev) => ({ ...prev, hasCover: true, customCover: null }));
    } else if (type === 'custom') {
      setOptions((prev) => ({ ...prev, hasCover: false, customCover: coverData }));
    } else {
      setOptions((prev) => ({ ...prev, hasCover: false, customCover: null }));
    }
  };

  const updateCoverField = (field: keyof CoverConfig, value: string) => {
    const updated = { ...coverData, type: 'template' as const, [field]: value };
    setCoverData(updated);
    if (coverType === 'custom') {
      setOptions((prev) => ({ ...prev, customCover: updated }));
    }
  };

  return (
    <div className="space-y-6 text-[var(--ui-text-primary)]">
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-[var(--ui-text-primary)] flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-[var(--color-accent-base)]" />
          <span>Diseño de Tapa (Portada)</span>
        </h2>
        <p className="text-xs text-[var(--ui-text-secondary)]">
          Configura si el primer pliego de tu libro usará la página 1 de tu PDF o una Tapa Tipográfica con preset visual.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => handleCoverTypeChange('source')}
          className={`p-3 rounded-[${radius.control}] border text-xs font-bold text-center transition-all ${
            coverType === 'source'
              ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-light)]/20 text-[var(--ui-text-primary)] shadow-sm'
              : 'border-[var(--ui-border)] bg-[var(--ui-bg-surface)] text-[var(--ui-text-secondary)] hover:border-[var(--ui-dock-border)]'
          }`}
        >
          Página 1 del PDF
        </button>

        <button
          type="button"
          onClick={() => handleCoverTypeChange('custom')}
          className={`p-3 rounded-[${radius.control}] border text-xs font-bold text-center transition-all ${
            coverType === 'custom'
              ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-light)]/20 text-[var(--ui-text-primary)] shadow-sm'
              : 'border-[var(--ui-border)] bg-[var(--ui-bg-surface)] text-[var(--ui-text-secondary)] hover:border-[var(--ui-dock-border)]'
          }`}
        >
          Tapa con Preset
        </button>

        <button
          type="button"
          onClick={() => handleCoverTypeChange('none')}
          className={`p-3 rounded-[${radius.control}] border text-xs font-bold text-center transition-all ${
            coverType === 'none'
              ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-light)]/20 text-[var(--ui-text-primary)] shadow-sm'
              : 'border-[var(--ui-border)] bg-[var(--ui-bg-surface)] text-[var(--ui-text-secondary)] hover:border-[var(--ui-dock-border)]'
          }`}
        >
          Sin Tapa Especial
        </button>
      </div>

      {coverType === 'custom' && (
        <div className={`space-y-5 p-4 rounded-[${radius.card}] bg-[var(--ui-bg-surface)] border border-[var(--ui-border)]`}>
          {/* Selector de Presets de Portada (mismo catálogo del CV) */}
          <div className="space-y-2">
            <label className={`${typeScale.fieldLabel} flex items-center gap-1.5`}>
              <Palette className="w-3.5 h-3.5 text-[var(--color-accent-base)]" />
              Estilo Visual de Tapa (Catálogo de Portadas)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {COVER_PRESETS.map((preset) => {
                const isSelected = (coverData.coverStyle || 'monica-classic') === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => updateCoverField('coverStyle', preset.id)}
                    className={`flex items-center justify-between p-2.5 rounded-[${radius.control}] border text-left text-xs transition-all ${
                      isSelected
                        ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-light)]/20 font-bold'
                        : 'border-[var(--ui-border)] hover:border-[var(--ui-dock-border)]'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div
                        className="w-4 h-4 rounded-full border border-black/20 shrink-0"
                        style={{ backgroundColor: preset.badgeBg }}
                      />
                      <span className="truncate">{preset.name}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[var(--color-accent-base)] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Campos de Texto para la Tapa */}
          <div className="space-y-3 pt-2">
            <div>
              <label className={typeScale.fieldLabel}>Título del Libro</label>
              <input
                type="text"
                value={coverData.title || ''}
                onChange={(e) => updateCoverField('title', e.target.value)}
                placeholder="Ej. Antología Poética 2026"
                className={`w-full px-3 py-2 rounded-[${radius.control}] border border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-xs text-[var(--ui-text-primary)] focus:border-[var(--color-accent-base)] outline-none`}
              />
            </div>

            <div>
              <label className={typeScale.fieldLabel}>Autor / Compilador</label>
              <input
                type="text"
                value={coverData.author || ''}
                onChange={(e) => updateCoverField('author', e.target.value)}
                placeholder="Ej. María Daniela Burgos"
                className={`w-full px-3 py-2 rounded-[${radius.control}] border border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-xs text-[var(--ui-text-primary)] focus:border-[var(--color-accent-base)] outline-none`}
              />
            </div>

            <div>
              <label className={typeScale.fieldLabel}>Editorial / Edición (opcional)</label>
              <input
                type="text"
                value={coverData.publisher || ''}
                onChange={(e) => updateCoverField('publisher', e.target.value)}
                placeholder="Ej. Ediciones Kalpagráfica"
                className={`w-full px-3 py-2 rounded-[${radius.control}] border border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-xs text-[var(--ui-text-primary)] focus:border-[var(--color-accent-base)] outline-none`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
