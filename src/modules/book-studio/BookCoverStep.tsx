import React, { useEffect, useState } from 'react';
import { BookOpen, Ban, FileText, Image, Palette, ChevronLeft, ChevronRight } from 'lucide-react';
import { BookImpositionOptions, CoverConfig } from './domain/impositionEngine';
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

interface BookCoverStepProps {
  options: BookImpositionOptions;
  setOptions: React.Dispatch<React.SetStateAction<BookImpositionOptions>>;
  onNextStep?: () => void;
  onPrevStep?: () => void;
}

export const BookCoverStep: React.FC<BookCoverStepProps> = ({
  options,
  setOptions,
  onNextStep,
  onPrevStep,
}) => {
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
      coverStyle: options.coverStyle || 'modern-corporate',
    }
  );
  const [imageError, setImageError] = useState<string | null>(null);
  const [thumbUri, setThumbUri] = useState<string | null>(null);

  const hasCoverChosen = options.hasCover || Boolean(options.customCover && options.customCover.type !== 'none');

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.customCover?.assetId]);

  const handleCoverTypeChange = (type: 'source' | 'custom' | 'upload' | 'none') => {
    setCoverType(type);
    if (type === 'source') {
      setOptions((prev) => ({ ...prev, hasCover: true, customCover: null }));
      emitLidioMessage({
        kind: 'state',
        groupKey: 'book-cover-mode',
        title: 'Tapa del PDF activada',
        body: 'Se usará la primera página de tu archivo como portada.',
      });
    } else if (type === 'custom') {
      const updated: CoverConfig = { ...coverData, type: 'template' };
      setCoverData(updated);
      setOptions((prev) => ({ ...prev, hasCover: false, customCover: updated }));
      emitLidioMessage({
        kind: 'state',
        groupKey: 'book-cover-mode',
        title: 'Crear Tapa activada',
        body: 'Elegí un diseño o un color propio y escribí título y autor.',
      });
    } else if (type === 'upload') {
      const updated: CoverConfig = { ...coverData, type: 'upload' };
      setCoverData(updated);
      setOptions((prev) => ({ ...prev, hasCover: false, customCover: updated }));
      emitLidioMessage({
        kind: 'state',
        groupKey: 'book-cover-mode',
        title: 'Imagen de tapa activada',
        body: 'Subí tu propia imagen vertical en JPG o PNG.',
      });
    } else {
      if (options.customCover?.assetId) {
        bookAssetManager.remove(options.customCover.assetId);
      }
      setThumbUri(null);
      setOptions((prev) => ({ ...prev, hasCover: false, customCover: null }));
      emitLidioMessage({
        kind: 'state',
        groupKey: 'book-cover-mode',
        title: 'Sin tapa especial',
        body: 'El libro empieza directo en la primera página del contenido.',
      });
    }
  };

  const patchCoverData = (patch: Partial<CoverConfig>) => {
    const updated: CoverConfig = {
      ...coverData,
      type: coverType === 'upload' ? 'upload' : 'template',
      ...patch,
    };
    setCoverData(updated);
    if (coverType === 'custom' || coverType === 'upload') {
      setOptions((prev) => ({
        ...prev,
        ...(patch.coverStyle ? { coverStyle: patch.coverStyle } : {}),
        customCover: updated,
      }));
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
      if (coverData.assetId && coverData.assetId !== assetId) {
        bookAssetManager.remove(coverData.assetId);
      }
      setThumbUri(null);
      const updated: CoverConfig = { ...coverData, type: 'upload', assetId, imageUri: undefined };
      setCoverData(updated);
      setImageError(null);
      setOptions((prev) => ({ ...prev, customCover: updated }));
    } catch {
      setImageError(t.bookStudio.sharedBody.saveImageFailed);
    }
  };

  return (
    <div className="space-y-5 text-[var(--ui-text-primary)]">
      <PanelSection
        icon={<BookOpen className="w-4 h-4" />}
        title={t.bookStudio.coverStep.title}
        helpTitle="Elegí cómo armar la tapa"
        helpText={t.bookStudio.coverStep.description}
        headerRight={
          hasCoverChosen ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-[var(--ui-text-secondary)]">
                {t.bookStudio.coverStep.blankBehindLabel}
              </span>
              <LidioHelpTrigger
                size="xs"
                title="Hoja en blanco detrás de la tapa"
                text={t.bookStudio.coverStep.blankBehindHelper}
                groupKey="book-cover-retiro"
              />
              <SectionSwitch
                checked={options.blankBehindCover !== false}
                onChange={(checked) => {
                  setOptions((prev) => ({ ...prev, blankBehindCover: checked }));
                  emitLidioMessage({
                    kind: 'state',
                    groupKey: 'book-cover-retiro',
                    title: checked ? 'Hoja detrás de la tapa activada' : 'Hoja detrás de la tapa desactivada',
                    body: checked
                      ? 'El reverso de la tapa queda en blanco.'
                      : 'La primera página va justo detrás de la portada.',
                  });
                }}
                label={t.bookStudio.coverStep.blankBehindLabel}
                helpText={t.bookStudio.coverStep.blankBehindHelper}
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
            label={t.bookStudio.coverStep.pdfFirstPage}
            helpText="Toma la primera hoja del PDF que subiste como portada."
            helpGroupKey="book-cover-opt-source"
            active={coverType === 'source'}
            onClick={() => handleCoverTypeChange('source')}
          />
          <ActionTileButton
            role="preset"
            icon={<Palette className="w-4 h-4" />}
            label={t.bookStudio.coverStep.presetMode}
            helpText="Creá una tapa eligiendo un diseño o un color propio, con título y autor."
            helpGroupKey="book-cover-opt-custom"
            active={coverType === 'custom'}
            onClick={() => handleCoverTypeChange('custom')}
          />
          <ActionTileButton
            role="io"
            icon={<Image className="w-4 h-4" />}
            label={t.bookStudio.coverStep.uploadMode}
            helpText="Subí una portada que ya diseñaste en JPG o PNG."
            helpGroupKey="book-cover-opt-upload"
            active={coverType === 'upload'}
            onClick={() => handleCoverTypeChange('upload')}
          />
          <ActionTileButton
            role="record"
            icon={<Ban className="w-4 h-4" />}
            label={t.bookStudio.coverStep.noCoverMode}
            helpText="No agrega portada aparte; empieza con tu texto."
            helpGroupKey="book-cover-opt-none"
            active={coverType === 'none'}
            onClick={() => handleCoverTypeChange('none')}
          />
        </ActionGrid>
      </PanelSection>

      {coverType === 'upload' && (
        <PanelSection
          icon={<Image className="w-4 h-4" />}
          title={t.bookStudio.coverStep.uploadLabel}
          helpTitle="Imagen de portada"
          helpText={t.bookStudio.coverStep.uploadHint}
        >
          <ContextualGuideBox title="Qué imagen funciona mejor">
            Usá una imagen vertical en JPG o PNG. Si tiene bordes muy justos, elegí &ldquo;Ajustar sin deformar&rdquo;.
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

          {(coverData.imageUri || thumbUri) && (
            <div className="space-y-4">
              <div
                className="relative w-full aspect-[1/1.41] max-w-[200px] mx-auto overflow-hidden border border-[var(--ui-border)] shadow-[var(--shadow-raised)] bg-[var(--ui-bg-hover)]"
                style={{ borderRadius: radius.control }}
              >
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
                      onChange={() => patchCoverData({ imageFit: 'crop' })}
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
                      onChange={() => patchCoverData({ imageFit: 'fit' })}
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
                      onChange={() => patchCoverData({ imageFit: 'stretch' })}
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

      {coverType === 'custom' && (
        <PanelSection
          icon={<Palette className="w-4 h-4" />}
          title={t.bookStudio.coverStep.presetHeading}
          helpTitle="Diseño y color de la tapa"
          helpText="Elegí un diseño de fondo o tocá Elegir color para usar el selector de color y cuentagotas."
        >
          <ContextualGuideBox title="Qué escribir en la tapa">
            Escribí el título principal como querés leerlo en portada. Autor y editorial son opcionales.
          </ContextualGuideBox>

          <BookCoverColorPickerGrid
            selectedStyle={coverData.coverStyle || 'modern-corporate'}
            bgColor={coverData.bgColor}
            textColor={coverData.textColor}
            onSelectPreset={(presetId) =>
              patchCoverData({ coverStyle: presetId, bgColor: undefined, textColor: undefined })
            }
            onSelectCustomColor={(bgColor, textColor) =>
              patchCoverData({ coverStyle: 'monica-classic', bgColor, textColor })
            }
          />

          <div className="space-y-3 pt-1">
            <Field
              label={t.bookStudio.coverStep.titleLabel}
              value={coverData.title || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => patchCoverData({ title: e.target.value })}
              placeholder={t.bookStudio.coverStep.titlePlaceholder}
            />
            <Field
              label={t.bookStudio.coverStep.authorCompileLabel}
              value={coverData.author || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => patchCoverData({ author: e.target.value })}
              placeholder={t.bookStudio.coverStep.authorPlaceholder}
            />
            <Field
              label={t.bookStudio.sharedBody.publisherLabel}
              value={coverData.publisher || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => patchCoverData({ publisher: e.target.value })}
              placeholder={t.bookStudio.sharedBody.publisherPlaceholder}
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
            className={`${button.base} ${button.primary} flex items-center justify-center gap-1.5 text-xs font-bold`}
          >
            <span>{t.bookStudio.coverStep.nextStep}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
