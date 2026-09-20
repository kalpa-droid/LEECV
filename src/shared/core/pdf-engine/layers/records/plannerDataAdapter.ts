import { GridType } from '../planner/gridPatternEngine';
import { TemporalView, WeeklyLayout, WeekStart } from '../planner/timeArchitectureEngine';

export interface PlannerMonthOverride {
  gridType?: GridType;
  primaryColor?: string;
  notes?: string;
}

export interface PlannerDocumentData {
  year?: number;
  gridType?: GridType;
  gridColor?: string;
  temporalView?: TemporalView;
  weeklyLayout?: WeeklyLayout;
  weekStart?: WeekStart;
  monthOverrides?: Record<number, PlannerMonthOverride>;
  title?: string;
  subtitle?: string;
  primaryColor?: string;
}

export interface PreparedPlannerRenderData {
  year: number;
  gridType: GridType;
  gridColor: string;
  temporalView: TemporalView;
  weeklyLayout: WeeklyLayout;
  weekStart: WeekStart;
  monthOverrides: Record<number, PlannerMonthOverride>;
  title: string;
  subtitle: string;
  primaryColor: string;
}

export function preparePlannerRenderData(data: PlannerDocumentData): PreparedPlannerRenderData {
  return {
    year: data.year || new Date().getFullYear(),
    gridType: data.gridType || 'dot-grid',
    gridColor: data.gridColor || '#CBD5E1',
    temporalView: data.temporalView || 'monthly',
    weeklyLayout: data.weeklyLayout || 'horizontal',
    weekStart: data.weekStart || 'monday',
    monthOverrides: data.monthOverrides || {},
    title: data.title || 'Agenda Anual',
    subtitle: data.subtitle || 'Planificador y Organización',
    primaryColor: data.primaryColor || '#1D9E75',
  };
}
