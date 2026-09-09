import React, { useState } from 'react';
import { BookOpen, Check, Palette } from 'lucide-react';
import { BookImpositionOptions, CoverConfig } from '../../shared/core/book-engine/impositionEngine';
import { COVER_PRESETS } from '../../shared/core/pdf-engine/layers/presets/coverPresetCatalog';
import { radius, typeScale } from '../../shared/core/uiDesignSystem';
import { useText } from '../../shared/i18n/useText';

interface BookCoverStepProps {
  options: BookImpositionOptions;
  setOptions: React.Dispatch<React.SetStateAction<BookImpositionOptions>>;
}

export const BookCoverStep: React.FC<BookCoverStepProps> = ({ options, setOptions }) => {
  const t = useText();
  const [coverType, setCoverType] = useState<'source' | 'custom' | 'upload' | 'none'>(
    options.hasCover
      ? 'source'
      : options.customCover?.type === 'upload'
      ? 'upload'
      : options.customCover?.type === 'template'
      ? 'custom'
      : 'none'
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

  const handleCoverTypeChange = (type: 'source' | 'custom' | 'upload' | 'none') => {
    setCoverType(type);
    if (type === 'source') {
      setOptions((prev) => ({ ...prev, hasCover: true, customCover: null }));
    } else if (type === 'custom') {
      const updated = { ...coverData, type: 'template' as const };
      setOptions((prev) => ({ ...prev, hasCover: false, customCover: updated }));
    } else if (type === 'upload') {
      const updated = { ...coverData, type: 'upload' as const };
      setOptions((prev) => ({ ...prev, hasCover: false, customCover: updated }));
    } else {
      setOptions((prev) => ({ ...prev, hasCover: false, customCover: null }));
    }
  };

  const updateCoverField = (field: keyof CoverConfig, value: string) => {
    const updated = { ...coverData, type: (coverType === 'upload' ? 'upload' : 'template') as any, [field]: value };
    setCoverData(updated);
    if (coverType === 'custom' || coverType === 'upload') {
      setOptions((prev) => ({ ...prev, customCover: updated }));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        updateCoverField('imageUri', dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6 text-[var(--ui-text-primary)]">
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-[var(--ui-text-primary)] flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-[var(--color-accent-text)]" />
          <span>{t.bookStudio.coverStep.title}</span>
        </h2>
        <p className="text-xs text-[var(--ui-text-secondary)]">
          {t.bookStudio.coverStep.description}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => handleCoverTypeChange('source')}
          className={`p-2.5 rounded-[${radius.control}] border text-xs font-bold text-center transition-all cursor-pointer ${
            coverType === 'source'
              ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-light)]/20 text-[var(--ui-text-primary)] shadow-sm'
              : 'border-[var(--ui-border)] bg-[var(--ui-bg-surface)] text-[var(--ui-text-secondary)] hover:border-[var(--ui-dock-border)]'
          }`}
        >
          Pág. 1 del PDF
        </button>

        <button
          type="button"
          onClick={() => handleCoverTypeChange('custom')}
          className={`p-2.5 rounded-[${radius.control}] border text-xs font-bold text-center transition-all cursor-pointer ${
            coverType === 'custom'
              ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-light)]/20 text-[var(--ui-text-primary)] shadow-sm'
              : 'border-[var(--ui-border)] bg-[var(--ui-bg-surface)] text-[var(--ui-text-secondary)] hover:border-[var(--ui-dock-border)]'
          }`}
        >
          Tapa con Preset
        </button>

        <button
          type="button"
          onClick={() => handleCoverTypeChange('upload')}
          className={`p-2.5 rounded-[${radius.control}] border text-xs font-bold text-center transition-all cursor-pointer ${
            coverType === 'upload'
              ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-light)]/20 text-[var(--ui-text-primary)] shadow-sm'
              : 'border-[var(--ui-border)] bg-[var(--ui-bg-surface)] text-[var(--ui-text-secondary)] hover:border-[var(--ui-dock-border)]'
          }`}
        >
          Subir mi Tapa
        </button>

        <button
          type="button"
          onClick={() => handleCoverTypeChange('none')}
          className={`p-2.5 rounded-[${radius.control}] border text-xs font-bold text-center transition-all cursor-pointer ${
            coverType === 'none'
              ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-light)]/20 text-[var(--ui-text-primary)] shadow-sm'
              : 'border-[var(--ui-border)] bg-[var(--ui-bg-surface)] text-[var(--ui-text-secondary)] hover:border-[var(--ui-dock-border)]'
          }`}
        >
          Sin Tapa Especial
        </button>
      </div>

      {coverType === 'upload' && (
        <div className={`space-y-4 p-4 rounded-[${radius.card}] bg-[var(--ui-bg-surface)] border border-[var(--ui-border)]`}>
          <div className="space-y-1">
            <label className={typeScale.fieldLabel}>Archivo de Imagen de Tapa (JPG o PNG)</label>
            <p className="text-xs text-[var(--ui-text-secondary)]">
              Sube una imagen diseñada para la portada completa de tu libro. Se escalará para cubrir la hoja.
            </p>
          </div>

          <input
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleImageUpload}
            className={`w-full px-3 py-2 rounded-[${radius.control}] border border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-xs text-[var(--ui-text-primary)] cursor-pointer`}
          />

          {coverData.imageUri && (
            <div className="relative w-full aspect-[1/1.4] max-w-[200px] mx-auto rounded-lg overflow-hidden border border-[var(--ui-border)] shadow-md">
              <img src={coverData.imageUri} alt="Vista previa tapa subida" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      )}

      {coverType === 'custom' && (
        <div className={`space-y-5 p-4 rounded-[${radius.card}] bg-[var(--ui-bg-surface)] border border-[var(--ui-border)]`}>
          {/* Selector de Presets de Portada (mismo catálogo del CV) */}
          <div className="space-y-2">
            <label className={`${typeScale.fieldLabel} flex items-center gap-1.5`}>
              <Palette className="w-3.5 h-3.5 text-[var(--color-accent-text)]" />
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
                    {isSelected && <Check className="w-4 h-4 text-[var(--color-accent-text)] shrink-0" />}
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

      {/* Retiro de Tapa y Hoja en Blanco Posterior */}
      <div className={`space-y-4 p-4 rounded-[${radius.card}] bg-[var(--ui-bg-surface)] border border-[var(--ui-border)]`}>
        <h3 className="text-xs font-bold text-[var(--ui-text-primary)] uppercase tracking-wider block">
          Ajustes de Retiro de Tapa
        </h3>

        <label className={`flex items-center justify-between p-3 rounded-[${radius.control}] border border-[var(--ui-border)] bg-[var(--ui-bg-card)] cursor-pointer hover:border-[var(--ui-dock-border)] transition-all`}>
          <div className="space-y-0.5 pr-4">
            <span className="font-bold block text-xs text-[var(--ui-text-primary)]">Hoja en blanco detrás de la Tapa</span>
            <span className="text-[10px] text-[var(--ui-text-secondary)] block">
              Deja la cara posterior (retiro) de la portada limpia sin texto del cuerpo.
            </span>
          </div>
          <input
            type="checkbox"
            checked={options.blankBehindCover !== false}
            onChange={(e) => setOptions((prev) => ({ ...prev, blankBehindCover: e.target.checked }))}
            className="w-4 h-4 accent-[var(--color-accent-base)] rounded focus:ring-0 cursor-pointer"
          />
        </label>
      </div>
    </div>
  );
};
