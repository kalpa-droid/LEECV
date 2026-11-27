export interface EditorialStepItem {
  id: string;
  stepNumber: number;
  label: string;
  shortLabel: string;
  description: string;
  /** Nombre del ícono en ICON_REGISTRY (se resuelve en el Dock). */
  iconId: string;
}

/**
 * Secuencia del Dock lateral de EditorLee (7 pasos en grilla compacta de 2 columnas).
 * Separa claramente:
 * 1. Inicio y Archivo (obra, borradores, importar AST y Carpeta Segura)
 * 2. Datos y Portada (identidad de obra y carátula)
 * 3. Estructura y Hoja (márgenes, interlineado, columnas, separadores, encabezados/pies)
 * 4. Estilo y Tipografía (fuentes y paleta visual)
 * 5. Índice General
 * 6. Partes y Capítulos
 * 7. Bibliografía y Citas
 */
export const EDITORIAL_STEP_SEQUENCE: EditorialStepItem[] = [
  {
    id: 'editorial_inicio',
    stepNumber: 1,
    label: 'Inicio y Archivo',
    shortLabel: 'Inicio',
    description: 'Obra activa, borradores guardados, importar manuscrito sin pérdidas y respaldo en PC o Drive.',
    iconId: 'inicio',
  },
  {
    id: 'editorial_portada',
    stepNumber: 2,
    label: 'Datos y Portada',
    shortLabel: 'Portada',
    description: 'Título, autoría, datos de edición y diseño exterior de portada.',
    iconId: 'ed_cover',
  },
  {
    id: 'editorial_estructura',
    stepNumber: 3,
    label: 'Estructura y Hoja',
    shortLabel: 'Estructura',
    description: 'Hoja, márgenes, interlineado, columnas globales, carátulas de capítulos y encabezados.',
    iconId: 'diseno_hoja',
  },
  {
    id: 'editorial_diseño',
    stepNumber: 4,
    label: 'Estilo y Tipografía',
    shortLabel: 'Estilo',
    description: 'Tipo de letra, tamaño, fuentes locales y paleta de color de la obra.',
    iconId: 'ed_design',
  },
  {
    id: 'editorial_toc',
    stepNumber: 5,
    label: 'Índice General',
    shortLabel: 'Índice',
    description: 'Encendido/apagado, niveles de subtítulos y qué capítulos entran al índice.',
    iconId: 'ed_toc',
  },
  {
    id: 'editorial_secciones',
    stepNumber: 6,
    label: 'Partes y Capítulos',
    shortLabel: 'Capítulos',
    description: 'Agregar, ordenar y organizar preliminares, capítulos y anexos.',
    iconId: 'ed_sections',
  },
  {
    id: 'editorial_bibliografia',
    stepNumber: 7,
    label: 'Bibliografía y Citas',
    shortLabel: 'Citas',
    description: 'Agregar fuentes, ordenar referencias y bibliografía comentada.',
    iconId: 'ed_bibliografia',
  },
];

export function getEditorialStepById(id: string): EditorialStepItem | undefined {
  return EDITORIAL_STEP_SEQUENCE.find((step) => step.id === id);
}

export function getNextEditorialStepId(currentId: string): string {
  const idx = EDITORIAL_STEP_SEQUENCE.findIndex((step) => step.id === currentId);
  return idx >= 0 && idx < EDITORIAL_STEP_SEQUENCE.length - 1
    ? EDITORIAL_STEP_SEQUENCE[idx + 1].id
    : currentId;
}

export function getPrevEditorialStepId(currentId: string): string {
  const idx = EDITORIAL_STEP_SEQUENCE.findIndex((step) => step.id === currentId);
  return idx > 0 ? EDITORIAL_STEP_SEQUENCE[idx - 1].id : currentId;
}
