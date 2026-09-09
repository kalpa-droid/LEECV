import React, { useEffect, useRef, useState } from 'react';
import { RotateCw, Trash2, RotateCcw, ZoomIn, ArrowLeft, ArrowRight, Scissors } from 'lucide-react';
import { radius, elevationSystem } from '../../../shared/core/uiDesignSystem';

export interface ThumbnailCardProps {
  pageNum: number;
  pdfDoc: any;
  rotation?: number;
  isDeleted?: boolean;
  canMoveLeft?: boolean;
  canMoveRight?: boolean;
  splitOffset?: number;
  isFotocopiaMode?: boolean;
  onRotate: (pageNum: number) => void;
  onToggleDelete: (pageNum: number) => void;
  onMoveLeft?: (pageNum: number) => void;
  onMoveRight?: (pageNum: number) => void;
  onSplitOffsetChange?: (pageNum: number, newOffset: number) => void;
  onOpenLightbox: (pageNum: number) => void;
}

export const ThumbnailCard: React.FC<ThumbnailCardProps> = ({
  pageNum,
  pdfDoc,
  rotation = 0,
  isDeleted = false,
  canMoveLeft = false,
  canMoveRight = false,
  splitOffset = 50,
  isFotocopiaMode = false,
  onRotate,
  onToggleDelete,
  onMoveLeft,
  onMoveRight,
  onSplitOffsetChange,
  onOpenLightbox,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [renderError, setRenderError] = useState<boolean>(false);

  useEffect(() => {
    let isCancelled = false;

    if (!pdfDoc) {
      setIsLoading(false);
      return;
    }

    const renderPageThumbnail = async () => {
      if (!canvasRef.current) return;

      try {
        setIsLoading(true);
        setRenderError(false);
        const page = await pdfDoc.getPage(pageNum);
        if (isCancelled) return;

        // Render at compact scale for thumbnail (approx 180px width)
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const isVertical = unscaledViewport.height > unscaledViewport.width;
        const autoAngle = (isFotocopiaMode && isVertical) ? 90 : 0;
        const totalAngle = (autoAngle + rotation) % 360;

        const targetWidth = 180;
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

        // Overlay vertical split line if splitOffset is customized or in fotocopia mode
        if ((isFotocopiaMode || splitOffset !== 50) && !isCancelled) {
          const splitX = Math.round(canvas.width * (splitOffset / 100));
          ctx.save();
          ctx.strokeStyle = '#FF2E63';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 3]);
          ctx.beginPath();
          ctx.moveTo(splitX, 0);
          ctx.lineTo(splitX, canvas.height);
          ctx.stroke();
          ctx.restore();
        }

        if (!isCancelled) {
          setIsLoading(false);
        }
      } catch (err) {
        console.error(`Error rendering thumbnail page ${pageNum}:`, err);
        if (!isCancelled) {
          setRenderError(true);
          setIsLoading(false);
        }
      }
    };

    renderPageThumbnail();

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, pageNum, rotation, splitOffset, isFotocopiaMode]);

  return (
    <div
      className={`group relative flex flex-col items-center rounded-[${radius.card}] border bg-[var(--ui-bg-card)] p-2 transition-all ${
        elevationSystem.raised
      } ${
        isDeleted
          ? 'opacity-40 border-[var(--color-status-danger-base)]/50 grayscale'
          : 'border-[var(--ui-border)] hover:border-[var(--color-accent-base)]'
      }`}
    >
      {/* Cabecera de Número de Página */}
      <div className="flex items-center justify-between w-full mb-1.5 px-1 text-[11px] font-bold">
        <span className={`px-2 py-0.5 rounded-md ${
          isDeleted
            ? 'bg-[var(--color-status-danger-muted)] text-[var(--color-status-danger-text)] line-through'
            : 'bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)]'
        }`}>
          Pág. {pageNum}
        </span>
        <div className="flex items-center gap-1">
          {splitOffset !== 50 && (
            <span className="text-[10px] text-[var(--color-secondary-bright)] font-mono font-bold" title="Corte manual central">
              ✂ {splitOffset}%
            </span>
          )}
          {rotation > 0 && (
            <span className="text-[10px] text-[var(--color-secondary-bright)] font-mono font-bold">
              {rotation}°
            </span>
          )}
        </div>
      </div>

      {/* Contenedor del Canvas de Miniatura */}
      <div
        onClick={() => onOpenLightbox(pageNum)}
        className="relative w-full aspect-[1/1.4] bg-[var(--ui-bg-panel)] rounded-md overflow-hidden flex items-center justify-center cursor-pointer border border-[var(--ui-border)]/50"
      >
        {/*
          El <canvas> se renderiza SIEMPRE, incluso mientras isLoading es true.
          Antes se sacaba del DOM condicionalmente (solo en el else de isLoading),
          lo que dejaba canvasRef.current en null la primera vez que corría el
          efecto de dibujo — esa función cortaba en su primer `if (!canvasRef.current)
          return` sin nunca llegar a setIsLoading(false), y el spinner quedaba
          para siempre (100% de los casos, no intermitente). Con el canvas
          siempre montado, la referencia existe desde el primer render.
        */}
        <canvas
          ref={canvasRef}
          className={`max-w-full max-h-full object-contain shadow-xs transition-opacity ${isLoading || renderError ? 'opacity-0 absolute' : 'opacity-100'}`}
        />
        {isLoading && (
          <div className="w-5 h-5 border-2 border-[var(--color-accent-base)] border-t-transparent rounded-full animate-spin" />
        )}
        {!isLoading && renderError && (
          <span className="text-[10px] text-[var(--ui-text-secondary)]">Error Pág. {pageNum}</span>
        )}

        {/* Overlay Strikethrough cuando está eliminada */}
        {isDeleted && (
          <div className="absolute inset-0 bg-[var(--color-status-danger-muted)] flex items-center justify-center">
            {/* check-contrast-ignore-next-line: insignia de eliminada sobre overlay de baja opacidad */}
            <span className="px-2 py-1 bg-[var(--color-status-danger-text)] text-white text-[10px] font-black uppercase rounded shadow-sm">
              Eliminada
            </span>
          </div>
        )}

        {/* Botón Lupa Hover */}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="p-2 bg-[var(--ui-bg-card)] rounded-full text-[var(--ui-text-primary)] shadow-md">
            <ZoomIn className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Stepper de Corte Central Manual en Modo Fotocopia o cuando sea editable */}
      {onSplitOffsetChange && (
        <div className="flex items-center justify-between w-full mt-1.5 px-1 py-0.5 rounded bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] text-[10px] font-bold">
          <button
            type="button"
            onClick={() => onSplitOffsetChange(pageNum, Math.max(30, splitOffset - 1))}
            className="px-1.5 hover:bg-[var(--ui-border)] rounded text-[var(--ui-text-primary)] cursor-pointer"
            title="Mover corte 1% a la izquierda"
          >
            ◄
          </button>
          <span className="text-[10px] text-[var(--ui-text-primary)] font-mono flex items-center gap-0.5" title="Ajuste manual de corte central">
            <Scissors className="w-3 h-3 text-[var(--color-secondary-bright)]" />
            <span>{splitOffset}%</span>
          </span>
          <button
            type="button"
            onClick={() => onSplitOffsetChange(pageNum, Math.min(70, splitOffset + 1))}
            className="px-1.5 hover:bg-[var(--ui-border)] rounded text-[var(--ui-text-primary)] cursor-pointer"
            title="Mover corte 1% a la derecha"
          >
            ►
          </button>
        </div>
      )}

      {/* Barra de Herramientas Rápidas por Página */}
      <div className="flex items-center justify-around w-full mt-1.5 pt-1.5 border-t border-[var(--ui-border)] gap-1">
        {onMoveLeft && (
          <button
            type="button"
            disabled={!canMoveLeft}
            onClick={() => onMoveLeft(pageNum)}
            title="Mover página a la izquierda"
            className="p-1 rounded hover:bg-[var(--ui-bg-panel)] text-[var(--ui-text-secondary)] disabled:opacity-30 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          type="button"
          onClick={() => onRotate(pageNum)}
          title="Rotar 90° hacia la derecha"
          className="p-1 rounded hover:bg-[var(--ui-bg-panel)] text-[var(--color-secondary-bright)] cursor-pointer"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onToggleDelete(pageNum)}
          title={isDeleted ? 'Restaurar página' : 'Eliminar página'}
          className={`p-1 rounded cursor-pointer ${
            isDeleted
              ? 'hover:bg-[var(--color-status-success-muted)] text-[var(--color-status-success-bright)]'
              : 'hover:bg-[var(--color-status-danger-muted)] text-[var(--color-status-danger-text)]'
          }`}
        >
          {isDeleted ? <RotateCcw className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
        </button>

        {onMoveRight && (
          <button
            type="button"
            disabled={!canMoveRight}
            onClick={() => onMoveRight(pageNum)}
            title="Mover página a la derecha"
            className="p-1 rounded hover:bg-[var(--ui-bg-panel)] text-[var(--ui-text-secondary)] disabled:opacity-30 cursor-pointer"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
