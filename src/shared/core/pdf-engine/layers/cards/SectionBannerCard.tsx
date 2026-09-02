import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { CARD_DESIGNS, CardDesign } from './cardDesignSchema';
import { ResolvedThemeRoles, getTypographyColorBinding } from '../colors/colorSystem';
import { TypographyScale, Preset } from '../presets/presetSchema';
import { PdfSectionIcon } from '../icons/PdfSectionIcon';
import { resolveDecorativeStyles } from '../decorations/decorativeLayerEngine';
import { resolveUnifiedTextSpec } from '../typography/unifiedTextHierarchyEngine';

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
  preset,
  titleText,
  iconId,
  designId = 'primary-card',
  rolesColor,
  typography,
  surfaceBgColor,
  isSidebar = false,
}: SectionBannerCardProps) {
  const design: CardDesign = CARD_DESIGNS[designId] || CARD_DESIGNS['primary-card'];
  const decStyles = preset ? resolveDecorativeStyles(preset, designId as any, rolesColor, isSidebar ? 'sidebar' : 'main') : null;
  const iconStyle = decStyles?.headerIconStyle || 'filled';

  const bannerBgColor = !isSidebar && (design.backgroundColorRole && design.backgroundColorRole !== 'transparent')
    ? (rolesColor[design.backgroundColorRole as keyof ResolvedThemeRoles] as string || rolesColor.primary)
    : 'transparent';

  const effectiveSurfaceHex = (bannerBgColor && bannerBgColor !== 'transparent')
    ? bannerBgColor
    : (surfaceBgColor || (isSidebar ? rolesColor.primary : rolesColor.background));

  const textSpec = resolveUnifiedTextSpec('title', effectiveSurfaceHex, rolesColor, typography, 'section-banner');
  const typographyBinding = getTypographyColorBinding(rolesColor, effectiveSurfaceHex);

  const iconColor = iconStyle === 'minimal' 
    ? (rolesColor.accent || textSpec.colorHex) 
    : textSpec.colorHex;

  if (isSidebar) {
    const sidebarFontSize = Math.max(8.5, typography.sectionHeading - 2.5);
    const cleanIconId = (iconId || '').replace(/-cont$/, '');

    const hasDivider = decStyles ? decStyles.dividerStyle.enabled : true;

    const styles = StyleSheet.create({
      sidebarBannerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: 14,
        marginBottom: 6,
        paddingBottom: 4,
        borderBottomWidth: hasDivider ? (decStyles ? decStyles.dividerStyle.heightPt : 1) : 0,
        borderBottomColor: decStyles ? decStyles.dividerStyle.color : typographyBinding.border,
      },
      sidebarBanner: {
        fontSize: sidebarFontSize,
        fontFamily: textSpec.fontFamily,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        color: textSpec.colorHex,
        opacity: textSpec.opacity,
        fontWeight: textSpec.fontWeight as any,
      },
    });

    return (
      <View wrap={false} style={styles.sidebarBannerContainer}>
        {cleanIconId ? <PdfSectionIcon iconId={cleanIconId} size={sidebarFontSize} color={iconColor} /> : null}
        <Text style={styles.sidebarBanner}>{titleText}</Text>
      </View>
    );
  }

  // Encabezado de Sección en Columna Principal (Main): Franja contenedora de objeto
  const isTransparentBanner = bannerBgColor === 'transparent';
  const cleanIconId = (iconId || '').replace(/-cont$/, '');
  const hasDivider = decStyles ? decStyles.dividerStyle.enabled : true;

  const styles = StyleSheet.create({
    bannerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: bannerBgColor,
      paddingHorizontal: isTransparentBanner ? 0 : 10,
      paddingVertical: isTransparentBanner ? 4 : 5,
      borderRadius: isTransparentBanner ? 0 : (design.borderRadiusPt || 4),
      marginTop: decStyles ? decStyles.dividerStyle.marginTopPt + 10 : 16,
      marginBottom: decStyles ? decStyles.dividerStyle.marginBottomPt : 8,
      borderBottomWidth: isTransparentBanner && hasDivider ? (decStyles ? decStyles.dividerStyle.heightPt || 1.5 : 1.5) : 0,
      borderBottomColor: decStyles ? decStyles.dividerStyle.color : (rolesColor.accent || rolesColor.primary),
      borderLeftWidth: (!isTransparentBanner && design.borderWidthPt) ? Math.max(2, design.borderWidthPt) : 0,
      borderLeftColor: rolesColor[design.borderColorRole as keyof ResolvedThemeRoles] as string || rolesColor.accent,
    },
    bannerText: {
      fontSize: typography.sectionHeading,
      fontFamily: textSpec.fontFamily,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      color: textSpec.colorHex,
      opacity: textSpec.opacity,
      fontWeight: textSpec.fontWeight as any,
    },
  });

  return (
    <View style={styles.bannerContainer} wrap={false}>
      {cleanIconId ? <PdfSectionIcon iconId={cleanIconId} size={typography.sectionHeading + 1} color={iconColor} /> : null}
      <Text style={styles.bannerText}>{titleText}</Text>
    </View>
  );
}
