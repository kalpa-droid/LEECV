/**
 * CAPA "TEXTO DE HOJA" — anclado a la HOJA FÍSICA, no a ningún sector.
 *
 * El número de página es el caso típico: su posición es siempre relativa
 * a la esquina de la hoja completa (ej. "abajo a la derecha"), sin importar
 * qué sector, columna o margen de contenido haya en esa zona. Por eso vive
 * en su propia capa, con su propia geometría — nunca dentro de un sector.
 */

export type PageTextAnchor =
  | 'bottom-right' | 'bottom-left' | 'bottom-center'
  | 'top-right' | 'top-left';

export interface PageTextObjectDefinition {
  id: string;
  anchor: PageTextAnchor;
  /** Distancia fija al borde físico de la hoja, en pt — no usa el margen de contenido */
  edgeOffsetPt: number;
  fontSizePt: number;
  color?: string;
  /** '{page}' y '{totalPages}' se reemplazan en render */
  template: string; // ej. "Página {page} de {totalPages}"
}

export interface ResolvedPageTextPosition {
  id: string;
  text: string;
  style: {
    position: 'absolute';
    fontSize: number;
    color: string;
    [key: string]: any; // top/bottom/left/right según el anchor
  };
}

export function resolvePageTextObjects(
  defs: PageTextObjectDefinition[],
  pageWidthPt: number,
  pageHeightPt: number,
  currentPage: number,
  totalPages: number
): ResolvedPageTextPosition[] {
  return defs.map((def) => {
    const text = def.template
      .replace('{page}', String(currentPage))
      .replace('{totalPages}', String(totalPages));

    const edgeStyle: Record<string, number> = {};
    if (def.anchor.startsWith('bottom')) edgeStyle.bottom = def.edgeOffsetPt;
    if (def.anchor.startsWith('top')) edgeStyle.top = def.edgeOffsetPt;
    if (def.anchor.endsWith('right')) edgeStyle.right = def.edgeOffsetPt;
    if (def.anchor.endsWith('left')) edgeStyle.left = def.edgeOffsetPt;
    if (def.anchor.endsWith('center')) {
      edgeStyle.left = 0;
      edgeStyle.right = 0;
      // el consumidor debe aplicar textAlign:'center' cuando left+right están seteados
    }

    return {
      id: def.id,
      text,
      style: {
        position: 'absolute',
        fontSize: def.fontSizePt,
        color: def.color || '#94a3b8',
        ...edgeStyle,
        ...(def.anchor.endsWith('center') ? { textAlign: 'center' } : {}),
      },
    };
  });
}
