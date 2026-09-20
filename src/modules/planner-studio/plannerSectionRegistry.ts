export interface PlannerSectionDefinition {
  id: string; // The property name in data.modules
  label: string;
  description?: string;
}

export const PLANNER_SECTION_REGISTRY: PlannerSectionDefinition[] = [
  {
    id: 'notesBlock',
    label: 'Metas y Objetivos',
    description: 'Bloque de Notas y Objetivos'
  },
  {
    id: 'taskPriority',
    label: 'Tareas Prioritarias',
    description: 'Lista de tareas destacadas'
  },
  {
    id: 'habitTracker',
    label: 'Seguimiento de Hábitos',
    description: 'Control de hábitos recurrentes'
  },
  {
    id: 'expenseTracker',
    label: 'Control de Gastos',
    description: 'Bloque para seguimiento de finanzas'
  }
];
