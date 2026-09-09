import React, { useEffect, useRef } from 'react';
import {
  CoverConfig,
  BackCoverConfig,
  crearCanvasTapaCustom,
  crearCanvasContratapaCustom,
  getCoverCanvasSize,
} from '../../../shared/core/book-engine/impositionEngine';

export interface CoverPreviewThumbnailProps {
  config: CoverConfig | BackCoverConfig | null | undefined;
  kind: 'cover' | 'backCover';
  paperSize?: 'A4' | 'A3';
  className?: string;
}

export const CoverPreviewThumbnail: React.FC<CoverPreviewThumbnailProps> = ({
  config,
  kind,
  paperSize = 'A4',
  className = 'w-full h-28 object-contain rounded border border-[var(--ui-border)]',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;

    const renderCoverCanvas = async () => {
      if (!config || !canvasRef.current) return;
      const size = getCoverCanvasSize(paperSize);
      const source =
        kind === 'cover'
          ? await crearCanvasTapaCustom(config as CoverConfig, size)
          : await crearCanvasContratapaCustom(config as BackCoverConfig, size);

      if (cancelled || !canvasRef.current || !source) return;

      const canvas = canvasRef.current;
      canvas.width = source.width;
      canvas.height = source.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(source, 0, 0);
      }
    };

    renderCoverCanvas();

    return () => {
      cancelled = true;
    };
  }, [config, kind, paperSize]);

  return <canvas ref={canvasRef} className={className} />;
};
