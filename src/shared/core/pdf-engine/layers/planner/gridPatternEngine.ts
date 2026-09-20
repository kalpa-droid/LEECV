export type GridPatternType = 'blank' | 'dot-grid' | 'lined' | 'graph';
export type GridType = GridPatternType;

export interface GridPatternConfig {
  type: GridPatternType;
  spacingMm?: number;
  colorHex?: string;
  opacity?: number;
}

export function generateGridPatternPath(
  config: GridPatternConfig,
  widthMm: number,
  heightMm: number
): { pathString: string; style: any } | null {
  if (config.type === 'blank') return null;

  const spacing = config.spacingMm || 5;
  const mmToPt = 2.8346;
  const spacingPt = spacing * mmToPt;
  const widthPt = widthMm * mmToPt;
  const heightPt = heightMm * mmToPt;

  const style = {
    stroke: config.colorHex || '#D1D5DB',
    strokeWidth: config.type === 'dot-grid' ? 1.5 : 0.5,
    strokeDasharray: config.type === 'dot-grid' ? `0.01 ${spacingPt}` : undefined,
    strokeLinecap: config.type === 'dot-grid' ? 'round' as const : 'butt' as const,
    opacity: config.opacity ?? 0.5
  };

  let pathString = '';

  if (config.type === 'lined') {
    for (let y = spacingPt; y < heightPt; y += spacingPt) {
      pathString += `M 0 ${y} L ${widthPt} ${y} `;
    }
  } else if (config.type === 'dot-grid') {
    // For SVG Path in pdf-lib, we draw lines that are dotted via strokeDasharray
    for (let y = spacingPt; y < heightPt; y += spacingPt) {
      pathString += `M 0 ${y} L ${widthPt} ${y} `;
    }
  }

  return { pathString, style };
}
