import { useState, useRef, useCallback, useEffect } from 'react';
import { resolveDocumentCanvasPx } from '../pdf-engine/layers/page/pageSizes';
import { calculateFitScale, FitScaleOptions } from './viewportCalculations';

export interface UseDocumentViewportOptions extends FitScaleOptions {
  pageSizeId?: string;
  onZoomChange?: (scale: number) => void;
}

/**
 * Custom Hook Reactivo Universal de Viewport (viewportEngine).
 * Mide el contenedor real usando ResizeObserver, reintenta en cascada con rAF si
 * la medición da null y consolida la gestión de gestos (rueda, pellizco, pan).
 */
export function useDocumentViewport(options: UseDocumentViewportOptions = {}) {
  const { pageSizeId = 'a4', onZoomChange, safetyPaddingPx, minScale, maxScale } = options;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const paperSheetRef = useRef<HTMLDivElement | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const [zoomLevel, setZoomLevelState] = useState<number>(0.85);
  const [isAutoFitMode, setIsAutoFitMode] = useState<boolean>(true);

  const canvasDimensions = resolveDocumentCanvasPx(pageSizeId);
  const { widthPx: docWidth, heightPx: docHeight } = canvasDimensions;

  const cancelPendingRaf = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  const triggerAutoFit = useCallback(() => {
    cancelPendingRaf();
    const container = containerRef.current;
    if (!container) return;

    const { width, height } = container.getBoundingClientRect();
    const scale = calculateFitScale(width, height, docWidth, docHeight, { safetyPaddingPx, minScale, maxScale });

    if (scale === null) {
      // Reintentar en cascada mediante rAF si la medición aún no es válida (width 0)
      rafIdRef.current = requestAnimationFrame(() => {
        triggerAutoFit();
      });
      return;
    }

    setZoomLevelState(scale);
    if (onZoomChange) onZoomChange(scale);
    // Deps con primitivos, no el objeto `options` completo: un objeto literal
    // nuevo en cada render del componente que llama al hook (ej. App.tsx en
    // cada tecla tipeada) recreaba esta función constantemente, disparando de
    // nuevo el ResizeObserver de abajo en cada render y re-midiendo en
    // cualquier instante -- incluso con el visor recién oculto/a mitad de
    // transición -- lo que hacía que el resultado de "Ver" fuera intermitente.
  }, [docWidth, docHeight, safetyPaddingPx, minScale, maxScale, onZoomChange, cancelPendingRaf]);

  const fitAndCenter = useCallback(() => {
    setIsAutoFitMode(true);
    triggerAutoFit();
    if (containerRef.current) {
      containerRef.current.scrollLeft = 0;
      containerRef.current.scrollTop = 0;
    }
  }, [triggerAutoFit]);

  // Medición real mediante ResizeObserver sobre el contenedor del DOM
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isAutoFitMode) return;
    const observer = new ResizeObserver(() => triggerAutoFit());
    observer.observe(container);
    triggerAutoFit();
    return () => {
      cancelPendingRaf();
      observer.disconnect();
    };
  }, [isAutoFitMode, triggerAutoFit, cancelPendingRaf]);

  const setZoomLevel = useCallback((value: number | ((prev: number) => number)) => {
    setIsAutoFitMode(false);
    setZoomLevelState(prev => {
      const next = typeof value === 'function' ? value(prev) : value;
      const clamped = Number(Math.min(Math.max(next, 0.2), 2.5).toFixed(2));
      if (onZoomChange) onZoomChange(clamped);
      return clamped;
    });
  }, [onZoomChange]);

  // Gestos: Wheel (rueda del mouse) y Touch (pinch/pan)
  const onWheelZoom = useCallback((e: WheelEvent) => {
    const target = e.target as HTMLElement | null;
    const isOverPaper = target && paperSheetRef.current && paperSheetRef.current.contains(target);

    if (isOverPaper || e.ctrlKey || e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      const delta = -e.deltaY * 0.0012;
      setZoomLevel(prev => prev + delta);
    }
  }, [setZoomLevel]);

  return {
    zoomLevel,
    isAutoFitMode,
    canvasDimensions,
    setZoomLevel,
    triggerAutoFit,
    fitAndCenter,
    containerRef,
    paperSheetRef,
    onWheelZoom
  };
}
