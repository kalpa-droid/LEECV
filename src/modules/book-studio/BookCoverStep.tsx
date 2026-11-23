import React, { useEffect, useState } from 'react';
import { BookOpen, Ban, Check, FileText, Image, Palette, ChevronLeft, ChevronRight, BookMarked, Trash2 } from 'lucide-react';
import { BookImpositionOptions, CoverConfig } from './domain/impositionEngine';
import {
  BookSectionDivider,
  makeDividerPageToken,
  resolveBookOrderedItems,
} from './domain/bookDividerCanvas';
import { BookSectionDividerModal } from './components/BookSectionDividerModal';
import { COVER_PRESETS } from '../../shared/core/pdf-engine/layers/presets/coverPresetCatalog';
import { bookAssetManager } from './domain/bookAssetManager';
import { PanelSection } from '../../shared/core/ui/PanelSection';
import { ActionGrid } from '../../shared/core/ui/ActionGrid';
import { ActionTileButton } from '../../shared/core/ui/ActionTileButton';
import { ContextualGuideBox } from '../../shared/core/ui/ContextualGuideBox';
import { Field } from '../../shared/core/ui/Field';
import { SectionSwitch } from '../../shared/core/ui/SectionSwitch';
import { LidioHelpTrigger } from '../../shared/core/ui/LidioHelpTrigger';
import { emitLidioMessage } from '../../shared/core/assistant/lidioBus';
import { radius, typeScale, button, selectableCard, input } from '../../shared/core/uiDesignSystem';
import { useText } from '../../shared/i18n/useText';

interface BookCoverStepProps {
  options: BookImpositionOptions;
  setOptions: React.Dispatch<React.SetStateAction<BookImpositionOptions>>;
  pdfPageCount?: number;
  onNextStep?: () => void;
  onPrevStep?: () => void;
}

