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
 * Secuencia del Dock lateral de EditorLee.
 * El orden es el recorrido real de redacción: inicio → portada → secciones
 * → diseño → TOC → metadatos → IA → respaldo.
 */
export const EDITORIAL_STEP_SEQUENCE: EditorialStepItem[] = [
  {
    id: 'editorial_inicio',
    stepNumber: 1,
    label: '1. Inicio / Configuración',
    shortLabel: 'Inicio',
    description: 'Tipo de documento, preset y tamaño de hoja.', // plain-language:allow — tipo de documento y formato de hoja
    iconId: 'inicio',
  },
  {
    id: 'editorial_portada',
    stepNumber: 2,
    label: '2. Portada / Carátula',
    shortLabel: 'Portada',
    description: 'Modo de tapa, título, autor y QR opcional.',
    iconId: 'ed_cover',
  },
  {
    id: 'editorial_secciones',
    stepNumber: 3,
    label: '3. Secciones y Capítulos',
    shortLabel: 'Secciones',
    description: 'Agregar y editar secciones: preliminares, cuerpo, cierre.',
    iconId: 'ed_sections',
  },
  {
    id: 'editorial_diseño',
    stepNumber: 4,
    label: '4. Diseño y Hoja',
    shortLabel: 'Diseño',
    description: 'Márgenes, lomo, encabezados par/impar y tipografía.',
    iconId: 'ed_design',
  },
  {
    id: 'editorial_toc',
    stepNumber: 5,
    label: '5. Índice Automático',
    shortLabel: 'Índice',
    description: 'Encendido/apagado, profundidad H1-H2, ubicación tras carátula.',
    iconId: 'ed_toc',
  },
  {
    id: 'editorial_metadata',
    stepNumber: 6,
    label: '6. Metadatos y Legales',
    shortLabel: 'Metadatos',
    description: 'Ficha CIP, copyright, pares clave-valor personalizados.',
    iconId: 'ed_metadata',
  },
  {
    id: 'editorial_import_ai',
    stepNumber: 7,
    label: '7. Importar y IA',
    shortLabel: 'IA',
    description: 'Subir .docx/.txt/.md, estructurar con IA, reescribir o pulir.',
    iconId: 'ed_import_ai',
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