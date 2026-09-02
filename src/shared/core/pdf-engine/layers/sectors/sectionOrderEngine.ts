/**
 * NÚCLEO — MOTOR DE POSICIONAMIENTO RELATIVO DE SECCIONES (sectionOrderEngine.ts)
 * 
 * Regula la reordenación dinámica y declarativa de secciones en el lienzo del PDF y la interfaz UI:
 * - Posicionamiento relativo: "Al principio", "Después de: [Sección X]", "Al final".
 * - Cambio de sector: Mover entre Barra Lateral (secundaria) y Columna Principal (primaria).
 * - Garantiza la persistencia simétrica en `cvData.layout.sectionOrders` y `cvData.layout.columnAssignments`.
 */

export type SectorRoleType = 'primaria' | 'secundaria';

export interface RelativePositionOptions {
  sectionId: string;
  targetSector: SectorRoleType;
  positionMode: 'start' | 'after' | 'end';
  targetAfterId?: string;
}

/**
 * Mueve un elemento al principio de la lista.
 */
export function moveSectionToStart(list: string[], sectionId: string): string[] {
  const filtered = list.filter(id => id !== sectionId);
  return [sectionId, ...filtered];
}

/**
 * Mueve un elemento al final de la lista.
 */
export function moveSectionToEnd(list: string[], sectionId: string): string[] {
  const filtered = list.filter(id => id !== sectionId);
  return [...filtered, sectionId];
}

/**
 * Mueve un elemento para que se ubique inmediatamente "después de" la sección targetAfterId.
 */
export function moveSectionAfter(list: string[], sectionId: string, targetAfterId: string): string[] {
  const filtered = list.filter(id => id !== sectionId);
  const targetIdx = filtered.indexOf(targetAfterId);

  if (targetIdx === -1) {
    return [...filtered, sectionId];
  }

  const result = [...filtered];
  result.splice(targetIdx + 1, 0, sectionId);
  return result;
}

/**
 * Aplica una mutación de posición relativa sobre `cvData`, actualizando síncronamente
 * `layout.columnAssignments` y `layout.sectionOrders` para persistencia en el JSON.
 */
export function applyRelativeSectionPosition(cvData: any, options: RelativePositionOptions): any {
  if (!cvData || !options.sectionId) return cvData;

  const cleanSecId = options.sectionId.replace(/-cont$/, '');
  const targetSector = options.targetSector; // 'primaria' (main) | 'secundaria' (sidebar)
  const otherSector: SectorRoleType = targetSector === 'primaria' ? 'secundaria' : 'primaria';

  const currentAssignments = { ...(cvData?.layout?.columnAssignments || {}) };
  currentAssignments[cleanSecId] = targetSector;

  const currentOrders = cvData?.layout?.sectionOrders || {};
  let targetList: string[] = Array.isArray(currentOrders[targetSector])
    ? [...currentOrders[targetSector]]
    : [];
  let otherList: string[] = Array.isArray(currentOrders[otherSector])
    ? [...currentOrders[otherSector]]
    : [];

  // Remover de la otra columna si estaba presente
  otherList = otherList.filter(id => id !== cleanSecId);

  // Asegurar que la sección a mover esté en la lista del sector objetivo
  if (!targetList.includes(cleanSecId)) {
    targetList.push(cleanSecId);
  }

  // Aplicar el reordenamiento según el modo seleccionado
  if (options.positionMode === 'start') {
    targetList = moveSectionToStart(targetList, cleanSecId);
  } else if (options.positionMode === 'end') {
    targetList = moveSectionToEnd(targetList, cleanSecId);
  } else if (options.positionMode === 'after' && options.targetAfterId) {
    targetList = moveSectionAfter(targetList, cleanSecId, options.targetAfterId);
  }

  return {
    ...cvData,
    layout: {
      ...(cvData.layout || {}),
      columnAssignments: currentAssignments,
      sectionOrders: {
        ...(cvData.layout?.sectionOrders || {}),
        [targetSector]: [...new Set(targetList)],
        [otherSector]: [...new Set(otherList)]
      }
    }
  };
}
