import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet, pdf } from '@react-pdf/renderer';
import { getPageSize } from '../../../shared/core/pdf-engine/layers/page/pageSizes';
import {
  EditorialSection,
  EditorialRecord,
  EditorialRecordType,
  EditorialPresetId,
  EditorialCoverMode,
  EditorialDesignConfig,
  EditorialTocConfig,
  EditorialManifestRules,
} from '../domain/editorialTypes';
import {
  EditorialPreset,
  getEditorialPreset,
  DEFAULT_EDITORIAL_PRESET,
} from '../domain/editorialPresetCatalog';
import {
  calculateCoverDimensions,
  calculateSpineThickness,
  normalizeTypographyText,
} from '../domain/editorialMath';
import {
  EditorialLegalFields,
  EditorialMetadata,
  EditorialTocEntry,
} from '../domain/editorialTypes';
import { registerPdfCategoryExporter } from '../../../shared/core/pdf-engine/pdfCategoryRegistry';
import { downloadBlob } from '../../../shared/core/utils/downloadUtils';

// Tipos auxiliares para el render PDF
interface SectionRenderModel {
  id: string;
  title: string;
  records: EditorialRecord[];
}

interface CoverRenderModel {
  mode: EditorialCoverMode;
  title?: string;
  subtitle?: string;
  author?: string;
  editor?: string;
  institution?: string;
  qrCodeUrl?: string;
  qrSize?: number;
}

interface EditorialRenderModel {
  title: string;
  preset: EditorialPreset;
  design: EditorialDesignConfig;
  sections: SectionRenderModel[];
  cover: CoverRenderModel;
  tocConfig: EditorialTocConfig;
  manifestRules: EditorialManifestRules;
}

/**
 * Documento PDF nativo para EditorLee usando @react-pdf/renderer.
 *
 * Lo que se ve en pantalla (VectorDocViewer) es exactamente el mismo PDF
 * que se descarga: cero posibilidad de que preview y descarga difieran.
 *
 * El visor VectorDocViewer usa los mismos props (zoomLevel, preset) que
 * FacturLee y CV, por lo que la forma de zoom y gestos es idéntica.
 */
function toPdfPageSize(pageSizeId: string): 'A4' | 'A5' | 'LETTER' | [number, number] {
  if (pageSizeId === 'a4') return 'A4';
  if (pageSizeId === 'a5') return 'A5';
  if (pageSizeId === 'carta') return 'LETTER';
  if (pageSizeId === 'legal') return 'LETTER'; // fallback
  const def = getPageSize(pageSizeId);
  return [def.widthPt, def.heightPt];
}

function formatTextoLiso(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, ' ')
    .trim();
}

