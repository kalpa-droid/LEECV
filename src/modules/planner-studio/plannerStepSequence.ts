export interface PlannerStepItem {
  id: string;
  stepNumber: number;
  label: string;
  shortLabel: string;
  description: string;
}

export const PLANNER_STEP_SEQUENCE: PlannerStepItem[] = [
  {
    id: 'planner_design',
    stepNumber: 1,
    label: '1. Diseño y Paleta',
    shortLabel: 'Diseño',
    description: 'Tipografías y colores',
  },
  {
    id: 'planner_background',
    stepNumber: 2,
    label: '2. Fondo de Hoja',
    shortLabel: 'Fondo',
    description: 'Puntos guía, renglones o blanco',
  },
  {
    id: 'planner_structure',
    stepNumber: 3,
    label: '3. Estructura del Año',
    shortLabel: 'Estructura',
    description: 'Año, inicio de semana y formato',
  },
  {
    id: 'planner_sections',
    stepNumber: 4,
    label: '4. Módulos de Contenido',
    shortLabel: 'Módulos',
    description: 'Hábitos, tareas y notas',
  },
  {
    id: 'planner_months',
    stepNumber: 5,
    label: '5. Personalización por Mes',
    shortLabel: 'Meses',
    description: 'Overrides mes a mes',
  },
  {
    id: 'planner_personal',
    stepNumber: 6,
    label: '6. Datos Personales',
    shortLabel: 'Personales',
    description: 'Datos del titular',
  },
];

export const getPlannerStepById = (id: string): PlannerStepItem | undefined => {
  return PLANNER_STEP_SEQUENCE.find((step) => step.id === id);
};

export const getNextPlannerStepId = (currentId: string): string => {
  const idx = PLANNER_STEP_SEQUENCE.findIndex((step) => step.id === currentId);
  if (idx >= 0 && idx < PLANNER_STEP_SEQUENCE.length - 1) {
    return PLANNER_STEP_SEQUENCE[idx + 1].id;
  }
  return currentId;
};

export const getPrevPlannerStepId = (currentId: string): string => {
  const idx = PLANNER_STEP_SEQUENCE.findIndex((step) => step.id === currentId);
  if (idx > 0) {
    return PLANNER_STEP_SEQUENCE[idx - 1].id;
  }
  return currentId;
};
