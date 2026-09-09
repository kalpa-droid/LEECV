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
  Trash2,
  Undo2,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { radius, elevationSystem, button, input } from '../../../shared/core/uiDesignSystem';

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
  splitOffset?: number;
  isFotocopiaMode?: boolean;
  isDeleted?: boolean;
  deletedPages?: (number | string)[];
  showDeletedPages?: boolean;
  activeStep?: string;
  onSaveReferencePage: (refPdfPage: number, refBookPage: number, refPageSide: 'derecha' | 'izquierda') => void;
  onSaveSplitOffset?: (pageNum: number, newOffset: number) => void;
  onNavigate?: (pageNum: number) => void;
  onRotate?: (pageNum: number) => void;
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
  splitOffset = 50,
  isFotocopiaMode = false,
  isDeleted = false,
  deletedPages = [],
  showDeletedPages = false,
  activeStep = '',
  onSaveReferencePage,
  onSaveSplitOffset,
  onNavigate,
  onRotate,
  onToggleDelete,
  onMoveLeft,
  onMoveRight,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Form states for reference page and split offset
  const [inputBookPage, setInputBookPage] = useState<number>(refBookPage || pageNum);
  const [inputPageSide, setInputPageSide] = useState<'derecha' | 'izquierda'>(refPageSide);
  const [localSplitOffset, setLocalSplitOffset] = useState<number>(splitOffset);
  const [isSavedNotice, setIsSavedNotice] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    setInputBookPage(refBookPage || pageNum);
    setInputPageSide(refPageSide);
    setLocalSplitOffset(splitOffset);
  }, [isOpen, pageNum, refBookPage, refPageSide, splitOffset]);

  // El lado es 100% derivable del número de página impreso (impar=derecha, par=izquierda)
  useEffect(() => {
    setInputPageSide(inputBookPage % 2 !== 0 ? 'derecha' : 'izquierda');
  }, [inputBookPage]);

  useEffect(() => {
    if (!isOpen || !pdfDoc || !canvasRef.current) return;

    let isCancelled = false;

    const renderHighRes = async () => {
      try {
        setIsLoading(true);
        const page = await pdfDoc.getPage(pageNum);
        if (isCancelled) return;

        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const isVertical = unscaledViewport.height > unscaledViewport.width;
        const autoAngle = isFotocopiaMode && isVertical ? 90 : 0;
        const totalAngle = (autoAngle + rotation) % 360;

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

        // Draw red dashed split line overlay at localSplitOffset only in fotocopia mode
        if (!isCancelled && ctx && isFotocopiaMode) {
          const splitX = Math.round(canvas.width * (localSplitOffset / 100));
          ctx.save();
          ctx.strokeStyle = '#FF2E63';
          ctx.lineWidth = 3;
          ctx.setLineDash([8, 6]);
          ctx.beginPath();
          ctx.moveTo(splitX, 0);
          ctx.lineTo(splitX, canvas.height);
          ctx.stroke();

          // Draw scissors badge at top of line
          ctx.fillStyle = '#FF2E63';
          ctx.fillRect(splitX - 16, 4, 32, 18);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`✂ ${localSplitOffset}%`, splitX, 17);
          ctx.restore();
        }

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
  }, [isOpen, pdfDoc, pageNum, rotation, localSplitOffset, isFotocopiaMode]);

  if (!isOpen) return null;

  const handleApplyReference = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveReferencePage(pageNum, Number(inputBookPage), inputPageSide);
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
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 px-3 py-2 rounded-xl bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] font-bold text-xs flex items-center gap-1 hover:opacity-90 transition cursor-pointer shadow-lg"
              title={`Ir a página ${prevPage}`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Anterior ({prevPage})</span>
            </button>
          )}

          {nextPage !== null && onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate(nextPage)}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 px-3 py-2 rounded-xl bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] font-bold text-xs flex items-center gap-1 hover:opacity-90 transition cursor-pointer shadow-lg"
              title={`Ir a página ${nextPage}`}
            >
              <span className="hidden sm:inline">Siguiente ({nextPage})</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {isLoading && (
            <div className="flex flex-col items-center gap-2 text-[var(--ui-text-secondary)]">
              <div className="w-8 h-8 border-3 border-[var(--color-accent-base)] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">Cargando vista previa en alta resolución...</span>
            </div>
          )}

          <canvas
            ref={canvasRef}
            className={`max-w-full max-h-[70vh] object-contain shadow-2xl rounded-sm ${
              isLoading ? 'hidden' : 'block'
            } ${isDeleted ? 'opacity-50 grayscale' : ''}`}
          />

          {isDeleted && (
            <div className="absolute top-4 left-4 px-3 py-1.5 rounded-lg bg-[var(--color-status-danger-muted)] border border-[var(--color-status-danger-base)]/40 text-[var(--color-status-danger-text)] font-bold text-xs shadow-md">
              PÁGINA ELIMINADA
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
                  Página {pageNum} del PDF
                </span>
                <h3 className="text-base font-bold text-[var(--ui-text-primary)] flex items-center gap-1.5 pt-1">
                  <Bookmark className="w-4 h-4 text-[var(--color-secondary-bright)]" />
                  <span>5. Encuentro un número</span>
                </h3>
                <p className="text-xs text-[var(--ui-text-secondary)] leading-relaxed">
                  Busca en la vista previa el número impreso en esta página y escríbelo a continuación.
                </p>
              </div>

              <form onSubmit={handleApplyReference} className="space-y-3 pt-2 border-t border-[var(--ui-border)]">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--ui-text-primary)] block">
                    En esta hoja veo el número de página:
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
                    {inputPageSide === 'derecha' ? 'Derecha (Impar)' : 'Izquierda (Par)'}
                  </div>
                </div>

                <button
                  type="submit"
                  className={`${button.base} ${button.primary} w-full flex items-center justify-center gap-1.5 text-xs font-bold`}
                >
                  <Check className="w-4 h-4" />
                  <span>Encontrado</span>
                </button>

                {isSavedNotice && (
                  <div className="p-2 bg-[var(--color-status-success-muted)] border border-[var(--color-status-success-bright)]/30 rounded-[10px] text-[var(--color-status-success-text)] text-xs font-bold text-center animate-fadeIn">
                    ✓ Guardado correctamente
                  </div>
                )}

                {isCurrentReference && (
                  <div className="p-2 bg-[var(--color-accent-light)]/20 border border-[var(--color-accent-base)]/30 rounded-[10px] text-[var(--color-accent-text)] text-[11px] font-semibold text-center">
                    ★ Referencia activa del libro
                  </div>
                )}
              </form>
            </div>
          ) : (
            /* CONTEXTO GENERAL: Pasos 1..4, 6 */
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="px-2.5 py-1 rounded-full bg-[var(--color-accent-light)]/20 text-[var(--color-secondary-bright)] font-bold text-[10px] uppercase">
                  Página {pageNum} del PDF
                </span>
                <h3 className="text-base font-bold text-[var(--ui-text-primary)] flex items-center gap-1.5 pt-1">
                  <Bookmark className="w-4 h-4 text-[var(--color-secondary-bright)]" />
                  <span>Inspección & Foliado</span>
                </h3>
                <p className="text-xs text-[var(--ui-text-secondary)] leading-relaxed">
                  Vista previa de alta resolución y calibración de número de página.
                </p>
              </div>

              {/* Formulario de Calibración de Foliado de Referencia */}
              <form onSubmit={handleApplyReference} className="space-y-3 pt-2 border-t border-[var(--ui-border)]">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--ui-text-primary)] block">
                    Número de Página Impreso
                  </label>
                  <p className="text-[11px] text-[var(--ui-text-secondary)]">
                    Asigna el número de página visible en el libro original.
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
                    {inputPageSide === 'derecha' ? 'Derecha (Impar)' : 'Izquierda (Par)'}
                  </div>
                </div>

                <button
                  type="submit"
                  className={`${button.base} ${button.primary} w-full flex items-center justify-center gap-1.5 text-xs font-bold`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Guardar Referencia</span>
                </button>

                {isSavedNotice && (
                  <div className="p-2 bg-[var(--color-status-success-muted)] border border-[var(--color-status-success-bright)]/30 rounded-[10px] text-[var(--color-status-success-text)] text-xs font-bold text-center animate-fadeIn">
                    ✓ Guardado correctamente
                  </div>
                )}

                {isCurrentReference && (
                  <div className="p-2 bg-[var(--color-accent-light)]/20 border border-[var(--color-accent-base)]/30 rounded-[10px] text-[var(--color-accent-text)] text-[11px] font-semibold text-center">
                    ★ Referencia activa del libro
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
                      <span>Corte Central Manual</span>
                    </span>
                    <span className="font-mono text-[var(--color-secondary-bright)]">{localSplitOffset}%</span>
                  </div>

                  <input
                    type="range"
                    min={30}
                    max={70}
                    value={localSplitOffset}
                    onChange={(e) => handleSplitOffsetChangeLocal(parseInt(e.target.value, 10))}
                    className="w-full h-1.5 bg-[var(--ui-bg-panel)] rounded-lg appearance-none cursor-pointer accent-[var(--color-accent-base)]"
                  />

                  <div className="flex items-center justify-between text-[10px] text-[var(--ui-text-secondary)]">
                    <span>Izquierda 30%</span>
                    <span>Centro 50%</span>
                    <span>Derecha 70%</span>
                  </div>
                </div>
              )}

              {/* Botones de Organización SOLO en modo Normal */}
              {!isFotocopiaMode && (
                <div className="space-y-2 pt-3 border-t border-[var(--ui-border)]">
                  <label className="text-xs font-bold text-[var(--ui-text-primary)] block">Acciones de Página</label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {onRotate && (
                      <button
                        type="button"
                        onClick={() => onRotate(pageNum)}
                        className={`${button.base} ${button.secondary} flex items-center justify-center gap-1.5 py-2`}
                        title="Rotar 180°"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Rotar 180°</span>
                      </button>
                    )}

                    {onToggleDelete && (
                      <button
                        type="button"
                        onClick={() => onToggleDelete(pageNum)}
                        className={`${button.base} ${
                          isDeleted ? button.primary : button.secondary
                        } flex items-center justify-center gap-1.5 py-2`}
                        title={isDeleted ? 'Restaurar Página' : 'Eliminar Página'}
                      >
                        {isDeleted ? <Undo2 className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5 text-[var(--color-status-danger-text)]" />}
                        <span>{isDeleted ? 'Restaurar' : 'Eliminar'}</span>
                      </button>
                    )}

                    {onMoveLeft && (
                      <button
                        type="button"
                        onClick={() => onMoveLeft(pageNum)}
                        className={`${button.base} ${button.secondary} flex items-center justify-center gap-1 py-2`}
                        title="Mover a la izquierda"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Mover Izq</span>
                      </button>
                    )}

                    {onMoveRight && (
                      <button
                        type="button"
                        onClick={() => onMoveRight(pageNum)}
                        className={`${button.base} ${button.secondary} flex items-center justify-center gap-1 py-2`}
                        title="Mover a la derecha"
                      >
                        <span>Mover Der</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2 pt-3 border-t border-[var(--ui-border)]">
            {isFotocopiaMode && !isFoliadoStep && (
              <div className="flex items-center gap-2 text-[11px] text-[var(--ui-text-secondary)]">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-[var(--color-secondary-bright)]" />
                <span>La línea roja punteada ✂ indica por dónde cortará el motor.</span>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className={`${button.base} ${button.secondary} w-full flex items-center justify-center gap-1.5 text-xs font-bold`}
            >
              <Check className="w-4 h-4" />
              <span>Cerrar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
