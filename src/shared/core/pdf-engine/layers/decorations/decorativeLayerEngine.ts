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
}

export function resolveDecorativeStyles(
  preset: Preset,
  cardKind: 'primary-card' | 'secondary-card' | 'accent-card' | 'neutral-card' = 'neutral-card'
): ResolvedDecorativeStyles {
  const policy = preset.decorativeElementPolicy || {
    cardBorders: true,
    sectionDividers: true,
    backgroundShapes: true,
    shadowEffects: false
  };

  const palette = preset.palette;

  let bg = '#ffffff';
  let borderCol = palette.secondary || '#e5e7eb';

  if (cardKind === 'primary-card') {
    bg = palette.primary;
    borderCol = palette.primary;
  } else if (cardKind === 'accent-card') {
    bg = palette.accent;
    borderCol = palette.accent;
  } else if (cardKind === 'secondary-card') {
    bg = palette.secondary;
    borderCol = palette.secondary;
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
      color: palette.accent || palette.primary,
      marginTopPt: 6,
      marginBottomPt: 8
    },
    backgroundShapeEnabled: policy.backgroundShapes !== false
  };
}
