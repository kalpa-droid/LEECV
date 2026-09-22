import { useEffect, useRef } from 'react';
import { DOC_SCALE_VAR } from './useDocumentViewport';

interface Options {
  /** Contenedor con scroll del visor (el que tiene la variable --doc-scale). Si falta, se usa la hoja. */
  containerRef?: React.Ref<HTMLDivElement>;
  sheetRef: React.RefObject<HTMLDivElement | null>;
  /** setZoomLevel del viewport: acepta un número o una función sobre el zoom vigente. */
  onZoomChange?: (next: number | ((prev: number) => number)) => void;
  /** Zoom del estado de React: solo respaldo si todavía no hay variable CSS. */
  zoomLevel: number;
}

/**
 * Zoom por rueda del mouse (PC) y pellizco de 2 dedos (celular) sobre la hoja.
 * Compartido por todos los visores de documentos (CV, tarjeta, carta, agenda).
 */
export function useViewportGestures({ containerRef, sheetRef, onZoomChange, zoomLevel }: Options) {
  // Ref con el zoom actual, para que el efecto de gestos no tenga que depender
  // de `zoomLevel` (si dependiera de él, el propio gesto de pinch dispararía un
  // re-montaje del efecto en cada tick, reseteando initialPinchDistance a mitad
  // del gesto y "matando" el pinch después del primer milímetro).
  const zoomLevelRef = useRef(zoomLevel);
  useEffect(() => {
    zoomLevelRef.current = zoomLevel;
  }, [zoomLevel]);

  useEffect(() => {
    const container = (containerRef as React.RefObject<HTMLDivElement | null> | undefined)?.current || sheetRef.current;
    if (!container || !onZoomChange) return;

    // 1. ZOOM POR RUEDA DIRECTA (PC): sin apretar tecla Ctrl sobre la hoja
    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null;
      const isOverPaper = target && sheetRef.current && sheetRef.current.contains(target);

      if (isOverPaper) {
        // Intercepta solo el área de la hoja para hacer zoom directo sin alterar el navegador
        e.preventDefault();
        e.stopPropagation();

        const zoomDelta = -e.deltaY * 0.0012;
        onZoomChange((prev: number) => {
          const next = Math.min(Math.max(prev + zoomDelta, 0.35), 2.5);
          return Number(next.toFixed(3));
        });
      }
      // Si el cursor está fuera de la hoja (en márgenes o barra de scroll lateral),
      // el evento no se previene, permitiendo scroll vertical continuo normal.
    };

    // 2. PINCH-TO-ZOOM MULTI-TOUCH (CELULAR): 2 dedos ajustan zoom del visor de forma aislada
    // El zoom vigente vive en la variable CSS del contenedor (la escribe el viewport de forma
    // síncrona); el estado de React puede ir un frame atrasado, así que no se lee de ahí.
    const readCurrentScale = () =>
      parseFloat(container.style.getPropertyValue(DOC_SCALE_VAR)) || zoomLevelRef.current;
    let initialPinchDistance: number | null = null;
    let initialZoomOnPinch = readCurrentScale();

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Frenar acá mismo el paneo nativo del navegador (con passive:false abajo,
        // preventDefault() sí surte efecto). Si esto no se hace en touchstart, con
        // touchstart en modo passive:true el navegador ya arranca su propio gesto
        // de paneo/scroll antes de que touchmove llegue a interceptarlo, y la hoja
        // "se va al costado" en vez de hacer zoom.
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        initialPinchDistance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
        initialZoomOnPinch = readCurrentScale();
      } else {
        initialPinchDistance = null;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialPinchDistance !== null) {
        e.preventDefault(); // Prevenir zoom de toda la interfaz del navegador
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
        const ratio = currentDist / initialPinchDistance;

        const newZoom = Math.min(Math.max(initialZoomOnPinch * ratio, 0.3), 2.5);
        onZoomChange(Number(newZoom.toFixed(3)));
      }
      // Con 1 dedo se permite desplazamiento nativo libre en 2D (pan X e Y)
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        initialPinchDistance = null;
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onZoomChange]);
}
