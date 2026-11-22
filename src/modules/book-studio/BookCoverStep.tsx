import React, { useEffect, useState } from 'react';
import { BookOpen, Check, Palette, ChevronLeft, ChevronRight } from 'lucide-react';
import { BookImpositionOptions, CoverConfig } from './domain/impositionEngine';
import { COVER_PRESETS } from '../../shared/core/pdf-engine/layers/presets/coverPresetCatalog';
import { bookAssetManager } from './domain/bookAssetManager';
import { radius, typeScale, button, selectableCard, input } from '../../shared/core/uiDesignSystem';
import { useText } from '../../shared/i18n/useText';

interface BookCoverStepProps {
  options: BookImpositionOptions;
  setOptions: React.Dispatch<React.SetStateAction<BookImpositionOptions>>;
  onNextStep?: () => void;
  onPrevStep?: () => void;
}

export const BookCoverStep: React.FC<BookCoverStepProps> = ({ options, setOptions, onNextStep, onPrevStep }) => {
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
  const [imageError, setImageError] = useState<string | null>(null);
  const [thumbUri, setThumbUri] = useState<string | null>(null);

  // El retiro detrás de la tapa solo tiene sentido si hay alguna tapa (del PDF
  // o personalizada). Con "Sin tapa" el motor no inyecta hojas en blanco.
  const hasCoverChosen = options.hasCover || Boolean(options.customCover);

  useEffect(() => {
    let cancelled = false;
    const currentAssetId = options.customCover?.assetId;
    if (currentAssetId && !thumbUri) {
      bookAssetManager.getThumbUrl(currentAssetId).then((url) => {
        if (!cancelled) setThumbUri(url);
      });
    }
    return () => {
      cancelled = true;
    };
    // Solo cuando cambia la ref del asset, no en cada tecla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.customCover?.assetId]);

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
      // Sin tapa: borrar también la imagen local guardada, no dejar basura.
      if (options.customCover?.assetId) {
        bookAssetManager.remove(options.customCover.assetId);
      }
      setThumbUri(null);
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setImageError(t.bookStudio.sharedBody.notImageFile);
      return;
    }
    try {
      const { assetId } = await bookAssetManager.putFile(file, 'cover');
      // Evitar duplicados huérfanos: la imagen anterior se borra.
      if (coverData.assetId && coverData.assetId !== assetId) {
        bookAssetManager.remove(coverData.assetId);
      }
      setThumbUri(null);
      const updated: CoverConfig = { ...coverData, type: 'upload' as const, assetId, imageUri: undefined };
      setCoverData(updated);
      setImageError(null);
      setOptions((prev) => ({ ...prev, customCover: updated }));
    } catch {
      setImageError(t.bookStudio.sharedBody.saveImageFailed);
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
          className={`${selectableCard.base} ${
            coverType === 'source' ? selectableCard.selected : selectableCard.unselected
          } text-xs font-bold text-center py-2.5 px-2`}
        >
          {t.bookStudio.coverStep.pdfFirstPage}
        </button>

        <button
          type="button"
          onClick={() => handleCoverTypeChange('custom')}
          className={`${selectableCard.base} ${
            coverType === 'custom' ? selectableCard.selected : selectableCard.unselected
          } text-xs font-bold text-center py-2.5 px-2`}
        >
          {t.bookStudio.coverStep.presetMode}
        </button>

        <button
          type="button"
          onClick={() => handleCoverTypeChange('upload')}
          className={`${selectableCard.base} ${
            coverType === 'upload' ? selectableCard.selected : selectableCard.unselected
          } text-xs font-bold text-center py-2.5 px-2`}
        >
          {t.bookStudio.coverStep.uploadMode}
        </button>

        <button
          type="button"
          onClick={() => handleCoverTypeChange('none')}
          className={`${selectableCard.base} ${
            coverType === 'none' ? selectableCard.selected : selectableCard.unselected
          } text-xs font-bold text-center py-2.5 px-2`}
        >
          {t.bookStudio.coverStep.noCoverMode}
        </button>
      </div>

      {coverType === 'upload' && (
        <div className={`space-y-4 p-4 rounded-[${radius.card}] bg-[var(--ui-bg-surface)] border border-[var(--ui-border)]`}>
          <div className="space-y-1">
            <label className={typeScale.fieldLabel}>{t.bookStudio.coverStep.uploadLabel}</label>
            <p className="text-xs text-[var(--ui-text-secondary)]">
              {t.bookStudio.coverStep.uploadHint}
            </p>
          </div>

          <input
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleImageUpload}
            className={`${input.base} cursor-pointer`}
          />

          {imageError && (
            <p className="text-xs font-semibold text-[var(--color-status-danger-text)]">{imageError}</p>
          )}

          {(coverData.imageUri || thumbUri) && (
            <div className="space-y-4">
              <div className={`relative w-full aspect-[1/1.41] max-w-[200px] mx-auto rounded-[${radius.control}] overflow-hidden border border-[var(--ui-border)] shadow-[var(--shadow-raised)] bg-[var(--ui-bg-hover)]`}>
                <img 
                  src={(coverData.imageUri || thumbUri) as string} 
                  alt={t.bookStudio.coverStep.uploadPreviewAlt} 
                  className={`w-full h-full ${
                    coverData.imageFit === 'stretch' ? '' :
                    coverData.imageFit === 'fit' ? 'object-contain' : 'object-cover'
                  }`} 
                />
              </div>

              <div className="space-y-2">
                <label className={typeScale.fieldLabel}>{t.bookStudio.sharedBody.imageFitLabel}</label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="coverImageFit"
                      value="crop"
                      checked={!coverData.imageFit || coverData.imageFit === 'crop'}
                      onChange={() => updateCoverField('imageFit', 'crop')}
                      className="accent-[var(--color-accent-base)]"
                    />
                    <span className="text-xs">{t.bookStudio.sharedBody.imageFitCrop}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="coverImageFit"
                      value="fit"
                      checked={coverData.imageFit === 'fit'}
                      onChange={() => updateCoverField('imageFit', 'fit')}
                      className="accent-[var(--color-accent-base)]"
                    />
                    <span className="text-xs">{t.bookStudio.sharedBody.imageFitContain}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="coverImageFit"
                      value="stretch"
                      checked={coverData.imageFit === 'stretch'}
                      onChange={() => updateCoverField('imageFit', 'stretch')}
                      className="accent-[var(--color-accent-base)]"
                    />
                    <span className="text-xs">{t.bookStudio.sharedBody.imageFitStretch}</span>
                  </label>
                </div>
              </div>
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
              {t.bookStudio.coverStep.presetHeading}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {COVER_PRESETS.map((preset) => {
                const isSelected = (coverData.coverStyle || 'monica-classic') === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => updateCoverField('coverStyle', preset.id)}
                    className={`${selectableCard.base} ${
                      isSelected ? selectableCard.selected : selectableCard.unselected
                    } flex items-center justify-between p-2.5 text-xs`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div
                        className="w-4 h-4 rounded-full border border-black/20 shrink-0"
                        style={{ backgroundColor: preset.badgeBg }}
                      />
                      <span className="truncate font-medium">{preset.name}</span>
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
              <label className={typeScale.fieldLabel}>{t.bookStudio.coverStep.titleLabel}</label>
              <input
                type="text"
                value={coverData.title || ''}
                onChange={(e) => updateCoverField('title', e.target.value)}
                placeholder={t.bookStudio.coverStep.titlePlaceholder}
                className={`${input.base} ${input.focus}`}
              />
            </div>

            <div>
              <label className={typeScale.fieldLabel}>{t.bookStudio.coverStep.authorCompileLabel}</label>
              <input
                type="text"
                value={coverData.author || ''}
                onChange={(e) => updateCoverField('author', e.target.value)}
                placeholder={t.bookStudio.coverStep.authorPlaceholder}
                className={`${input.base} ${input.focus}`}
              />
            </div>

            <div>
              <label className={typeScale.fieldLabel}>{t.bookStudio.sharedBody.publisherLabel}</label>
              <input
                type="text"
                value={coverData.publisher || ''}
                onChange={(e) => updateCoverField('publisher', e.target.value)}
                placeholder={t.bookStudio.sharedBody.publisherPlaceholder}
                className={`${input.base} ${input.focus}`}
              />
            </div>
          </div>
        </div>
      )}

      {/* Retiro de Tapa y Hoja en Blanco Posterior (solo con tapa: del PDF o personalizada) */}
      {hasCoverChosen && (
      <div className={`space-y-4 p-4 rounded-[${radius.card}] bg-[var(--ui-bg-surface)] border border-[var(--ui-border)]`}>
        <label className={`flex items-center justify-between p-3 rounded-[${radius.control}] border border-[var(--ui-border)] bg-[var(--ui-bg-card)] cursor-pointer hover:border-[var(--ui-dock-border)] transition-all`}>
          <div className="space-y-0.5 pr-4">
            <span className="font-bold block text-xs text-[var(--ui-text-primary)]">{t.bookStudio.coverStep.blankBehindLabel}</span>
            <span className="text-[10px] text-[var(--ui-text-secondary)] block">
              {t.bookStudio.coverStep.blankBehindHelper}
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
            <span>{t.bookStudio.backStep}</span>
          </button>
        ) : <div />}

        {onNextStep && (
          <button
            type="button"
            onClick={onNextStep}
            className={`${button.base} ${button.primary} flex items-center gap-1.5 text-xs font-bold`}
          >
            <span>{t.bookStudio.coverStep.nextStep}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};


