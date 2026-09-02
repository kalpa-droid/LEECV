import React from 'react';
import { View, Svg, Path, Rect, Circle, G } from '@react-pdf/renderer';
import { resolveCoverOrnament, CoverStyleId } from '../layers/decorations/coverOrnamentEngine';
import { ResolvedThemeRoles } from '../layers/colors/colorSystem';

interface CoverOrnamentRendererProps {
  coverStyle?: CoverStyleId | string;
  rolesColor?: ResolvedThemeRoles;
  /** Ancho y alto opcionales si se requiere restringir espacio (defaults a página completa / lienzo) */
  widthPt?: number;
  heightPt?: number;
}

export const CoverOrnamentRenderer: React.FC<CoverOrnamentRendererProps> = ({
  coverStyle = 'monica-classic',
  rolesColor,
  widthPt = 595,
  heightPt = 842
}) => {
  const ornament = resolveCoverOrnament(coverStyle, rolesColor);
  const { kind, primaryColor, accentColor, secondaryColor, opacity } = ornament;

  // 1. CANON CLÁSICO: Filigrana & Esquinas Áureas (classic-filigree)
  if (kind === 'classic-filigree') {
    return (
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity }}>
        {/* Esquina Superior Izquierda */}
        <View style={{ position: 'absolute', top: 16, left: 16 }}>
          <Svg width={36} height={36} viewBox="0 0 36 36">
            <G fill="none" stroke={accentColor} strokeWidth={1.2}>
              <Path d="M2 34V8a6 6 0 0 1 6-6h26" />
              <Path d="M6 34V12a6 6 0 0 1 6-6h22" strokeOpacity={0.6} />
              <Circle cx={8} cy={8} r={2} fill={primaryColor} stroke="none" />
            </G>
          </Svg>
        </View>

        {/* Esquina Superior Derecha */}
        <View style={{ position: 'absolute', top: 16, right: 16 }}>
          <Svg width={36} height={36} viewBox="0 0 36 36">
            <G fill="none" stroke={accentColor} strokeWidth={1.2}>
              <Path d="M34 34V8a6 6 0 0 0-6-6H2" />
              <Path d="M30 34V12a6 6 0 0 0-6-6H2" strokeOpacity={0.6} />
              <Circle cx={28} cy={8} r={2} fill={primaryColor} stroke="none" />
            </G>
          </Svg>
        </View>

        {/* Remate Central Superior */}
        <View style={{ position: 'absolute', top: 14, left: widthPt / 2 - 20 }}>
          <Svg width={40} height={10} viewBox="0 0 40 10">
            <G fill="none" stroke={accentColor} strokeWidth={1}>
              <Path d="M0 5h14M26 5h14" />
              <Path d="M20 1l4 4-4 4-4-4z" fill={accentColor} stroke="none" />
            </G>
          </Svg>
        </View>
      </View>
    );
  }

  // 2. BENTO GRID: Marcos Angulares L-Shape en Esquinas (bento-corners)
  if (kind === 'bento-corners') {
    return (
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity }}>
        {/* Superior Izquierda L */}
        <View style={{ position: 'absolute', top: 20, left: 20 }}>
          <Svg width={24} height={24} viewBox="0 0 24 24">
            <Path d="M2 24V2h22" fill="none" stroke={accentColor} strokeWidth={3} strokeLinecap="square" />
            <Rect x={4} y={4} width={4} height={4} fill={primaryColor} />
          </Svg>
        </View>

        {/* Superior Derecha L */}
        <View style={{ position: 'absolute', top: 20, right: 20 }}>
          <Svg width={24} height={24} viewBox="0 0 24 24">
            <Path d="M22 24V2H0" fill="none" stroke={accentColor} strokeWidth={3} strokeLinecap="square" />
            <Rect x={16} y={4} width={4} height={4} fill={primaryColor} />
          </Svg>
        </View>

        {/* Inferior Izquierda L */}
        <View style={{ position: 'absolute', bottom: 20, left: 20 }}>
          <Svg width={24} height={24} viewBox="0 0 24 24">
            <Path d="M2 0v22h22" fill="none" stroke={secondaryColor} strokeWidth={2} strokeLinecap="square" />
          </Svg>
        </View>

        {/* Inferior Derecha L */}
        <View style={{ position: 'absolute', bottom: 20, right: 20 }}>
          <Svg width={24} height={24} viewBox="0 0 24 24">
            <Path d="M22 0v22H0" fill="none" stroke={secondaryColor} strokeWidth={2} strokeLinecap="square" />
          </Svg>
        </View>
      </View>
    );
  }

  // 3. MINIMAL EDITORIAL: Barra Vertical de Acento & Punto de Edición (minimal-bar)
  if (kind === 'minimal-bar') {
    return (
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity }}>
        {/* Barra Lateral Fina de Acento */}
        <View style={{ position: 'absolute', top: 40, left: 24, bottom: 40 }}>
          <Svg width={6} height={heightPt - 80} viewBox={`0 0 6 ${heightPt - 80}`}>
            <Rect x={0} y={0} width={2} height={heightPt - 80} fill={accentColor} opacity={0.7} />
            <Circle cx={1} cy={24} r={3} fill={primaryColor} />
          </Svg>
        </View>
      </View>
    );
  }

  // 4. CREATIVE SUSTENTABLE: Hojas Botánicas Vectoriales (organic-leaf)
  if (kind === 'organic-leaf') {
    return (
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity }}>
        {/* Esquina Superior Derecha - Ramas Botánicas */}
        <View style={{ position: 'absolute', top: 16, right: 16 }}>
          <Svg width={48} height={48} viewBox="0 0 48 48">
            <G fill="none" stroke={accentColor} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M44 4A32 32 0 0 0 12 36" />
              <Path d="M44 4c-8 2-16 8-18 16" />
              <Path d="M30 18c-6 2-10 8-12 14" />
              <Path d="M22 4A16 16 0 0 0 6 20" strokeOpacity={0.6} />
            </G>
            <Circle cx={44} cy={4} r={3} fill={accentColor} />
          </Svg>
        </View>

        {/* Esquina Inferior Izquierda - Hoja Secundaria */}
        <View style={{ position: 'absolute', bottom: 20, left: 20 }}>
          <Svg width={36} height={36} viewBox="0 0 36 36">
            <G fill="none" stroke={secondaryColor} strokeWidth={1.4} strokeLinecap="round">
              <Path d="M4 32A24 24 0 0 1 28 8" />
              <Path d="M4 32c6-1.5 12-6 13.5-12" />
            </G>
          </Svg>
        </View>
      </View>
    );
  }

  // 5. BOLD IMPACT: Insignia Ejecutiva & Estrella Geométrica (bold-star-badge)
  if (kind === 'bold-star-badge') {
    return (
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity }}>
        {/* Esquina Superior Derecha - Estrella / Escudo Ejecutiva */}
        <View style={{ position: 'absolute', top: 20, right: 24 }}>
          <Svg width={32} height={32} viewBox="0 0 32 32">
            <Path
              d="M16 2l4.2 8.5 9.4 1.4-6.8 6.6 1.6 9.3L16 23.4 7.6 27.8l1.6-9.3-6.8-6.6 9.4-1.4L16 2z"
              fill={accentColor}
            />
            <Path
              d="M16 6l2.8 5.7 6.3.9-4.5 4.4 1.1 6.2-5.7-3-5.7 3 1.1-6.2-4.5-4.4 6.3-.9L16 6z"
              fill={primaryColor}
              opacity={0.6}
            />
          </Svg>
        </View>

        {/* Marco de Esquina Grueso Superior Izquierdo */}
        <View style={{ position: 'absolute', top: 0, left: 0 }}>
          <Svg width={40} height={40} viewBox="0 0 40 40">
            <Path d="M0 0h40v6H6v34H0V0z" fill={primaryColor} opacity={0.85} />
          </Svg>
        </View>
      </View>
    );
  }

  // 6. MAGAZINE EXECUTIVE: Cabecera Masthead Doble Línea (magazine-masthead-lines)
  if (kind === 'magazine-masthead-lines') {
    return (
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity }}>
        {/* Franja Doble de Imprenta Superior */}
        <View style={{ position: 'absolute', top: 20, left: 24, right: 24 }}>
          <Svg width={widthPt - 48} height={8} viewBox={`0 0 ${widthPt - 48} 8`}>
            <Rect x={0} y={0} width={widthPt - 48} height={2} fill={primaryColor} />
            <Rect x={0} y={5} width={widthPt - 48} height={1} fill={accentColor} />
          </Svg>
        </View>

        {/* Sello Editorial Inferior */}
        <View style={{ position: 'absolute', bottom: 20, left: 24, right: 24 }}>
          <Svg width={widthPt - 48} height={8} viewBox={`0 0 ${widthPt - 48} 8`}>
            <Rect x={0} y={2} width={widthPt - 48} height={1} fill={accentColor} />
            <Rect x={0} y={6} width={widthPt - 48} height={2} fill={primaryColor} />
          </Svg>
        </View>
      </View>
    );
  }

  return null;
};
