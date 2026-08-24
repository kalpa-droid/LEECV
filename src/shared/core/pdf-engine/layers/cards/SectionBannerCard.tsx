import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { CARD_DESIGNS, CardDesign } from './cardDesignSchema';
import { ResolvedThemeRoles, getTypographyColorBinding } from '../colors/colorSystem';
import { TypographyScale, Preset } from '../presets/presetSchema';
import { PdfSectionIcon } from '../icons/PdfSectionIcon';

interface SectionBannerCardProps {
  preset?: Preset;
  titleText: string;
  iconId?: string;
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
 * la Matriz de Traducción Cromática HSL (superficies claras u oscuras) y la Vincuación Tipográfica.
 */
export function SectionBannerCard({
  titleText,
  iconId,
  designId = 'primary-card',
  rolesColor,
  typography,
  surfaceBgColor,
  isSidebar = false,
}: SectionBannerCardProps) {
  const design: CardDesign = CARD_DESIGNS[designId] || CARD_DESIGNS['primary-card'];

  const containerBgHex = surfaceBgColor || (isSidebar ? rolesColor.primary : rolesColor.background);
  const typographyBinding = getTypographyColorBinding(rolesColor, containerBgHex);

  if (isSidebar) {
    // Encabezado de Sección en Sidebar: Franja integrada minimalista
    const styles = StyleSheet.create({
      sidebarBannerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: 14,
        marginBottom: 6,
        paddingBottom: 4,
        borderBottomWidth: 1,
        borderBottomColor: typographyBinding.border,
      },
      sidebarBanner: {
        fontSize: typography.sectionHeading,
        fontFamily: 'Helvetica-Bold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        color: typographyBinding.sectionHeading,
      },
    });

    return (
      <View wrap={false} style={styles.sidebarBannerContainer}>
        {iconId ? <PdfSectionIcon iconId={iconId} size={typography.sectionHeading} color={typographyBinding.sectionHeading} /> : null}
        <Text style={styles.sidebarBanner}>{titleText}</Text>
      </View>
    );
  }

  // Encabezado de Sección en Columna Principal (Main): Franja contenedora de objeto
  const bannerBgColor = (design.backgroundColorRole && design.backgroundColorRole !== 'transparent')
    ? (rolesColor[design.backgroundColorRole as keyof ResolvedThemeRoles] as string || rolesColor.primary)
    : 'transparent';

  const isTransparentBanner = bannerBgColor === 'transparent';

  const styles = StyleSheet.create({
    bannerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: bannerBgColor,
      paddingHorizontal: isTransparentBanner ? 0 : 10,
      paddingVertical: isTransparentBanner ? 4 : 5,
      borderRadius: isTransparentBanner ? 0 : (design.borderRadiusPt || 4),
      marginTop: 16,
      marginBottom: 8,
      borderBottomWidth: isTransparentBanner ? 1.5 : 0,
      borderBottomColor: rolesColor.accent || rolesColor.primary,
      borderLeftWidth: (!isTransparentBanner && design.borderWidthPt) ? Math.max(2, design.borderWidthPt) : 0,
      borderLeftColor: rolesColor[design.borderColorRole as keyof ResolvedThemeRoles] as string || rolesColor.accent,
    },
    bannerText: {
      fontSize: typography.sectionHeading,
      fontFamily: 'Helvetica-Bold',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      color: typographyBinding.sectionHeading,
    },
  });

  return (
    <View style={styles.bannerContainer} wrap={false}>
      {iconId ? <PdfSectionIcon iconId={iconId} size={typography.sectionHeading + 1} color={typographyBinding.sectionHeading} /> : null}
      <Text style={styles.bannerText}>{titleText}</Text>
    </View>
  );
}
