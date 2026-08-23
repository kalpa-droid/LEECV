import React from 'react';
import { Svg, Path } from '@react-pdf/renderer';
import { getIcon } from './iconRegistry';

interface PdfSectionIconProps {
  iconId: string;
  color?: string;
  size?: number;
  style?: any;
}

export function PdfSectionIcon({
  iconId,
  color = '#0f172a',
  size = 14,
  style
}: PdfSectionIconProps) {
  const iconDef = getIcon(iconId);

  return (
    <Svg
      viewBox={iconDef.viewBox}
      style={{ width: size, height: size, ...(style || {}) }}
    >
      {iconDef.paths.map((dStr, idx) => (
        <Path
          key={idx}
          d={dStr}
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ))}
    </Svg>
  );
}
