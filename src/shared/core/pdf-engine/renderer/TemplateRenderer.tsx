import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { Preset } from '../layers/presets/presetSchema';
import { getPageSize, PageSize } from '../layers/page/pageSizes';
import { MARGIN_PRESETS, resolveMargins } from '../layers/margins/marginPresets';
import { resolveSectors } from '../layers/sectors/resolveSectors';
import { placeFixedObjects } from '../layers/fixedObjects/placeFixedObjects';
import { ContentSection, ContentRecord } from '../layers/records/recordTypes';
import { getPresentContactFields } from '../layers/records/sharedFields';
import { resolveThemeRoles } from '../layers/colors/colorSystem';
import { CardObjectRenderer } from '../layers/cards/CardObjectRenderer';

export interface TemplateRendererProps {
  preset: Preset;
  sections: ContentSection[];
  personalInfo?: any;
  certificatesScanned?: any[];
  showCoverPage?: boolean;
  coverFeaturedEducationId?: string;
  coverFeaturedProfessionId?: string;
  roles?: any[];
  education?: any[];
  professions?: any[];
  customTheme?: any;
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
  preset,
  sections,
  personalInfo = {},
  certificatesScanned = [],
  showCoverPage = false,
  coverFeaturedEducationId,
  coverFeaturedProfessionId,
  roles = [],
  education = [],
  professions = [],
  embedded = false,
  canvasWidthMm,
  canvasHeightMm,
  customTheme,
  customRecordCardDesigns
}) => {
  const rolesColor = resolveThemeRoles({
    primaryColor: customTheme?.primaryColor || customTheme?.primary || preset.palette.primary,
    secondaryColor: customTheme?.secondaryColor || customTheme?.secondary || preset.palette.secondary,
    accentColor: customTheme?.accentColor || customTheme?.accent || preset.palette.accent,
    bgColor: customTheme?.bgColor || customTheme?.bgCorridor || customTheme?.background || '#ffffff',
    textColor: customTheme?.textColor || customTheme?.text || preset.palette.text,
  });

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
  const usable = resolveMargins(pageDef, marginDef);
  const resolvedSectors = resolveSectors(usable, preset.sectors);
  const sectorsWithFlow = placeFixedObjects(resolvedSectors, preset.fixedObjects);

  const pdfPaperSize = preset.pageSizeId === 'carta' ? 'LETTER' : preset.pageSizeId === 'legal' ? 'LEGAL' : 'A4';

  const styles = StyleSheet.create({
    page: {
      flexDirection: 'column',
      backgroundColor: rolesColor.background,
      fontFamily: preset.typography.fontFamily,
      fontSize: preset.typography.body,
      color: rolesColor.text,
      paddingTop: usable.margins.topPt,
      paddingBottom: usable.margins.bottomPt,
      paddingLeft: usable.margins.leftPt,
      paddingRight: usable.margins.rightPt
    },
    pageBody: {
      flexDirection: 'row',
      flex: 1
    },
    leftColumn: {
      backgroundColor: rolesColor.primary,
      color: rolesColor.textOnPrimary,
      paddingHorizontal: 16,
      flexDirection: 'column'
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
      borderColor: preset.palette.accent,
      objectFit: 'cover',
      marginBottom: 8
    },
    profilePhotoPlaceholder: {
      width: 90,
      height: 110,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: preset.palette.accent,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8
    },
    sidebarSectionTitle: {
      fontSize: preset.typography.sectionHeading,
      fontFamily: 'Helvetica-Bold',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 12,
      marginBottom: 6,
      paddingBottom: 3,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255, 255, 255, 0.3)',
      color: '#ffffff'
    },
    sidebarItemText: {
      fontSize: preset.typography.caption,
      marginBottom: 3,
      lineHeight: 1.3
    },
    sidebarItemBold: {
      fontFamily: 'Helvetica-Bold'
    },
    // Right Content Column Styling (el ancho real lo define el sector — ver sectorStyle abajo)
    rightColumn: {
      paddingHorizontal: 24,
      backgroundColor: '#ffffff'
    },
    headerName: {
      fontSize: preset.typography.title,
      fontFamily: 'Helvetica-Bold',
      textTransform: 'uppercase',
      color: '#0f172a',
      marginBottom: 4,
      paddingBottom: 6,
      borderBottomWidth: 1,
      borderBottomColor: '#e2e8f0'
    },
    headerNameHighlight: {
      color: preset.palette.primary
    },
    sectionTitleContainer: {
      backgroundColor: preset.palette.primary,
      color: preset.palette.textOnPrimary,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 4,
      marginTop: 14,
      marginBottom: 8
    },
    sectionTitleText: {
      fontSize: preset.typography.sectionHeading,
      fontFamily: 'Helvetica-Bold',
      textTransform: 'uppercase',
      letterSpacing: 0.5
    },
    cardBox: {
      backgroundColor: '#f8fafc',
      borderWidth: 1,
      borderColor: '#e2e8f0',
      borderLeftWidth: 4,
      borderLeftColor: preset.palette.primary,
      borderRadius: 6,
      padding: 10,
      marginBottom: 8
    },
    cardBoxAccent: {
      borderLeftColor: preset.palette.accent
    },
    cardHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 3
    },
    cardTitle: {
      fontSize: preset.typography.itemTitle,
      fontFamily: 'Helvetica-Bold',
      color: '#0f172a',
      flex: 1
    },
    cardYearBadge: {
      backgroundColor: preset.palette.primary,
      color: '#ffffff',
      fontSize: preset.typography.caption,
      fontFamily: 'Helvetica-Bold',
      paddingHorizontal: 5,
      paddingVertical: 2,
      borderRadius: 3
    },
    cardInstitution: {
      fontSize: preset.typography.body,
      fontFamily: 'Helvetica-Bold',
      color: '#475569',
      marginBottom: 3
    },
    cardDetails: {
      fontSize: preset.typography.caption,
      color: '#334155',
      lineHeight: 1.4
    },
    courseBox: {
      backgroundColor: '#f8fafc',
      borderWidth: 1,
      borderColor: '#e2e8f0',
      borderRadius: 5,
      padding: 7,
      marginBottom: 6,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    courseTitle: {
      fontSize: preset.typography.itemTitle,
      fontFamily: 'Helvetica-Bold',
      color: '#0f172a'
    },
    courseInstitution: {
      fontSize: preset.typography.caption,
      color: '#64748b'
    },
    courseHours: {
      backgroundColor: '#e2e8f0',
      color: '#334155',
      fontSize: preset.typography.caption,
      fontFamily: 'Helvetica-Bold',
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 3
    },
    signatureContainer: {
      marginTop: 20,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: '#cbd5e1',
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
      borderBottomColor: '#94a3b8',
      height: 30,
      marginBottom: 4
    },
    signerName: {
      fontSize: preset.typography.itemTitle,
      fontFamily: 'Helvetica-Bold',
      color: '#0f172a'
    },
    signerRole: {
      fontSize: preset.typography.caption,
      color: '#64748b'
    },
    certPage: {
      backgroundColor: '#ffffff',
      padding: 24,
      alignItems: 'center',
      justifyContent: 'center'
    },
    certTitle: {
      fontSize: preset.typography.cover?.title ? Math.round(preset.typography.cover.title * 0.55) : 14,
      fontFamily: 'Helvetica-Bold',
      color: '#0f172a',
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
      backgroundColor: preset.palette.primary,
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
      borderColor: preset.palette.accent,
      marginBottom: 14,
      objectFit: 'cover'
    },
    coverPhotoPlaceholder: {
      width: 130,
      height: 165,
      borderRadius: 12,
      borderWidth: 3,
      borderColor: preset.palette.accent,
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
      fontSize: preset.typography.cover?.title || preset.typography.title,
      fontFamily: 'Helvetica-Bold',
      color: '#ffffff',
      marginBottom: 10,
      textTransform: 'uppercase',
      letterSpacing: 1
    },
    coverName: {
      fontSize: preset.typography.cover?.name || preset.typography.title,
      fontFamily: 'Helvetica-Bold',
      color: preset.palette.accent,
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
      color: preset.palette.accent
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

  const renderRecord = (rec: ContentRecord) => {
    const f = rec.fields;

    if (rec.kind === 'contact-item') {
      return (
        <View key={rec.id} wrap={false}>
          {getPresentContactFields(rec, 'document').map((f) => (
            <Text key={f.key} style={styles.sidebarItemText}>
              {f.cvLabel}{' '}
              {f.cardOmit ? <Text style={styles.sidebarItemBold}>{f.value}</Text> : f.value}
            </Text>
          ))}
        </View>
      );
    }

    if (rec.kind === 'skill') {
      return (
        <Text key={rec.id} style={styles.sidebarItemText}>• {String(f.name || '')}</Text>
      );
    }

    if (rec.kind === 'education') {
      const designId = customRecordCardDesigns?.education || preset.recordCardDesigns?.education || 'accent-card';
      return (
        <CardObjectRenderer
          key={rec.id}
          designId={designId}
          title={String(f.degree || '')}
          subtitle={String(f.institution || '')}
          dateOrBadge={f.year ? `AÑO ${String(f.year)}` : undefined}
          rolesColor={rolesColor}
          typography={preset.typography}
        />
      );
    }

    if (rec.kind === 'experience') {
      const designId = customRecordCardDesigns?.experience || preset.recordCardDesigns?.experience || 'primary-card';
      return (
        <CardObjectRenderer
          key={rec.id}
          designId={designId}
          title={String(f.role || '')}
          subtitle={String(f.institution || '')}
          dateOrBadge={f.year ? String(f.year) : undefined}
          description={f.details ? String(f.details) : undefined}
          rolesColor={rolesColor}
          typography={preset.typography}
        />
      );
    }

    if (rec.kind === 'course') {
      const designId = customRecordCardDesigns?.course || preset.recordCardDesigns?.course || 'neutral-card';
      return (
        <CardObjectRenderer
          key={rec.id}
          designId={designId}
          title={String(f.title || f.name || '')}
          subtitle={String(f.institution || '')}
          dateOrBadge={f.hours ? String(f.hours) : undefined}
          rolesColor={rolesColor}
          typography={preset.typography}
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
              <Image src={String(f.dataUrl)} style={styles.signatureImage} />
            ) : (
              <View style={styles.signatureLine} />
            )}
            <Text style={styles.signerName}>{String(f.signerName || '')}</Text>
            <Text style={styles.signerRole}>{String(f.signerRole || '')}</Text>
          </View>
        </View>
      );
    }

    return null;
  };

  const documentBody = (
    <View style={embedded ? [styles.pageBody, { width: pageDef.widthPt, height: pageDef.heightPt }] : styles.pageBody}>
      {sectorsWithFlow.map((sFlow) => {
        const isSidebar = sFlow.sector.role === 'sidebar';
        const sectorStyle = isSidebar ? styles.leftColumn : styles.rightColumn;
        const widthStyle = { width: sFlow.sector.box.widthPt };

        const sectorSectionIds = preset.sectionOrder.find(s => s.sectorRole === sFlow.sector.role)?.sectionIds || [];
        const sectorSections = sections.filter(sec => sectorSectionIds.includes(sec.id));

        return (
          <View key={sFlow.sector.id} style={[sectorStyle, widthStyle]}>
            {isSidebar && (
              <View style={styles.sidebarHeader}>
                {personalInfo?.profilePhoto ? (
                  <Image src={personalInfo.profilePhoto} style={styles.profilePhoto} />
                ) : (
                  <View style={styles.profilePhotoPlaceholder}>
                    <Text style={{ fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#ffffff' }}>
                      {personalInfo?.initials || 'CV'}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {!isSidebar && (
              <Text style={styles.headerName}>
                {personalInfo.surname || ''} <Text style={styles.headerNameHighlight}>{personalInfo.givenNames || ''}</Text>
              </Text>
            )}

            {sectorSections.map((sec) => (
              <View key={sec.id}>
                {sec.titleText && (
                  isSidebar ? (
                    <Text style={styles.sidebarSectionTitle}>{sec.titleText}</Text>
                  ) : (
                    <View style={styles.sectionTitleContainer}>
                      <Text style={styles.sectionTitleText}>{sec.titleText}</Text>
                    </View>
                  )
                )}
                {sec.records.map(rec => renderRecord(rec))}
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );

  // MODO EMBEBIDO: se devuelve solo el contenido, sin Document/Page propios,
  // sin portada ni páginas de certificados — pensado para ir DENTRO de un
  // slot de otra hoja ya armada (ej. una tarjeta dentro de un A4 con varias).
  if (embedded) {
    return documentBody;
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
                <Text style={{ fontSize: 32, color: '#ffffff' }}>👤</Text>
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
              <Text style={styles.coverFooterSub}>{personalInfo.initials || 'LEECV'} | AÑO {new Date().getFullYear()}</Text>
              <Text style={styles.coverFooterBadge}>DOCUMENTO OFICIAL</Text>
            </View>
          </View>
        </Page>
      )}

      {/* LAYER 0-4: MAIN CV CONTENT PAGES */}
      <Page size={pdfPaperSize} style={styles.page}>
        {documentBody}
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
