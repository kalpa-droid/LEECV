/**
 * CAPA 2 — SECTORES (divisiones de la página)
 *
 * Depende SOLO de la Capa 0 (tamaño físico de hoja) — NUNCA del margen.
 * Un sector es geometría pura sobre la hoja completa: su caja (box) llega
 * hasta donde tiene que llegar según su rol, incluido el borde físico si
 * así lo pide su diseño (ej. un sidebar de color de borde a borde).
 *
 * El margen (Capa 3) es una capa DISTINTA y POSTERIOR que decide cuánto
 * espacio de "lectura" se le da al CONTENIDO adentro de cada sector — nunca
 * cambia el tamaño ni la posición del sector en sí. Por eso pintar el fondo
 * de un sector y aplicar el margen a su contenido son siempre dos nodos
 * distintos en el render (ver TemplateRenderer): así es imposible que un
 * cambio de margen vuelva a "cortar" el color de fondo, estructuralmente.
 */

export type SectorRole = 'sidebar' | 'main' | 'banner' | 'footer';

export interface SectorDefinition {
  id: string;
  role: SectorRole;
  /** Ancho como % de la hoja física completa (columnas) o 100 si es banda de ancho completo */
  widthPercent: number;
  /** Orden de izquierda a derecha / arriba a abajo */
  order: number;
  /**
   * Si es true, el CONTENIDO de este sector ignora el margen general de
   * página y usa su propio padding interno mínimo — típico de un sidebar
   * de color que solo necesita un respiro chico, no el margen de lectura
   * completo pensado para texto largo en la columna principal.
   */
  bleedsPageMargin?: boolean;
}

export interface ResolvedSector {
  id: string;
  role: SectorRole;
  bleedsPageMargin: boolean;
  /** Caja en pt, relativa a la HOJA FÍSICA COMPLETA (0,0 = esquina real de la hoja) */
  box: { xPt: number; yPt: number; widthPt: number; heightPt: number };
}

export interface PhysicalPageDims {
  widthPt: number;
  heightPt: number;
}

/** Capa 0 (hoja física) + Capa 2 (definición de sectores) → cajas resueltas en pt, SIN margen aplicado */
export function resolveSectors(page: PhysicalPageDims, sectors: SectorDefinition[]): ResolvedSector[] {
  const ordered = [...sectors].sort((a, b) => a.order - b.order);
  let cursorXPt = 0;

  return ordered.map((sector) => {
    const widthPt = Math.round((sector.widthPercent / 100) * page.widthPt);
    const resolved: ResolvedSector = {
      id: sector.id,
      role: sector.role,
      bleedsPageMargin: sector.bleedsPageMargin ?? (sector.role === 'sidebar'),
      box: { xPt: cursorXPt, yPt: 0, widthPt, heightPt: page.heightPt },
    };
    cursorXPt += widthPt;
    return resolved;
  });
}
