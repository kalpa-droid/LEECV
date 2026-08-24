import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { CARD_DESIGNS, CardDesign } from './cardDesignSchema';
import { ResolvedThemeRoles, getTypographyColorBinding } from '../colors/colorSystem';
import { TypographyScale, Preset } from '../presets/presetSchema';
import { resolveDecorativeStyles } from '../decorations/decorativeLayerEngine';
import { deriveRecordScale } from '../typography/typographyHierarchyEngine';
import { resolveAccentTarget } from '../colors/accentApplicationEngine';
import { resolveRecordLayout } from '../records/recordSpatialLayoutEngine';

interface CardObjectRendererProps {
  preset?: Preset;
  designId?: string;
  title: string;
  subtitle?: string;
  dateOrBadge?: string;
  badges?: Array<{ id: string; label: string; value: string }>;
  extras?: Array<{ id: string; label: string; value: string; type?: string }>;
  description?: string;
  rolesColor: ResolvedThemeRoles;
  typography: TypographyScale;
  sectorRole?: 'sidebar' | 'main';
}

export function CardObjectRenderer({
  preset,
  designId = 'primary-card',
  title,
  subtitle,
  dateOrBadge,
  badges = [],
  extras = [],
  description,
  rolesColor,
  typography,
  sectorRole = 'main',
}: CardObjectRendererProps) {
  const design: CardDesign = CARD_DESIGNS[designId] || CARD_DESIGNS['primary-card'];
  const decStyles = preset ? resolveDecorativeStyles(preset, designId as any) : null;
  const recordScale = deriveRecordScale(typography, typography.recordScaleRatios);
  const spatialLayout = resolveRecordLayout(design.layoutTemplate);

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

  const effectiveBgColor = (backgroundColor && backgroundColor !== 'transparent')
    ? backgroundColor
    : (sectorRole === 'sidebar' ? rolesColor.primary : rolesColor.background);

  const typographyBinding = getTypographyColorBinding(rolesColor, effectiveBgColor);

  const resolvedAccent = resolveAccentTarget(
    design.accentTarget,
    design.titleColorRole,
    design.badgeColorRole,
    rolesColor,
    typographyBinding.itemTitle,
    typographyBinding.caption
  );

  let titleColor = resolvedAccent.titleColor;
  let badgeColor = resolvedAccent.badgeColor;
  let subtitleColor = typographyBinding.caption;
  let descColor = typographyBinding.body;

  const cardBgColor = decStyles?.cardContainerStyle.backgroundColor ?? (
    spatialLayout.isBoxed ? 'rgba(0,0,0,0.025)' : backgroundColor
  );

  const styles = StyleSheet.create({
    cardContainer: {
      padding: spatialLayout.containerStyle.padding,
      marginBottom: spatialLayout.containerStyle.marginBottom,
      borderLeftWidth: decStyles?.cardContainerStyle.borderWidthPt ?? design.borderWidthPt,
      borderLeftColor: decStyles?.cardContainerStyle.borderColor ?? resolvedAccent.leftRuleColor ?? borderColor,
      borderLeftStyle: 'solid',
      backgroundColor: cardBgColor,
      borderRadius: decStyles?.cardContainerStyle.borderRadiusPt ?? design.borderRadiusPt,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: 2,
    },
    titleText: {
      fontSize: recordScale.recordTitle,
      fontFamily: typography.fontFamily,
      color: titleColor,
      fontWeight: 'bold',
      flex: 1,
      marginRight: 6,
    },
    badgeText: {
      fontSize: recordScale.recordMeta,
      fontFamily: typography.fontFamily,
      color: badgeColor,
      fontWeight: 'bold',
    },
    badgeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 4,
      marginTop: 2,
      marginBottom: 4,
    },
    badgePill: {
      fontSize: recordScale.recordMeta - 1,
      fontFamily: typography.fontFamily,
      color: badgeColor,
      backgroundColor: 'rgba(0, 0, 0, 0.04)',
      paddingHorizontal: 4,
      paddingVertical: 1,
      borderRadius: 3,
    },
    extraRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 2,
      marginBottom: 3,
    },
    extraText: {
      fontSize: recordScale.recordExtra,
      fontFamily: typography.fontFamily,
      color: subtitleColor,
      fontStyle: 'italic',
    },
    subtitleText: {
      fontSize: recordScale.recordSubtitle,
      fontFamily: typography.fontFamily,
      color: subtitleColor,
      marginBottom: 3,
    },
    descText: {
      fontSize: recordScale.recordBody,
      fontFamily: typography.fontFamily,
      color: descColor,
      lineHeight: recordScale.lineHeightBody,
    },
  });

  return (
    <View style={styles.cardContainer} wrap={false}>
      <View style={styles.headerRow}>
        <Text style={styles.titleText}>{title}</Text>
        {dateOrBadge ? <Text style={styles.badgeText}>{dateOrBadge}</Text> : null}
      </View>
      {subtitle ? <Text style={styles.subtitleText}>{subtitle}</Text> : null}

      {/* Dynamic Badge Bar (Collapses cleanly when empty) */}
      {badges.length > 0 && (
        <View style={styles.badgeRow}>
          {badges.map((b) => (
            <Text key={b.id} style={styles.badgePill}>
              {b.label}: {b.value}
            </Text>
          ))}
        </View>
      )}

      {/* Dynamic Extra Lines (Collapses cleanly when empty) */}
      {extras.length > 0 && (
        <View style={styles.extraRow}>
          {extras.map((ex) => (
            <Text key={ex.id} style={styles.extraText}>
              📌 {ex.value}
            </Text>
          ))}
        </View>
      )}

      {description ? <Text style={styles.descText}>{description}</Text> : null}
    </View>
  );
}
