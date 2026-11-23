import React, { useEffect, useState } from 'react';
import { BookMarked, Check, FilePlus2, FileText, Image, Palette } from 'lucide-react';
import { Modal } from '../../../shared/core/ui/Modal';
import { Field } from '../../../shared/core/ui/Field';
import { ActionGrid } from '../../../shared/core/ui/ActionGrid';
import { ActionTileButton } from '../../../shared/core/ui/ActionTileButton';
import { COVER_PRESETS } from '../../../shared/core/pdf-engine/layers/presets/coverPresetCatalog';
import { button, input, radius, selectableCard } from '../../../shared/core/uiDesignSystem';
import { BookSectionDivider } from '../domain/bookDividerCanvas';
import { BookPaperSizeId } from '../domain/bookPrintProfileEngine';
import { bookAssetManager } from '../domain/bookAssetManager';
import { CoverPreviewThumbnail } from './CoverPreviewThumbnail';

export interface BookSectionDividerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfPageCount: number;
  defaultInsertBeforePage?: number;
  defaultCoverStyle?: string;
  paperSize?: BookPaperSizeId;
  initialDivider?: BookSectionDivider | null;
  onSaveDivider: (divider: BookSectionDivider) => void;
}

export const BookSectionDividerModal: React.FC<BookSectionDividerModalProps> = ({
  isOpen,
  onClose,
  pdfPageCount,
  defaultInsertBeforePage = 1,
  defaultCoverStyle = 'monica-classic',
  paperSize = 'A4',
  initialDivider = null,
  onSaveDivider,
}) => {
  const [insertBeforePage, setInsertBeforePage] = useState<number>(defaultInsertBeforePage);
  const [blankBehind, setBlankBehind] = useState<boolean>(true);
  const [type, setType] = useState<'template' | 'upload'>('template');
  const [coverStyle, setCoverStyle] = useState<string>(defaultCoverStyle);
  const [kicker, setKicker] = useState<string>('Capítulo 1');
  const [title, setTitle] = useState<string>('');
  const [subtitle, setSubtitle] = useState<string>('');
  const [assetId, setAssetId] = useState<string | undefined>(undefined);
  const [imageFit, setImageFit] = useState<'crop' | 'fit' | 'stretch'>('crop');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (initialDivider) {
      setInsertBeforePage(initialDivider.insertBeforePage || 1);
      setBlankBehind(initialDivider.blankBehind !== false);
      setType(initialDivider.type || 'template');
      setCoverStyle(initialDivider.coverStyle || defaultCoverStyle);
      setKicker(initialDivider.kicker ?? '');
      setTitle(initialDivider.title || '');
      setSubtitle(initialDivider.subtitle ?? '');
      setAssetId(initialDivider.assetId);
      setImageFit(initialDivider.imageFit || 'crop');
    } else {
      setInsertBeforePage(Math.max(1, Math.min(pdfPageCount || 1, defaultInsertBeforePage || 1)));
      setBlankBehind(true);
      setType('template');
      setCoverStyle(defaultCoverStyle);
      setKicker('Capítulo 1');
      setTitle('');
      setSubtitle('');
      setAssetId(undefined);
      setImageFit('crop');
    }
    setErrorMsg(null);
  }, [isOpen, initialDivider, defaultInsertBeforePage, defaultCoverStyle, pdfPageCount]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Elegí una imagen en formato PNG o JPG.');
      return;
    }
    try {
      const saved = await bookAssetManager.putFile(file, 'cover');
      setAssetId(saved.assetId);
      setType('upload');
      setErrorMsg(null);
    } catch {
      setErrorMsg('No pudimos guardar la imagen en este equipo.');
    }
  };

  const previewConfig: BookSectionDivider = {
    id: initialDivider?.id || 'preview_divider',
    insertBeforePage,
    kicker: kicker.trim(),
    title: title.trim() || 'Título del capítulo',
    subtitle: subtitle.trim(),
    type,
    coverStyle,
    assetId,
    imageFit,
    blankBehind,
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (type === 'template' && !title.trim()) {
      setErrorMsg('Escribí el título del capítulo o sección para generar la carátula.');
      return;
    }
    if (type === 'upload' && !assetId) {
      setErrorMsg('Subí una imagen para el separador o elegí una plantilla de diseño.');
      return;
    }
    const maxPage = Math.max(1, pdfPageCount || 1);
    const clampedPage = Math.max(1, Math.min(maxPage, Number(insertBeforePage) || 1));

    onSaveDivider({
      id: initialDivider?.id || `divider_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      insertBeforePage: clampedPage,
      kicker: kicker.trim(),
      title: title.trim() || `Separador Pág. ${clampedPage}`,
      subtitle: subtitle.trim(),
      type,
      coverStyle,
      assetId,
      imageFit,
      blankBehind,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      icon={<BookMarked className="w-4 h-4" />}
      title={initialDivider ? 'Editar carátula / separador de capítulo' : 'Agregar carátula / separador de capítulo'}
      helpTitle="Carátulas internas entre páginas"
      helpText="Insertá una portada de capítulo o sección antes de cualquier página de tu PDF. Podés usar los mismos diseños de la tapa principal y elegir si dejar el reverso en blanco."
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-[var(--ui-text-primary)]">
        {/* 1. Ubicación y Preset de hoja (Con hoja blanca detrás vs Solo 1 página) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
          <div className="p-3 border border-[var(--ui-border)] bg-[var(--ui-bg-surface)] space-y-1.5" style={{ borderRadius: radius.control }}>
            <label className="text-xs font-bold text-[var(--ui-text-primary)] block">
              Insertar antes de la página PDF:
            </label>
            <input
              type="number"
              min={1}
              max={Math.max(1, pdfPageCount || 1)}
              value={insertBeforePage}
              onChange={(e) => setInsertBeforePage(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className={`${input.base} ${input.focus} w-full font-bold text-sm`}
            />
            <span className="text-[10px] text-[var(--ui-text-secondary)] block">
              Total actual: {pdfPageCount || 1} págs. en el PDF
            </span>
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <span className="text-xs font-bold text-[var(--ui-text-primary)] block">
              Cómo insertar el separador:
            </span>
            <ActionGrid columns={2}>
              <ActionTileButton
                role="preset"
                icon={<FilePlus2 className="w-4 h-4" />}
                label="Con hoja blanca detrás"
                badge="2 págs."
                active={blankBehind}
                helpText="Recomendado para impresión doble cara: la carátula queda a la derecha y su reverso queda limpio en blanco."
                helpGroupKey="divider-blank-behind-yes"
                onClick={() => setBlankBehind(true)}
              />
              <ActionTileButton
                role="record"
                icon={<FileText className="w-4 h-4" />}
                label="Solo 1 página"
                badge="1 pág."
                active={!blankBehind}
                helpText="Inserta únicamente la página de carátula; el contenido continúa inmediatamente en el reverso."
                helpGroupKey="divider-blank-behind-no"
                onClick={() => setBlankBehind(false)}
              />
            </ActionGrid>
          </div>
        </div>

        {/* 2. Modo de diseño + Vista previa en vivo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-3">
            <ActionGrid columns={2}>
              <ActionTileButton
                role="preset"
                icon={<Palette className="w-4 h-4" />}
                label="Diseño con Preset"
                active={type === 'template'}
                helpText="Usa los mismos diseños editoriales del catálogo de portadas."
                helpGroupKey="divider-mode-template"
                onClick={() => setType('template')}
              />
              <ActionTileButton
                role="io"
                icon={<Image className="w-4 h-4" />}
                label="Subir imagen propia"
                active={type === 'upload'}
                helpText="Subí una carátula de capítulo ya diseñada en JPG o PNG."
                helpGroupKey="divider-mode-upload"
                onClick={() => setType('upload')}
              />
            </ActionGrid>

            {type === 'template' ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {COVER_PRESETS.map((preset) => {
                    const selected = coverStyle === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setCoverStyle(preset.id)}
                        className={`${selectableCard.base} ${
                          selected ? selectableCard.selected : selectableCard.unselected
                        } flex items-center justify-between p-2 text-[11px] cursor-pointer`}
                      >
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0"
                            style={{ backgroundColor: preset.badgeBg }}
                          />
                          <span className="truncate font-semibold">{preset.name.split('&')[0].trim()}</span>
                        </div>
                        {selected && <Check className="w-3.5 h-3.5 text-[var(--color-accent-text)] shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <Field
                    label="Etiqueta superior (opcional)"
                    value={kicker}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setKicker(e.target.value)}
                    placeholder="Ej: Capítulo 1 / Parte I"
                  />
                  <div className="sm:col-span-2">
                    <Field
                      label="Título del capítulo o sección"
                      value={title}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                      placeholder="Ej: Introducción General"
                    />
                  </div>
                </div>

                <Field
                  label="Subtítulo o epígrafe (opcional)"
                  value={subtitle}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubtitle(e.target.value)}
                  placeholder="Breve frase o descripción de esta sección..."
                />
              </>
            ) : (
              <div className="space-y-2.5">
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleImageUpload}
                  className={`${input.base} cursor-pointer`}
                />
                <Field
                  label="Nombre de referencia"
                  value={title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                  placeholder="Ej: Separador Capítulo 1"
                />
              </div>
            )}
          </div>

          {/* Columna derecha: Vista previa en vivo */}
          <div className="p-3 border border-[var(--ui-border)] bg-[var(--ui-bg-surface)] flex flex-col items-center justify-center space-y-2" style={{ borderRadius: radius.card }}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--ui-text-secondary)]">
              Vista previa del separador
            </span>
            <CoverPreviewThumbnail
              config={previewConfig}
              kind="divider"
              paperSize={paperSize}
              defaultCoverStyle={defaultCoverStyle}
              className="w-full max-w-[160px] h-auto aspect-[1/1.41] object-contain rounded border border-[var(--ui-border)] bg-[var(--ui-bg-card)] shadow-xs"
            />
            <span className="text-[11px] font-semibold text-[var(--color-accent-text)] text-center">
              {blankBehind ? 'Suma 2 páginas (con reverso blanco)' : 'Suma 1 página'}
            </span>
          </div>
        </div>

        {errorMsg && (
          <p className="text-xs font-semibold text-[var(--color-status-danger-text)]">{errorMsg}</p>
        )}

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--ui-border)]">
          <button
            type="button"
            onClick={onClose}
            className={`${button.base} ${button.secondary}`}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className={`${button.base} ${button.primary}`}
          >
            {initialDivider ? 'Guardar cambios' : 'Insertar separador'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