export const BookCoverStep: React.FC<BookCoverStepProps> = ({
  options,
  setOptions,
  pdfPageCount = 1,
  onNextStep,
  onPrevStep,
}) => {
  const t = useText();
  const [isDividerModalOpen, setIsDividerModalOpen] = useState(false);
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
      coverStyle: options.coverStyle || 'monica-classic',
    }
  );
  const [imageError, setImageError] = useState<string | null>(null);
  const [thumbUri, setThumbUri] = useState<string | null>(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.customCover?.assetId]);

  const handleCoverTypeChange = (type: 'source' | 'custom' | 'upload' | 'none') => {
    setCoverType(type);
    if (type === 'source') {
      setOptions((prev) => ({ ...prev, hasCover: true, customCover: null }));
      emitLidioMessage({ kind: 'state', groupKey: 'book-cover-mode', title: 'Tapa del PDF activada', body: 'Se usará la primera página de tu archivo como portada.' });
    } else if (type === 'custom') {
      const updated = { ...coverData, type: 'template' as const };
      setOptions((prev) => ({ ...prev, hasCover: false, customCover: updated }));
      emitLidioMessage({ kind: 'state', groupKey: 'book-cover-mode', title: 'Tapa diseñada activada', body: 'Elegí un estilo y escribí título y autor.' });
    } else if (type === 'upload') {
      const updated = { ...coverData, type: 'upload' as const };
      setOptions((prev) => ({ ...prev, hasCover: false, customCover: updated }));
      emitLidioMessage({ kind: 'state', groupKey: 'book-cover-mode', title: 'Imagen de tapa activada', body: 'Subí tu propia imagen vertical en JPG o PNG.' });
    } else {
      if (options.customCover?.assetId) {
        bookAssetManager.remove(options.customCover.assetId);
      }
      setThumbUri(null);
      setOptions((prev) => ({ ...prev, hasCover: false, customCover: null }));
      emitLidioMessage({ kind: 'state', groupKey: 'book-cover-mode', title: 'Sin tapa especial', body: 'El libro empieza directo en la primera página del contenido.' });
    }
  };

  const updateCoverField = (field: keyof CoverConfig, value: string) => {
    const updated = { ...coverData, type: (coverType === 'upload' ? 'upload' : 'template') as any, [field]: value };
    setCoverData(updated);
    if (coverType === 'custom' || coverType === 'upload') {
      setOptions((prev) => ({
        ...prev,
        ...(field === 'coverStyle' ? { coverStyle: value } : {}),
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
      const updated: CoverConfig = { ...coverData, type: 'upload' as const, assetId, imageUri: undefined };
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
            helpText="Genera una tapa prolija eligiendo diseño, título y autor."
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
        </PanelSection>
      )}

      {coverType === 'custom' && (
        <PanelSection
          icon={<Palette className="w-4 h-4" />}
          title={t.bookStudio.coverStep.presetHeading}
          helpTitle="Estilo visual de tapa"
          helpText="Elegí el diseño de fondo de portada y completá los textos impresos."
        >
          <ContextualGuideBox title="Qué escribir en la tapa">
            Escribí el título principal como querés leerlo en portada. Autor y editorial son opcionales.
          </ContextualGuideBox>

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
                  } flex items-center justify-between p-2.5 text-xs cursor-pointer`}
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

          <div className="space-y-3 pt-1">
            <Field
              label={t.bookStudio.coverStep.titleLabel}
              value={coverData.title || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateCoverField('title', e.target.value)}
              placeholder={t.bookStudio.coverStep.titlePlaceholder}
            />
            <Field
              label={t.bookStudio.coverStep.authorCompileLabel}
              value={coverData.author || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateCoverField('author', e.target.value)}
              placeholder={t.bookStudio.coverStep.authorPlaceholder}
            />
            <Field
              label={t.bookStudio.sharedBody.publisherLabel}
              value={coverData.publisher || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateCoverField('publisher', e.target.value)}
              placeholder={t.bookStudio.sharedBody.publisherPlaceholder}
            />
          </div>
        </PanelSection>
      )}

      {hasCoverChosen && (
        <div
          className="flex items-center justify-between gap-3 p-3 border border-[var(--ui-border)] bg-[var(--ui-bg-surface)]"
          style={{ borderRadius: radius.control }}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-bold text-xs text-[var(--ui-text-primary)] truncate">
              {t.bookStudio.coverStep.blankBehindLabel}
            </span>
            <LidioHelpTrigger
              title={t.bookStudio.coverStep.blankBehindLabel}
              text={t.bookStudio.coverStep.blankBehindHelper}
              groupKey="book-cover-retiro"
            />
          </div>
          <SectionSwitch
            checked={options.blankBehindCover !== false}
            onChange={(checked) => {
              setOptions((prev) => ({ ...prev, blankBehindCover: checked }));
              emitLidioMessage({
                kind: 'state',
                groupKey: 'book-cover-retiro',
                title: checked ? 'Retiro de tapa en blanco activado' : 'Retiro de tapa desactivado',
                body: checked
                  ? 'El reverso de la tapa queda limpio sin texto encima.'
                  : 'La primera página va justo detrás de la portada.',
              });
            }}
            label={t.bookStudio.coverStep.blankBehindLabel}
            helpText={t.bookStudio.coverStep.blankBehindHelper}
            size="sm"
          />
        </div>
      )}

      <PanelSection
        icon={<BookMarked className="w-4 h-4" />}
        title="Carátulas o separadores por capítulo"
        helpTitle="Portadillas internas"
        helpText="Podés insertar portadas o separadores manuales antes de cualquier página de tu PDF (con hoja blanca detrás o de 1 sola página) usando los mismos diseños de tapa."
      >
        <button
          type="button"
          onClick={() => setIsDividerModalOpen(true)}
          className="w-full py-2 px-3 rounded-lg border border-[var(--color-accent-base)]/50 bg-[var(--color-accent-muted)] text-[var(--color-accent-text)] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer hover:opacity-90"
        >
          <BookMarked className="w-3.5 h-3.5" />
          <span>＋ Agregar carátula o separador de capítulo</span>
        </button>

        {(options.sectionDividers || []).length > 0 && (
          <div className="space-y-1.5 pt-1">
            {(options.sectionDividers || []).map((div) => (
              <div
                key={div.id}
                className="p-2 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-card)] flex items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0">
                  <span className="font-bold text-[var(--ui-text-primary)] truncate block">
                    {div.kicker ? `${div.kicker}: ` : ''}{div.title}
                  </span>
                  <span className="text-[10px] text-[var(--ui-text-secondary)]">
                    Antes de Pág. {div.insertBeforePage} · {div.blankBehind ? 'Con hoja blanca detrás (2 págs.)' : 'Solo 1 página'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const token = makeDividerPageToken(div.id);
                    setOptions((prev) => ({
                      ...prev,
                      sectionDividers: (prev.sectionDividers || []).filter((d) => d.id !== div.id),
                      pageOrder: (prev.pageOrder || []).filter((it) => String(it) !== token),
                    }));
                  }}
                  className="p-1 text-[var(--color-status-danger-text)] hover:opacity-80 cursor-pointer"
                  title="Eliminar separador"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </PanelSection>

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

      <BookSectionDividerModal
        isOpen={isDividerModalOpen}
        onClose={() => setIsDividerModalOpen(false)}
        pdfPageCount={pdfPageCount}
        defaultCoverStyle={coverData.coverStyle || options.coverStyle || 'monica-classic'}
        paperSize={options.paperSize}
        onSaveDivider={(divider: BookSectionDivider) => {
          setOptions((prev) => {
            const existing = prev.sectionDividers || [];
            const nextDividers = [...existing, divider];
            const token = makeDividerPageToken(divider.id);
            const baseOrder = resolveBookOrderedItems({
              pdfPageCount,
              pageOrder: prev.pageOrder,
              sectionDividers: existing,
            });
            const targetPage = Math.max(1, Number(divider.insertBeforePage) || 1);
            const idx = baseOrder.findIndex((it) => typeof it === 'number' && it >= targetPage);
            if (idx === -1) baseOrder.push(token);
            else baseOrder.splice(idx, 0, token);
            return {
              ...prev,
              sectionDividers: nextDividers,
              pageOrder: baseOrder,
            };
          });
        }}
      />
    </div>
  );
};
