/**
 * NÚCLEO — CATÁLOGO DE ALIAS DE NOMBRES DE CAMPOS (fieldAliasCatalog.ts)
 * 
 * Centraliza el mapeo de nombres de campos en inglés / alternativos (ej: 'role' -> 'cargo', 'year' -> 'periodo')
 * para garantizar la compatibilidad con esquemas legacy o entradas personalizadas sin duplicar ramas if/else.
 */

export const FIELD_ALIASES: Record<string, string> = {
  degree: 'tituloOGrado',
  title: 'tituloOGrado',
  name: 'tituloOGrado',
  course: 'tituloOGrado',
  role: 'cargo',
  institution: 'institucion',
  company: 'institucion',
  year: 'periodo',
  hours: 'cargaHoraria',
  details: 'descripcion',
  description: 'descripcion',
  bulletPoints: 'logros',
  achievements: 'logros',
  logros: 'logros',
};

/**
 * Resuelve la clave legacy/alternativa dada la clave canónica de un campo y el nombre de la sección en el formulario.
 */
export function resolveLegacyFieldKey(fieldId: string, sectionName: string): string {
  if (fieldId === 'tituloOGrado') {
    if (sectionName === 'experience') return 'role';
    if (sectionName === 'coursesAndCertificates' || sectionName === 'informatics' || sectionName === 'ecology') return 'title';
    return 'degree';
  }
  if (fieldId === 'cargo') {
    return 'role';
  }
  if (fieldId === 'descripcion') {
    return (sectionName === 'experience' || sectionName === 'ecology') ? 'details' : 'description';
  }
  if (fieldId === 'periodo') {
    return 'year';
  }
  if (fieldId === 'cargaHoraria') {
    return 'hours';
  }
  return fieldId;
}
