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
 * Secuencia lógica del Dock lateral de EditorLee (7 pasos en grilla compacta de 2 columnas):
 * 1. Inicio y Archivo (obra, borradores, importar sin pérdidas y respaldo)
 * 2. Datos y Portada (identidad de obra y carátula)
 * 3. Partes y Capítulos (preliminares, capítulos y anexos)
 * 4. Bibliografía y Citas (fuentes sincronizadas con capítulos)
 * 5. Estructura y Hoja (hoja, márgenes, interlineado, columnas, portadillas, encabezados)
 * 6. Estilo y Tipografía (fuentes y paleta visual)
 * 7. Índice y Exportación (Índice General verificado + chequeo y salida final)
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
    id: 'editorial_secciones',
    stepNumber: 3,
    label: 'Partes y Capítulos',
    shortLabel: 'Capítulos',
    description: 'Agregar, ordenar y organizar preliminares, capítulos y anexos.',
    iconId: 'ed_sections',
  },
  {
    id: 'editorial_bibliografia',
    stepNumber: 4,
    label: 'Bibliografía y Citas',
    shortLabel: 'Citas',
    description: 'Agregar fuentes, ordenar referencias y bibliografía comentada.',
    iconId: 'ed_bibliografia',
  },
  {
    id: 'editorial_estructura',
    stepNumber: 5,
    label: 'Estructura y Hoja',
    shortLabel: 'Estructura',
    description: 'Hoja, márgenes, interlineado, columnas globales, carátulas de capítulos y encabezados.',
    iconId: 'diseno_hoja',
  },
  {
    id: 'editorial_diseño',
    stepNumber: 6,
    label: 'Estilo y Tipografía',
    shortLabel: 'Estilo',
    description: 'Tipo de letra, tamaño, fuentes locales y paleta de color de la obra.',
    iconId: 'ed_design',
  },
  {
    id: 'editorial_toc',
    stepNumber: 7,
    label: 'Índice y Exportación',
    shortLabel: 'Índice y Salida',
    description: 'Índice General automático, verificación final y exportación a PDF o Word.',
    iconId: 'ed_toc',
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
