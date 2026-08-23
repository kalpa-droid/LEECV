import React from 'react';
import { getIcon } from './iconRegistry';

interface DomSectionIconProps {
  iconId: string;
  className?: string;
  color?: string;
  size?: number;
}

export function DomSectionIcon({
  iconId,
  className = 'w-4 h-4',
  color,
  size
}: DomSectionIconProps) {
  const iconDef = getIcon(iconId);

  return (
    <svg
      viewBox={iconDef.viewBox}
      className={className}
      style={{
        width: size ? `${size}px` : undefined,
        height: size ? `${size}px` : undefined,
        stroke: color || 'currentColor'
      }}
      fill="none"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {iconDef.paths.map((dStr, idx) => (
        <path key={idx} d={dStr} />
      ))}
    </svg>
  );
}
