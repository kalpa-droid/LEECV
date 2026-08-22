import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { CARD_DESIGNS, CardDesign } from './cardDesignSchema';
import { ResolvedThemeRoles, getContrastRatio, getContrastTextColor } from '../colors/colorSystem';
import { TypographyScale } from '../presets/presetSchema';

interface CardObjectRendererProps {
  designId?: string;
  title: string;
  subtitle?: string;
  dateOrBadge?: string;
  description?: string;
  rolesColor: ResolvedThemeRoles;
  typography: TypographyScale;
  sectorRole?: 'sidebar' | 'main';
}

export function CardObjectRenderer({
  designId = 'primary-card',
  title,
  subtitle,
  dateOrBadge,
  description,
  rolesColor,
  typography,
  sectorRole = 'main',
}: CardObjectRendererProps) {
  const design: CardDesign = CARD_DESIGNS[designId] || CARD_DESIGNS['primary-card'];

  const getRoleColor = (roleName: string) => {
    switch (roleName) {
      case 'primary': return rolesColor.primary;
      case 'secondary': return rolesColor.secondary;
      case 'accent': return rolesColor.accent;
      case 'text': return rolesColor.text;
      case 'textOnPrimary': return rolesColor.textOnPrimary;
      case 'border': return rolesColor.border;
      case 'background': return rolesColor.background;
      default: return 'transparent';
    }
  };

  const borderColor = getRoleColor(design.borderColorRole);
  const backgroundColor = getRoleColor(design.backgroundColorRole);
  let titleColor = getRoleColor(design.titleColorRole);
  let badgeColor = getRoleColor(design.badgeColorRole);
  let subtitleColor = rolesColor.secondary;
  let descColor = rolesColor.text;

  // Systemic Contrast Protection: Resolve real background behind the card
  // If the card background is transparent, the real background is the container sector's color.
  const effectiveBgColor = (backgroundColor && backgroundColor !== 'transparent')
    ? backgroundColor
    : (sectorRole === 'sidebar' ? rolesColor.primary : rolesColor.background);

  if (effectiveBgColor) {
    if (getContrastRatio(effectiveBgColor, titleColor) < 3.5) {
      titleColor = getContrastTextColor(effectiveBgColor);
    }
    if (getContrastRatio(effectiveBgColor, badgeColor) < 3.5) {
      badgeColor = getContrastTextColor(effectiveBgColor);
    }
    if (getContrastRatio(effectiveBgColor, subtitleColor) < 3.5) {
      subtitleColor = getContrastTextColor(effectiveBgColor);
    }
    if (getContrastRatio(effectiveBgColor, descColor) < 3.5) {
      descColor = getContrastTextColor(effectiveBgColor);
    }
  }

  const fontSizeTitle = design.titleSizeToken === 'title' 
    ? typography.title 
    : design.titleSizeToken === 'sectionHeading' 
      ? typography.sectionHeading 
      : typography.itemTitle;

  const fontSizeBadge = design.badgeSizeToken === 'itemTitle'
    ? typography.itemTitle
    : design.badgeSizeToken === 'body'
      ? typography.body
      : typography.caption;

  const styles = StyleSheet.create({
    cardContainer: {
      padding: 8,
      marginBottom: 8,
      borderLeftWidth: design.borderWidthPt,
      borderLeftColor: borderColor,
      borderLeftStyle: 'solid',
      backgroundColor: backgroundColor,
      borderRadius: design.borderRadiusPt,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: 2,
    },
    titleText: {
      fontSize: fontSizeTitle,
      fontFamily: typography.fontFamily,
      color: titleColor,
      fontWeight: 'bold',
      flex: 1,
      marginRight: 6,
    },
    badgeText: {
      fontSize: fontSizeBadge,
      fontFamily: typography.fontFamily,
      color: badgeColor,
      fontWeight: 'bold',
    },
    subtitleText: {
      fontSize: typography.body,
      fontFamily: typography.fontFamily,
      color: subtitleColor,
      marginBottom: 3,
    },
    descText: {
      fontSize: typography.body,
      fontFamily: typography.fontFamily,
      color: descColor,
      lineHeight: 1.3,
    },
  });

  return (
    <View style={styles.cardContainer} wrap={false}>
      <View style={styles.headerRow}>
        <Text style={styles.titleText}>{title}</Text>
        {dateOrBadge ? <Text style={styles.badgeText}>{dateOrBadge}</Text> : null}
      </View>
      {subtitle ? <Text style={styles.subtitleText}>{subtitle}</Text> : null}
      {description ? <Text style={styles.descText}>{description}</Text> : null}
    </View>
  );
}