export const EditorialPdfDocument: React.FC<{
  data: {
    metadata: EditorialMetadata;
    design: EditorialDesignConfig;
    sections: EditorialSection[];
    cover?: { mode: EditorialCoverMode; [key: string]: any };
    tocConfig: EditorialTocConfig;
    manifestRules: EditorialManifestRules;
  };
  preset: EditorialPresetId;
}> = ({ data, preset }) => {
  const pdfPreset = getEditorialPreset(preset) || DEFAULT_EDITORIAL_PRESET;
  const model: EditorialRenderModel = {
    title: data.metadata.title,
    preset: pdfPreset,
    design: data.design,
    sections: data.sections.map((s) => ({
      id: s.id,
      title: s.title,
      records: s.records,
    })),
    cover: data.cover || {
      mode: 'libro',
      title: data.metadata.title,
    },
    tocConfig: data.tocConfig,
    manifestRules: data.manifestRules,
  };

  const styles = StyleSheet.create({
    page: {
      fontFamily: model.design.typography.fontFamily,
      backgroundColor: '#FFFFFF',
      color: '#000000',
      padding: 26,
      fontSize: model.design.typography.fontSize,
    },
    coverPage: {
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100%',
      padding: 40,
      textAlign: 'center',
    },
    coverTitle: {
      fontSize: 32,
      fontFamily: 'Helvetica-Bold',
      marginBottom: 12,
      color: '#333333',
    },
    coverSubtitle: {
      fontSize: 16,
      color: '#666666',
      marginBottom: 20,
    },
    coverAuthor: {
      fontSize: 14,
      color: '#888888',
      marginBottom: 8,
    },
    sectionTitle: {
      fontSize: 18,
      fontFamily: 'Helvetica-Bold',
      marginTop: 20,
      marginBottom: 10,
      color: '#333333',
    },
    bodyText: {
      fontSize: model.design.typography.fontSize,
      lineHeight: model.design.typography.lineHeight,
      marginBottom: 10,
    },
    sectionDivider: {
      borderTopWidth: 1,
      borderTopColor: '#E5E7EB',
      marginVertical: 16,
    },
    footer: {
      position: 'absolute',
      bottom: 14,
      left: 26,
      right: 26,
      borderTopWidth: 0.6,
      borderTopColor: '#9CA3AF',
      paddingTop: 4,
      fontSize: 10,
      color: 'gray-500',
      textAlign: 'center',
    },
    headerEven: {
      position: 'absolute',
      top: 26,
      left: 26,
      right: 26,
      fontSize: 9,
      color: 'gray-500',
    },
    headerOdd: {
      position: 'absolute',
      top: 26,
      left: 26,
      right: 26,
      fontSize: 9,
      color: 'gray-500',
    },
    table: {
      marginTop: 8,
      borderWidth: 0.6,
      borderColor: '#9CA3AF',
    },
    tableHeader: {
      backgroundColor: '#3F51B5',
      color: 'white',
      paddingVertical: 3,
      paddingHorizontal: 4,
      fontSize: 9,
    },
    tableRow: {
      paddingVertical: 3,
      paddingHorizontal: 4,
      borderTopWidth: 0.4,
      borderTopColor: '#9CA3AF',
    },
    callout: {
      borderWidth: 1,
      borderColor: '#FBBF24',
      backgroundColor: '#FEF3C7',
      padding: 8,
      margin: 8,
    },
    calloutTitle: {
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
      marginBottom: 4,
    },
    listItem: {
      marginBottom: 4,
    },
    listBullet: {
      marginLeft: 12,
      marginBottom: 2,
    },
    imageCaption: {
      fontSize: 9,
      color: 'gray-500',
      textAlign: 'center',
      marginTop: 4,
    },
    qrCode: {
      width: 40,
      height: 40,
    },
    metadataField: {
      marginBottom: 6,
    },
    metadataLabel: {
      fontSize: 9,
      color: 'gray-500',
      marginRight: 4,
    },
    metadataValue: {
      fontSize: 9,
    },
  });

  // Generar páginas de cubierta
  const coverPage = model.cover.mode === 'libro' ? (
    <Page size="A4" style={styles.coverPage}>
      <Text style={styles.coverTitle}>{formatTextoLiso(model.cover.title || model.title)}</Text>
      {model.cover.subtitle && <Text style={styles.coverSubtitle}>{formatTextoLiso(model.cover.subtitle)}</Text>}
      {model.cover.author && <Text style={styles.coverAuthor}>{formatTextoLiso(model.cover.author)}</Text>}
      {model.cover.qrCodeUrl && (
        <Image style={styles.qrCode} src={model.cover.qrCodeUrl} />
      )}
    </Page>
  ) : null;

  // Generar páginas de sección
  const sectionPages = model.sections.map((section, secIndex) => (
    <Page key={section.id} size={toPdfPageSize(model.design.pageSize)} style={styles.page}>
      <Text style={styles.sectionTitle}>{formatTextoLiso(section.title)}</Text>
      {section.records.length > 0 && (
        <View style={styles.sectionDivider} />
      )}
      {section.records.map((record, recIndex) => {
        switch (record.type) {
          case 'paragraph': return (
            <Text key={recIndex} style={styles.bodyText}>{formatTextoLiso(record.content || '')}</Text>
          );
          case 'subtitle': return (
            <Text key={recIndex} style={{ ...styles.bodyText, fontFamily: 'Helvetica-Bold', fontSize: 16 }}>
              {formatTextoLiso(record.content || '')}
            </Text>
          );
          case 'quote': return (
            <View style={styles.callout}>
              <Text style={styles.calloutTitle}>{formatTextoLiso(record.content || '')}</Text>
              {record.quoteAttribution && <Text style={{ fontSize: 9, color: 'gray-500' }}>— {formatTextoLiso(record.quoteAttribution)}</Text>}
            </View>
          );
          case 'callout': return (
            <View style={styles.callout}>
              <Text style={styles.calloutTitle}>{formatTextoLiso(record.content || '')}</Text>
            </View>
          );
          case 'list': return (
            <View key={recIndex} style={styles.listItem}>
              {formatTextoLiso(record.content || '').split('\n').map((line, li) => (
                <Text key={li} style={styles.listBullet}>{line}</Text>
              ))}
            </View>
          );
          case 'table': {
            const headers = record.tableHeaders || [];
            const rows = record.tableRows || [];
            return (
              <View key={recIndex} style={styles.table}>
                <View style={styles.tableHeader}>
                  {headers.map((h) => (
                    <Text style={{ ...styles.tableHeader, marginRight: 8 }}>{h}</Text>
                  ))}
                </View>
                {rows.map((row, ri) => (
                  <View key={ri} style={styles.tableRow}>
                    {row.map((cell, ci) => (
                      <Text key={ci} style={styles.tableRow}>{cell}</Text>
                    ))}
                  </View>
                ))}
              </View>
            );
          }
          case 'image': {
            const imgSrc = record.imagePath || '';
            const dpi = record.imageDpi || 150;
            const caption = record.imageCaption || '';
            return (
              <View key={recIndex} style={{ textAlign: 'center', margin: 8 }}>
                {imgSrc && <Image style={{ width: 100, height: 100, objectFit: 'contain' }} src={imgSrc} />}
                {caption && <Text style={styles.imageCaption}>{formatTextoLiso(caption)}</Text>}
              </View>
            );
          }
          case 'bibliography_item': {
            const author = record.bibAuthor || '';
            const year = record.bibYear || '';
            const title = record.bibTitle || '';
            const editorial = record.bibEditorial || '';
            const style = record.bibStyle || 'tradicional';
            const formatted = `${author} (${year}). "${title}". ${editorial || ''}`.trim();
            return (
              <Text key={recIndex} style={styles.bodyText}>
                {formatTextoLiso(formatted)}
              </Text>
            );
          }
          case 'qr_or_break': {
            if (record.isBreak) return <Text key={recIndex} break />;
            if (record.qrCode) return (
              <Image key={recIndex} style={styles.qrCode} src={record.qrCode} />
            );
            return <Text key={recIndex} style={{ opacity: 0 }} />; // spacer invisible
          }
          default: return <Text key={recIndex} style={styles.bodyText}>{formatTextoLiso(record.content || '')}</Text>;
        }
      })}
    </Page>
  ));

  // Generar página de índice automático si está habilitado
  const tocPage = model.tocConfig.enabled ? (
    <Page key="toc" size={toPdfPageSize(model.design.pageSize)} style={styles.page}>
      <Text style={{ fontSize: 18, fontFamily: 'Helvetica-Bold', marginBottom: 20 }}>Índice Automático</Text>
      {model.sections.map((section, si) => (
        <React.Fragment key={`sec-${section.id}`}>
          <Text style={{ fontSize: 14, marginBottom: 10 }}>
            {section.title}
          </Text>
          {section.records
            .filter((r) => r.type !== 'callout' && r.type !== 'image')
            .map((record, ri) => {
              const label = record.title || record.content?.slice(0, 30) || 'Sin título';
              return (
                <Text key={`rec-${section.id}-${ri}`} style={{ fontSize: 12, marginBottom: 6 }}>
                  {label} -- Página {si + 2}
                </Text>
              );
            })}
        </React.Fragment>
      ))}
    </Page>
  ) : null;

  // Generar encabezados par/impar
  const headerByPage = (pageIndex: number) =>
    pageIndex % 2 === 0 ? styles.headerEven : styles.headerOdd;

  return (
    <Document title={model.title} author={model.cover.title || 'EditorLee'}>
      {coverPage}
      {sectionPages}
      {tocPage}
      {/* Página final con footer consistente */}
      <Page size={toPdfPageSize(model.design.pageSize)} style={styles.page}>
        <View style={styles.footer}>
          <Text style={{ fontSize: 9, color: 'gray-500', textAlign: 'center' }}>
            Documento generado en LEECV · {model.cover.mode || 'Libro'} · {new Date().toLocaleDateString('es-AR')}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default EditorialPdfDocument;

registerPdfCategoryExporter('editorial', async (cvData, preset) => {
  const draft = cvData?.draft || cvData;
  if (!draft) return false;
  const docElement = React.createElement(EditorialPdfDocument, {
    data: draft,
    preset: preset.id as any,
  });
  const blob = await pdf(docElement as any).toBlob();
  const safeTitle = (draft.metadata?.title || 'Publicacion-Editorial')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .slice(0, 50);
  downloadBlob(blob, `${safeTitle}.pdf`);
  return true;
});