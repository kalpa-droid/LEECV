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
  /**
   * Ancho ABSOLUTO en mm, exacto sin importar el tamaño de hoja (A4/Carta/
   * Legal/A3/etc). Cuando está presente, tiene prioridad sobre widthPercent
   * para ESTE sector — pero widthPercent sigue siendo obligatorio como
   * fallback/documentación de intención. Los demás sectores de la misma
   * fila (sin widthMm) se reparten el espacio que sobra según su propio
   * widthPercent, normalizado sólo entre ellos — así "68" sigue queriendo
   * decir "lo que quede", sin tener que recalcular a mano cuando un sector
   * hermano pasa a usar mm.
   */
  widthMm?: number;
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
  const mmToPt = (mm: number) => Math.round(mm * 2.8346);

  // Primero, los sectores con ancho ABSOLUTO (widthMm) — su ancho en pt no
  // depende del tamaño de hoja, así que se calcula directo.
  const fixedWidthPtById = new Map<string, number>();
  let fixedTotalPt = 0;
  for (const sector of ordered) {
    if (sector.widthMm !== undefined) {
      const widthPt = mmToPt(sector.widthMm);
      fixedWidthPtById.set(sector.id, widthPt);
      fixedTotalPt += widthPt;
    }
  }

  // Lo que queda de la hoja se reparte entre los sectores SIN widthMm,
  // proporcional a su widthPercent normalizado sólo entre ellos — si no hay
  // ningún sector con widthMm en la fila, esto es matemáticamente idéntico
  // al comportamiento anterior (100% de la hoja, 100% de la suma de %).
  const remainingPt = Math.max(0, page.widthPt - fixedTotalPt);
  const flexSectors = ordered.filter((sector) => sector.widthMm === undefined);
  const flexPercentSum = flexSectors.reduce((sum, sector) => sum + sector.widthPercent, 0) || 1;

  let cursorXPt = 0;
  return ordered.map((sector) => {
    const widthPt = fixedWidthPtById.has(sector.id)
      ? fixedWidthPtById.get(sector.id)!
      : Math.round((sector.widthPercent / flexPercentSum) * remainingPt);
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
