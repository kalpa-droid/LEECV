/**
 * NÚCLEO — MOTOR DE ARMONÍA Y ESCALA TIPOGRÁFICA MODULAR (typographyHarmonyEngine.ts)
 * 
 * Genera escalas de fuentes matemáticamente armónicas y proporcionales basadas en intervalos musicales y proporciones clásicas.
 * Análogo a `paletteHarmonyEngine.ts` para color.
 */

import { TypographyScale } from '../presets/presetSchema';

export type TypographyHarmonyScheme = 
  | 'minorSecond'     // 1.067 - Ultra denso / compacto
  | 'majorSecond'     // 1.125 - Escala sutil / corporativo
  | 'minorThird'      // 1.200 - Editorial clásico
  | 'majorThird'      // 1.250 - Proporción estándar (Recomendada)
  | 'perfectFourth'   // 1.333 - Contraste alto / moderno
  | 'augmentedFourth' // 1.414 - Jerarquía expresiva
  | 'perfectFifth'    // 1.500 - Gran impacto visual
  | 'goldenRatio';    // 1.618 - Proporción áurea

export const TYPOGRAPHY_HARMONY_RATIOS: Record<TypographyHarmonyScheme, number> = {
  minorSecond: 1.067,
  majorSecond: 1.125,
  minorThird: 1.200,
  majorThird: 1.250,
  perfectFourth: 1.333,
  augmentedFourth: 1.414,
  perfectFifth: 1.500,
  goldenRatio: 1.618
};

export interface TypographyHarmonyOptions {
  baseBodyPt?: number;
  scheme?: TypographyHarmonyScheme | number;
  fontFamily?: string;
  lineHeightBody?: number;
  lineHeightHeading?: number;
}

/**
 * Redondea un número a 1 decimal para estabilidad en renderizado PDF.
 */
function round1(val: number): number {
  return Math.round(val * 10) / 10;
}

/**
 * Genera una escala tipográfica completa y armónica a partir de un tamaño base y un esquema de proporción.
 */
export function generateHarmoniousTypographyScale(options: TypographyHarmonyOptions = {}): TypographyScale {
  const baseBody = options.baseBodyPt || 9.5;
  const ratio = typeof options.scheme === 'number'
    ? options.scheme
    : (TYPOGRAPHY_HARMONY_RATIOS[options.scheme || 'majorThird'] || 1.25);
  
  const fontFamily = options.fontFamily || 'Helvetica';
  const lineHeightBody = options.lineHeightBody || 1.3;
  const lineHeightHeading = options.lineHeightHeading || 1.2;

  const body = baseBody;
  const caption = Math.max(7, round1(body / ratio));
  const itemTitle = round1(body * ratio);
  const sectionHeading = round1(itemTitle * ratio);
  const title = round1(sectionHeading * ratio);

  // Escalas de registro
  const subtitle = round1(itemTitle / Math.sqrt(ratio));
  const meta = round1(body / Math.sqrt(ratio));
  const extra = round1(caption);

  return {
    title,
    sectionHeading,
    itemTitle,
    body,
    caption,
    fontFamily,
    lineHeightBody,
    lineHeightHeading,
    recordScaleRatios: {
      subtitle,
      meta,
      extra
    },
    cover: {
      badge: round1(body),
      title: round1(caption * 1.5),
      name: round1(title * 1.3),
      role: round1(itemTitle),
      quote: round1(itemTitle),
      footerMain: round1(body),
      footerSub: round1(caption)
    }
  };
}
