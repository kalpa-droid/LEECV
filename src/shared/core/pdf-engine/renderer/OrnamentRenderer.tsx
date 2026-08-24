import React from 'react';
import { View, Svg, Path, G } from '@react-pdf/renderer';

interface OrnamentRendererProps {
  ornamentKind: 'organic-leaf' | 'geometric-badge' | 'classic-line' | 'none';
  color?: string;
}

export function OrnamentRenderer({ ornamentKind, color = '#52b788' }: OrnamentRendererProps) {
  if (!ornamentKind || ornamentKind === 'none') {
    return null;
  }

  if (ornamentKind === 'organic-leaf') {
    return (
      <View style={{ position: 'absolute', top: 8, right: 8, opacity: 0.85 }}>
        <Svg width={24} height={24} viewBox="0 0 24 24">
          <G fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.4 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
            <Path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
          </G>
        </Svg>
      </View>
    );
  }

  if (ornamentKind === 'geometric-badge') {
    return (
      <View style={{ position: 'absolute', top: 8, right: 8, opacity: 0.9 }}>
        <Svg width={20} height={20} viewBox="0 0 24 24">
          <Path
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            fill={color}
          />
        </Svg>
      </View>
    );
  }

  if (ornamentKind === 'classic-line') {
    return (
      <View style={{ position: 'absolute', top: 12, right: 12, opacity: 0.7 }}>
        <Svg width={30} height={4} viewBox="0 0 30 4">
          <Path d="M0 2h30" stroke={color} strokeWidth={2} strokeDasharray="3 3" />
        </Svg>
      </View>
    );
  }

  return null;
}
