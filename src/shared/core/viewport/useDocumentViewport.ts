import { useState, useRef, useCallback, useEffect, useLayoutEffect, useMemo } from 'react';
import { resolveDocumentCanvasPx } from '../pdf-engine/layers/page/pageSizes';
import {
  calculateFitScale,
  calculateCenteredScroll,
  clampZoom,
  contentBoxWidth,
  FitScaleOptions,
} from './viewportCalculations';
import { createObservableRef } from './observableRef';

/** Variable CSS (definida sobre el contenedor) con el zoom total vigente. La hoja la lee por CSS. */
export const DOC_SCALE_VAR = '--doc-scale';

export interface UseDocumentViewportOptions extends FitScaleOptions {
  pageSizeId?: string;
  onZoomChange?: (scale: number) => void;
}

const MAX_FIT_RETRIES = 30;
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Viewport universal (viewportEngine) — React FUERA del camino crítico.
 *
 * El tamaño en pantalla se resuelve en dos factores:
 *   zoom total = ajuste automático (fit) × zoom del usuario (pellizco / rueda / +−)
 *
 * Ambos se escriben DIRECTO al DOM como la variable CSS `--doc-scale` del contenedor,
 * en el mismo instante en que el ResizeObserver (o el gesto) los calcula: no esperan
 * un render de React ni pueden llegar con un valor viejo. La hoja (CVPreview) lee la
 * variable por CSS. El estado de React (`zoomLevel`, `isAutoFitMode`) es solo un DATO
 * para mostrar en la UI (el %, el botón de "ajustar") y se sincroniza una vez por frame.
 *
 * La hoja nunca cambia de tamaño real (A4, A5, tarjeta…): solo se le aplica `scale`.
 */
