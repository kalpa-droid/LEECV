/**
 * CAPA 2 — SECTORES (divisiones de la página)
 * Depende SOLO de la Capa 1 (UsableArea). Reparte el área útil en cajas
 * (columnas, bandas horizontales, grilla). Todavía no sabe nada de objetos
 * fijos ni de contenido — solo geometría.
 */

import { UsableArea } from '../../margins/marginPresets';

export type SectorRole = 'sidebar' | 'main' | 'banner' | 'footer';

export interface SectorDefinition {
  id: string;
  role: SectorRole;
  /** Ancho como % del área útil (columnas) o 100 si es banda de ancho completo */
  widthPercent: number;
  /** Orden de izquierda a derecha / arriba a abajo */
  order: number;
}

export interface ResolvedSector {
  id: string;
  role: SectorRole;
  /** Caja en pt, relativa al área útil (ya sin márgenes de página) */
  box: { xPt: number; yPt: number; widthPt: number; heightPt: number };
}

/** Capa 1 (área útil) + Capa 2 (definición de sectores) → cajas resueltas en pt */
export function resolveSectors(usable: UsableArea, sectors: SectorDefinition[]): ResolvedSector[] {
  const ordered = [...sectors].sort((a, b) => a.order - b.order);
  let cursorXPt = 0;

  return ordered.map((sector) => {
    const widthPt = Math.round((sector.widthPercent / 100) * usable.widthPt);
    const resolved: ResolvedSector = {
      id: sector.id,
      role: sector.role,
      box: { xPt: cursorXPt, yPt: 0, widthPt, heightPt: usable.heightPt },
    };
    cursorXPt += widthPt;
    return resolved;
  });
}
