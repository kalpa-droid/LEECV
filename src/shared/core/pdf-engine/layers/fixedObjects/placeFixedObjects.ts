/**
 * CAPA 3 — OBJETOS FIJOS
 * Depende SOLO de la Capa 2 (ResolvedSector). Un objeto fijo vive DENTRO
 * de un sector ya resuelto y consume una porción de su caja — nunca al revés.
 * Ejemplos: foto de perfil, banner de encabezado, firma, línea decorativa.
 * No fluyen entre páginas: su tamaño es conocido de antemano (no depende
 * de texto dinámico).
 */

import { ResolvedSector } from '../sectors/resolveSectors';

export type FixedObjectAnchor = 'top' | 'bottom' | 'center';

export interface FixedObjectDefinition {
  id: string;
  sectorId: string;
  type: 'photo' | 'banner' | 'signature' | 'decorative-line';
  anchor: FixedObjectAnchor;
  heightPt: number;
  /** Si no se especifica, ocupa el 100% del ancho del sector */
  widthPt?: number;
}

export interface PlacedFixedObject extends FixedObjectDefinition {
  box: { xPt: number; yPt: number; widthPt: number; heightPt: number };
}

export interface SectorWithFlowSpace {
  sector: ResolvedSector;
  fixedObjects: PlacedFixedObject[];
  /** Lo que queda del sector después de restar los objetos fijos — acá vive el contenido dinámico */
  flowBox: { xPt: number; yPt: number; widthPt: number; heightPt: number };
}

/** Capa 2 (sectores) + Capa 3 (objetos fijos declarados) → espacio remanente para contenido dinámico */
export function placeFixedObjects(
  sectors: ResolvedSector[],
  fixedObjects: FixedObjectDefinition[]
): SectorWithFlowSpace[] {
  const availableSectorIds = new Set(sectors.map((s) => s.id));

  return sectors.map((sector) => {
    // Si el sectorId declarado no existe en la maqueta actual (ej: 'sidebar' en un layout 1-columna 'full-width'),
    // remapeamos los objetos huérfanos al primer sector disponible (habitualmente 'main').
    const isPrimaryFallbackSector = sector.id === 'main' || sector === sectors[0];
    const objectsInSector = fixedObjects.filter((obj) => {
      if (obj.sectorId === sector.id) return true;
      if (!availableSectorIds.has(obj.sectorId) && isPrimaryFallbackSector) return true;
      return false;
    });

    let topConsumedPt = 0;
    let bottomConsumedPt = 0;
    const placed: PlacedFixedObject[] = objectsInSector.map((obj) => {
      const widthPt = obj.widthPt ?? sector.box.widthPt;
      let yPt: number;
      if (obj.anchor === 'top') { yPt = topConsumedPt; topConsumedPt += obj.heightPt; }
      else if (obj.anchor === 'bottom') { bottomConsumedPt += obj.heightPt; yPt = sector.box.heightPt - bottomConsumedPt; }
      else { yPt = (sector.box.heightPt - obj.heightPt) / 2; }

      return { ...obj, box: { xPt: sector.box.xPt, yPt, widthPt, heightPt: obj.heightPt } };
    });

    return {
      sector,
      fixedObjects: placed,
      flowBox: {
        xPt: sector.box.xPt,
        yPt: sector.box.yPt + topConsumedPt,
        widthPt: sector.box.widthPt,
        heightPt: sector.box.heightPt - topConsumedPt - bottomConsumedPt,
      },
    };
  });
}
