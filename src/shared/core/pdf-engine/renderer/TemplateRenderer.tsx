import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { Preset } from '../layers/presets/presetSchema';
import { getPageSize, PageSize } from '../layers/page/pageSizes';
import { MARGIN_PRESETS, resolveMargins } from '../layers/margins/marginPresets';
import { resolveSectors } from '../layers/sectors/resolveSectors';
import { placeFixedObjects } from '../layers/fixedObjects/placeFixedObjects';
import { ContentSection, ContentRecord } from '../layers/records/recordTypes';
import { getPresentContactFields } from '../layers/records/sharedFields';
import { resolveThemeRoles, getTypographyColorBinding, ResolvedThemeRoles } from '../layers/colors/colorSystem';
import { resolvePageTextStyle, buildPageTextTemplate } from '../layers/pageText/pageTextObjects';
import { CardObjectRenderer } from '../layers/cards/CardObjectRenderer';
import { SectionBannerCard } from '../layers/cards/SectionBannerCard';
import { buildStructuredRecordLayout } from '../layers/records/recordLayoutEngine';
import { processPageOverflow } from '../layers/overflow/pageOverflowEngine';
import { OrnamentRenderer } from './OrnamentRenderer';
import { DecorativeBackgroundRenderer } from './DecorativeBackgroundRenderer';
import { resolveDecorativeStyles } from '../layers/decorations/decorativeLayerEngine';
import { flattenPresetForATS } from '../layers/ats/atsFlatteningEngine';
import { createSubColumnGrid } from '../layers/subColumns/resolveSubColumns';
import { resolveUnifiedTextSpec } from '../layers/typography/unifiedTextHierarchyEngine';
import { resolveSubtleCardBackground } from '../layers/colors/surfaceAwareColorEngine';
import { initPdfFonts, sanitizeFontFamily } from '../layers/typography/pdfFontRegistry';
import { resolveEffectivePresetSectionOrder, CvLayoutOverrides } from '../layers/sectors/layoutResolutionEngine';

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


export interface TemplateRendererProps {
  preset: Preset;
  atsMode?: boolean;
  sections: ContentSection[];
  personalInfo?: any;
  certificatesScanned?: any[];
  showCoverPage?: boolean;
  coverFeaturedEducationId?: string;
  coverFeaturedProfessionId?: string;
  roles?: any[];
  education?: any[];
  professions?: any[];
  userFontFamily?: string;
  layoutOverrides?: CvLayoutOverrides;
  customRecordCardDesigns?: {
    education?: string;
    experience?: string;
    course?: string;
  };
  /**
   * Modo embebido: devuelve solo el contenido (sin Document/Page propios,
   * sin portada, sin páginas de certificados) para insertarlo dentro de un
   * slot de otra hoja ya armada — el caso de una tarjeta dentro de un A4.
   */
  embedded?: boolean;
  /** En modo embedded, el tamaño real viene del OBJETO (ej. la tarjeta en
   * mm), no de una hoja física — por eso se pasa explícito acá en vez de
   * resolverse de preset.pageSizeId. */
  canvasWidthMm?: number;
  canvasHeightMm?: number;
}

const MM_TO_PT_LOCAL = 2.8346;

