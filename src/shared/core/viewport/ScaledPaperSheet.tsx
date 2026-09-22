import React, { useEffect, useRef } from 'react';
import { DOC_SCALE_VAR } from './useDocumentViewport';

interface ScaledPaperSheetProps {
  /** Tamaño REAL de la hoja en px (el que devuelve resolveDocumentCanvasPx): nunca cambia con el zoom. */
  widthPx: number;
  heightPx: number;
  /** Zoom del estado de React: solo se usa de respaldo cuando no hay contenedor con variable CSS. */
  zoomLevel: number;
  /** true cuando un contenedor con useDocumentViewport dicta el zoom por la variable CSS --doc-scale. */
  managed: boolean;
  sheetRef: React.RefObject<HTMLDivElement | null>;
  className?: string;
  children: React.ReactNode;
}

/**
 * La hoja de papel del visor: conserva su tamaño real y solo se le aplica `scale`.
 * Compartida por todos los documentos (CV, tarjeta, carta, agenda).
 *
 * - La caja EXTERNA ocupa exactamente el espacio escalado (ancho y alto), así el scroll del
 *   contenedor mide lo que se ve. NO usa flex/justify-center: el hijo mide el ancho sin escalar
 *   y `justify-center` repartiría ese desborde a ambos lados (la hoja arrancaba en x negativo y
 *   la mitad izquierda quedaba fuera de pantalla).
 * - `transform` no achica el espacio que ocupa la hoja interna, así que el alto real del
 *   contenido se mide con un ResizeObserver (sin pasar por React) y la caja externa toma alto × escala.
 */
export function ScaledPaperSheet({ widthPx, heightPx, zoomLevel, managed, sheetRef, className = '', children }: ScaledPaperSheetProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const content = contentRef.current;
    const sheet = sheetRef.current;
    if (!content || !sheet || typeof ResizeObserver === 'undefined') return;
    const syncHeight = () => sheet.style.setProperty('--doc-content-h', `${content.offsetHeight}px`);
    const observer = new ResizeObserver(syncHeight);
    observer.observe(content);
    syncHeight();
    return () => observer.disconnect();
  }, [sheetRef]);

  // Con contenedor propio el zoom lo dicta la variable CSS que escribe useDocumentViewport
  // directo al DOM; `zoomLevel` (estado de React) queda solo de respaldo.
  const scaleExpr = managed ? `var(${DOC_SCALE_VAR}, ${zoomLevel})` : String(zoomLevel);

  return (
    <div
      ref={sheetRef}
      className={`my-1 sm:my-5 no-print mx-auto shrink-0 relative ${className}`}
      style={{
        width: `calc(${widthPx}px * ${scaleExpr})`,
        height: `calc(var(--doc-content-h, ${heightPx}px) * ${scaleExpr})`,
        minHeight: `calc(${heightPx}px * ${scaleExpr})`,
        maxWidth: 'none',
      }}
    >
      <div
        ref={contentRef}
        className="shrink-0 origin-top-left"
        style={{ transform: `scale(${scaleExpr})`, width: `${widthPx}px` }}
      >
        {children}
      </div>
    </div>
  );
}
