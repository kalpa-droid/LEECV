import { FieldDefinition } from './fieldCatalog';

/**
 * NÚCLEO — deriva las opciones de etiqueta elegibles para un campo a
 * partir de su `label` en el catálogo (separado por " / "). No hace
 * falta escribir un array de opciones a mano por cada uno de los 17
 * campos — se calcula solo del texto que ya existe.
 *
 * Escape hatch: si el split automático no da opciones limpias (ej.
 * "Usuario / Manija (@usuario)", donde el paréntesis no debería ser
 * una opción separada), el campo puede declarar `labelOptions`
 * explícito en el catálogo para pisar el cálculo automático.
 */
export function getFieldLabelOptions(def: FieldDefinition): string[] {
  if (def.labelOptions && def.labelOptions.length > 0) return def.labelOptions;
  const parts = def.label.split(' / ').map(p => p.trim()).filter(Boolean);
  return parts.length > 1 ? parts : [def.label];
}
