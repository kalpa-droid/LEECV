import React, { useState } from 'react';
import { BookMarked, ChevronRight } from 'lucide-react';
import { BookImpositionOptions, BackCoverConfig } from '../../shared/core/book-engine/impositionEngine';
import { radius, typeScale } from '../../shared/core/uiDesignSystem';
import { useText } from '../../shared/i18n/useText';

interface BookBackCoverStepProps {
  options: BookImpositionOptions;
  setOptions: React.Dispatch<React.SetStateAction<BookImpositionOptions>>;
  onNextStep?: () => void;
}

export const BookBackCoverStep: React.FC<BookBackCoverStepProps> = ({ options, setOptions, onNextStep }) => {
  const t = useText();
  const [backCoverType, setBackCoverType] = useState<'source' | 'custom' | 'upload' | 'none'>(
    options.hasBackCover
      ? 'source'
      : options.customBackCover?.type === 'upload'
      ? 'upload'
      : options.customBackCover?.type === 'template'
      ? 'custom'
      : 'none'
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

  const handleBackCoverTypeChange = (type: 'source' | 'custom' | 'upload' | 'none') => {
    setBackCoverType(type);
    if (type === 'source') {
      setOptions((prev) => ({ ...prev, hasBackCover: true, customBackCover: null }));
    } else if (type === 'custom') {
      const updated = { ...backCoverData, type: 'template' as const };
      setOptions((prev) => ({ ...prev, hasBackCover: false, customBackCover: updated }));
    } else if (type === 'upload') {
      const updated = { ...backCoverData, type: 'upload' as const };
      setOptions((prev) => ({ ...prev, hasBackCover: false, customBackCover: updated }));
    } else {
      setOptions((prev) => ({ ...prev, hasBackCover: false, customBackCover: null }));
    }
  };

  const updateBackCoverField = (field: keyof BackCoverConfig, value: string) => {
    const updated = { ...backCoverData, type: (backCoverType === 'upload' ? 'upload' : 'template') as any, [field]: value };
    setBackCoverData(updated);
    if (backCoverType === 'custom' || backCoverType === 'upload') {
      setOptions((prev) => ({ ...prev, customBackCover: updated }));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        updateBackCoverField('imageUri', dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6 text-[var(--ui-text-primary)]">
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-[var(--ui-text-primary)] flex items-center gap-2">
          <BookMarked className="w-5 h-5 text-[var(--color-accent-text)]" />
          <span>{t.bookStudio.backCoverStep.title}</span>
        </h2>
        <p className="text-xs text-[var(--ui-text-secondary)]">
          {t.bookStudio.backCoverStep.description}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => handleBackCoverTypeChange('source')}
          className={`p-2.5 rounded-[${radius.control}] border text-xs font-bold text-center transition-all cursor-pointer ${
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
          className={`p-2.5 rounded-[${radius.control}] border text-xs font-bold text-center transition-all cursor-pointer ${
            backCoverType === 'custom'
              ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-light)]/20 text-[var(--ui-text-primary)] shadow-sm'
              : 'border-[var(--ui-border)] bg-[var(--ui-bg-surface)] text-[var(--ui-text-secondary)] hover:border-[var(--ui-dock-border)]'
          }`}
        >
          Contratapa Custom
        </button>

        <button
          type="button"
          onClick={() => handleBackCoverTypeChange('upload')}
          className={`p-2.5 rounded-[${radius.control}] border text-xs font-bold text-center transition-all cursor-pointer ${
            backCoverType === 'upload'
              ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-light)]/20 text-[var(--ui-text-primary)] shadow-sm'
              : 'border-[var(--ui-border)] bg-[var(--ui-bg-surface)] text-[var(--ui-text-secondary)] hover:border-[var(--ui-dock-border)]'
          }`}
        >
          Subir mi Contratapa
        </button>

        <button
          type="button"
          onClick={() => handleBackCoverTypeChange('none')}
          className={`p-2.5 rounded-[${radius.control}] border text-xs font-bold text-center transition-all cursor-pointer ${
            backCoverType === 'none'
              ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-light)]/20 text-[var(--ui-text-primary)] shadow-sm'
              : 'border-[var(--ui-border)] bg-[var(--ui-bg-surface)] text-[var(--ui-text-secondary)] hover:border-[var(--ui-dock-border)]'
          }`}
        >
          Sin Contratapa
        </button>
      </div>

      {backCoverType === 'upload' && (
        <div className={`space-y-4 p-4 rounded-[${radius.card}] bg-[var(--ui-bg-surface)] border border-[var(--ui-border)]`}>
          <div className="space-y-1">
            <label className={typeScale.fieldLabel}>Archivo de Imagen de Contratapa (JPG o PNG)</label>
            <p className="text-xs text-[var(--ui-text-secondary)]">
              Sube una imagen diseñada para la contratapa de tu libro.
            </p>
          </div>

          <input
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleImageUpload}
            className={`w-full px-3 py-2 rounded-[${radius.control}] border border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-xs text-[var(--ui-text-primary)] cursor-pointer`}
          />

          {backCoverData.imageUri && (
            <div className="relative w-full aspect-[1/1.4] max-w-[200px] mx-auto rounded-lg overflow-hidden border border-[var(--ui-border)] shadow-md">
              <img src={backCoverData.imageUri} alt="Vista previa contratapa subida" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      )}

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

      {/* Retiro de Contratapa y Hoja en Blanco Anterior */}
      <div className={`space-y-4 p-4 rounded-[${radius.card}] bg-[var(--ui-bg-surface)] border border-[var(--ui-border)]`}>
        <h3 className="text-xs font-bold text-[var(--ui-text-primary)] uppercase tracking-wider block">
          Ajustes de Retiro de Contratapa
        </h3>

        <label className={`flex items-center justify-between p-3 rounded-[${radius.control}] border border-[var(--ui-border)] bg-[var(--ui-bg-card)] cursor-pointer hover:border-[var(--ui-dock-border)] transition-all`}>
          <div className="space-y-0.5 pr-4">
            <span className="font-bold block text-xs text-[var(--ui-text-primary)]">Hoja en blanco delante de la Contratapa</span>
            <span className="text-[10px] text-[var(--ui-text-secondary)] block">
              Asegura que el reverso de la última hoja del cuerpo quede limpio antes de la contratapa.
            </span>
          </div>
          <input
            type="checkbox"
            checked={options.blankInFrontBackCover !== false}
            onChange={(e) => setOptions((prev) => ({ ...prev, blankInFrontBackCover: e.target.checked }))}
            className="w-4 h-4 accent-[var(--color-accent-base)] rounded focus:ring-0 cursor-pointer"
          />
        </label>
      </div>

      {onNextStep && (
        <div className="pt-4 border-t border-[var(--ui-border)] flex justify-end">
          <button
            type="button"
            onClick={onNextStep}
            className={`py-2 px-4 rounded-[${radius.control}] bg-[var(--ui-bg-card)] border border-[var(--ui-border)] hover:border-[var(--color-accent-base)] text-xs font-bold text-[var(--color-accent-text)] transition flex items-center gap-1.5 cursor-pointer`}
          >
            <span>Siguiente: 7. Exportar</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
