import React, { useEffect, useState } from 'react';
import { BookMarked, Ban, FileText, Image, Palette, ChevronLeft, ChevronRight } from 'lucide-react';
import { BookImpositionOptions, BackCoverConfig } from './domain/impositionEngine';
import { bookAssetManager } from './domain/bookAssetManager';
import { BookCoverColorPickerGrid } from './components/BookCoverColorPickerGrid';
import { PanelSection } from '../../shared/core/ui/PanelSection';
import { ActionGrid } from '../../shared/core/ui/ActionGrid';
import { ActionTileButton } from '../../shared/core/ui/ActionTileButton';
import { ContextualGuideBox } from '../../shared/core/ui/ContextualGuideBox';
import { Field } from '../../shared/core/ui/Field';
import { SectionSwitch } from '../../shared/core/ui/SectionSwitch';
import { LidioHelpTrigger } from '../../shared/core/ui/LidioHelpTrigger';
import { emitLidioMessage } from '../../shared/core/assistant/lidioBus';
import { radius, typeScale, button, input } from '../../shared/core/uiDesignSystem';
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

  const hasBackCoverChosen =
    options.hasBackCover || Boolean(options.customBackCover && options.customBackCover.type !== 'none');

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
      coverStyle: options.customCover?.coverStyle || options.coverStyle || 'modern-corporate',
      bgColor: options.customCover?.bgColor,
      textColor: options.customCover?.textColor,
    }
  );

  const handleBackCoverTypeChange = (type: 'source' | 'custom' | 'upload' | 'none') => {
    setBackCoverType(type);
    if (type === 'source') {
      setOptions((prev) => ({ ...prev, hasBackCover: true, customBackCover: null }));
      emitLidioMessage({
        kind: 'state',
        groupKey: 'book-backcover-mode',
        title: 'Contratapa del PDF activada',
        body: 'La última página de tu PDF cierra el libro.',
      });
    } else if (type === 'custom') {
      const updated: BackCoverConfig = { ...backCoverData, type: 'template' };
      setBackCoverData(updated);
      setOptions((prev) => ({ ...prev, hasBackCover: false, customBackCover: updated }));
      emitLidioMessage({
        kind: 'state',
        groupKey: 'book-backcover-mode',
        title: 'Crear Contratapa activada',
        body: 'Elegí un diseño o un color propio, y sumá sinopsis o editorial.',
      });
    } else if (type === 'upload') {
      const updated: BackCoverConfig = { ...backCoverData, type: 'upload' };
      setBackCoverData(updated);
      setOptions((prev) => ({ ...prev, hasBackCover: false, customBackCover: updated }));
      emitLidioMessage({
        kind: 'state',
        groupKey: 'book-backcover-mode',
        title: 'Imagen de contratapa activada',
        body: 'Subí tu propia imagen de cierre.',
      });
    } else {
      if (options.customBackCover?.assetId) {
        bookAssetManager.remove(options.customBackCover.assetId);
      }
      setThumbUri(null);
      setOptions((prev) => ({ ...prev, hasBackCover: false, customBackCover: null }));
      emitLidioMessage({
        kind: 'state',
        groupKey: 'book-backcover-mode',
        title: 'Sin contratapa especial',
        body: 'El libro termina en la última hoja de contenido.',
      });
    }
  };

  const patchBackCoverData = (patch: Partial<BackCoverConfig>) => {
    const updated: BackCoverConfig = {
      ...backCoverData,
      type: backCoverType === 'upload' ? 'upload' : 'template',
      ...patch,
    };
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
      if (backCoverData.assetId && backCoverData.assetId !== assetId) {
        bookAssetManager.remove(backCoverData.assetId);
      }
      setThumbUri(null);
      const updated: BackCoverConfig = { ...backCoverData, type: 'upload', assetId, imageUri: undefined };
      setBackCoverData(updated);
      setImageError(null);
      setOptions((prev) => ({ ...prev, customBackCover: updated }));
    } catch {
      setImageError(t.bookStudio.sharedBody.saveImageFailed);
    }
  };

  return (
    <div className="space-y-5 text-[var(--ui-text-primary)]">
      <PanelSection
        icon={<BookMarked className="w-4 h-4" />}
        title={t.bookStudio.backCoverStep.title}
        helpTitle="Cierre visual del libro"
        helpText={t.bookStudio.backCoverStep.description}
        headerRight={
          hasBackCoverChosen ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-[var(--ui-text-secondary)]">
                {t.bookStudio.backCoverStep.blankInFrontLabel}
              </span>
              <LidioHelpTrigger
                size="xs"
                title="Hoja en blanco delante de la contratapa"
                text={t.bookStudio.backCoverStep.blankInFrontHelper}
                groupKey="book-backcover-retiro"
              />
              <SectionSwitch
                checked={options.blankInFrontBackCover !== false}
                onChange={(checked) => {
                  setOptions((prev) => ({ ...prev, blankInFrontBackCover: checked }));
                  emitLidioMessage({
                    kind: 'state',
                    groupKey: 'book-backcover-retiro',
                    title: checked ? 'Hoja delante de la contratapa activada' : 'Hoja delante de la contratapa desactivada',
                    body: checked
                      ? 'Garantiza al menos una página limpia antes de la contratapa.'
                      : 'El contenido termina justo antes de la contratapa.',
                  });
                }}
                label={t.bookStudio.backCoverStep.blankInFrontLabel}
                helpText={t.bookStudio.backCoverStep.blankInFrontHelper}
                size="sm"
              />
            </div>
          ) : undefined
        }
      >
        <ActionGrid columns={2}>
          <ActionTileButton
            role="record"
            icon={<FileText className="w-4 h-4" />}
            label={t.bookStudio.backCoverStep.lastPdfPage}
            helpText="Usa la última página del archivo subido como cierre."
            helpGroupKey="book-backcover-source"
            active={backCoverType === 'source'}
            onClick={() => handleBackCoverTypeChange('source')}
          />
          <ActionTileButton
            role="preset"
            icon={<Palette className="w-4 h-4" />}
            label={t.bookStudio.backCoverStep.customMode}
            helpText="Creá una contratapa con reseña, editorial y diseño o color propio."
            helpGroupKey="book-backcover-custom"
            active={backCoverType === 'custom'}
            onClick={() => handleBackCoverTypeChange('custom')}
          />
          <ActionTileButton
            role="io"
            icon={<Image className="w-4 h-4" />}
            label={t.bookStudio.backCoverStep.uploadMode}
            helpText="Subí una imagen propia para el lado de atrás del libro."
            helpGroupKey="book-backcover-upload"
            active={backCoverType === 'upload'}
            onClick={() => handleBackCoverTypeChange('upload')}
          />
          <ActionTileButton
            role="record"
            icon={<Ban className="w-4 h-4" />}
            label={t.bookStudio.backCoverStep.noBackCoverMode}
            helpText="No agrega contratapa al final del libro."
            helpGroupKey="book-backcover-none"
            active={backCoverType === 'none'}
            onClick={() => handleBackCoverTypeChange('none')}
          />
        </ActionGrid>
      </PanelSection>

      {backCoverType === 'upload' && (
        <PanelSection
          icon={<Image className="w-4 h-4" />}
          title={t.bookStudio.backCoverStep.uploadLabel}
          helpTitle="Imagen de contratapa"
          helpText={t.bookStudio.backCoverStep.uploadHint}
        >
          <ContextualGuideBox title="Qué imagen elegir">
            Elegí una imagen vertical limpia. Si no coincide exacto con la proporción, probá &ldquo;Ajustar sin deformar&rdquo;.
          </ContextualGuideBox>

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
              <div
                className="relative w-full aspect-[1/1.41] max-w-[200px] mx-auto overflow-hidden border border-[var(--ui-border)] shadow-[var(--shadow-raised)] bg-[var(--ui-bg-hover)]"
                style={{ borderRadius: radius.control }}
              >
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
                      onChange={() => patchBackCoverData({ imageFit: 'crop' })}
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
                      onChange={() => patchBackCoverData({ imageFit: 'fit' })}
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
                      onChange={() => patchBackCoverData({ imageFit: 'stretch' })}
                      className="accent-[var(--color-accent-base)]"
                    />
                    <span className="text-xs">{t.bookStudio.sharedBody.imageFitStretch}</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </PanelSection>
      )}

      {backCoverType === 'custom' && (
        <PanelSection
          icon={<Palette className="w-4 h-4" />}
          title={t.bookStudio.backCoverStep.presetHeading}
          helpTitle="Diseño y color de contratapa"
          helpText={t.bookStudio.backCoverStep.inheritStyleNote}
        >
          <ContextualGuideBox title="Qué escribir atrás">
            Escribí un resumen breve que invite a leer el libro. Editorial e ISBN son opcionales.
          </ContextualGuideBox>

          <BookCoverColorPickerGrid
            selectedStyle={backCoverData.coverStyle || 'modern-corporate'}
            bgColor={backCoverData.bgColor}
            textColor={backCoverData.textColor}
            onSelectPreset={(presetId) =>
              patchBackCoverData({ coverStyle: presetId, bgColor: undefined, textColor: undefined })
            }
            onSelectCustomColor={(bgColor, textColor) =>
              patchBackCoverData({ coverStyle: 'monica-classic', bgColor, textColor })
            }
          />

          <div className="space-y-3 pt-1">
            <Field
              label={t.bookStudio.backCoverStep.synopsisLabel}
              as="textarea"
              rows={3}
              value={backCoverData.synopsis || ''}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => patchBackCoverData({ synopsis: e.target.value })}
              placeholder={t.bookStudio.backCoverStep.synopsisPlaceholder}
              className="resize-none"
            />
            <Field
              label={t.bookStudio.sharedBody.publisherLabel}
              value={backCoverData.publisher || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => patchBackCoverData({ publisher: e.target.value })}
              placeholder={t.bookStudio.sharedBody.publisherPlaceholder}
            />
            <Field
              label={t.bookStudio.backCoverStep.isbnLabel}
              value={backCoverData.isbn || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => patchBackCoverData({ isbn: e.target.value })}
              placeholder={t.bookStudio.backCoverStep.isbnPlaceholder}
            />
          </div>
        </PanelSection>
      )}

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
