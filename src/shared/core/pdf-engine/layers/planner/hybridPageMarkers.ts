export interface HybridMarkersConfig {
  enabled: boolean;
  colorHex?: string;
  marginMm?: number;
  lengthMm?: number;
}

export function generateHybridMarkersPath(
  config: HybridMarkersConfig,
  widthMm: number,
  heightMm: number
) {
  if (!config.enabled) return null;

  // Factor de conversión mm a pt
  const mmToPt = 2.83465;
  const w = widthMm * mmToPt;
  const h = heightMm * mmToPt;
  const m = (config.marginMm || 5) * mmToPt;
  const l = (config.lengthMm || 10) * mmToPt;

  // Dibujamos las 4 esquinas. Cada esquina es una forma de L.
  // Top-Left
  const tl = `M ${m} ${m + l} L ${m} ${m} L ${m + l} ${m}`;
  // Top-Right
  const tr = `M ${w - m - l} ${m} L ${w - m} ${m} L ${w - m} ${m + l}`;
  // Bottom-Left
  const bl = `M ${m} ${h - m - l} L ${m} ${h - m} L ${m + l} ${h - m}`;
  // Bottom-Right
  const br = `M ${w - m - l} ${h - m} L ${w - m} ${h - m} L ${w - m} ${h - m - l}`;

  return {
    pathString: `${tl} ${tr} ${bl} ${br}`,
    style: {
      stroke: config.colorHex || '#94a3b8',
      strokeWidth: 0.5,
    }
  };
}
