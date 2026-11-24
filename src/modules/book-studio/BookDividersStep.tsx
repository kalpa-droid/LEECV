import React, { useState } from 'react';
import { Bookmark, ChevronLeft, ChevronRight, Edit3, Image, Palette, Plus, Trash2 } from 'lucide-react';
import { BookImpositionOptions } from './domain/impositionEngine';
import {
  BookSectionDivider,
  makeDividerPageToken,
  resolveBookOrderedItems,
} from './domain/bookDividerCanvas';
import { bookAssetManager } from './domain/bookAssetManager';
import { BookCoverColorPickerGrid } from './components/BookCoverColorPickerGrid';
import { CoverPreviewThumbnail } from './components/CoverPreviewThumbnail';
import { PanelSection } from '../../shared/core/ui/PanelSection';
import { ActionGrid } from '../../shared/core/ui/ActionGrid';
import { ActionTileButton } from '../../shared/core/ui/ActionTileButton';
import { ContextualGuideBox } from '../../shared/core/ui/ContextualGuideBox';
import { Field } from '../../shared/core/ui/Field';
import { SectionSwitch } from '../../shared/core/ui/SectionSwitch';
import { LidioHelpTrigger } from '../../shared/core/ui/LidioHelpTrigger';
import { emitLidioMessage } from '../../shared/core/assistant/lidioBus';
import { button, input, radius, typeScale } from '../../shared/core/uiDesignSystem';
import { useText } from '../../shared/i18n/useText';

interface BookDividersStepProps {
  options: BookImpositionOptions;
  setOptions: React.Dispatch<React.SetStateAction<BookImpositionOptions>>;
  pdfPageCount: number;
  onNextStep?: () => void;
  onPrevStep?: () => void;
}

