import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { Preset } from '../layers/presets/presetSchema';
import { getPageSize } from '../layers/page/pageSizes';
import { MARGIN_PRESETS, resolveMargins } from '../layers/margins/marginPresets';
import { resolveSectors } from '../layers/sectors/resolveSectors';
import { placeFixedObjects } from '../layers/fixedObjects/placeFixedObjects';
import { ContentSection } from '../layers/records/recordTypes';

interface TemplateRendererProps {
  preset: Preset;
  sections: ContentSection[];
  personalInfo?: any;
}

export const TemplateRenderer: React.FC<TemplateRendererProps> = ({
  preset,
  sections,
  personalInfo = {}
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
      paddingTop: usable.margins.topPt,
      paddingBottom: usable.margins.bottomPt,
      paddingLeft: usable.margins.leftPt,
      paddingRight: usable.margins.rightPt,
    },
    pageBody: {
      flexDirection: 'row',
      flex: 1,
    },
    cardBox: {
      backgroundColor: '#f8fafc',
      borderWidth: 1,
      borderColor: '#e2e8f0',
      borderLeftWidth: 4,
      borderLeftColor: preset.palette.primary,
      borderRadius: 6,
      padding: 8,
      marginBottom: 8,
    },
    sectionTitleContainer: {
      backgroundColor: preset.palette.primary,
      color: preset.palette.textOnPrimary,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      marginTop: 10,
      marginBottom: 6,
    },
    sectionTitleText: {
      fontSize: preset.typography.sectionHeading,
      fontFamily: 'Helvetica-Bold',
      textTransform: 'uppercase',
    },
    cardTitle: {
      fontSize: preset.typography.itemTitle,
      fontFamily: 'Helvetica-Bold',
      color: preset.palette.text,
    },
    cardBody: {
      fontSize: preset.typography.body,
      color: '#475569',
      marginTop: 2,
    }
  });

  return (
    <Document title={preset.name}>
      <Page size={pdfPaperSize} style={styles.page}>
        <View style={styles.pageBody}>
          {sectorsWithFlow.map((sFlow) => {
            const isSidebar = sFlow.sector.role === 'sidebar';
            const sectorStyle = {
              width: `${sFlow.sector.box.widthPt}pt`,
              backgroundColor: isSidebar ? preset.palette.primary : '#ffffff',
              color: isSidebar ? preset.palette.textOnPrimary : preset.palette.text,
              padding: 12,
            };

            const sectorSectionIds = preset.sectionOrder.find(s => s.sectorRole === sFlow.sector.role)?.sectionIds || [];
            const sectorSections = sections.filter(sec => sectorSectionIds.includes(sec.id));

            return (
              <View key={sFlow.sector.id} style={sectorStyle}>
                {/* Render Fixed Objects in this Sector */}
                {sFlow.fixedObjects.map((fObj) => {
                  if (fObj.type === 'photo' && personalInfo?.profilePhoto) {
                    return (
                      <View key={fObj.id} style={{ alignItems: 'center', marginBottom: 12 }}>
                        <Image src={personalInfo.profilePhoto} style={{ width: 80, height: 100, borderRadius: 6 }} />
                      </View>
                    );
                  }
                  if (fObj.type === 'decorative-line') {
                    return (
                      <View key={fObj.id} style={{ height: fObj.heightPt, backgroundColor: preset.palette.accent, width: '100%' }} />
                    );
                  }
                  return null;
                })}

                {/* Render Flowing Dynamic Content Sections */}
                {sectorSections.map((sec) => (
                  <View key={sec.id}>
                    <View style={styles.sectionTitleContainer}>
                      <Text style={styles.sectionTitleText}>{sec.titleText}</Text>
                    </View>
                    {sec.records.map((rec) => (
                      <View key={rec.id} wrap={false} style={styles.cardBox}>
                        <Text style={styles.cardTitle}>
                          {typeof rec.fields.title === 'string' ? rec.fields.title : 'Registro'}
                        </Text>
                        {rec.fields.institution && (
                          <Text style={styles.cardBody}>
                            {typeof rec.fields.institution === 'string' ? rec.fields.institution : ''}
                          </Text>
                        )}
                        {rec.fields.details && (
                          <Text style={styles.cardBody}>
                            {typeof rec.fields.details === 'string' ? rec.fields.details : ''}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            );
          })}
        </View>
      </Page>
    </Document>
  );
};
