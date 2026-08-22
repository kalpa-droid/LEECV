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
  const bannerBgColor = (design.backgroundColorRole && design.backgroundColorRole !== 'transparent')
    ? (rolesColor[design.backgroundColorRole as keyof ResolvedThemeRoles] as string || rolesColor.primary)
    : 'transparent';

  const isTransparentBanner = bannerBgColor === 'transparent';
  const bannerTextPalette = isTransparentBanner
    ? surfacePalette
    : translatePaletteForSurface(rolesColor, bannerBgColor);

  const styles = StyleSheet.create({
    bannerContainer: {
      backgroundColor: bannerBgColor,
      paddingHorizontal: isTransparentBanner ? 0 : 10,
      paddingVertical: isTransparentBanner ? 4 : 5,
      borderRadius: isTransparentBanner ? 0 : (design.borderRadiusPt || 4),
      marginTop: 16,
      marginBottom: 8,
      borderBottomWidth: isTransparentBanner ? 1.5 : 0,
      borderBottomColor: rolesColor.primary,
      borderLeftWidth: (!isTransparentBanner && design.borderWidthPt) ? Math.max(2, design.borderWidthPt) : 0,
      borderLeftColor: rolesColor[design.borderColorRole as keyof ResolvedThemeRoles] as string || rolesColor.accent,
    },
    bannerText: {
      fontSize: typography.sectionHeading,
      fontFamily: 'Helvetica-Bold',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      color: isTransparentBanner ? rolesColor.primary : bannerTextPalette.title,
    },
  });

  return (
    <View style={styles.bannerContainer} wrap={false}>
      <Text style={styles.bannerText}>{titleText}</Text>
    </View>
  );
}
