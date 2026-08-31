import React from 'react';
import { View, Svg, Path, G, Text as PdfText } from '@react-pdf/renderer';

interface DecorativeBackgroundRendererProps {
  backgroundShapeEnabled?: boolean;
  watermark?: 'none' | 'subtle-brand' | 'ecologia';
  color?: string;
}

export function DecorativeBackgroundRenderer({
  backgroundShapeEnabled = false,
  watermark = 'none',
  color = '#00A8A0',
}: DecorativeBackgroundRendererProps) {
  const showShapes = Boolean(backgroundShapeEnabled);
  const showWatermark = watermark && watermark !== 'none';

  if (!showShapes && !showWatermark) {
    return null;
  }

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} fixed>
      {/* Background Shapes (Efectos sutiles de fondo en esquinas) */}
      {showShapes && (
        <>
          <View style={{ position: 'absolute', top: -30, right: -30, opacity: 0.05 }}>
            <Svg width={180} height={180} viewBox="0 0 200 200">
              <Path
                d="M 0 0 L 200 0 L 200 200 C 100 180 50 120 0 0 Z"
                fill={color}
              />
            </Svg>
          </View>
          <View style={{ position: 'absolute', bottom: -20, left: -20, opacity: 0.04 }}>
            <Svg width={140} height={140} viewBox="0 0 150 150">
              <Path
                d="M 0 150 L 0 0 C 60 50 100 90 150 150 Z"
                fill={color}
              />
            </Svg>
          </View>
        </>
      )}

      {/* Watermark (Marca de Agua sutil de fondo) */}
      {watermark === 'subtle-brand' && (
        <View style={{ position: 'absolute', top: '45%', left: '35%', opacity: 0.035, transform: 'rotate(-25deg)' }}>
          <Svg width={220} height={80} viewBox="0 0 220 80">
            <G fill={color}>
              <Path d="M10 10 H210 V70 H10 Z" fill="none" stroke={color} strokeWidth={3} />
              <PdfText x={25} y={48} style={{ fontSize: 24, fontFamily: 'Helvetica-Bold', fill: color }}>
                LEECV • CV
              </PdfText>
            </G>
          </Svg>
        </View>
      )}

      {watermark === 'ecologia' && (
        <View style={{ position: 'absolute', top: '40%', right: '10%', opacity: 0.04, transform: 'rotate(-15deg)' }}>
          <Svg width={200} height={200} viewBox="0 0 100 100">
            <G fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
              <Path d="M50 90 C 50 90, 20 60, 20 35 C 20 15, 35 10, 50 25 C 65 10, 80 15, 80 35 C 80 60, 50 90, 50 90 Z" />
              <Path d="M50 90 L 50 25" />
              <Path d="M50 70 C 40 60, 30 55, 30 55" />
              <Path d="M50 55 C 60 45, 70 40, 70 40" />
              <Path d="M50 40 C 42 32, 35 30, 35 30" />
            </G>
          </Svg>
        </View>
      )}
    </View>
  );
}
