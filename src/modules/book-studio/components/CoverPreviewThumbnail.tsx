import React, { useEffect, useRef, useState } from 'react';
import {
  CoverConfig,
  BackCoverConfig,
  crearCanvasTapaCustom,
  crearCanvasContratapaCustom,
} from '../../../shared/core/book-engine/impositionEngine';

export interface CoverPreviewThumbnailProps {
  config: CoverConfig | BackCoverConfig | null | undefined;
  kind: 'cover' | 'backCover';
  paperSize?: 'A4' | 'A3';
  className?: string;
}

/**
 * Miniatura de tapa/contratapa.
 * Nivel 1 de la arquitectura de 3 niveles: renderiza a ~320px de ancho,
 * no al tamaño real del pliego (1748×2480 / 2480×3508). Antes dibujaba el
 * canvas gigante por cada tecla y colgaba el navegador.
 */
export const CoverPreviewThumbnail: React.FC<CoverPreviewThumbnailProps> = ({
  config,
  kind,
  paperSize = 'A4',
  className = 'w-full h-28 object-contain rounded border border-[var(--ui-border)]',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const renderCoverCanvas = async () => {
      if (!config || !canvasRef.current) return;
      setLoadError(false);

      const fullWidth = paperSize === 'A3' ? 2480 : 1748;
      const fullHeight = paperSize === 'A3' ? 3508 : 2480;
      const thumbWidth = 320;
      const thumbHeight = Math.round((thumbWidth * fullHeight) / fullWidth);
      const renderScale = thumbWidth / fullWidth;

      try {
        const source =
          kind === 'cover'
            ? await crearCanvasTapaCustom(config as CoverConfig, { width: thumbWidth, height: thumbHeight }, renderScale)
            : await crearCanvasContratapaCustom(config as BackCoverConfig, { width: thumbWidth, height: thumbHeight }, renderScale);

        if (cancelled || !canvasRef.current || !source) return;

        const canvas = canvasRef.current;
        canvas.width = source.width;
        canvas.height = source.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(source, 0, 0);
        }

        // Liberar el canvas de trabajo completo (evita saturar la GPU).
        source.width = 0;
        source.height = 0;
      } catch (err) {
        if (!cancelled) {
          console.warn('No se pudo renderizar la miniatura de la cubierta:', err);
          setLoadError(true);
        }
      }
    };

    renderCoverCanvas();

    return () => {
      cancelled = true;
    };
  }, [config, kind, paperSize]);

  if (loadError) {
    return (
      <div className="w-full h-28 flex items-center justify-center text-center px-2 rounded border border-dashed border-[var(--ui-border)] bg-[var(--ui-bg-card)]">
        <p className="text-[11px] leading-snug text-[var(--ui-text-secondary)]">
          No pudimos cargar esta imagen. Guardala como PNG o JPG y subila de nuevo.
        </p>
      </div>
    );
  }

  return <canvas ref={canvasRef} className={className} />;
};
