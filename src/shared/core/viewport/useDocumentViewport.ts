import { useState, useRef, useCallback, useEffect } from 'react';
import { resolveDocumentCanvasPx } from '../pdf-engine/layers/page/pageSizes';
import { calculateFitScale, FitScaleOptions } from './viewportCalculations';

export interface UseDocumentViewportOptions extends FitScaleOptions {
  pageSizeId?: string;
  onZoomChange?: (scale: number) => void;
}

/**
 * Custom Hook Reactivo Universal de Viewport (viewportEngine).
 * Mide el contenedor real usando ResizeObserver, calcula la escala óptima basada en el formato
 * de página de pageSizes.ts y consolida la gestión de gestos (rueda, pellizco, pan).
 */
export function useDocumentViewport(options: UseDocumentViewportOptions = {}) {
  const { pageSizeId = 'a4', onZoomChange } = options;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const paperSheetRef = useRef<HTMLDivElement | null>(null);

  const [zoomLevel, setZoomLevelState] = useState<number>(0.85);
  const [isAutoFitMode, setIsAutoFitMode] = useState<boolean>(true);

  const canvasDimensions = resolveDocumentCanvasPx(pageSizeId);
  const { widthPx: docWidth, heightPx: docHeight } = canvasDimensions;

  const triggerAutoFit = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const { width, height } = container.getBoundingClientRect();
    const scale = calculateFitScale(width, height, docWidth, docHeight, options);
    setZoomLevelState(scale);
    if (onZoomChange) onZoomChange(scale);
  }, [docWidth, docHeight, options, onZoomChange]);

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
    return () => observer.disconnect();
  }, [isAutoFitMode, triggerAutoFit]);

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
