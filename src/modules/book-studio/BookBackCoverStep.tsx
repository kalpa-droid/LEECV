import React, { useEffect, useState } from 'react';
import { BookMarked, ChevronLeft, ChevronRight, Palette, Check } from 'lucide-react';
import { BookImpositionOptions, BackCoverConfig } from '../../shared/core/book-engine/impositionEngine';
import { COVER_PRESETS } from '../../shared/core/pdf-engine/layers/presets/coverPresetCatalog';
import { bookAssetManager } from '../../shared/core/book-engine/bookAssetManager';
import { radius, typeScale, button, selectableCard, input } from '../../shared/core/uiDesignSystem';
import { useText } from '../../shared/i18n/useText';

interface BookBackCoverStepProps {
  options: BookImpositionOptions;
  setOptions: React.Dispatch<React.SetStateAction<BookImpositionOptions>>;
  onNextStep?: () => void;
  onPrevStep?: () => void;
}

export const BookBackCoverStep: React.FC<BookBackCoverStepProps> = ({ options, setOptions, onNextStep, onPrevStep }) => {
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
  const [imageError, setImageError] = useState<string | null>(null);
  const [thumbUri, setThumbUri] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const currentAssetId = options.customBackCover?.assetId;
    if (currentAssetId && !thumbUri) {
      bookAssetManager.getThumbUrl(currentAssetId).then((url) => {
        if (!cancelled) setThumbUri(url);
      });
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.customBackCover?.assetId]);

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
      // Sin contratapa: borrar también la imagen local guardada, no dejar basura.
      if (options.customBackCover?.assetId) {
        bookAssetManager.remove(options.customBackCover.assetId);
      }
      setThumbUri(null);
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setImageError(t.bookStudio.sharedBody.notImageFile);
      return;
    }
    try {
      const { assetId } = await bookAssetManager.putFile(file, 'backCover');
      // Evitar duplicados huérfanos: la imagen anterior se borra.
      if (backCoverData.assetId && backCoverData.assetId !== assetId) {
        bookAssetManager.remove(backCoverData.assetId);
      }
      setThumbUri(null);
      const updated: BackCoverConfig = { ...backCoverData, type: 'upload' as const, assetId, imageUri: undefined };
      setBackCoverData(updated);
      setImageError(null);
      setOptions((prev) => ({ ...prev, customBackCover: updated }));
    } catch {
      setImageError(t.bookStudio.sharedBody.saveImageFailed);
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
          className={`${selectableCard.base} ${
            backCoverType === 'source' ? selectableCard.selected : selectableCard.unselected
          } text-xs font-bold text-center py-2.5 px-2`}
        >
          {t.bookStudio.backCoverStep.lastPdfPage}
        </button>

        <button
          type="button"
          onClick={() => handleBackCoverTypeChange('custom')}
          className={`${selectableCard.base} ${
            backCoverType === 'custom' ? selectableCard.selected : selectableCard.unselected
          } text-xs font-bold text-center py-2.5 px-2`}
        >
          {t.bookStudio.backCoverStep.customMode}
        </button>

        <button
          type="button"
          onClick={() => handleBackCoverTypeChange('upload')}
          className={`${selectableCard.base} ${
            backCoverType === 'upload' ? selectableCard.selected : selectableCard.unselected
          } text-xs font-bold text-center py-2.5 px-2`}
        >
          {t.bookStudio.backCoverStep.uploadMode}
        </button>

        <button
          type="button"
          onClick={() => handleBackCoverTypeChange('none')}
          className={`${selectableCard.base} ${
            backCoverType === 'none' ? selectableCard.selected : selectableCard.unselected
          } text-xs font-bold text-center py-2.5 px-2`}
        >
          {t.bookStudio.backCoverStep.noBackCoverMode}
        </button>
      </div>

      {backCoverType === 'upload' && (
        <div className={`space-y-4 p-4 rounded-[${radius.card}] bg-[var(--ui-bg-surface)] border border-[var(--ui-border)]`}>
          <div className="space-y-1">
            <label className={typeScale.fieldLabel}>{t.bookStudio.backCoverStep.uploadLabel}</label>
            <p className="text-xs text-[var(--ui-text-secondary)]">
              {t.bookStudio.backCoverStep.uploadHint}
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

          {(backCoverData.imageUri || thumbUri) && (
            <div className="space-y-4">
              <div className={`relative w-full aspect-[1/1.41] max-w-[200px] mx-auto rounded-[${radius.control}] overflow-hidden border border-[var(--ui-border)] shadow-[var(--shadow-raised)] bg-[var(--ui-bg-hover)]`}>
                <img
                  src={(backCoverData.imageUri || thumbUri) as string}
                  alt={t.bookStudio.backCoverStep.uploadPreviewAlt} 
                  className={`w-full h-full ${
                    backCoverData.imageFit === 'stretch' ? '' :
                    backCoverData.imageFit === 'fit' ? 'object-contain' : 'object-cover'
                  }`}
                />
              </div>

              <div className="space-y-2">
                <label className={typeScale.fieldLabel}>{t.bookStudio.sharedBody.imageFitLabel}</label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="backCoverImageFit"
                      value="crop"
                      checked={!backCoverData.imageFit || backCoverData.imageFit === 'crop'}
                      onChange={() => updateBackCoverField('imageFit', 'crop')}
                      className="accent-[var(--color-accent-base)]"
                    />
                    <span className="text-xs">{t.bookStudio.sharedBody.imageFitCrop}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="backCoverImageFit"
                      value="fit"
                      checked={backCoverData.imageFit === 'fit'}
                      onChange={() => updateBackCoverField('imageFit', 'fit')}
                      className="accent-[var(--color-accent-base)]"
                    />
                    <span className="text-xs">{t.bookStudio.sharedBody.imageFitContain}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="backCoverImageFit"
                      value="stretch"
                      checked={backCoverData.imageFit === 'stretch'}
                      onChange={() => updateBackCoverField('imageFit', 'stretch')}
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

      {backCoverType === 'custom' && (
        <div className={`space-y-5 p-4 rounded-[${radius.card}] bg-[var(--ui-bg-surface)] border border-[var(--ui-border)]`}>
          {/* Selector de Presets de Portada (mismo catálogo del CV y de la tapa) */}
          <div className="space-y-2">
            <label className={`${typeScale.fieldLabel} flex items-center gap-1.5`}>
              <Palette className="w-3.5 h-3.5 text-[var(--color-accent-text)]" />
              {t.bookStudio.backCoverStep.presetHeading}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {COVER_PRESETS.map((preset) => {
                const isSelected = (backCoverData.coverStyle || 'monica-classic') === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => updateBackCoverField('coverStyle', preset.id)}
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
            <p className="text-[10px] text-[var(--ui-text-secondary)]">
              {t.bookStudio.backCoverStep.inheritStyleNote}
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <label className={typeScale.fieldLabel}>{t.bookStudio.backCoverStep.synopsisLabel}</label>
              <textarea
                rows={3}
                value={backCoverData.synopsis || ''}
                onChange={(e) => updateBackCoverField('synopsis', e.target.value)}
                placeholder={t.bookStudio.backCoverStep.synopsisPlaceholder}
                className={`${input.base} ${input.focus} resize-none`}
              />
            </div>

            <div>
              <label className={typeScale.fieldLabel}>{t.bookStudio.sharedBody.publisherLabel}</label>
              <input
                type="text"
                value={backCoverData.publisher || ''}
                onChange={(e) => updateBackCoverField('publisher', e.target.value)}
                placeholder={t.bookStudio.sharedBody.publisherPlaceholder}
                className={`${input.base} ${input.focus}`}
              />
            </div>

            <div>
              <label className={typeScale.fieldLabel}>{t.bookStudio.backCoverStep.isbnLabel}</label>
              <input
                type="text"
                value={backCoverData.isbn || ''}
                onChange={(e) => updateBackCoverField('isbn', e.target.value)}
                placeholder={t.bookStudio.backCoverStep.isbnPlaceholder}
                className={`${input.base} ${input.focus}`}
              />
            </div>
          </div>
        </div>
      )}

      {/* Retiro de Contratapa y Hoja en Blanco Anterior */}
      <div className={`space-y-4 p-4 rounded-[${radius.card}] bg-[var(--ui-bg-surface)] border border-[var(--ui-border)]`}>
        <h3 className="text-xs font-bold text-[var(--ui-text-primary)] uppercase tracking-wider block">
          {t.bookStudio.backCoverStep.retiroHeading}
        </h3>

        <label className={`flex items-center justify-between p-3 rounded-[${radius.control}] border border-[var(--ui-border)] bg-[var(--ui-bg-card)] cursor-pointer hover:border-[var(--ui-dock-border)] transition-all`}>
          <div className="space-y-0.5 pr-4">
            <span className="font-bold block text-xs text-[var(--ui-text-primary)]">{t.bookStudio.backCoverStep.blankInFrontLabel}</span>
            <span className="text-[10px] text-[var(--ui-text-secondary)] block">
              {t.bookStudio.backCoverStep.blankInFrontHelper}
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
            <span>{t.bookStudio.backCoverStep.nextStep}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};


