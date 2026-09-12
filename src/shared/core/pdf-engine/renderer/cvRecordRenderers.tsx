import React from 'react';
import { View, Text, Image } from '@react-pdf/renderer';
import { ContentRecord, CvRecordKind } from '../layers/records/recordTypes';
import { Preset } from '../layers/presets/presetSchema';
import { ResolvedThemeRoles } from '../layers/colors/colorSystem';
import { getPresentContactFields } from '../layers/records/sharedFields';
import { resolveUnifiedTextSpec } from '../layers/typography/unifiedTextHierarchyEngine';
import { getContainerStyle } from '../../styles/containerStyleEngine';
import { resolveSubtleCardBackground } from '../layers/colors/surfaceAwareColorEngine';
import { buildStructuredRecordLayout } from '../layers/records/recordLayoutEngine';
import { CardObjectRenderer } from '../layers/cards/CardObjectRenderer';

function sanitizeSvgDataUrl(dataUrl?: string): string | undefined {
  if (!dataUrl || typeof dataUrl !== 'string') return dataUrl;
  if (dataUrl.includes('data:image/svg+xml')) {
    try {
      if (dataUrl.includes(';base64,')) {
        const parts = dataUrl.split(';base64,');
        const decoded = typeof window !== 'undefined' && window.atob ? window.atob(parts[1]) : Buffer.from(parts[1], 'base64').toString('utf8');
        const cleaned = decoded.replace(/font-family=['"]?cursive['"]?/gi, 'font-family="Helvetica"');
        const reencoded = typeof window !== 'undefined' && window.btoa ? window.btoa(cleaned) : Buffer.from(cleaned, 'utf8').toString('base64');
        return `${parts[0]};base64,${reencoded}`;
      }
      return dataUrl.replace(/font-family=['"]?cursive['"]?/gi, 'font-family="Helvetica"');
    } catch (_e) {
      return dataUrl;
    }
  }
  return dataUrl;
}

export interface CvRenderContext {
  isSidebarSector: boolean;
  sectorRolesColor: ResolvedThemeRoles;
  sidebarRolesColor: ResolvedThemeRoles;
  mainRolesColor: ResolvedThemeRoles;
  surfaceHex: string;
  preset: Preset;
  styles: any;
  customRecordCardDesigns?: Record<string, string>;
  sidebarContactSpec: any;
}

export type CvRecordRenderFn = (rec: ContentRecord<CvRecordKind>, ctx: CvRenderContext) => React.ReactNode;

const cvCatalogCardRenderer: CvRecordRenderFn = (rec, ctx) => {
  const { isSidebarSector, sectorRolesColor, preset, customRecordCardDesigns } = ctx;
  const f = rec.fields;
  const designId = customRecordCardDesigns?.[rec.kind] || preset.recordCardDesigns?.[rec.kind] || preset.recordCardDesigns?.education || 'accent-card';
  const layout = buildStructuredRecordLayout(f);

  return (
    <CardObjectRenderer
      key={rec.id}
      preset={preset}
      designId={designId}
      title={layout.header || String(f.degree || f.title || f.personaReferencia || '')}
      subtitle={layout.subheader || String(f.institution || f.cargo || f.autor || '')}
      badges={layout.badges}
      extras={layout.extras}
      description={layout.block || undefined}
      rolesColor={sectorRolesColor}
      typography={preset.typography}
      sectorRole={isSidebarSector ? 'sidebar' : 'main'}
    />
  );
};

export const CV_RECORD_RENDERERS: Record<CvRecordKind, CvRecordRenderFn> = {
  'contact-item': (rec, ctx) => {
    const { isSidebarSector, sectorRolesColor, surfaceHex, preset, styles } = ctx;
    const contactSpec = resolveUnifiedTextSpec('body', surfaceHex, sectorRolesColor, preset.typography, isSidebarSector ? 'sidebar-contact' : 'main-body');
    return (
      <View key={rec.id} wrap={false}>
        {getPresentContactFields(rec, 'document').map((f) => (
          <Text key={f.key} style={[styles.sidebarItemText, { color: contactSpec.colorHex, opacity: contactSpec.opacity }]}>
            {f.cvLabel}{' '}
            {f.cardOmit ? <Text style={styles.sidebarItemBold}>{f.value}</Text> : f.value}
          </Text>
        ))}
      </View>
    );
  },

  'quote-text': (rec, ctx) => {
    const { isSidebarSector, sectorRolesColor, surfaceHex, preset, customRecordCardDesigns } = ctx;
    const f = rec.fields;
    const designId = customRecordCardDesigns?.resumen || preset.recordCardDesigns?.resumen || 'accent-outline';
    const containerStyle = getContainerStyle(designId);
    const quoteSpec = resolveUnifiedTextSpec('subtitle', surfaceHex, sectorRolesColor, preset.typography, 'quote-text');
    const cardBg = containerStyle.hasBackground ? resolveSubtleCardBackground(isSidebarSector ? 'sidebar' : 'main', sectorRolesColor) : 'transparent';
    const borderColor = containerStyle.borderColorRole === 'accent'
      ? sectorRolesColor.accent
      : containerStyle.borderColorRole === 'primary'
        ? sectorRolesColor.primary
        : containerStyle.borderColorRole === 'border'
          ? sectorRolesColor.border
          : 'transparent';

    return (
      <View
        key={rec.id}
        wrap={false}
        style={{
          backgroundColor: cardBg,
          borderLeftWidth: containerStyle.borderWidthPt > 0 ? Math.max(3, containerStyle.borderWidthPt) : 0,
          borderLeftColor: borderColor,
          paddingVertical: 8,
          paddingHorizontal: 12,
          borderRadius: 4,
          marginBottom: 10,
          marginTop: 4
        }}
      >
        <Text
          style={{
            fontSize: quoteSpec.fontSizePt,
            fontFamily: quoteSpec.fontFamily,
            fontStyle: 'italic',
            color: quoteSpec.colorHex,
            opacity: quoteSpec.opacity,
            lineHeight: 1.35
          }}
        >
          {String(f.text || '')}
        </Text>
      </View>
    );
  },

  'skill': (rec, ctx) => {
    const { sectorRolesColor, surfaceHex, preset, styles } = ctx;
    const f = rec.fields;
    const itemSpec = resolveUnifiedTextSpec('body', surfaceHex, sectorRolesColor, preset.typography, 'skill');
    return (
      <Text
        key={rec.id}
        style={[
          styles.sidebarItemText,
          {
            color: itemSpec.colorHex,
            opacity: itemSpec.opacity,
            fontSize: itemSpec.fontSizePt,
            fontFamily: itemSpec.fontFamily
          }
        ]}
      >
        • {String(f.name || '')}
      </Text>
    );
  },

  'languages': (rec, ctx) => {
    const { sectorRolesColor, surfaceHex, preset, styles } = ctx;
    const f = rec.fields;
    const itemSpec = resolveUnifiedTextSpec('body', surfaceHex, sectorRolesColor, preset.typography, 'skill');
    const label = `${f.idioma || f.name || ''}${f.nivel ? ` (${f.nivel})` : ''}`;
    return (
      <Text
        key={rec.id}
        style={[
          styles.sidebarItemText,
          {
            color: itemSpec.colorHex,
            opacity: itemSpec.opacity,
            fontSize: itemSpec.fontSizePt,
            fontFamily: itemSpec.fontFamily
          }
        ]}
      >
        • {label}
      </Text>
    );
  },

  'education': cvCatalogCardRenderer,
  'projects': cvCatalogCardRenderer,
  'publications': cvCatalogCardRenderer,
  'references': cvCatalogCardRenderer,

  'experience': (rec, ctx) => {
    const { isSidebarSector, sectorRolesColor, preset, customRecordCardDesigns } = ctx;
    const f = rec.fields;
    const designId = customRecordCardDesigns?.experience || preset.recordCardDesigns?.experience || 'primary-card';
    const layout = buildStructuredRecordLayout(f);

    return (
      <CardObjectRenderer
        key={rec.id}
        preset={preset}
        designId={designId}
        title={layout.header || String(f.role || '')}
        subtitle={layout.subheader || String(f.institution || '')}
        badges={layout.badges}
        extras={layout.extras}
        description={layout.block || (f.details ? String(f.details) : undefined)}
        rolesColor={sectorRolesColor}
        typography={preset.typography}
        sectorRole={isSidebarSector ? 'sidebar' : 'main'}
      />
    );
  },

  'course': (rec, ctx) => {
    const { isSidebarSector, sectorRolesColor, surfaceHex, preset, styles, customRecordCardDesigns, sidebarContactSpec } = ctx;
    const f = rec.fields;
    const layout = buildStructuredRecordLayout(f);

    if (isSidebarSector || rec.targetSectorRole === 'sidebar') {
      const titleSpec = resolveUnifiedTextSpec('subtitle', surfaceHex, sectorRolesColor, preset.typography, 'course-title');
      const subSpec = resolveUnifiedTextSpec('meta', surfaceHex, sectorRolesColor, preset.typography, 'course-institution');

      return (
        <View key={rec.id} style={{ marginBottom: 6 }} wrap={false}>
          <Text style={[styles.sidebarItemText, styles.sidebarItemBold, { color: titleSpec.colorHex, opacity: titleSpec.opacity }]}>
            {layout.header || String(f.title || f.name || '')}
          </Text>
          {layout.subheader ? (
            <Text style={[styles.sidebarItemText, { color: subSpec.colorHex, opacity: subSpec.opacity }]}>
              {layout.subheader}
            </Text>
          ) : null}
          {layout.badges.length > 0 ? (
            <Text style={[styles.sidebarItemText, { fontSize: (sidebarContactSpec.fontSizePt || 9) - 1, opacity: 0.75 }]}>
              {layout.badges.map(b => b.value).join(' · ')}
            </Text>
          ) : null}
          {layout.block ? (
            <Text style={[styles.sidebarItemText, { fontSize: (sidebarContactSpec.fontSizePt || 9) - 1, opacity: 0.85 }]}>
              {typeof layout.block === 'string' ? layout.block : layout.block.join(' · ')}
            </Text>
          ) : null}
        </View>
      );
    }
    const designId = customRecordCardDesigns?.course || preset.recordCardDesigns?.course || 'neutral-card';
    return (
      <CardObjectRenderer
        key={rec.id}
        preset={preset}
        designId={designId}
        title={layout.header || String(f.title || f.name || '')}
        subtitle={layout.subheader || String(f.institution || '')}
        badges={layout.badges}
        extras={layout.extras}
        description={layout.block || undefined}
        rolesColor={sectorRolesColor}
        typography={preset.typography}
        sectorRole="main"
      />
    );
  },

  'social-link': (rec, ctx) => {
    const { sectorRolesColor, surfaceHex, preset, styles } = ctx;
    const f = rec.fields;
    const linkSpec = resolveUnifiedTextSpec('body', surfaceHex, sectorRolesColor, preset.typography, 'social-link');
    return (
      <View key={rec.id} style={{ marginBottom: 4 }} wrap={false}>
        <Text style={[styles.sidebarItemText, { color: linkSpec.colorHex, opacity: linkSpec.opacity }]}>
          {String(f.icon || '🔗')} {String(f.label || '')}
        </Text>
        {f.url ? (
          <Text style={[styles.sidebarItemText, { fontSize: (linkSpec.fontSizePt || 9) - 1, opacity: 0.75 }]}>
            {String(f.url)}
          </Text>
        ) : null}
      </View>
    );
  },

  'qr': (rec, ctx) => {
    const { sectorRolesColor, surfaceHex, preset, styles } = ctx;
    const f = rec.fields;
    const captionSpec = resolveUnifiedTextSpec('meta', surfaceHex, sectorRolesColor, preset.typography, 'qr-caption');
    return (
      <View key={rec.id} wrap={false} style={{ alignItems: 'center', marginVertical: 8 }}>
        {f.dataUrl || f.url ? (
          <Image src={String(f.dataUrl || f.url)} style={{ width: 64, height: 64, borderRadius: 4 }} />
        ) : null}
        {f.caption && <Text style={[styles.sidebarItemText, { color: captionSpec.colorHex, opacity: captionSpec.opacity }]}>{String(f.caption)}</Text>}
      </View>
    );
  },

  'freeform': (rec, ctx) => {
    const { styles } = ctx;
    const f = rec.fields;
    return (
      <View key={rec.id} wrap={false} style={styles.signatureContainer}>
        <View style={styles.signatureBox}>
          {f.dataUrl ? (
            <Image src={sanitizeSvgDataUrl(String(f.dataUrl))!} style={styles.signatureImage} />
          ) : (
            <View style={styles.signatureLine} />
          )}
          <Text style={styles.signerName}>{String(f.signerName || '')}</Text>
          {f.signerRole ? <Text style={styles.signerRole}>{String(f.signerRole)}</Text> : null}
          {f.date ? (
            <Text style={styles.signerDate}>
              {String(f.date).includes('-') ? String(f.date).split('-').reverse().join('/') : String(f.date)}
            </Text>
          ) : null}
        </View>
      </View>
    );
  },

  'custom': (rec, ctx) => {
    const { preset, customRecordCardDesigns } = ctx;
    const f = rec.fields;
    const layout = buildStructuredRecordLayout(f);

    return (
      <CardObjectRenderer
        key={rec.id}
        preset={preset}
        designId={customRecordCardDesigns?.education || preset.recordCardDesigns?.education || 'accent-card'}
        title={layout.header || ''}
        subtitle={layout.subheader || undefined}
        badges={layout.badges}
        extras={layout.extras}
        description={layout.block || undefined}
        rolesColor={ctx.sectorRolesColor}
        typography={preset.typography}
        sectorRole={ctx.isSidebarSector ? 'sidebar' : 'main'}
      />
    );
  }
};
