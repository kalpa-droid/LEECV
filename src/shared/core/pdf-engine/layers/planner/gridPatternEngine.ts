export type GridPatternType = 'blank' | 'dot-grid' | 'lined' | 'graph';
export type GridType = GridPatternType;

export interface GridPatternConfig {
  type: GridPatternType;
  spacingMm?: number;
  colorHex?: string;
  opacity?: number;
}

export interface GridPatternPath {
  pathString: string;
  style: {
    stroke: string;
    strokeWidth: number;
    strokeLinecap: 'round' | 'butt';
    opacity: number;
  };
}

const MM_TO_PT = 2.8346;
/** Largo de un "punto": un trazo casi nulo con extremos redondos. pdfkit rechaza trazos de largo 0. */
const DOT_LENGTH_PT = 0.01;

/**
 * Trama de fondo de la hoja (puntos, renglones, cuadriculado o blanco).
 *
 * Los puntos NO se dibujan con `strokeDasharray: "0 n"`: pdfkit exige largos > 0 y el PDF
 * entero fallaba con "dash([0, n]) invalid" apenas se usaba la trama por defecto. Cada punto
 * es un trazo diminuto con extremo redondo.
 */
export function generateGridPatternPath(
  config: GridPatternConfig,
  widthMm: number,
  heightMm: number
): GridPatternPath | null {
  if (config.type === 'blank') return null;

  const spacingPt = (config.spacingMm || 5) * MM_TO_PT;
  const widthPt = widthMm * MM_TO_PT;
  const heightPt = heightMm * MM_TO_PT;
  const round = (n: number) => Math.round(n * 100) / 100;

  const style: GridPatternPath['style'] = {
    stroke: config.colorHex || '#D1D5DB',
    // OJO: nunca strokeDasharray "0.01 n" para el punto — pdfkit exige largos > 0 y
    // ese patrón (con 0 literal) hace fallar TODO el PDF con "dash([0,n]) invalid".
    // Cada punto es un trazo real y diminuto (ver DOT_LENGTH_PT) con extremo redondo.
    strokeWidth: config.type === 'dot-grid' ? 1.6 : 0.5,
    strokeLinecap: config.type === 'dot-grid' ? 'round' as const : 'butt' as const,
    // Los puntos son chicos: con la misma transparencia que las líneas casi no se ven al imprimir.
    opacity: config.opacity ?? (config.type === 'dot-grid' ? 0.95 : 0.5),
  };

  const segments: string[] = [];

  if (config.type === 'lined') {
    for (let y = spacingPt; y < heightPt; y += spacingPt) {
      segments.push(`M 0 ${round(y)} L ${round(widthPt)} ${round(y)}`);
    }
  } else if (config.type === 'graph') {
    for (let y = spacingPt; y < heightPt; y += spacingPt) {
      segments.push(`M 0 ${round(y)} L ${round(widthPt)} ${round(y)}`);
    }
    for (let x = spacingPt; x < widthPt; x += spacingPt) {
      segments.push(`M ${round(x)} 0 L ${round(x)} ${round(heightPt)}`);
    }
  } else if (config.type === 'dot-grid') {
    for (let y = spacingPt; y < heightPt; y += spacingPt) {
      for (let x = spacingPt; x < widthPt; x += spacingPt) {
        segments.push(`M ${round(x)} ${round(y)} L ${round(x + DOT_LENGTH_PT)} ${round(y)}`);
      }
    }
  }

  return { pathString: segments.join(' '), style };
}
