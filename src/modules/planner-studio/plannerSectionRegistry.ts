export interface PlannerSectionDefinition {
  id: string; // The property name in data.modules
  label: string;
  description?: string;
  defaultForPersonas?: string[];
}

export const PLANNER_SECTION_REGISTRY: PlannerSectionDefinition[] = [
  {
    id: 'notesBlock',
    label: 'Metas y Objetivos',
    description: 'Bloque de Notas y Objetivos',
    defaultForPersonas: ['planner-clasico', 'planner-docente', 'planner-emprendedor', 'planner-personal']
  },
  {
    id: 'taskPriority',
    label: 'Tareas Prioritarias',
    description: 'Lista de tareas destacadas',
    defaultForPersonas: ['planner-clasico', 'planner-docente', 'planner-ejecutivo', 'planner-emprendedor']
  },
  {
    id: 'habitTracker',
    label: 'Seguimiento de Hábitos',
    description: 'Control de hábitos recurrentes',
    defaultForPersonas: ['planner-clasico', 'planner-emprendedor', 'planner-personal']
  },
  {
    id: 'timeBlocking',
    label: 'Bloques de Tiempo (Horarios)',
    description: 'Organización horaria y bloques de trabajo',
    defaultForPersonas: ['planner-docente', 'planner-ejecutivo']
  },
  {
    id: 'expenseTracker',
    label: 'Control de Gastos',
    description: 'Bloque para seguimiento de finanzas',
    defaultForPersonas: ['planner-ejecutivo', 'planner-emprendedor']
  }
];
