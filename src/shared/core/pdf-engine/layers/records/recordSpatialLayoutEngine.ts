/**
 * NÚCLEO — MOTOR DE LAYOUT ESPACIAL POR REGISTRO (recordSpatialLayoutEngine.ts)
 * 
 * Define y resuelve los 4 arquetipos espaciales de maquetación para tarjetas de registro:
 * 1. stacked-clean: Disposición vertical apilada tradicional (por defecto).
 * 2. split-date-left: Fecha/periodo en una columna lateral izquierda de 65pt, contenido a la derecha.
 * 3. inline-compact: Título e institución integrados en la misma línea separados por viñeta.
 * 4. boxed-highlight: Tarjeta contenedora con relleno y fondo de superficie sutil.
 */

export type RecordLayoutTemplate = 'stacked-clean' | 'split-date-left' | 'inline-compact' | 'boxed-highlight';

export interface ResolvedRecordLayout {
  template: RecordLayoutTemplate;
  containerStyle: {
    padding: number;
    marginBottom: number;
    flexDirection?: 'row' | 'column';
  };
  isSplitLeft: boolean;
  isInlineCompact: boolean;
  isBoxed: boolean;
}

import { DensityMode } from '../presets/presetSchema';
import { resolveDensityFactors } from '../typography/densityEngine';

export function resolveRecordLayout(
  template: RecordLayoutTemplate | undefined,
  densityMode: DensityMode | number = 'normal'
): ResolvedRecordLayout {
  const density = resolveDensityFactors(densityMode);
  const activeTemplate = template || 'stacked-clean';

  switch (activeTemplate) {
    case 'split-date-left':
      return {
        template: 'split-date-left',
        containerStyle: { padding: 6 * density.recordCardPaddingFactor, marginBottom: 8 * density.recordCardPaddingFactor, flexDirection: 'row' },
        isSplitLeft: true,
        isInlineCompact: false,
        isBoxed: false
      };

    case 'inline-compact':
      return {
        template: 'inline-compact',
        containerStyle: { padding: 5 * density.recordCardPaddingFactor, marginBottom: 6 * density.recordCardPaddingFactor },
        isSplitLeft: false,
        isInlineCompact: true,
        isBoxed: false
      };

    case 'boxed-highlight':
      return {
        template: 'boxed-highlight',
        containerStyle: { padding: 10 * density.recordCardPaddingFactor, marginBottom: 10 * density.recordCardPaddingFactor },
        isSplitLeft: false,
        isInlineCompact: false,
        isBoxed: true
      };

    case 'stacked-clean':
    default:
      return {
        template: 'stacked-clean',
        containerStyle: { padding: 8 * density.recordCardPaddingFactor, marginBottom: 8 * density.recordCardPaddingFactor },
        isSplitLeft: false,
        isInlineCompact: false,
        isBoxed: false
      };
  }
}
