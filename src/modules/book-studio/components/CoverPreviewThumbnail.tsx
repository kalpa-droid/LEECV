import React, { useEffect, useRef, useState } from 'react';
import {
  CoverConfig,
  BackCoverConfig,
  crearCanvasTapaCustom,
  crearCanvasContratapaCustom,
} from '../domain/impositionEngine';
import { bookAssetManager } from '../domain/bookAssetManager';
import { useText } from '../../../shared/i18n/useText';

export interface CoverPreviewThumbnailProps {
  config: CoverConfig | BackCoverConfig | null | undefined;
  kind: 'cover' | 'backCover';
  paperSize?: 'A4' | 'A3';
  className?: string;
}

/**
 * Miniatura de tapa/contratapa.
 * Nivel 1 de la arquitectura de 3 niveles: para imágenes locales usa la
 * miniatura liviana guardada al subir el archivo (sin reprocesar nada); para
 * plantillas usa un canvas de ~320px de ancho, no el tamaño de fábrica del
 * pliego (1748×2480 / 2480×3508).
 */
export const CoverPreviewThumbnail: React.FC<CoverPreviewThumbnailProps> = ({
  config,
  kind,
  paperSize = 'A4',
  className = 'w-full h-28 object-contain rounded border border-[var(--ui-border)]',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const t = useText();
  const [loadError, setLoadError] = useState(false);
  const [assetThumbUrl, setAssetThumbUrl] = useState<string | null>(null);
  const assetId = (config as { assetId?: string } | null | undefined)?.assetId;

  // Nivel 1: si la tapa/contratapa es un asset local, usar su miniatura.
  useEffect(() => {
    let cancelled = false;
    if (assetId) {
      bookAssetManager.getThumbUrl(assetId).then((url) => {
        if (!cancelled) setAssetThumbUrl(url);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [assetId]);

  // Plantillas: re-renderizar a ~320px de ancho.
  useEffect(() => {
    let cancelled = false;

    const renderCoverCanvas = async () => {
      if (!config || assetId || !canvasRef.current) return;
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
  }, [config, kind, paperSize, assetId]);

  if (assetId) {
    if (assetThumbUrl) {
      return (
        <img
          src={assetThumbUrl}
          className={className}
          alt={kind === 'cover' ? t.bookStudio.coverThumbnail.altCover : t.bookStudio.coverThumbnail.altBackCover}
        />
      );
    }
    return <div className="w-full h-28 rounded border border-dashed border-[var(--ui-border)] bg-[var(--ui-bg-card)]" />;
  }

  if (loadError) {
    return (
      <div className="w-full h-28 flex items-center justify-center text-center px-2 rounded border border-dashed border-[var(--ui-border)] bg-[var(--ui-bg-card)]">
        <p className="text-[11px] leading-snug text-[var(--ui-text-secondary)]">
          {t.bookStudio.coverThumbnail.loadError}
        </p>
      </div>
    );
  }

  return <canvas ref={canvasRef} className={className} />;
};
