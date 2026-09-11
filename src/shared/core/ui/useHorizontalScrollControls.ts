import { useState, useEffect, useCallback, RefObject } from 'react';

export interface HorizontalScrollControls {
  canScrollLeft: boolean;
  canScrollRight: boolean;
  scrollLeft: () => void;
  scrollRight: () => void;
}

/**
 * NÚCLEO — MOTOR DE SCROLL HORIZONTAL (useHorizontalScrollControls)
 *
 * Detecta en tiempo real si un contenedor con overflow-x tiene contenido oculto a la
 * izquierda y/o a la derecha, y expone `scrollLeft()`/`scrollRight()` para desplazarlo por
 * pasos (no es solo un booleano — mueve el contenedor de verdad, con scroll suave).
 *
 * Un solo hook para cualquier tira horizontal desplazable de la app (pestañas de documentos,
 * carruseles de miniaturas, chips de filtro, etc.) — evita que cada componente reimplemente
 * su propia detección de overflow a mano.
 *
 * @param containerRef ref al elemento con `overflow-x-auto`/`scroll`
 * @param deps lista de dependencias que, al cambiar, deben re-evaluar el estado de scroll
 *             (por ejemplo, la cantidad de pestañas abiertas — si se agrega o cierra una,
 *             el contenedor puede pasar de "todo visible" a "hay overflow" o viceversa)
 * @param step cuánto se desplaza por click, en píxeles (default: 160)
 */
export function useHorizontalScrollControls(
  containerRef: RefObject<HTMLElement | null>,
  deps: React.DependencyList = [],
  step: number = 160
): HorizontalScrollControls {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, [containerRef]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    updateScrollState();

    el.addEventListener('scroll', updateScrollState, { passive: true });

    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(el);

    return () => {
      el.removeEventListener('scroll', updateScrollState);
      resizeObserver.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, updateScrollState, ...deps]);

  const scrollLeft = useCallback(() => {
    containerRef.current?.scrollBy({ left: -step, behavior: 'smooth' });
  }, [containerRef, step]);

  const scrollRight = useCallback(() => {
    containerRef.current?.scrollBy({ left: step, behavior: 'smooth' });
  }, [containerRef, step]);

  return { canScrollLeft, canScrollRight, scrollLeft, scrollRight };
}