export const TemplateRenderer: React.FC<TemplateRendererProps> = ({
  preset: basePreset,
  atsMode = false,
  sections,
  personalInfo = {},
  certificatesScanned = [],
  showCoverPage = false,
  coverFeaturedEducationId,
  coverFeaturedProfessionId,
  roles = [],
  education = [],
  professions = [],
  userFontFamily,
  layoutOverrides,
  embedded = false,
  canvasWidthMm,
  canvasHeightMm,
  customRecordCardDesigns
}) => {
  const rawFontFamily = userFontFamily || personalInfo?.fontFamily || basePreset.typography.fontFamily;
  const activeFontFamily = sanitizeFontFamily(rawFontFamily);
  const rawPreset = atsMode ? flattenPresetForATS(basePreset) : basePreset;
  const preset = {
    ...rawPreset,
    typography: {
      ...rawPreset.typography,
      fontFamily: activeFontFamily
    }
  };
  
  const surfaceModes = preset.sectorSurfaceMode || { sidebar: 'dark', main: 'light' };
  const sidebarPalette = preset.surfacePalettes 
    ? (surfaceModes.sidebar === 'dark' ? preset.surfacePalettes.dark : preset.surfacePalettes.light)
    : preset.palette;
  const mainPalette = preset.surfacePalettes 
    ? (surfaceModes.main === 'light' ? preset.surfacePalettes.light : preset.surfacePalettes.dark)
    : preset.palette;

  const sidebarRolesColor = resolveThemeRoles(sidebarPalette);
  const mainRolesColor = resolveThemeRoles(mainPalette);
  const rolesColor = mainRolesColor;

  const sidebarType = getTypographyColorBinding(sidebarRolesColor, sidebarRolesColor.primary);
  const mainType = getTypographyColorBinding(mainRolesColor, mainRolesColor.background);

  // En modo embedded el "lienzo" es el objeto (ej. la tarjeta), no una hoja
  // física — nunca se consulta getPageSize() para ese caso.
  const pageDef: PageSize = embedded && canvasWidthMm && canvasHeightMm
    ? {
        id: 'embedded',
        name: 'Embedded Canvas',
        label: 'Embedded Canvas',
        category: 'tarjeta',
        widthMm: canvasWidthMm,
        heightMm: canvasHeightMm,
        widthPt: canvasWidthMm * MM_TO_PT_LOCAL,
        heightPt: canvasHeightMm * MM_TO_PT_LOCAL,
      }
    : getPageSize(preset.pageSizeId);
  const marginDef = MARGIN_PRESETS[preset.marginPresetId] || MARGIN_PRESETS.documento_estandar;
  const usable = resolveMargins(pageDef, marginDef); // Capa 3: solo para saber CUÁNTO margen aplicar al contenido
  const resolvedSectors = resolveSectors({ widthPt: pageDef.widthPt, heightPt: pageDef.heightPt }, preset.sectors); // Capa 2: geometría sobre la hoja FÍSICA completa, sin margen
  const sectorsWithFlow = placeFixedObjects(resolvedSectors, preset.fixedObjects);
  const pdfPaperSize = preset.pageSizeId === 'carta' ? 'LETTER' : preset.pageSizeId === 'legal' ? 'LEGAL' : 'A4';

  const sidebarCardBg = resolveSubtleCardBackground('sidebar', sidebarRolesColor);
  const mainCardBg = resolveSubtleCardBackground('main', mainRolesColor);

  const headerNameSpec = resolveUnifiedTextSpec('title', mainRolesColor.background, mainRolesColor, preset.typography, 'header-name');
  const sidebarContactSpec = resolveUnifiedTextSpec('body', sidebarRolesColor.primary, sidebarRolesColor, preset.typography, 'sidebar-contact');
  const signerNameSpec = resolveUnifiedTextSpec('title', mainRolesColor.background, mainRolesColor, preset.typography, 'signer-name');
  const signerRoleSpec = resolveUnifiedTextSpec('subtitle', mainRolesColor.background, mainRolesColor, preset.typography, 'signer-role');
  const signerDateSpec = resolveUnifiedTextSpec('meta', mainRolesColor.background, mainRolesColor, preset.typography, 'signer-date');
  const certTitleSpec = resolveUnifiedTextSpec('title', '#ffffff', mainRolesColor, preset.typography, 'cert-title');

  const styles = StyleSheet.create({
    page: {
      flexDirection: 'column',
      backgroundColor: rolesColor.background,
      fontFamily: preset.typography.fontFamily,
      fontSize: preset.typography.body,
      color: rolesColor.text
    },
    pageBody: {
      flexDirection: 'row',
      flex: 1
    },
    // CAPA "SUPERFICIE" — solo pintan. Nunca tienen padding, nunca saben de
    // márgenes. Su único trabajo es rellenar exactamente la caja del sector
    // (ver sector.box, Capa 2), llegue o no al borde físico.
    leftColumnSurface: {
      backgroundColor: rolesColor.primary,
      flexDirection: 'column',
      minHeight: '100%'
    },
    rightColumnSurface: {
      flex: 1,
      backgroundColor: rolesColor.background,
      flexDirection: 'column',
      minHeight: '100%'
    },
    // CAPA "CONTENIDO" — solo manejan margen/padding. Nunca tienen
    // backgroundColor, por eso un cambio de margen JAMÁS puede volver a
    // cortar el color: son dos nodos distintos del árbol, no el mismo.
    leftColumnContent: {
      paddingLeft: usable.margins.leftPt || 14,
      paddingRight: usable.margins.leftPt || 14,
      paddingTop: usable.margins.topPt || 14,
      paddingBottom: usable.margins.bottomPt || 14,
      flex: 1
    },
    rightColumnContent: {
      paddingLeft: usable.margins.rightPt || 14,
      paddingRight: usable.margins.rightPt || 14,
      paddingTop: usable.margins.topPt || 14,
      paddingBottom: usable.margins.bottomPt || 14,
      flex: 1
    },
    sidebarHeader: {
      alignItems: 'center',
      marginBottom: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255, 255, 255, 0.3)'
    },
    profilePhoto: {
      width: 90,
      height: 110,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: rolesColor.accent,
      objectFit: 'cover',
      marginBottom: 8
    },
    profilePhotoPlaceholder: {
      width: 90,
      height: 110,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: rolesColor.accent,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8
    },
    sidebarItemText: {
      fontSize: sidebarContactSpec.fontSizePt,
      fontFamily: sidebarContactSpec.fontFamily,
      marginBottom: 3,
      lineHeight: 1.3,
      color: sidebarContactSpec.colorHex,
      opacity: sidebarContactSpec.opacity
    },
    sidebarItemBold: {
      fontFamily: 'Helvetica-Bold'
    },
    headerName: {
      fontSize: Math.max(20, (headerNameSpec.fontSizePt || 16) + 4),
      fontFamily: headerNameSpec.fontFamily,
      textTransform: 'uppercase',
      color: headerNameSpec.colorHex,
      opacity: headerNameSpec.opacity,
      fontWeight: headerNameSpec.fontWeight,
      marginBottom: 4,
      paddingBottom: 6,
      borderBottomWidth: 1,
      borderBottomColor: mainType.border
    },
    headerNameHighlight: {
      color: mainType.accentRule
    },
    signatureContainer: {
      marginTop: 20,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: mainRolesColor.border,
      alignItems: 'flex-end'
    },
    signatureBox: {
      width: 180,
      textAlign: 'center'
    },
    signatureImage: {
      height: 40,
      objectFit: 'contain',
      marginBottom: 4
    },
    signatureLine: {
      borderBottomWidth: 1,
      borderBottomColor: mainRolesColor.border,
      height: 30,
      marginBottom: 4
    },
    signerName: {
      fontSize: signerNameSpec.fontSizePt,
      fontFamily: signerNameSpec.fontFamily,
      color: signerNameSpec.colorHex,
      opacity: signerNameSpec.opacity,
      fontWeight: signerNameSpec.fontWeight
    },
    signerRole: {
      fontSize: signerRoleSpec.fontSizePt,
      fontFamily: signerRoleSpec.fontFamily,
      color: signerRoleSpec.colorHex,
      opacity: signerRoleSpec.opacity,
      fontWeight: signerRoleSpec.fontWeight
    },
    signerDate: {
      fontSize: signerDateSpec.fontSizePt,
      fontFamily: signerDateSpec.fontFamily,
      fontStyle: 'italic',
      color: signerDateSpec.colorHex,
      opacity: signerDateSpec.opacity,
      marginTop: 2
    },
    certPage: {
      backgroundColor: '#ffffff',
      padding: 24,
      alignItems: 'center',
      justifyContent: 'center'
    },
    certTitle: {
      fontSize: certTitleSpec.fontSizePt,
      fontFamily: certTitleSpec.fontFamily,
      color: certTitleSpec.colorHex,
      opacity: certTitleSpec.opacity,
      fontWeight: certTitleSpec.fontWeight,
      marginBottom: 12
    },
    certImage: {
      maxWidth: '100%',
      maxHeight: '80%',
      objectFit: 'contain',
      borderRadius: 4
    },
    coverPage: {
      flexDirection: 'column',
      backgroundColor: rolesColor.primary,
      color: '#ffffff',
      padding: 32,
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    coverHeaderBlock: {
      alignItems: 'center',
      marginTop: 20
    },
    coverPhoto: {
      width: 130,
      height: 165,
      borderRadius: 12,
      borderWidth: 3,
      borderColor: rolesColor.accent,
      marginBottom: 14,
      objectFit: 'cover'
    },
    coverPhotoPlaceholder: {
      width: 130,
      height: 165,
      borderRadius: 12,
      borderWidth: 3,
      borderColor: rolesColor.accent,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14
    },
    coverBadgeContainer: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
      marginBottom: 8
    },
    coverBadgeText: {
      fontSize: preset.typography.cover?.badge || preset.typography.caption,
      fontFamily: 'Helvetica-Bold',
      letterSpacing: 1.5,
      color: '#ffffff'
    },
    coverTitle: {
      fontSize: preset.typography.cover?.title || 12,
      fontFamily: 'Helvetica-Bold',
      color: '#ffffff',
      opacity: 0.85,
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: 2
    },
    coverName: {
      fontSize: preset.typography.cover?.name || 28,
      fontFamily: 'Helvetica-Bold',
      color: '#ffffff',
      opacity: 1.0,
      marginBottom: 12,
      textAlign: 'center'
    },
    coverRolesRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 6,
      marginBottom: 14,
      maxWidth: 400
    },
    coverRoleBadge: {
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.3)'
    },
    coverRoleText: {
      fontSize: preset.typography.cover?.role || preset.typography.caption,
      fontFamily: 'Helvetica-Bold',
      color: '#ffffff'
    },
    coverQuoteBox: {
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      padding: 10,
      borderRadius: 8,
      maxWidth: 400,
      marginTop: 8
    },
    coverQuoteText: {
      fontSize: preset.typography.cover?.quote || preset.typography.body,
      fontStyle: 'italic',
      color: '#ffffff',
      textAlign: 'center',
      lineHeight: preset.typography.lineHeightBody || 1.3
    },
    coverFooterBar: {
      width: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)'
    },
    coverFooterSub: {
      fontSize: preset.typography.cover?.footerSub || preset.typography.caption,
      fontFamily: 'Helvetica-Bold',
      color: '#e2e8f0'
    },
    coverFooterMain: {
      fontSize: preset.typography.cover?.footerMain || preset.typography.body,
      fontFamily: 'Helvetica-Bold',
      color: '#ffffff'
    },
    coverFooterBadge: {
      fontSize: preset.typography.cover?.footerSub || preset.typography.caption,
      fontFamily: 'Helvetica-Bold',
      color: rolesColor.accent
    }
  });

  const featuredBadges: string[] = [];
  if (education && coverFeaturedEducationId) {
    const found = education.find((e: any, idx: number) => String(e.id || idx) === String(coverFeaturedEducationId));
    if (found?.degree) featuredBadges.push(found.degree);
  }
  if (professions && coverFeaturedProfessionId) {
    const found = professions.find((p: any, idx: number) => String(p.id || idx) === String(coverFeaturedProfessionId));
    if (found?.degree) featuredBadges.push(found.degree);
  }
  if (featuredBadges.length === 0 && Array.isArray(roles) && roles.length > 0) {
    roles.forEach(r => { if (r) featuredBadges.push(r); });
  }
  if (featuredBadges.length === 0 && personalInfo?.titlePrefix) {
    featuredBadges.push(personalInfo.titlePrefix);
  }

  const renderRecord = (
    rec: ContentRecord, 
    isSidebarSector: boolean = false, 
    sectorRolesColor: ResolvedThemeRoles = mainRolesColor
  ) => {
    const f = rec.fields;

    if (rec.kind === 'contact-item') {
      const surfaceHex = isSidebarSector ? sidebarRolesColor.primary : mainRolesColor.background;
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
    }

    if (rec.kind === 'quote-text') {
      const surfaceHex = isSidebarSector ? sidebarRolesColor.primary : mainRolesColor.background;
      const quoteSpec = resolveUnifiedTextSpec('body', surfaceHex, sectorRolesColor, preset.typography, 'quote-text');
      return (
        <Text key={rec.id} style={{ fontSize: quoteSpec.fontSizePt, fontFamily: quoteSpec.fontFamily, fontStyle: 'italic', color: quoteSpec.colorHex, opacity: quoteSpec.opacity, marginBottom: 8, lineHeight: 1.4 }}>
          "{String(f.text || '')}"
        </Text>
      );
    }

    if (rec.kind === 'skill') {
      return (
        <Text key={rec.id} style={styles.sidebarItemText}>• {String(f.name || '')}</Text>
      );
    }

    if (rec.kind === 'education') {
      const designId = customRecordCardDesigns?.education || preset.recordCardDesigns?.education || 'accent-card';
      const layout = buildStructuredRecordLayout(f);

      return (
        <CardObjectRenderer
          key={rec.id}
          preset={preset}
          designId={designId}
          title={layout.header || String(f.degree || '')}
          subtitle={layout.subheader || String(f.institution || '')}
          badges={layout.badges}
          extras={layout.extras}
          description={layout.block || undefined}
          rolesColor={sectorRolesColor}
          typography={preset.typography}
          sectorRole={isSidebarSector ? 'sidebar' : 'main'}
        />
      );
    }

    if (rec.kind === 'experience') {
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
    }

    if (rec.kind === 'course') {
      const layout = buildStructuredRecordLayout(f);

      if (isSidebarSector || rec.targetSectorRole === 'sidebar') {
        return (
          <View key={rec.id} style={{ marginBottom: 6 }} wrap={false}>
            <Text style={[styles.sidebarItemText, styles.sidebarItemBold]}>
              {layout.header || String(f.title || f.name || '')}
            </Text>
            {layout.subheader ? (
              <Text style={[styles.sidebarItemText, { color: 'rgba(255, 255, 255, 0.85)' }]}>
                {layout.subheader}
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
    }

    if (rec.kind === 'social-link') {
      return (
        <Text key={rec.id} style={styles.sidebarItemText}>
          {String(f.icon || '🔗')} {String(f.label || f.url || '')}
        </Text>
      );
    }

    if (rec.kind === 'qr') {
      return (
        <View key={rec.id} wrap={false} style={{ alignItems: 'center', marginVertical: 8 }}>
          {f.dataUrl || f.url ? (
            <Image src={String(f.dataUrl || f.url)} style={{ width: 64, height: 64, borderRadius: 4 }} />
          ) : null}
          {f.caption && <Text style={styles.sidebarItemText}>{String(f.caption)}</Text>}
        </View>
      );
    }

    if (rec.kind === 'freeform') {
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
    }

    if (rec.kind === 'custom') {
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
          rolesColor={sectorRolesColor}
          typography={preset.typography}
          sectorRole={isSidebarSector ? 'sidebar' : 'main'}
        />
      );
    }

    return null;
  };

  const effectiveSectionOrder = resolveEffectivePresetSectionOrder(preset, layoutOverrides);
  const overflowResult = processPageOverflow(preset, sections);
  const decStyles = resolveDecorativeStyles(preset);

  const buildDocumentBody = (pageSections: ContentSection[], isFirstPage: boolean) => (
    <View style={embedded ? [styles.pageBody, { width: pageDef.widthPt, height: pageDef.heightPt }] : styles.pageBody}>
      <DecorativeBackgroundRenderer
        backgroundShapeEnabled={decStyles.backgroundShapeEnabled}
        watermark={decStyles.watermark}
        color={rolesColor.accent}
      />
      {sectorsWithFlow.map((sFlow) => {
        const isSidebar = sFlow.sector.role === 'sidebar';
        const sectorRolesColor = isSidebar ? sidebarRolesColor : mainRolesColor;
        const surfaceStyle = isSidebar ? [styles.leftColumnSurface, { backgroundColor: sectorRolesColor.primary }] : [styles.rightColumnSurface, { backgroundColor: sectorRolesColor.background }];
        const contentStyle = isSidebar ? styles.leftColumnContent : styles.rightColumnContent;
        const widthStyle = isSidebar ? { width: sFlow.sector.box.widthPt } : {};

        const sectorSectionIds = effectiveSectionOrder.find(s => s.sectorRole === sFlow.sector.role)?.sectionIds || [];
        const allDefinedSectorIds = effectiveSectionOrder.flatMap(s => s.sectionIds || []);

        const sectorSections = pageSections.filter(sec => {
          const baseId = sec.id.replace(/-cont$/, '');
          const isExplicitlyAssigned = sectorSectionIds.includes(baseId) || sectorSectionIds.includes(sec.id);
          if (isExplicitlyAssigned) return true;

          const isAssignedToOtherSector = allDefinedSectorIds.includes(baseId) || allDefinedSectorIds.includes(sec.id);
          if (!isAssignedToOtherSector && sFlow.sector.role === 'main') {
            return true;
          }
          return false;
        });

        return (
          <View key={sFlow.sector.id} style={[surfaceStyle, widthStyle, { position: 'relative' }] as any}>
            <OrnamentRenderer ornamentKind={decStyles.cornerOrnament} color={sectorRolesColor.accent} />
            <View style={contentStyle}>
              {/* SPACER FIJO DE MARGEN SUPERIOR PARA EVITAR EL BUG DE PAGINACIÓN DE REACT-PDF (#430/#733) */}
              <View fixed style={{ height: usable.margins.topPt || 14 }} />
              {isSidebar && isFirstPage && (
                <View style={styles.sidebarHeader}>
                  {personalInfo?.profilePhoto ? (
                    <Image src={personalInfo.profilePhoto} style={styles.profilePhoto} />
                  ) : (
                    <View style={styles.profilePhotoPlaceholder}>
                      <Text style={{ fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#ffffff' }}>
                        {`${(personalInfo?.givenNames || 'C')[0]}${(personalInfo?.surname || 'V')[0]}`}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {!isSidebar && isFirstPage && (
                <Text style={styles.headerName}>
                  {personalInfo.surname || ''} <Text style={styles.headerNameHighlight}>{personalInfo.givenNames || ''}</Text>
                </Text>
              )}

              {sectorSections.map((sec) => {
                const isFirma = sec.id === 'firma' || sec.id.startsWith('firma');
                const sectionStyle = isFirma ? { marginTop: 16 } : undefined;

                if (isSidebar) {
                  // Sidebar: la sección completa es un bloque atómico (wrap={false})
                  return (
                    <View key={sec.id} break={sec.breakBefore || false} wrap={false} style={sectionStyle as any}>
                      {sec.titleText && !isFirma && (
                        <SectionBannerCard
                          preset={preset}
                          titleText={sec.titleText}
                          iconId={sec.id}
                          designId={undefined}
                          rolesColor={sectorRolesColor}
                          typography={preset.typography}
                          isSidebar={isSidebar}
                        />
                      )}
                      {sec.records.map(rec => renderRecord(rec, isSidebar, sectorRolesColor))}
                    </View>
                  );
                }

                // Main Sector: Banner + primer registro son atómicos para evitar título huérfano
                return (
                  <View key={sec.id} break={sec.breakBefore || false} style={sectionStyle as any}>
                    {sec.records.length > 0 ? (
                      <>
                        <View wrap={false}>
                          {sec.titleText && !isFirma && (
                            <SectionBannerCard
                              preset={preset}
                              titleText={sec.titleText}
                              iconId={sec.id}
                              designId={customRecordCardDesigns?.education || preset.recordCardDesigns?.education}
                              rolesColor={sectorRolesColor}
                              typography={preset.typography}
                              isSidebar={isSidebar}
                            />
                          )}
                          {renderRecord(sec.records[0], isSidebar, sectorRolesColor)}
                        </View>
                        {sec.records.slice(1).map(rec => (
                          <View key={rec.id || `rec-${Math.random()}`} wrap={false}>
                            {renderRecord(rec, isSidebar, sectorRolesColor)}
                          </View>
                        ))}
                      </>
                    ) : (
                      sec.titleText && !isFirma && (
                        <View wrap={false}>
                          <SectionBannerCard
                            preset={preset}
                            titleText={sec.titleText}
                            iconId={sec.id}
                            designId={customRecordCardDesigns?.education || preset.recordCardDesigns?.education}
                            rolesColor={sectorRolesColor}
                            typography={preset.typography}
                            isSidebar={isSidebar}
                          />
                        </View>
                      )
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );

  // MODO EMBEBIDO: se devuelve solo el contenido, sin Document/Page propios
  if (embedded) {
    return buildDocumentBody(sections, true);
  }

  return (
    <Document title={preset.name}>
      {/* LAYER 0-4: COVER PAGE (PAGE 1) */}
      {showCoverPage && (
        <Page size={pdfPaperSize} style={styles.coverPage}>
          <View style={styles.coverHeaderBlock}>
            {personalInfo?.profilePhoto ? (
              <Image src={personalInfo.profilePhoto} style={styles.coverPhoto} />
            ) : (
              <View style={styles.coverPhotoPlaceholder}>
                <Text style={{ fontSize: 24, fontFamily: 'Helvetica-Bold', color: '#ffffff' }}>
                  {`${(personalInfo?.givenNames || 'C')[0]}${(personalInfo?.surname || 'V')[0]}`}
                </Text>
              </View>
            )}

            <View style={styles.coverBadgeContainer}>
              <Text style={styles.coverBadgeText}>PORTAFOLIO PROFESIONAL</Text>
            </View>

            <Text style={styles.coverTitle}>CURRICULUM VITAE</Text>
            <Text style={styles.coverName}>
              {personalInfo.fullName || `${personalInfo.surname || ''} ${personalInfo.givenNames || ''}`.trim() || 'Postulante'}
            </Text>

            {featuredBadges.length > 0 && (
              <View style={styles.coverRolesRow}>
                {featuredBadges.map((badge, idx) => (
                  <View key={idx} style={styles.coverRoleBadge}>
                    <Text style={styles.coverRoleText}>{badge}</Text>
                  </View>
                ))}
              </View>
            )}

            {personalInfo.quote && (
              <View style={styles.coverQuoteBox}>
                <Text style={styles.coverQuoteText}>"{personalInfo.quote}"</Text>
              </View>
            )}
          </View>

          <View style={styles.coverFooterBar}>
            <View>
              <Text style={styles.coverFooterSub}>DNI: {personalInfo.dni || '---'} | CUIT: {personalInfo.cuit || '---'}</Text>
              <Text style={styles.coverFooterMain}>{personalInfo.cityProvince || 'Salta, Argentina'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.coverFooterSub}>LEECV | AÑO {new Date().getFullYear()}</Text>
              <Text style={styles.coverFooterBadge}>DOCUMENTO OFICIAL</Text>
            </View>
          </View>
        </Page>
      )}

      {/* LAYER 0-4: MAIN CV CONTENT PAGES CON FLUJO NATIVO REACT-PDF */}
      <Page size={pdfPaperSize} style={styles.page}>
        {buildDocumentBody(sections, true)}
        {preset.pageTextObjects && preset.pageTextObjects.map(def => (
          <Text
            key={def.id}
            fixed
            style={resolvePageTextStyle(def) as any}
            render={({ pageNumber, totalPages }) => buildPageTextTemplate(def.template, pageNumber, totalPages)}
          />
        ))}
      </Page>

      {/* LAYER 4: SCANNED CERTIFICATE PAGES */}
      {certificatesScanned && certificatesScanned.map((cert: any, index: number) => (
        <Page key={`cert-${index}`} size={pdfPaperSize} style={styles.certPage}>
          <Text style={styles.certTitle}>CERTIFICADO ADJUNTO #{index + 1}: {cert.title || cert.name || 'Certificación'}</Text>
          {cert.dataUrl || cert.url ? (
            <Image src={cert.dataUrl || cert.url} style={styles.certImage} />
          ) : (
            <Text style={{ color: '#94a3b8' }}>[ Imagen de Certificado no disponible ]</Text>
          )}
        </Page>
      ))}
    </Document>
  );
};
