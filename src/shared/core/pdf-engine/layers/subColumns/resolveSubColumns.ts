/**
 * CAPA 4 — SUB-COLUMNAS DINÁMICAS DENTRO DE UN SECTOR
 *
 * Depende de la Capa 3 (contenido con margen ya aplicado) — nunca de la
 * superficie de pintura. Un sector como "main" puede pedir dividirse
 * internamente en 2+ columnas (ej. una lista de cursos en 2 columnas para
 * aprovechar el ancho) sin que esto afecte al fondo del sector ni a su
 * margen — ambos ya están resueltos por las capas anteriores.
 *
 * Importante: esto NO es lo mismo que los sectores (Capa 2). Los sectores
 * dividen la HOJA (sidebar vs. main). Las sub-columnas dividen el
 * CONTENIDO de un sector ya definido — un nivel más adentro.
 */

export interface SubColumnDefinition {
  id: string;
  /** % del ancho de CONTENIDO del sector (ya descontado el margen) */
  widthPercent: number;
  order: number;
  /** A qué sección(es) de ese sector alimenta esta sub-columna */
  sectionIds: string[];
}

export interface ResolvedSubColumn {
  id: string;
  sectionIds: string[];
  /** Ancho en pt, relativo al contenido del sector (0,0 = esquina del área de contenido, YA con margen aplicado) */
  box: { xPt: number; widthPt: number };
}

/**
 * @param contentWidthPt ancho de contenido del sector (después de su propio
 * margen — ver leftColumnContent/rightColumnContent en TemplateRenderer)
 */
export function resolveSubColumns(contentWidthPt: number, columns: SubColumnDefinition[]): ResolvedSubColumn[] {
  if (!columns || columns.length === 0) return [];

  const ordered = [...columns].sort((a, b) => a.order - b.order);
  const gapPt = 12; // respiro fijo entre sub-columnas, no configurable — evita que se toquen
  const totalGapPt = gapPt * (ordered.length - 1);
  const availableWidthPt = contentWidthPt - totalGapPt;

  let cursorXPt = 0;
  return ordered.map((col) => {
    const widthPt = Math.round((col.widthPercent / 100) * availableWidthPt);
    const resolved: ResolvedSubColumn = {
      id: col.id,
      sectionIds: col.sectionIds,
      box: { xPt: cursorXPt, widthPt },
    };
    cursorXPt += widthPt + gapPt;
    return resolved;
  });
}
