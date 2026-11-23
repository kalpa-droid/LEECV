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
 * Secuencia del Dock lateral de EditorLee (orden compacto de 2 columnas).
 * 1. Herramientas de entrada: Importar/IA + Inicio/Carpeta Segura
 * 2. Diseño y Estructura: Portada + Hoja y Márgenes + Índice
 * 3. Contenido y Datos: Secciones + Bibliografía + Metadatos
 * Debajo se despliegan los capítulos y apartados del manuscrito (i, ii, 1, 2, A).
 */
export const EDITORIAL_STEP_SEQUENCE: EditorialStepItem[] = [
  {
    id: 'editorial_import_ai',
    stepNumber: 1,
    label: 'Importar y IA',
    shortLabel: 'IA',
    description: 'Subir Word, LibreOffice, PDF o fotos con lectura automática e IA.',
    iconId: 'ed_import_ai',
  },
  {
    id: 'editorial_inicio',
    stepNumber: 2,
    label: 'Archivo y Carpeta Segura',
    shortLabel: 'Archivo',
    description: 'Obra activa, abrir respaldo .leedoc y guardar en carpeta propia.',
    iconId: 'inicio',
  },
  {
    id: 'editorial_portada',
    stepNumber: 3,
    label: 'Portada / Carátula',
    shortLabel: 'Portada',
    description: 'Modo de tapa, título, autor y diseño visual.',
    iconId: 'ed_cover',
  },
  {
    id: 'editorial_diseño',
    stepNumber: 4,
    label: 'Hoja y Márgenes',
    shortLabel: 'Diseño',
    description: 'Márgenes, lomo, tipografía, tamaño e interlineado.',
    iconId: 'ed_design',
  },
  {
    id: 'editorial_toc',
    stepNumber: 5,
    label: 'Índice Automático',
    shortLabel: 'Índice',
    description: 'Encendido/apagado, profundidad H1-H2 y ubicación.',
    iconId: 'ed_toc',
  },
  {
    id: 'editorial_secciones',
    stepNumber: 6,
    label: 'Secciones y Capítulos',
    shortLabel: 'Secciones',
    description: 'Agregar y ordenar preliminares, capítulos y anexos.',
    iconId: 'ed_sections',
  },
  {
    id: 'editorial_bibliografia',
    stepNumber: 7,
    label: 'Bibliografía y Fuentes',
    shortLabel: 'Citas',
    description: 'Agregar fuentes, ordenar referencias y convertir citas con IA.',
    iconId: 'ed_bibliografia',
  },
  {
    id: 'editorial_metadata',
    stepNumber: 8,
    label: 'Metadatos y Legales',
    shortLabel: 'Metadatos',
    description: 'Ficha de edición, copyright, institución e ISBN.',
    iconId: 'ed_metadata',
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
