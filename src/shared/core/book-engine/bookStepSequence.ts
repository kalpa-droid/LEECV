export interface BookStepItem {
  id: string;
  stepNumber: number;
  label: string;
  shortLabel: string;
  description: string;
  skipWhenNormal?: boolean;
}

export const BOOK_STEP_SEQUENCE: BookStepItem[] = [
  {
    id: 'book_source_type',
    stepNumber: 1,
    label: '1. Origen',
    shortLabel: 'Origen',
    description: 'Formato PDF y tamaño de hoja',
  },
  {
    id: 'book_organize',
    stepNumber: 2,
    label: '2. Organización de Páginas',
    shortLabel: 'Páginas',
    description: 'Grilla de miniaturas y orden',
    skipWhenNormal: true,
  },
  {
    id: 'book_cover',
    stepNumber: 3,
    label: '3. Tapa',
    shortLabel: 'Tapa',
    description: 'Diseño o imagen de portada',
  },
  {
    id: 'book_back_cover',
    stepNumber: 4,
    label: '4. Contratapa',
    shortLabel: 'Contratapa',
    description: 'Sinopsis o diseño posterior',
  },
  {
    id: 'book_foliado',
    stepNumber: 5,
    label: '5. Encuentro un número',
    shortLabel: 'Número',
    description: 'Calibración de numeración real',
  },
  {
    id: 'book_preview_export',
    stepNumber: 6,
    label: '6. Exportar PDF Final',
    shortLabel: 'Exportar',
    description: 'Montaje final e impresión',
  },
];

export const getBookStepById = (id: string): BookStepItem | undefined => {
  return BOOK_STEP_SEQUENCE.find((step) => step.id === id);
};

export const getNextBookStepId = (currentId: string, mode?: string): string => {
  const idx = BOOK_STEP_SEQUENCE.findIndex((step) => step.id === currentId);
  if (idx >= 0) {
    for (let i = idx + 1; i < BOOK_STEP_SEQUENCE.length; i++) {
      const step = BOOK_STEP_SEQUENCE[i];
      if (mode !== 'fotocopia' && step.skipWhenNormal) {
        continue;
      }
      return step.id;
    }
  }
  return currentId;
};

export const getPrevBookStepId = (currentId: string, mode?: string): string => {
  const idx = BOOK_STEP_SEQUENCE.findIndex((step) => step.id === currentId);
  if (idx > 0) {
    for (let i = idx - 1; i >= 0; i--) {
      const step = BOOK_STEP_SEQUENCE[i];
      if (mode !== 'fotocopia' && step.skipWhenNormal) {
        continue;
      }
      return step.id;
    }
  }
  return currentId;
};