export const BookDividersStep: React.FC<BookDividersStepProps> = ({
  options,
  setOptions,
  pdfPageCount,
  onNextStep,
  onPrevStep,
}) => {
  const t = useText();
  const dividers = options.sectionDividers || [];
  const defaultStyle = options.customCover?.coverStyle || options.coverStyle || 'modern-corporate';

  const [editingId, setEditingId] = useState<string | null>(null);
  const [dividerType, setDividerType] = useState<'template' | 'upload'>('template');
  const [blankBehind, setBlankBehind] = useState<boolean>(true);
  const [insertBeforePage, setInsertBeforePage] = useState<number>(1);
  const [coverStyle, setCoverStyle] = useState<string>(defaultStyle);
  const [bgColor, setBgColor] = useState<string | undefined>(options.customCover?.bgColor);
  const [textColor, setTextColor] = useState<string | undefined>(options.customCover?.textColor);
  const [kicker, setKicker] = useState<string>('Capítulo 1');
  const [title, setTitle] = useState<string>('');
  const [subtitle, setSubtitle] = useState<string>('');
  const [assetId, setAssetId] = useState<string | undefined>(undefined);
  const [imageFit, setImageFit] = useState<'crop' | 'fit' | 'stretch'>('crop');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const resetDraft = (nextChapterNum = dividers.length + 1) => {
    setEditingId(null);
    setDividerType('template');
    setInsertBeforePage(Math.max(1, Math.min(pdfPageCount || 1, 1)));
    setCoverStyle(defaultStyle);
    setBgColor(options.customCover?.bgColor);
    setTextColor(options.customCover?.textColor);
    setKicker(`Capítulo ${nextChapterNum}`);
    setTitle('');
    setSubtitle('');
    setAssetId(undefined);
    setImageFit('crop');
    setErrorMsg(null);
  };

  const loadForEdit = (div: BookSectionDivider) => {
    setEditingId(div.id);
    setDividerType(div.type);
    setBlankBehind(div.blankBehind !== false);
    setInsertBeforePage(div.insertBeforePage || 1);
    setCoverStyle(div.coverStyle || defaultStyle);
    setBgColor(div.bgColor);
    setTextColor(div.textColor);
    setKicker(div.kicker ?? '');
    setTitle(div.title || '');
    setSubtitle(div.subtitle ?? '');
    setAssetId(div.assetId);
    setImageFit(div.imageFit || 'crop');
    setErrorMsg(null);
  };

  const handleHeaderBlankToggle = (checked: boolean) => {
    setBlankBehind(checked);
    // Si ya hay separadores cargados y no está editando uno suelto, actualiza todos en lote.
    if (dividers.length > 0 && !editingId) {
      setOptions((prev) => ({
        ...prev,
        sectionDividers: (prev.sectionDividers || []).map((d) => ({ ...d, blankBehind: checked })),
      }));
    }
    emitLidioMessage({
      kind: 'state',
      groupKey: 'book-dividers-retiro',
      title: checked ? 'Hoja detrás de separadores activada' : 'Separadores de 1 sola página',
      body: checked
        ? 'Cada separador suma 2 páginas y conserva intactas las páginas impares a la derecha.'
        : 'Sin hoja detrás, el contenido sigue en el reverso y corre 1 lugar el lado de las páginas siguientes.',
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg(t.bookStudio.sharedBody.notImageFile);
      return;
    }
    try {
      const saved = await bookAssetManager.putFile(file, 'cover');
      setAssetId(saved.assetId);
      setDividerType('upload');
      setErrorMsg(null);
    } catch {
      setErrorMsg(t.bookStudio.sharedBody.saveImageFailed);
    }
  };

  const handleSaveDivider = (e: React.FormEvent) => {
    e.preventDefault();
    if (dividerType === 'template' && !title.trim()) {
      setErrorMsg('Escribí el título del capítulo o sección para armar el separador.');
      return;
    }
    if (dividerType === 'upload' && !assetId) {
      setErrorMsg('Subí una imagen para el separador o elegí un diseño.');
      return;
    }
    const maxPage = Math.max(1, pdfPageCount || 1);
    const clampedPage = Math.max(1, Math.min(maxPage, Number(insertBeforePage) || 1));

    const nextDivider: BookSectionDivider = {
      id: editingId || `divider_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      insertBeforePage: clampedPage,
      kicker: kicker.trim(),
      title: title.trim() || `Separador Pág. ${clampedPage}`,
      subtitle: subtitle.trim(),
      type: dividerType,
      coverStyle,
      bgColor,
      textColor,
      assetId,
      imageFit,
      blankBehind,
    };

    setOptions((prev) => {
      const existing = prev.sectionDividers || [];
      const nextDividers = editingId
        ? existing.map((d) => (d.id === editingId ? nextDivider : d))
        : [...existing, nextDivider];
      const token = makeDividerPageToken(nextDivider.id);
      const baseOrder = resolveBookOrderedItems({
        pdfPageCount,
        pageOrder: prev.pageOrder,
        sectionDividers: existing,
      }).filter((it) => String(it) !== token);

      const idx = baseOrder.findIndex((it) => {
        if (typeof it === 'number') return it >= clampedPage;
        const str = String(it);
        if (str.startsWith('blank') || str.startsWith('divider:')) return false;
        const num = Number(str.split('_')[0]);
        return Number.isFinite(num) && num >= clampedPage;
      });
      if (idx === -1) baseOrder.push(token);
      else baseOrder.splice(idx, 0, token);

      return { ...prev, sectionDividers: nextDividers, pageOrder: baseOrder };
    });

    emitLidioMessage({
      kind: 'state',
      groupKey: 'book-dividers-saved',
      title: editingId ? 'Separador actualizado' : 'Separador agregado',
      body: nextDivider.blankBehind
        ? `Insertado antes de la pág. ${clampedPage} con hoja detrás (2 págs., mantiene paridad).`
        : `Insertado antes de la pág. ${clampedPage} de 1 sola página (corre en 1 lugar el lado de lo que sigue).`,
    });
    resetDraft((editingId ? dividers.length : dividers.length + 1) + 1);
  };

  const handleToggleOneBlankBehind = (dividerId: string, nextVal: boolean) => {
    setOptions((prev) => ({
      ...prev,
      sectionDividers: (prev.sectionDividers || []).map((d) =>
        d.id === dividerId ? { ...d, blankBehind: nextVal } : d
      ),
    }));
  };

  const handleDeleteDivider = (dividerId: string) => {
    const token = makeDividerPageToken(dividerId);
    setOptions((prev) => ({
      ...prev,
      sectionDividers: (prev.sectionDividers || []).filter((d) => d.id !== dividerId),
      pageOrder: (prev.pageOrder || []).filter((it) => String(it) !== token),
    }));
    if (editingId === dividerId) resetDraft();
  };

  return (
    <div className="space-y-5 text-[var(--ui-text-primary)]">
      <PanelSection
        icon={<Bookmark className="w-4 h-4" />}
        title={t.bookStudio.dividersStep.title}
        helpTitle="Carátulas o separadores por capítulo"
        helpText={t.bookStudio.dividersStep.description}
        headerRight={
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-[var(--ui-text-secondary)]">
              {t.bookStudio.dividersStep.blankBehindLabel}
            </span>
            <LidioHelpTrigger
              size="xs"
              title="Hoja en blanco detrás del separador"
              text={t.bookStudio.dividersStep.blankBehindHelper}
              groupKey="book-dividers-retiro"
            />
            <SectionSwitch
              checked={blankBehind}
              onChange={handleHeaderBlankToggle}
              label={t.bookStudio.dividersStep.blankBehindLabel}
              helpText={t.bookStudio.dividersStep.blankBehindHelper}
              size="sm"
            />
          </div>
        }
      >
        <ActionGrid columns={2}>
          <ActionTileButton
            role="preset"
            icon={<Palette className="w-4 h-4" />}
            label={t.bookStudio.dividersStep.createMode}
            helpText="Armá la carátula eligiendo un diseño o un color propio con el cuentagotas."
            helpGroupKey="book-divider-opt-create"
            active={dividerType === 'template'}
            onClick={() => setDividerType('template')}
          />
          <ActionTileButton
            role="io"
            icon={<Image className="w-4 h-4" />}
            label={t.bookStudio.dividersStep.uploadMode}
            helpText="Subí una carátula que ya tengas diseñada en JPG o PNG."
            helpGroupKey="book-divider-opt-upload"
            active={dividerType === 'upload'}
            onClick={() => setDividerType('upload')}
          />
        </ActionGrid>

        <ContextualGuideBox title="Cómo afecta a las páginas derecha e izquierda">
          {blankBehind ? t.bookStudio.dividersStep.parityWith : t.bookStudio.dividersStep.parityWithout}
        </ContextualGuideBox>
      </PanelSection>

      <PanelSection
        icon={<Plus className="w-4 h-4" />}
        title={editingId ? 'Editar separador' : 'Nuevo separador'}
        helpTitle="Dónde y cómo aparece"
        helpText="Indicá antes de qué página de tu PDF querés ubicar este separador."
      >
        <form onSubmit={handleSaveDivider} className="space-y-3">
          <div>
            <label className={typeScale.fieldLabel}>{t.bookStudio.dividersStep.insertBeforeLabel}</label>
            <input
              type="number"
              min={1}
              max={Math.max(1, pdfPageCount || 1)}
              value={insertBeforePage}
              onChange={(e) => setInsertBeforePage(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className={`${input.base} ${input.focus} mt-1 w-full font-bold text-xs`}
            />
            <span className="text-[11px] text-[var(--ui-text-secondary)]">
              Tu PDF tiene {pdfPageCount || 1} páginas.
            </span>
          </div>

          {dividerType === 'template' ? (
            <>
              <BookCoverColorPickerGrid
                selectedStyle={coverStyle}
                bgColor={bgColor}
                textColor={textColor}
                onSelectPreset={(presetId) => {
                  setCoverStyle(presetId);
                  setBgColor(undefined);
                  setTextColor(undefined);
                }}
                onSelectCustomColor={(nextBg, nextText) => {
                  setCoverStyle('monica-classic');
                  setBgColor(nextBg);
                  setTextColor(nextText);
                }}
              />

              <Field
                label={t.bookStudio.dividersStep.kickerLabel}
                value={kicker}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setKicker(e.target.value)}
                placeholder="Ej. Capítulo 1 / Parte I"
              />
              <Field
                label={t.bookStudio.dividersStep.titleLabel}
                value={title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                placeholder="Ej. Introducción"
              />
              <Field
                label={t.bookStudio.dividersStep.subtitleLabel}
                value={subtitle}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubtitle(e.target.value)}
                placeholder="Frase corta o descripción..."
              />
            </>
          ) : (
            <div className="space-y-3">
              <input
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleImageUpload}
                className={`${input.base} cursor-pointer`}
              />
              <Field
                label="Nombre para recordarlo"
                value={title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                placeholder="Ej. Separador Capítulo 1"
              />
              <div className="space-y-1.5">
                <label className={typeScale.fieldLabel}>{t.bookStudio.sharedBody.imageFitLabel}</label>
                {(['crop', 'fit', 'stretch'] as const).map((fit) => (
                  <label key={fit} className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="dividerImageFit"
                      checked={imageFit === fit}
                      onChange={() => setImageFit(fit)}
                      className="accent-[var(--color-accent-base)]"
                    />
                    <span>
                      {fit === 'crop'
                        ? t.bookStudio.sharedBody.imageFitCrop
                        : fit === 'fit'
                        ? t.bookStudio.sharedBody.imageFitContain
                        : t.bookStudio.sharedBody.imageFitStretch}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {errorMsg && <p className="text-xs font-semibold text-[var(--color-status-danger-text)]">{errorMsg}</p>}

          <div className="flex items-center gap-2 pt-1">
            <button type="submit" className={`${button.base} ${button.primary} flex-1 text-xs font-bold`}>
              {editingId ? t.bookStudio.dividersStep.saveButton : t.bookStudio.dividersStep.addButton}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => resetDraft()}
                className={`${button.base} ${button.secondary} text-xs font-bold`}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </PanelSection>

      <PanelSection
        icon={<Bookmark className="w-4 h-4" />}
        title={t.bookStudio.dividersStep.listHeading}
        helpTitle="Separadores cargados"
        helpText="Podés prender o apagar la hoja blanca detrás de cada separador por separado."
      >
        {dividers.length === 0 ? (
          <p className="text-xs text-[var(--ui-text-secondary)]">{t.bookStudio.dividersStep.emptyHint}</p>
        ) : (
          <div className="space-y-2">
            {dividers.map((div) => (
              <div
                key={div.id}
                className="p-2.5 border border-[var(--ui-border)] bg-[var(--ui-bg-surface)] flex items-center gap-2.5 text-xs"
                style={{ borderRadius: radius.control }}
              >
                <CoverPreviewThumbnail
                  config={div}
                  kind="divider"
                  paperSize={options.paperSize}
                  defaultCoverStyle={defaultStyle}
                  className="w-10 h-14 object-contain rounded border border-[var(--ui-border)] bg-[var(--ui-bg-card)] shrink-0"
                />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <span className="font-bold text-[var(--ui-text-primary)] truncate block">
                    {div.kicker ? `${div.kicker}: ` : ''}{div.title}
                  </span>
                  <span className="text-[11px] text-[var(--ui-text-secondary)] block">
                    Antes de Pág. {div.insertBeforePage} ·{' '}
                    {div.blankBehind ? '2 págs. (mantiene lado)' : '1 pág. (corre lado)'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <SectionSwitch
                    size="sm"
                    checked={div.blankBehind !== false}
                    onChange={(checked) => handleToggleOneBlankBehind(div.id, checked)}
                    label="Hoja detrás"
                  />
                  <button
                    type="button"
                    onClick={() => loadForEdit(div)}
                    className="p-1.5 text-[var(--ui-text-secondary)] hover:text-[var(--color-accent-text)] cursor-pointer"
                    title="Editar separador"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteDivider(div.id)}
                    className="p-1.5 text-[var(--color-status-danger-text)] hover:opacity-80 cursor-pointer"
                    title="Eliminar separador"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
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
            className={`${button.base} ${button.primary} flex items-center gap-1.5 text-xs font-bold`}
          >
            <span>{t.bookStudio.dividersStep.nextStep}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
