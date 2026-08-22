import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { CARD_DESIGNS, CardDesign } from './cardDesignSchema';
import { ResolvedThemeRoles, translatePaletteForSurface } from '../colors/colorSystem';
import { TypographyScale } from '../presets/presetSchema';

interface SectionBannerCardProps {
  titleText: string;
  designId?: string;
  rolesColor: ResolvedThemeRoles;
  typography: TypographyScale;
  surfaceBgColor?: string;
  isSidebar?: boolean;
}

/**
 * CAPA 6 — OBJETOS BANNER DE SECCIÓN (SectionBannerCard)
 * Renderiza los encabezados de sección ("FORMACIÓN ACADÉMICA", "DATOS PERSONALES")
 * como objetos de primera clase en el motor de diseño, resolviendo su paleta mediante
 * la Matriz de Traducción Cromática HSL (superficies claras u oscuras).
 */
export function SectionBannerCard({
  titleText,
  designId = 'primary-card',
  rolesColor,
  typography,
  surfaceBgColor,
  isSidebar = false,
}: SectionBannerCardProps) {
  const design: CardDesign = CARD_DESIGNS[designId] || CARD_DESIGNS['primary-card'];

  const containerBgHex = surfaceBgColor || (isSidebar ? rolesColor.primary : rolesColor.background);
  const surfacePalette = translatePaletteForSurface(rolesColor, containerBgHex);

  if (isSidebar) {
    // Encabezado de Sección en Sidebar: Franja integrada minimalista
    const styles = StyleSheet.create({
      sidebarBanner: {
        fontSize: typography.sectionHeading,
        fontFamily: 'Helvetica-Bold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginTop: 14,
        marginBottom: 6,
        paddingBottom: 4,
        borderBottomWidth: 1,
        borderBottomColor: surfacePalette.border,
        color: surfacePalette.title,
      },
    });

    return (
      <View wrap={false}>
        <Text style={styles.sidebarBanner}>{titleText}</Text>
      </View>
    );
  }

  // Encabezado de Sección en Columna Principal (Main): Franja contenedora de objeto
  const bannerBgColor = design.backgroundColorRole === 'primary' 
    ? rolesColor.primary 
    : design.backgroundColorRole === 'accent'
      ? rolesColor.accent
      : rolesColor.primary;

  const bannerTextPalette = translatePaletteForSurface(rolesColor, bannerBgColor);

  const styles = StyleSheet.create({
    bannerContainer: {
      backgroundColor: bannerBgColor,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: design.borderRadiusPt || 4,
      marginTop: 14,
      marginBottom: 8,
      borderLeftWidth: design.borderWidthPt ? Math.max(2, design.borderWidthPt) : 0,
      borderLeftColor: rolesColor[design.borderColorRole] || rolesColor.accent,
    },
    bannerText: {
      fontSize: typography.sectionHeading,
      fontFamily: 'Helvetica-Bold',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      color: bannerTextPalette.title,
    },
  });

  return (
    <View style={styles.bannerContainer} wrap={false}>
      <Text style={styles.bannerText}>{titleText}</Text>
    </View>
  );
}
