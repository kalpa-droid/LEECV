import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { CARD_DESIGNS, CardDesign } from './cardDesignSchema';
import { ResolvedThemeRoles, getTypographyColorBinding } from '../colors/colorSystem';
import { TypographyScale, Preset } from '../presets/presetSchema';
import { resolveDecorativeStyles } from '../decorations/decorativeLayerEngine';
import { deriveRecordScale } from '../typography/typographyHierarchyEngine';
import { resolveAccentTarget } from '../colors/accentApplicationEngine';
import { resolveRecordLayout } from '../records/recordSpatialLayoutEngine';
import { arrangeRecordFields } from '../records/fieldPlacementEngine';
import { resolveColorForRole } from '../colors/surfaceAwareColorEngine';
import { resolveFieldDesign } from '../records/fieldDesignResolutionEngine';

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

  const parentBgColor = sectorRole === 'sidebar' ? rolesColor.primary : rolesColor.background;
  const cardBgColor = decStyles?.cardContainerStyle.backgroundColor ?? (
    spatialLayout.isBoxed 
      ? (sectorRole === 'sidebar' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.025)')
      : (backgroundColor && backgroundColor !== 'transparent' ? backgroundColor : 'transparent')
  );

  const typographyBinding = getTypographyColorBinding(rolesColor, cardBgColor);

  const resolvedAccent = resolveAccentTarget(
    design.accentTarget,
    design.titleColorRole,
    design.badgeColorRole,
    rolesColor,
    typographyBinding.itemTitle,
    typographyBinding.caption
  );

  const structuredInput = {
    header: title,
    subheader: subtitle || null,
    badges: [
      ...(dateOrBadge ? [{ id: 'periodo', label: 'Período', value: dateOrBadge }] : []),
      ...badges
    ],
    extras: extras.map(e => ({ id: e.id, label: e.label, value: e.value, type: e.type as any })),
    block: description || null,
    hasData: Boolean(title || subtitle || dateOrBadge || badges.length > 0 || extras.length > 0 || description)
  };

  const arranged = arrangeRecordFields(structuredInput, design.layoutTemplate);

  const titleColor = resolveColorForRole('title', 'text', cardBgColor, rolesColor, parentBgColor);
  const subtitleColor = resolveColorForRole('subtitle', 'text', cardBgColor, rolesColor, parentBgColor);
  const badgeColor = resolveColorForRole('badge', 'highlight', cardBgColor, rolesColor, parentBgColor);
  const descColor = resolveColorForRole('description', 'text', cardBgColor, rolesColor, parentBgColor);

  const activePreset: Preset = preset || {
    id: 'default',
    name: 'Default',
    pageCategory: 'documento',
    pageSizeId: 'a4',
    marginPresetId: 'default',
    sectors: [],
    fixedObjects: [],
    sectionOrder: [],
    palette: { primary: '#00A8A0', secondary: '#64748b', accent: '#FF2E63', text: '#0f172a', textOnPrimary: '#ffffff', background: '#ffffff' },
    typography: typography
  };

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
    <View style={styles.cardContainer}>
      <View wrap={false}>
        <View style={styles.headerRow}>
          <Text style={styles.titleText}>{arranged.headerTitle || title}</Text>
          {arranged.sideBadge ? (
            <Text style={styles.badgeText}>{arranged.sideBadge}</Text>
          ) : arranged.inlineRightBadges.length > 0 ? (
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {arranged.inlineRightBadges.map((b) => {
                const spec = resolveFieldDesign(b.id, 'badge', activePreset, rolesColor);
                return (
                  <Text key={b.id} style={[styles.badgeText, { color: spec.colorHex, fontSize: spec.fontSizePt }]}>
                    {b.value}
                  </Text>
                );
              })}
            </View>
          ) : null}
        </View>

        {arranged.headerSubtitle ? <Text style={styles.subtitleText}>{arranged.headerSubtitle}</Text> : null}

        {/* Dynamic Badge Bar */}
        {arranged.inlineBadges.length > 0 && (
          <View style={styles.badgeRow}>
            {arranged.inlineBadges.map((b) => {
              const spec = resolveFieldDesign(b.id, 'badge', activePreset, rolesColor);
              return (
                <Text key={b.id} style={[styles.badgePill, { color: spec.colorHex, fontSize: spec.fontSizePt }]}>
                  {b.label}: {b.value}
                </Text>
              );
            })}
          </View>
        )}

        {/* Extras Rows */}
        {arranged.extrasList.length > 0 && (
          <View style={styles.extraRow}>
            {arranged.extrasList.map((e) => {
              const spec = resolveFieldDesign(e.id, 'extra', activePreset, rolesColor);
              return (
                <Text key={e.id} style={[styles.extraText, { color: spec.colorHex, fontSize: spec.fontSizePt }]}>
                  • {e.label}: {e.value}
                </Text>
              );
            })}
          </View>
        )}
      </View>

      {/* Block Description */}
      {arranged.blockDescription ? <Text style={styles.descText}>{arranged.blockDescription}</Text> : null}
    </View>
  );
}
