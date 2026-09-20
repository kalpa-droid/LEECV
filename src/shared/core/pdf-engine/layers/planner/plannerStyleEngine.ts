import { resolveThemeRoles, getContrastTextColor, ResolvedThemeRoles } from '../colors/colorSystem';
import { resolveUnifiedTextSpec, ResolvedTextSpec } from '../typography/unifiedTextHierarchyEngine';
import { Preset } from '../presets/presetSchema';

export interface PlannerStyles {
  year: ResolvedTextSpec;
  monthName: ResolvedTextSpec;
  weekDayLabel: ResolvedTextSpec;
  dayNumber: ResolvedTextSpec;
  moduleTitle: ResolvedTextSpec;
  bodyText: ResolvedTextSpec;
  rolesColor: ResolvedThemeRoles;
  contrastTextOnAccent: (accentHex: string) => string;
}

export function resolvePlannerStyles(preset: Preset, backgroundHex: string = '#ffffff'): PlannerStyles {
  const rolesColor = resolveThemeRoles(preset.palette);
  return {
    year: resolveUnifiedTextSpec('title', backgroundHex, rolesColor, preset.typography, 'plannerYear'),
    monthName: resolveUnifiedTextSpec('subtitle', backgroundHex, rolesColor, preset.typography, 'plannerMonthName'),
    weekDayLabel: resolveUnifiedTextSpec('extra', backgroundHex, rolesColor, preset.typography, 'plannerWeekDayLabel'),
    dayNumber: resolveUnifiedTextSpec('badge', backgroundHex, rolesColor, preset.typography, 'plannerDayNumber'),
    moduleTitle: resolveUnifiedTextSpec('subtitle', backgroundHex, rolesColor, preset.typography, 'plannerModuleLabel'),
    bodyText: resolveUnifiedTextSpec('description', backgroundHex, rolesColor, preset.typography, 'plannerMonthNote'),
    rolesColor,
    contrastTextOnAccent: (accentHex: string) => getContrastTextColor(accentHex),
  };
}
