import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Check,
  Bookmark,
  Scissors,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  RotateCcw,
  BookMarked,
  Trash2,
  Undo2,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { radius, elevationSystem, button, input } from '../../../shared/core/uiDesignSystem';
import { resolveNaturalPdfPageSide } from '../../../shared/kits/print-imposition/impositionMath';
import { useText } from '../../../shared/i18n/useText';

export interface LightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageNum: number;
  pdfDoc: any;
  totalPages: number;
  rotation?: number;
  refPdfPage?: number;
  refBookPage?: number;
  refPageSide?: 'derecha' | 'izquierda';
  refPdfHalf?: 'izquierda' | 'derecha';
  splitOffset?: number;
  isFotocopiaMode?: boolean;
  isDeleted?: boolean;
  deletedPages?: (number | string)[];
  showDeletedPages?: boolean;
  activeStep?: string;
  onSaveReferencePage: (
    refPdfPage: number,
    refBookPage: number,
    refPageSide: 'derecha' | 'izquierda',
    refPdfHalf?: 'izquierda' | 'derecha',
  ) => void;
  onSaveSplitOffset?: (pageNum: number, newOffset: number) => void;
  onInsertDividerBeforePage?: (pageNum: number) => void;
  onNavigate?: (pageNum: number) => void;
  onRotate?: (pageNum: number) => void;
  onRotateLeft90?: (pageNum: number) => void;
  onToggleDelete?: (pageNum: number) => void;
  onMoveLeft?: (pageNum: number) => void;
  onMoveRight?: (pageNum: number) => void;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({
  isOpen,
  onClose,
  pageNum,
  pdfDoc,
  totalPages,
  rotation = 0,
  refPdfPage = 0,
  refBookPage = 0,
  refPageSide = 'derecha',
  refPdfHalf,
  splitOffset = 50,
  isFotocopiaMode = false,
  isDeleted = false,
  deletedPages = [],
  showDeletedPages = false,
  activeStep = '',
  onSaveReferencePage,
  onSaveSplitOffset,
  onInsertDividerBeforePage,
  onNavigate,
  onRotate,
  onRotateLeft90,
  onToggleDelete,
  onMoveLeft,
  onMoveRight,
}) => {
  const t = useText();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Form states for reference page and split offset
  const [inputBookPage, setInputBookPage] = useState<number>(refBookPage || pageNum);
  const [inputFotocopiaHalf, setInputFotocopiaHalf] = useState<'izquierda' | 'derecha'>(
    refPdfHalf || 'derecha',
  );
  const [inputPageSide, setInputPageSide] = useState<'derecha' | 'izquierda'>(refPageSide);
  const [localSplitOffset, setLocalSplitOffset] = useState<number>(splitOffset);
  const [isSavedNotice, setIsSavedNotice] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    setInputBookPage(refBookPage || pageNum);
    setInputFotocopiaHalf(refPdfHalf || 'derecha');
    setInputPageSide(
      resolveNaturalPdfPageSide(
        pageNum,
        isFotocopiaMode ? 'fotocopia' : 'normal',
        refPdfHalf || 'derecha',
      ),
    );
    setLocalSplitOffset(splitOffset);
  }, [isOpen, pageNum, refBookPage, refPageSide, refPdfHalf, splitOffset, isFotocopiaMode]);

  useEffect(() => {
    setInputPageSide(
      resolveNaturalPdfPageSide(
        pageNum,
        isFotocopiaMode ? 'fotocopia' : 'normal',
        inputFotocopiaHalf,
      ),
    );
  }, [pageNum, isFotocopiaMode, inputFotocopiaHalf]);

  useEffect(() => {
    if (!isOpen || !pdfDoc || !canvasRef.current) return;

    let isCancelled = false;

    const renderHighRes = async () => {
      try {
        setIsLoading(true);
        const page = await pdfDoc.getPage(pageNum);
        if (isCancelled) {
          try { page.cleanup?.(); } catch (e) { /* Ignore cleanup error */ }
          return;
        }

        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const isVertical = unscaledViewport.height > unscaledViewport.width;
        const autoAngle = isFotocopiaMode && isVertical && rotation === 0 ? 90 : 0;
        const totalAngle = ((autoAngle + rotation) % 360 + 360) % 360;

        const targetWidth = 600; // High quality preview
        const scale = targetWidth / unscaledViewport.width;
        const viewport = page.getViewport({ scale, rotation: totalAngle });

        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({ canvasContext: ctx, viewport }).promise;

        // Liberar la página de PDF.js (memoria/caché) tras dibujar.
        if (!isCancelled) {
          try { page.cleanup?.(); } catch (e) { /* Ignore cleanup error */ }
        }

        // La línea de corte y su insignia ahora son un overlay <div>
        // (antes se dibujaban en el canvas y mover el slider re-renderizaba
        // toda la página en alta resolución).

        if (!isCancelled) setIsLoading(false);
      } catch (err) {
        console.error(`Error rendering high-res lightbox page ${pageNum}:`, err);
        if (!isCancelled) setIsLoading(false);
      }
    };

    renderHighRes();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, pdfDoc, pageNum, rotation, isFotocopiaMode]);

  if (!isOpen) return null;

  const handleApplyReference = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveReferencePage(
      pageNum,
      Number(inputBookPage),
      inputPageSide,
      isFotocopiaMode ? inputFotocopiaHalf : undefined,
    );
    if (onSaveSplitOffset) {
      onSaveSplitOffset(pageNum, localSplitOffset);
    }
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 2000);
  };

  const handleSplitOffsetChangeLocal = (val: number) => {
    setLocalSplitOffset(val);
    if (onSaveSplitOffset) {
      onSaveSplitOffset(pageNum, val);
    }
  };

  const isCurrentReference = refPdfPage === pageNum && refBookPage > 0;
  const isFoliadoStep = activeStep === 'book_foliado';

  // Navigation helpers
  const deletedSet = new Set((deletedPages || []).map((p) => Number(p)));

  const getPrevPage = (): number | null => {
    let p = pageNum - 1;
    while (p >= 1) {
      if (showDeletedPages || !deletedSet.has(p)) {
        return p;
      }
      p--;
    }
    return null;
  };

  const getNextPage = (): number | null => {
    let p = pageNum + 1;
    while (p <= totalPages) {
      if (showDeletedPages || !deletedSet.has(p)) {
        return p;
      }
      p++;
    }
    return null;
  };

  const prevPage = getPrevPage();
  const nextPage = getNextPage();

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
      <div
        className={`relative w-full max-w-4xl max-h-[90vh] bg-[var(--ui-bg-card)] border border-[var(--ui-border)] rounded-[${radius.modal}] ${elevationSystem.overlay} overflow-hidden flex flex-col md:flex-row text-[var(--ui-text-primary)]`}
      >
        {/* Botón Cerrar */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-20 p-2 rounded-full bg-[var(--ui-bg-panel)] hover:bg-[var(--ui-border)] text-[var(--ui-text-primary)] transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Lado Izquierdo: Renderizado de la Imagen en Alta Res + Navegación ◀ ▶ */}
        <div className="flex-1 bg-[var(--ui-bg-panel)] p-6 flex flex-col items-center justify-center overflow-auto min-h-[320px] md:min-h-[480px] relative group">
          {/* Botones de Navegación ◀ ▶ flotantes sobre la imagen */}
          {prevPage !== null && onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate(prevPage)}
              className={`absolute left-3 top-1/2 -translate-y-1/2 z-10 px-3 py-2 rounded-[${radius.control}] bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] font-bold text-xs flex items-center gap-1 hover:opacity-90 transition cursor-pointer shadow-[var(--shadow-floating)]`}
              title={t.bookStudio.lightboxModal.goToPageTitle.replace('{page}', String(prevPage))}
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{t.bookStudio.lightboxModal.navPrevPage.replace('{page}', String(prevPage))}</span>
            </button>
          )}

          {nextPage !== null && onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate(nextPage)}
              className={`absolute right-3 top-1/2 -translate-y-1/2 z-10 px-3 py-2 rounded-[${radius.control}] bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] font-bold text-xs flex items-center gap-1 hover:opacity-90 transition cursor-pointer shadow-[var(--shadow-floating)]`}
              title={t.bookStudio.lightboxModal.goToPageTitle.replace('{page}', String(nextPage))}
            >
              <span className="hidden sm:inline">{t.bookStudio.lightboxModal.navNextPage.replace('{page}', String(nextPage))}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {isLoading && (
            <div className="flex flex-col items-center gap-2 text-[var(--ui-text-secondary)]">
              <div className="w-8 h-8 border-3 border-[var(--color-accent-base)] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">{t.bookStudio.lightboxModal.loadingHighRes}</span>
            </div>
          )}

          <div className="relative inline-flex max-w-full">
            <canvas
              ref={canvasRef}
              className={`max-w-full max-h-[70vh] object-contain shadow-[var(--shadow-overlay)] rounded-sm ${
                isLoading ? 'hidden' : 'block'
              } ${isDeleted ? 'opacity-50 grayscale' : ''}`}
            />

            {/* Línea de corte como overlay (div): mover el slider ya no vuelve
                a renderizar la página en alta resolución. */}
            {!isLoading && isFotocopiaMode && (
              <div
                className="absolute inset-y-0 pointer-events-none"
                style={{ left: `${localSplitOffset}%` }}
                title={t.bookStudio.lightboxModal.cutManualTitle}
              >
                <div className="h-full border-l-[3px] border-dashed border-[var(--color-accent-base)]" />
                <div className={`absolute top-0 left-0 -translate-x-1/2 flex items-center gap-1 px-1.5 py-0.5 rounded-[${radius.control}] bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] text-[9px] font-bold shadow-[var(--shadow-raised)]`}>
                  <Scissors className="w-2.5 h-2.5" />
                  <span>{localSplitOffset}%</span>
                </div>
              </div>
            )}
          </div>

          {isDeleted && (
            <div className={`absolute top-4 left-4 px-3 py-1.5 rounded-[${radius.control}] bg-[var(--color-status-danger-muted)] border border-[var(--color-status-danger-base)]/40 text-[var(--color-status-danger-text)] font-bold text-xs shadow-[var(--shadow-raised)]`}>
              {t.bookStudio.lightboxModal.deletedBadge}
            </div>
          )}
        </div>

        {/* Lado Derecho: Panel Contextual */}
        <div className="w-full md:w-80 p-5 bg-[var(--ui-bg-panel)] border-t md:border-t-0 md:border-l border-[var(--ui-border)] flex flex-col justify-between space-y-4 overflow-y-auto">
          {/* CONTEXTO PASO 5: Foliado ("5. Encuentro un número") */}
          {isFoliadoStep ? (
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="px-2.5 py-1 rounded-full bg-[var(--color-accent-light)]/20 text-[var(--color-secondary-bright)] font-bold text-[10px] uppercase">
                  {t.bookStudio.lightboxModal.pageOfPdf.replace('{page}', String(pageNum))}
                </span>
                <h3 className="text-base font-bold text-[var(--ui-text-primary)] flex items-center gap-1.5 pt-1">
                  <Bookmark className="w-4 h-4 text-[var(--color-secondary-bright)]" />
                  <span>{t.bookStudio.foliadoStep.title}</span>
                </h3>
                <p className="text-xs text-[var(--ui-text-secondary)] leading-relaxed">
                  {t.bookStudio.lightboxModal.foliadoInstruction}
                </p>
              </div>

              <form onSubmit={handleApplyReference} className="space-y-3 pt-2 border-t border-[var(--ui-border)]">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--ui-text-primary)] block">
                    {t.bookStudio.lightboxModal.foliadoFieldLabel}
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={inputBookPage}
                    onChange={(e) => setInputBookPage(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className={`${input.base} ${input.focus} w-24 text-center font-bold text-sm`}
                  />
                  <div className="flex-1 px-2.5 py-2 rounded-[10px] bg-[var(--ui-bg-card)] border border-[var(--ui-border)] text-xs font-semibold text-center">
                    {inputBookPage % 2 !== 0 ? t.bookStudio.lightboxModal.sideRightOdd : t.bookStudio.lightboxModal.sideLeftEven}
                  </div>
                </div>

                {isFotocopiaMode && (
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    {(['izquierda', 'derecha'] as const).map((half) => (
                      <button
                        key={half}
                        type="button"
                        onClick={() => setInputFotocopiaHalf(half)}
                        className={`py-1.5 px-2 rounded-lg border font-bold cursor-pointer ${
                          inputFotocopiaHalf === half
                            ? 'bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] border-[var(--color-accent-base)]'
                            : 'bg-[var(--ui-bg-card)] text-[var(--ui-text-secondary)] border-[var(--ui-border)]'
                        }`}
                      >
                        Mitad {half}
                      </button>
                    ))}
                  </div>
                )}

                <button
                  type="submit"
                  className={`${button.base} ${button.primary} w-full flex items-center justify-center gap-1.5 text-xs font-bold`}
                >
                  <Check className="w-4 h-4" />
                  <span>{t.bookStudio.foliadoStep.foundButton}</span>
                </button>

                {isSavedNotice && (
                  <div className="p-2 bg-[var(--color-status-success-muted)] border border-[var(--color-status-success-bright)]/30 rounded-[10px] text-[var(--color-status-success-text)] text-xs font-bold text-center animate-fadeIn">
                    {t.bookStudio.lightboxModal.savedNotice}
                  </div>
                )}

                {isCurrentReference && (
                  <div className="p-2 bg-[var(--color-accent-light)]/20 border border-[var(--color-accent-base)]/30 rounded-[10px] text-[var(--color-accent-text)] text-[11px] font-semibold text-center">
                    {t.bookStudio.lightboxModal.activeReference}
                  </div>
                )}
              </form>
            </div>
          ) : (
            /* CONTEXTO GENERAL: Pasos 1..4, 6 */
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="px-2.5 py-1 rounded-full bg-[var(--color-accent-light)]/20 text-[var(--color-secondary-bright)] font-bold text-[10px] uppercase">
                  {t.bookStudio.lightboxModal.pageOfPdf.replace('{page}', String(pageNum))}
                </span>
                <h3 className="text-base font-bold text-[var(--ui-text-primary)] flex items-center gap-1.5 pt-1">
                  <Bookmark className="w-4 h-4 text-[var(--color-secondary-bright)]" />
                  <span>{t.bookStudio.lightboxModal.sectionTitle}</span>
                </h3>
                <p className="text-xs text-[var(--ui-text-secondary)] leading-relaxed">
                  {t.bookStudio.lightboxModal.sectionDescription}
                </p>
              </div>

              {/* Formulario de Calibración de Foliado de Referencia */}
              <form onSubmit={handleApplyReference} className="space-y-3 pt-2 border-t border-[var(--ui-border)]">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--ui-text-primary)] block">
                    {t.bookStudio.lightboxModal.fieldLabel}
                  </label>
                  <p className="text-[11px] text-[var(--ui-text-secondary)]">
                    {t.bookStudio.lightboxModal.fieldHint}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={inputBookPage}
                    onChange={(e) => setInputBookPage(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className={`${input.base} ${input.focus} w-24 text-center font-bold text-sm`}
                  />
                  <div className="flex-1 px-2.5 py-2 rounded-[10px] bg-[var(--ui-bg-card)] border border-[var(--ui-border)] text-xs font-semibold text-center">
                    {inputBookPage % 2 !== 0 ? t.bookStudio.lightboxModal.sideRightOdd : t.bookStudio.lightboxModal.sideLeftEven}
                  </div>
                </div>

                {isFotocopiaMode && (
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    {(['izquierda', 'derecha'] as const).map((half) => (
                      <button
                        key={half}
                        type="button"
                        onClick={() => setInputFotocopiaHalf(half)}
                        className={`py-1.5 px-2 rounded-lg border font-bold cursor-pointer ${
                          inputFotocopiaHalf === half
                            ? 'bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] border-[var(--color-accent-base)]'
                            : 'bg-[var(--ui-bg-card)] text-[var(--ui-text-secondary)] border-[var(--ui-border)]'
                        }`}
                      >
                        Mitad {half}
                      </button>
                    ))}
                  </div>
                )}

                <button
                  type="submit"
                  className={`${button.base} ${button.primary} w-full flex items-center justify-center gap-1.5 text-xs font-bold`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>{t.bookStudio.lightboxModal.saveReference}</span>
                </button>

                {isSavedNotice && (
                  <div className="p-2 bg-[var(--color-status-success-muted)] border border-[var(--color-status-success-bright)]/30 rounded-[10px] text-[var(--color-status-success-text)] text-xs font-bold text-center animate-fadeIn">
                    {t.bookStudio.lightboxModal.savedNotice}
                  </div>
                )}

                {isCurrentReference && (
                  <div className="p-2 bg-[var(--color-accent-light)]/20 border border-[var(--color-accent-base)]/30 rounded-[10px] text-[var(--color-accent-text)] text-[11px] font-semibold text-center">
                    {t.bookStudio.lightboxModal.activeReference}
                  </div>
                )}
              </form>

              {/* Ajuste de Corte Central Manual SOLO en modo Fotocopia */}
              {isFotocopiaMode && (
                <div
                  className={`p-3 bg-[var(--ui-bg-card)] border border-[var(--ui-border)] rounded-[${radius.card}] space-y-2 pt-3 border-t border-[var(--ui-border)]`}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-[var(--ui-text-primary)]">
                    <span className="flex items-center gap-1">
                      <Scissors className="w-4 h-4 text-[var(--color-secondary-bright)]" />
                      <span>{t.bookStudio.lightboxModal.cutManualLabel}</span>
                    </span>
                    <span className="font-mono text-[var(--color-secondary-bright)]">{localSplitOffset}%</span>
                  </div>

                  <input
                    type="range"
                    min={30}
                    max={70}
                    value={localSplitOffset}
                    onChange={(e) => handleSplitOffsetChangeLocal(parseInt(e.target.value, 10))}
                    className={`w-full h-1.5 bg-[var(--ui-bg-panel)] rounded-[${radius.control}] appearance-none cursor-pointer accent-[var(--color-accent-base)]`}
                  />

                  <div className="flex items-center justify-between text-[10px] text-[var(--ui-text-secondary)]">
                    <span>{t.bookStudio.lightboxModal.cutLeft30}</span>
                    <span>{t.bookStudio.lightboxModal.cutCenter50}</span>
                    <span>{t.bookStudio.lightboxModal.cutRight70}</span>
                  </div>
                </div>
              )}

              {/* Botones de Organización y Separadores */}
              <div className="space-y-2 pt-3 border-t border-[var(--ui-border)]">
                <label className="text-xs font-bold text-[var(--ui-text-primary)] block">{t.bookStudio.lightboxModal.pageActionsLabel}</label>
                {onInsertDividerBeforePage && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onInsertDividerBeforePage(pageNum);
                    }}
                    className={`${button.base} ${button.secondary} w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold`}
                  >
                    <BookMarked className="w-3.5 h-3.5 text-[var(--color-accent-text)]" />
                    <span>Insertar carátula antes de esta página</span>
                  </button>
                )}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {onRotateLeft90 && (
                    <button
                      type="button"
                      onClick={() => onRotateLeft90(pageNum)}
                      className={`${button.base} ${button.secondary} flex items-center justify-center gap-1.5 py-2`}
                      title="Girar 90° a la izquierda (↺)"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Girar -90° ↺</span>
                    </button>
                  )}

                  {onRotate && (
                    <button
                      type="button"
                      onClick={() => onRotate(pageNum)}
                      className={`${button.base} ${button.secondary} flex items-center justify-center gap-1.5 py-2`}
                      title="Girar 90° a la derecha (↻)"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Girar +90° ↻</span>
                    </button>
                  )}

                  {onToggleDelete && (
                    <button
                      type="button"
                      onClick={() => onToggleDelete(pageNum)}
                      className={`${button.base} ${
                        isDeleted ? button.primary : button.secondary
                      } flex items-center justify-center gap-1.5 py-2`}
                      title={isDeleted ? t.bookStudio.lightboxModal.restorePageTitle : t.bookStudio.lightboxModal.deletePageTitle}
                    >
                      {isDeleted ? <Undo2 className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5 text-[var(--color-status-danger-text)]" />}
                      <span>{isDeleted ? t.bookStudio.lightboxModal.restoreShort : t.bookStudio.lightboxModal.deleteShort}</span>
                    </button>
                  )}

                  {onMoveLeft && (
                    <button
                      type="button"
                      onClick={() => onMoveLeft(pageNum)}
                      className={`${button.base} ${button.secondary} flex items-center justify-center gap-1 py-2`}
                      title={t.bookStudio.lightboxModal.moveLeftTitle}
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>{t.bookStudio.lightboxModal.moveLeft}</span>
                    </button>
                  )}

                  {onMoveRight && (
                    <button
                      type="button"
                      onClick={() => onMoveRight(pageNum)}
                      className={`${button.base} ${button.secondary} flex items-center justify-center gap-1 py-2`}
                      title={t.bookStudio.lightboxModal.moveRightTitle}
                    >
                      <span>{t.bookStudio.lightboxModal.moveRight}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2 pt-3 border-t border-[var(--ui-border)]">
            {isFotocopiaMode && !isFoliadoStep && (
              <div className="flex items-center gap-2 text-[11px] text-[var(--ui-text-secondary)]">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-[var(--color-secondary-bright)]" />
                <span>{t.bookStudio.lightboxModal.cutRedLineHint}</span>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className={`${button.base} ${button.secondary} w-full flex items-center justify-center gap-1.5 text-xs font-bold`}
            >
              <Check className="w-4 h-4" />
              <span>{t.common.actions.close}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
