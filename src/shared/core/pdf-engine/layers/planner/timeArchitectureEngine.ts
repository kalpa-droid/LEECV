export type TemporalView = 'undated' | 'daily' | 'weekly' | 'monthly';
export type WeeklyLayout = 'horizontal' | 'vertical' | 'dashboard';
export type WeekStart = 'monday' | 'sunday';

export interface MonthData {
  year: number;
  monthIndex: number; // 0-11
  monthName: string;
  daysInMonth: number;
  firstDayOfWeek: number; // 0 = Sunday or Monday depending on weekStart
  weeks: (number | null)[][];
}

export interface YearArchitecture {
  year: number;
  temporalView?: TemporalView;
  weeklyLayout?: WeeklyLayout;
  weekStart?: WeekStart;
  months: MonthData[];
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export interface TimeArchitectureOptions {
  temporalView?: TemporalView;
  weeklyLayout?: WeeklyLayout;
  weekStart?: WeekStart;
  startOnMonday?: boolean;
}

export function generateYearArchitecture(
  year: number,
  optionsOrStartOnMonday: boolean | TimeArchitectureOptions = true
): YearArchitecture {
  let isMonday = true;
  let temporalView: TemporalView = 'monthly';
  let weeklyLayout: WeeklyLayout = 'horizontal';
  let weekStart: WeekStart = 'monday';

  if (typeof optionsOrStartOnMonday === 'boolean') {
    isMonday = optionsOrStartOnMonday;
    weekStart = isMonday ? 'monday' : 'sunday';
  } else if (optionsOrStartOnMonday) {
    if (optionsOrStartOnMonday.weekStart) {
      weekStart = optionsOrStartOnMonday.weekStart;
      isMonday = weekStart === 'monday';
    } else if (optionsOrStartOnMonday.startOnMonday !== undefined) {
      isMonday = optionsOrStartOnMonday.startOnMonday;
      weekStart = isMonday ? 'monday' : 'sunday';
    }
    if (optionsOrStartOnMonday.temporalView) temporalView = optionsOrStartOnMonday.temporalView;
    if (optionsOrStartOnMonday.weeklyLayout) weeklyLayout = optionsOrStartOnMonday.weeklyLayout;
  }

  const months: MonthData[] = [];

  for (let m = 0; m < 12; m++) {
    const date = new Date(year, m, 1);
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    
    // JS Date.getDay(): 0 is Sunday.
    let firstDayOfWeek = date.getDay();
    if (isMonday) {
      firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    }

    const weeks: (number | null)[][] = [];
    let currentWeek: (number | null)[] = new Array(7).fill(null);
    let currentDayOfWeek = firstDayOfWeek;

    for (let day = 1; day <= daysInMonth; day++) {
      currentWeek[currentDayOfWeek] = day;
      if (currentDayOfWeek === 6) {
        weeks.push(currentWeek);
        currentWeek = new Array(7).fill(null);
        currentDayOfWeek = 0;
      } else {
        currentDayOfWeek++;
      }
    }
    if (currentWeek.some(d => d !== null)) {
      weeks.push(currentWeek);
    }

    months.push({
      year,
      monthIndex: m,
      monthName: MONTH_NAMES[m],
      daysInMonth,
      firstDayOfWeek,
      weeks
    });
  }

  return {
    year,
    temporalView,
    weeklyLayout,
    weekStart,
    months
  };
}
