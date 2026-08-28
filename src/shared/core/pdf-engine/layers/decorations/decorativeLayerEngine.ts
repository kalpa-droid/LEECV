/**
 * MOTOR DE CAPAS DECORATIVAS Y ELEMENTOS GRÁFICOS (decorativeLayerEngine.ts)
 * 
 * Evalúa las políticas decorativas declaradas en el Preset activo:
 * - Card borders (bordes pronunciados vs limpios sin marco)
 * - Section dividers (líneas divisorias decorativas)
 * - Background shapes (formas/acentos de fondo)
 * - Shadow effects (sombras visuales de elevación)
 */

import { Preset } from '../presets/presetSchema';
import { ResolvedThemeRoles } from '../colors/colorSystem';
import { resolveSubtleCardBackground } from '../colors/surfaceAwareColorEngine';

export interface ResolvedDecorativeStyles {
  cardContainerStyle: {
    borderWidthPt: number;
    borderColor: string;
    borderRadiusPt: number;
    backgroundColor: string;
    hasShadow: boolean;
  };
  dividerStyle: {
    enabled: boolean;
    heightPt: number;
    color: string;
    marginTopPt: number;
    marginBottomPt: number;
  };
  backgroundShapeEnabled: boolean;
  cornerOrnament: 'organic-leaf' | 'geometric-badge' | 'classic-line' | 'none';
  watermark: 'none' | 'subtle-brand' | 'ecologia';
  headerIconStyle: 'filled' | 'outlined' | 'minimal';
}

export function resolveDecorativeStyles(
  preset: Preset,
  cardKind: 'primary-card' | 'secondary-card' | 'accent-card' | 'neutral-card' = 'neutral-card',
  rolesColor?: ResolvedThemeRoles,
  sectorRole: 'sidebar' | 'main' = 'main'
): ResolvedDecorativeStyles {
  const policy = preset.decorativeElementPolicy || {
    cardBorders: true,
    sectionDividers: true,
    backgroundShapes: true,
    shadowEffects: false,
    cornerOrnaments: 'none',
    watermarkType: 'none',
    headerIconStyle: 'filled'
  };

  const palette = preset.palette;

  // Derivación consciente de superficie para neutral-card
  let bg = rolesColor ? resolveSubtleCardBackground(sectorRole, rolesColor) : (palette.background || '#ffffff');
  let borderCol = rolesColor?.border || rolesColor?.secondary || palette.secondary || '#e5e7eb';

  if (cardKind === 'primary-card') {
    bg = rolesColor?.primary || palette.primary;
    borderCol = rolesColor?.primary || palette.primary;
  } else if (cardKind === 'accent-card') {
    bg = rolesColor?.accent || palette.accent;
    borderCol = rolesColor?.accent || palette.accent;
  } else if (cardKind === 'secondary-card') {
    bg = rolesColor?.secondary || palette.secondary;
    borderCol = rolesColor?.secondary || palette.secondary;
  }

  return {
    cardContainerStyle: {
      borderWidthPt: policy.cardBorders ? 1 : 0,
      borderColor: borderCol,
      borderRadiusPt: 6,
      backgroundColor: bg,
      hasShadow: !!policy.shadowEffects
    },
    dividerStyle: {
      enabled: policy.sectionDividers !== false,
      heightPt: 1,
      color: rolesColor?.accent || palette.accent || palette.primary,
      marginTopPt: 6,
      marginBottomPt: 8
    },
    backgroundShapeEnabled: policy.backgroundShapes !== false,
    cornerOrnament: policy.cornerOrnaments || 'none',
    watermark: policy.watermarkType || 'none',
    headerIconStyle: policy.headerIconStyle || 'filled'
  };
}
