import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { Preset } from '../layers/presets/presetSchema';
import { getPageSize } from '../layers/page/pageSizes';
import { MARGIN_PRESETS, resolveMargins } from '../layers/margins/marginPresets';
import { resolveSectors } from '../layers/sectors/resolveSectors';
import { placeFixedObjects } from '../layers/fixedObjects/placeFixedObjects';
import { ContentSection, ContentRecord } from '../layers/records/recordTypes';

interface TemplateRendererProps {
  preset: Preset;
  sections: ContentSection[];
  personalInfo?: any;
  certificatesScanned?: any[];
}

export const TemplateRenderer: React.FC<TemplateRendererProps> = ({
  preset,
  sections,
  personalInfo = {},
  certificatesScanned = []
}) => {
  const pageDef = getPageSize(preset.pageSizeId);
  const marginDef = MARGIN_PRESETS[preset.marginPresetId] || MARGIN_PRESETS.documento_estandar;
  const usable = resolveMargins(pageDef, marginDef);
  const resolvedSectors = resolveSectors(usable, preset.sectors);
  const sectorsWithFlow = placeFixedObjects(resolvedSectors, preset.fixedObjects);

  const pdfPaperSize = preset.pageSizeId === 'carta' ? 'LETTER' : preset.pageSizeId === 'legal' ? 'LEGAL' : 'A4';

  const styles = StyleSheet.create({
    page: {
      flexDirection: 'column',
      backgroundColor: '#ffffff',
      fontFamily: preset.typography.fontFamily,
      fontSize: preset.typography.body,
      color: preset.palette.text,
      // CAPA 1 real: el margen sale de resolveMargins(preset.marginPresetId), no de un
      // 28pt fijo. Con eso, "tarjeta_ajustada" (3mm) no le come el espacio útil a una
      // tarjeta de 51mm de alto, y "documento_amplio" sí respeta sus 16mm reales.
      paddingTop: usable.margins.topPt,
      paddingBottom: usable.margins.bottomPt,
      paddingLeft: usable.margins.leftPt,
      paddingRight: usable.margins.rightPt
    },
    pageBody: {
      flexDirection: 'row',
      flex: 1
    },
    // Left Sidebar Styling (el ancho real lo define el sector — ver sectorStyle abajo)
    leftColumn: {
      backgroundColor: preset.palette.primary,
      color: preset.palette.textOnPrimary,
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
      fontSize: 14,
      fontFamily: 'Helvetica-Bold',
      color: '#0f172a',
      marginBottom: 12
    },
    certImage: {
      maxWidth: '100%',
      maxHeight: '80%',
      objectFit: 'contain',
      borderRadius: 4
    }
  });

  const renderRecord = (rec: ContentRecord) => {
    const f = rec.fields;

    if (rec.kind === 'contact-item') {
      return (
        <View key={rec.id} wrap={false}>
          {f.phone && <Text style={styles.sidebarItemText}>📞 {String(f.phone)}</Text>}
          {f.email && <Text style={styles.sidebarItemText}>✉️ {String(f.email)}</Text>}
          {f.address && <Text style={styles.sidebarItemText}>📍 {String(f.address)}</Text>}
          {f.cityProvince && <Text style={styles.sidebarItemText}>🏙️ {String(f.cityProvince)}</Text>}
          {f.dni && <Text style={styles.sidebarItemText}>DNI: <Text style={styles.sidebarItemBold}>{String(f.dni)}</Text></Text>}
          {f.cuit && <Text style={styles.sidebarItemText}>CUIT: <Text style={styles.sidebarItemBold}>{String(f.cuit)}</Text></Text>}
          {f.birthDate && <Text style={styles.sidebarItemText}>Nac.: <Text style={styles.sidebarItemBold}>{String(f.birthDate)}</Text></Text>}
        </View>
      );
    }

    if (rec.kind === 'skill') {
      return (
        <Text key={rec.id} style={styles.sidebarItemText}>• {String(f.name || '')}</Text>
      );
    }

    if (rec.kind === 'education') {
      return (
        <View key={rec.id} wrap={false} style={[styles.cardBox, styles.cardBoxAccent]}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>{String(f.degree || '')}</Text>
            {f.year && <Text style={styles.cardYearBadge}>AÑO {String(f.year)}</Text>}
          </View>
          <Text style={styles.cardInstitution}>{String(f.institution || '')}</Text>
        </View>
      );
    }

    if (rec.kind === 'experience') {
      return (
        <View key={rec.id} wrap={false} style={styles.cardBox}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>{String(f.role || '')}</Text>
            {f.year && <Text style={styles.cardYearBadge}>{String(f.year)}</Text>}
          </View>
          {f.institution && <Text style={styles.cardInstitution}>{String(f.institution)}</Text>}
          {f.details && <Text style={styles.cardDetails}>{String(f.details)}</Text>}
        </View>
      );
    }

    if (rec.kind === 'course') {
      return (
        <View key={rec.id} wrap={false} style={styles.courseBox}>
          <View style={{ flex: 1 }}>
            <Text style={styles.courseTitle}>{String(f.title || f.name || '')}</Text>
            <Text style={styles.courseInstitution}>{String(f.institution || '')}</Text>
          </View>
          {f.hours && <Text style={styles.courseHours}>{String(f.hours)}</Text>}
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

  return (
    <Document title={preset.name}>
      <Page size={pdfPaperSize} style={styles.page}>
        <View style={styles.pageBody}>
          {sectorsWithFlow.map((sFlow) => {
            const isSidebar = sFlow.sector.role === 'sidebar';
            const sectorStyle = isSidebar ? styles.leftColumn : styles.rightColumn;
            // CAPA 2 real: el ancho de cada columna sale de resolveSectors (widthPercent del
            // preset), no de un 32%/68% fijo. Así un preset nuevo puede declarar cualquier
            // proporción de columnas sin tener que tocar este archivo.
            const widthStyle = { width: sFlow.sector.box.widthPt };

            const sectorSectionIds = preset.sectionOrder.find(s => s.sectorRole === sFlow.sector.role)?.sectionIds || [];
            const sectorSections = sections.filter(sec => sectorSectionIds.includes(sec.id));

            return (
              <View key={sFlow.sector.id} style={[sectorStyle, widthStyle]}>
                {/* Render Sidebar Header & Profile Photo */}
                {isSidebar && (
                  <View style={styles.sidebarHeader}>
                    {personalInfo?.profilePhoto ? (
                      <Image src={personalInfo.profilePhoto} style={styles.profilePhoto} />
                    ) : (
                      <View style={styles.profilePhotoPlaceholder}>
                        <Text style={{ fontSize: 24, color: '#ffffff' }}>👤</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Render Candidate Header Name on Right Main Column */}
                {!isSidebar && (
                  <Text style={styles.headerName}>
                    {personalInfo.surname || ''} <Text style={styles.headerNameHighlight}>{personalInfo.givenNames || ''}</Text>
                  </Text>
                )}

                {/* Render Dynamic Content Sections */}
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
