/**
 * NÚCLEO — MOTOR DE ACENTO CON PROPÓSITO (accentApplicationEngine.ts)
 * 
 * Resuelve la aplicación del color de acento semántico según el objetivo declarado:
 * - 'title': El título del registro recibe el acento.
 * - 'meta-badge': Las fechas/badges/etiquetas reciben el acento.
 * - 'left-rule': La franja/borde izquierdo del contenedor recibe el acento.
 * - 'icon-only': Únicamente los íconos reciben el acento.
 * 
 * Regla de Precedencia y Retrocompatibilidad (100%):
 * Si `target` es undefined o nulo, recurre al rol de color histórico (ej. `titleColorRole`).
 */

import { ResolvedThemeRoles } from './colorSystem';

export type AccentTarget = 'title' | 'meta-badge' | 'left-rule' | 'icon-only' | 'none';

export interface ResolvedAccentStyles {
  titleColor: string;
  badgeColor: string;
  leftRuleColor: string;
  iconColor: string;
}

export function resolveAccentTarget(
  target: AccentTarget | undefined,
  titleColorRoleFallback: string,
  badgeColorRoleFallback: string,
  rolesColor: ResolvedThemeRoles,
  defaultTitleColor: string,
  defaultBadgeColor: string
): ResolvedAccentStyles {
  const accentHex = rolesColor.accent || '#FF2E63';

  if (!target) {
    return {
      titleColor: titleColorRoleFallback === 'accent' ? accentHex : defaultTitleColor,
      badgeColor: badgeColorRoleFallback === 'accent' ? accentHex : defaultBadgeColor,
      leftRuleColor: rolesColor.accent || rolesColor.primary,
      iconColor: rolesColor.accent || defaultTitleColor
    };
  }

  return {
    titleColor: target === 'title' ? accentHex : defaultTitleColor,
    badgeColor: target === 'meta-badge' ? accentHex : defaultBadgeColor,
    leftRuleColor: target === 'left-rule' ? accentHex : rolesColor.primary,
    iconColor: target === 'icon-only' || target === 'title' ? accentHex : defaultTitleColor
  };
}