export function useDocumentViewport(options: UseDocumentViewportOptions = {}) {
  const { pageSizeId = 'a4', onZoomChange, safetyPaddingPx, minScale, maxScale } = options;
  // Ref observable: el contenedor puede montarse DESPUÉS de este hook (retornos tempranos en
  // App). Al asignarse/limpiarse dispara un estado que re-engancha el observador de abajo.
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const containerRef = useMemo(() => createObservableRef<HTMLDivElement>(setContainerEl), []);
  const paperSheetRef = useRef<HTMLDivElement | null>(null);

  // Fuente de verdad del zoom: refs (síncronas). El estado de abajo es solo espejo para la UI.
  const fitScaleRef = useRef(0.85);
  const userZoomRef = useRef(1);
  const pendingStateRafRef = useRef<number | null>(null);
  const retryRafRef = useRef<number | null>(null);
  const onZoomChangeRef = useRef(onZoomChange);
  onZoomChangeRef.current = onZoomChange;

  const [zoomLevel, setZoomLevelState] = useState<number>(0.85);
  const [isAutoFitMode, setIsAutoFitMode] = useState<boolean>(true);

  const canvasDimensions = resolveDocumentCanvasPx(pageSizeId);
  const { widthPx: docWidth, heightPx: docHeight } = canvasDimensions;

  const cancelPending = useCallback(() => {
    if (retryRafRef.current !== null) {
      cancelAnimationFrame(retryRafRef.current);
      retryRafRef.current = null;
    }
  }, []);

  /** Escribe el zoom al DOM (síncrono) y sincroniza el espejo de React una vez por frame. */
  const commit = useCallback((fit: number, user: number): number => {
    fitScaleRef.current = fit;
    userZoomRef.current = user;
    const total = clampZoom(fit * user);
    containerRef.current?.style.setProperty(DOC_SCALE_VAR, String(total));

    if (pendingStateRafRef.current === null && typeof requestAnimationFrame === 'function') {
      pendingStateRafRef.current = requestAnimationFrame(() => {
        pendingStateRafRef.current = null;
        const current = clampZoom(fitScaleRef.current * userZoomRef.current);
        setZoomLevelState(current);
        setIsAutoFitMode(Math.abs(userZoomRef.current - 1) < 0.005);
        onZoomChangeRef.current?.(current);
      });
    }
    return total;
  }, []);

  const centerInContainer = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    // Se lee scrollWidth DESPUÉS de haber escrito la variable: el navegador recalcula el
    // layout con el tamaño nuevo de la hoja al leerlo, así el centrado es exacto.
    const { scrollLeft, scrollTop } = calculateCenteredScroll(
      container.clientWidth,
      container.clientHeight,
      container.scrollWidth,
      container.scrollHeight
    );
    container.scrollLeft = scrollLeft;
    container.scrollTop = scrollTop;
  }, []);

  /** Mide el contenedor real y aplica el ajuste. Devuelve false si todavía no hay medida válida. */
  const applyFit = useCallback((resetUser: boolean, recenter: boolean): boolean => {
    const container = containerRef.current;
    if (!container) return false;

    const rect = container.getBoundingClientRect();
    const cs = typeof getComputedStyle === 'function' ? getComputedStyle(container) : null;
    const width = contentBoxWidth(
      rect.width,
      cs ? parseFloat(cs.paddingLeft) || 0 : 0,
      cs ? parseFloat(cs.paddingRight) || 0 : 0
    );
    const fit = calculateFitScale(width, rect.height, docWidth, docHeight, { safetyPaddingPx, minScale, maxScale });
    if (fit === null) return false;

    commit(fit, resetUser ? 1 : userZoomRef.current);

    if (recenter) {
      centerInContainer();
      // Segunda pasada tras el siguiente frame: cubre a los visores que aún dimensionan
      // la hoja con el estado de React (ej. Book Studio) y no con la variable CSS.
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(centerInContainer);
    }
    return true;
  }, [docWidth, docHeight, safetyPaddingPx, minScale, maxScale, commit, centerInContainer]);

  /** Aplica el ajuste; si el contenedor aún mide 0 (oculto/en transición) reintenta unos frames. */
  const fitWithRetry = useCallback((resetUser: boolean, recenter: boolean) => {
    cancelPending();
    let attempts = 0;
    const attempt = () => {
      retryRafRef.current = null;
      if (applyFit(resetUser, recenter)) return;
      if (attempts++ < MAX_FIT_RETRIES && typeof requestAnimationFrame === 'function') {
        retryRafRef.current = requestAnimationFrame(attempt);
      }
    };
    attempt();
  }, [applyFit, cancelPending]);

  /** Vuelve al ajuste automático limpio (descarta el zoom manual) y centra. */
  const fitAndCenter = useCallback(() => {
    // Se descarta el zoom manual YA, antes de medir: si el contenedor está oculto (ej. al
    // tocar "Ver" en el celular) el ajuste se completa un frame después, y un resize
    // intermedio no debe "revivir" el zoom anterior.
    userZoomRef.current = 1;
    fitWithRetry(true, true);
  }, [fitWithRetry]);

  // Medición real sobre el contenedor. useLayoutEffect: el primer ajuste ocurre ANTES del
  // primer pintado, así no hay un frame con el zoom por defecto. El ResizeObserver corre
  // siempre (también con zoom manual): al rotar el teléfono se conserva el zoom relativo.
  const lastDocKeyRef = useRef(`${docWidth}x${docHeight}`);
  useIsomorphicLayoutEffect(() => {
    const container = containerEl;
    if (!container) return;

    const docKey = `${docWidth}x${docHeight}`;
    const docChanged = lastDocKeyRef.current !== docKey; // otro tamaño de hoja: zoom manual descartado
    lastDocKeyRef.current = docKey;

    const onResize = () => {
      const auto = Math.abs(userZoomRef.current - 1) < 0.005;
      fitWithRetry(false, auto);
    };
    fitWithRetry(docChanged, true);

    if (typeof ResizeObserver === 'undefined') return cancelPending;
    const observer = new ResizeObserver(onResize);
    observer.observe(container);
    return () => {
      cancelPending();
      observer.disconnect();
    };
  }, [containerEl, docWidth, docHeight, fitWithRetry, cancelPending]);

  useEffect(() => () => {
    if (pendingStateRafRef.current !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(pendingStateRafRef.current);
      pendingStateRafRef.current = null;
    }
  }, []);

  /**
   * Zoom manual (absoluto o funcional sobre el zoom total vigente). Se guarda como un
   * multiplicador sobre el ajuste automático, así rotar el teléfono no lo rompe y
   * "ajustar" vuelve limpio.
   */
  const setZoomLevel = useCallback((value: number | ((prev: number) => number)) => {
    const fit = fitScaleRef.current;
    const prevTotal = fit * userZoomRef.current;
    const next = typeof value === 'function' ? value(prevTotal) : value;
    const total = clampZoom(next);
    commit(fit, total / fit);
  }, [commit]);

  // Gestos: Wheel (rueda del mouse). El pellizco vive en CVPreview.
  const onWheelZoom = useCallback((e: WheelEvent) => {
    const target = e.target as HTMLElement | null;
    const isOverPaper = target && paperSheetRef.current && paperSheetRef.current.contains(target);

    if (isOverPaper || e.ctrlKey || e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      setZoomLevel(prev => prev - e.deltaY * 0.0012);
    }
  }, [setZoomLevel]);

  return {
    zoomLevel,
    isAutoFitMode,
    canvasDimensions,
    setZoomLevel,
    triggerAutoFit: fitAndCenter,
    fitAndCenter,
    containerRef,
    paperSheetRef,
    onWheelZoom
  };
}
