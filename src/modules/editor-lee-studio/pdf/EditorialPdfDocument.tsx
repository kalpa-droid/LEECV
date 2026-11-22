import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet, pdf } from '@react-pdf/renderer';
import { getPageSize } from '../../../shared/core/pdf-engine/layers/page/pageSizes';
import {
  EditorialSection,
  EditorialRecord,
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
  EditorialLegalFields,
  EditorialMetadata,
} from '../domain/editorialTypes';
import { registerPdfCategoryExporter } from '../../../shared/core/pdf-engine/pdfCategoryRegistry';
import { sanitizeFontFamily } from '../../../shared/core/pdf-engine/layers/typography/pdfFontRegistry';
import { downloadBlob } from '../../../shared/core/utils/downloadUtils';
import { EditorialPdfCoverPage } from './EditorialPdfCovers';
import { formatEditorialCitation } from '../domain/editorialCitationFormatter';

// Tipos auxiliares para el render PDF
interface SectionRenderModel {
  id: string;
  title: string;
  records: EditorialRecord[];
}

interface CoverRenderModel {
  mode: EditorialCoverMode;
  coverStyleId?: string;
  coverPaletteKey?: string;
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

interface EditorialDocumentDesign extends EditorialDesignConfig {
  pageSizeId?: string;
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  gutter?: number;
}

const AnchorMarker = ({ id, active }: { id: string; active?: boolean }) =>
  active ? <Text style={{ fontSize: 1, color: '#ffffff', opacity: 0.001 }}>{id}</Text> : null;

export const EditorialPdfDocument: React.FC<{
  data: {
    metadata: EditorialMetadata;
    design: EditorialDocumentDesign;
    sections: EditorialSection[];
    cover?: { mode: EditorialCoverMode; [key: string]: any };
    legalFields?: EditorialLegalFields;
    tocConfig: EditorialTocConfig;
    manifestRules: EditorialManifestRules;
  };
  preset: EditorialPresetId;
  interactiveAnchors?: boolean;
}> = ({ data, preset, interactiveAnchors = false }) => {
  const pdfPreset = getEditorialPreset(preset) || DEFAULT_EDITORIAL_PRESET;
  const rawDesign: EditorialDocumentDesign = (data?.design || {}) as EditorialDocumentDesign;
  const resolvedPageSizeId = rawDesign.pageSizeId || rawDesign.pageSize || pdfPreset.pageSize || 'a4';
  const resolvedFontSize = Number(rawDesign.typography?.fontSize) > 0 ? Number(rawDesign.typography.fontSize) : pdfPreset.typography.fontSize;
  const resolvedLineHeight = Number(rawDesign.typography?.lineHeight) > 0 ? Number(rawDesign.typography.lineHeight) : pdfPreset.typography.lineHeight;
  const rawFontFamily = rawDesign.typography?.fontFamily || pdfPreset.typography.fontFamily;

  const baseFont = sanitizeFontFamily(rawFontFamily, false, false);
  const boldFont = sanitizeFontFamily(rawFontFamily, true, false);
  const italicFont = sanitizeFontFamily(rawFontFamily, false, true);

  const visibleSections = (data?.sections || []).filter((s) => s.visible !== false);

  const model: EditorialRenderModel = {
    title: data?.metadata?.title || 'Mi obra',
    preset: pdfPreset,
    design: rawDesign,
    sections: visibleSections.map((s) => ({
      id: s.id,
      title: s.title,
      records: Array.isArray(s.records) ? s.records : [],
    })),
    cover: data?.cover || {
      mode: pdfPreset.coverMode || 'libro',
      title: data?.metadata?.title || 'Mi obra',
    },
    tocConfig: data?.tocConfig || { enabled: false, title: 'Índice', showSubtitles: true, position: 'tras-caratula' },
    manifestRules: data?.manifestRules || {
      preserveScenes: true,
      preservePoems: true,
      preserveCitations: true,
      typographyCleanup: true,
      qrQuietZone: 4,
      qrMinSize: 20,
    },
  };

  const marginTopPt = Math.max(20, (rawDesign.marginTop ?? rawDesign.margins?.top ?? 20) * 2.0);
  const marginBottomPt = Math.max(28, (rawDesign.marginBottom ?? rawDesign.margins?.bottom ?? 20) * 2.0);
  const marginLeftPt = Math.max(24, (rawDesign.gutter ?? rawDesign.marginLeft ?? rawDesign.margins?.left ?? 20) * 1.8);
  const marginRightPt = Math.max(24, (rawDesign.marginRight ?? rawDesign.margins?.right ?? 20) * 1.8);
  const resolvedPageSize = toPdfPageSize(resolvedPageSizeId);

  const styles = StyleSheet.create({
    page: {
      fontFamily: baseFont,
      backgroundColor: '#FFFFFF',
      color: '#111827',
      paddingTop: marginTopPt,
      paddingBottom: marginBottomPt,
      paddingLeft: marginLeftPt,
      paddingRight: marginRightPt,
      fontSize: resolvedFontSize,
    },
    coverPage: {
      fontFamily: baseFont,
      backgroundColor: '#FFFFFF',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100%',
      padding: 40,
      textAlign: 'center',
    },
    coverTitle: {
      fontSize: 28,
      fontFamily: boldFont,
      marginBottom: 12,
      color: '#111827',
    },
    coverSubtitle: {
      fontSize: 15,
      fontFamily: italicFont,
      color: '#4B5563',
      marginBottom: 20,
    },
    coverAuthor: {
      fontSize: 13,
      fontFamily: baseFont,
      color: '#374151',
      marginBottom: 8,
    },
    coverMetaNote: {
      fontSize: 10,
      fontFamily: baseFont,
      color: '#6B7280',
      marginTop: 6,
    },
    sectionTitle: {
      fontSize: 18,
      fontFamily: boldFont,
      marginTop: 12,
      marginBottom: 10,
      color: '#111827',
    },
    bodyText: {
      fontFamily: baseFont,
      fontSize: resolvedFontSize,
      lineHeight: resolvedLineHeight,
      marginBottom: rawDesign.normId === 'apa7' ? 0 : 10,
      textIndent: rawDesign.firstLineIndent ? 18 : 0,
    },
    bibItemWrap: {
      marginBottom: rawDesign.normId === 'apa7' ? 6 : 8,
    },
    bibText: {
      fontFamily: baseFont,
      fontSize: resolvedFontSize,
      lineHeight: resolvedLineHeight,
    },
    sectionDivider: {
      borderTopWidth: 1,
      borderTopColor: '#E5E7EB',
      marginVertical: 14,
    },
    footer: {
      position: 'absolute',
      bottom: 14,
      left: marginLeftPt,
      right: marginRightPt,
      borderTopWidth: 0.6,
      borderTopColor: '#D1D5DB',
      paddingTop: 4,
      fontSize: 9,
      fontFamily: baseFont,
      color: '#6B7280',
      textAlign: 'center',
    },
    headerEven: {
      position: 'absolute',
      top: 16,
      left: marginLeftPt,
      right: marginRightPt,
      fontSize: 9,
      fontFamily: baseFont,
      color: '#6B7280',
    },
    headerOdd: {
      position: 'absolute',
      top: 16,
      left: marginLeftPt,
      right: marginRightPt,
      fontSize: 9,
      fontFamily: baseFont,
      color: '#6B7280',
    },
    table: {
      marginTop: 8,
      borderWidth: 0.6,
      borderColor: '#9CA3AF',
    },
    tableHeader: {
      backgroundColor: '#3F51B5',
      color: '#FFFFFF',
      paddingVertical: 3,
      paddingHorizontal: 4,
      fontSize: 9,
      fontFamily: boldFont,
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
      fontFamily: boldFont,
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
      fontFamily: italicFont,
      color: '#6B7280',
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
      color: '#6B7280',
      marginRight: 4,
    },
    metadataValue: {
      fontSize: 9,
    },
  });

  const showCover = model.cover.mode && model.cover.mode !== 'sin-caratula';
  const coverTitleText = data?.metadata?.title || model.cover.title || model.title;
  const coverSubtitleText = data?.metadata?.subtitle || model.cover.subtitle;
  const coverAuthorText = data?.metadata?.author || model.cover.author;
  const coverEditorialText = data?.metadata?.editorial || model.cover.editor;

  // Generar páginas de cubierta adaptadas (desde COVER_PRESETS_CATALOG + paletas armónicas)
  const coverPage = showCover ? (
    <EditorialPdfCoverPage
      pageSize={resolvedPageSize}
      coverMode={model.cover.mode}
      coverStyleId={model.cover.coverStyleId || rawDesign.coverStyleId || pdfPreset.coverStyleId}
      coverPaletteKey={model.cover.coverPaletteKey || rawDesign.coverPaletteKey || pdfPreset.coverPaletteKey}
      fallbackPalette={{
        primary: '#1E293B',
        secondary: '#475569',
        accent: '#0F172A',
        text: '#0F172A',
        textOnPrimary: '#FFFFFF',
        background: '#FFFFFF',
      }}
      title={coverTitleText}
      subtitle={coverSubtitleText}
      author={coverAuthorText}
      editor={coverEditorialText}
      metadata={data?.metadata}
      legalFields={data?.legalFields}
      qrCodeUrl={model.cover.qrCodeUrl}
      baseFont={baseFont}
      boldFont={boldFont}
      italicFont={italicFont}
      startAnchors={
        <>
          <AnchorMarker id="ANCHOR_START:editorial_portada" active={interactiveAnchors} />
          <AnchorMarker id="ANCHOR_START:editorial_inicio" active={interactiveAnchors} />
        </>
      }
      endAnchors={<AnchorMarker id="ANCHOR_END:editorial_portada" active={interactiveAnchors} />}
    />
  ) : null;

  const showToc = Boolean(model.tocConfig?.enabled && model.sections.length > 0);
  const tocPageNumberOffset = (showCover ? 1 : 0) + (showToc ? 1 : 0);

  // Generar página de índice automático si está habilitado
  const tocPage = showToc ? (
    <Page key="toc" size={resolvedPageSize} style={styles.page}>
      <AnchorMarker id="ANCHOR_START:editorial_toc" active={interactiveAnchors} />
      <Text style={{ fontSize: 18, fontFamily: boldFont, marginBottom: 16 }}>
        {model.tocConfig?.title || 'Índice Automático'}
      </Text>
      {model.sections.map((section, si) => (
        <React.Fragment key={`sec-${section.id}`}>
          <Text style={{ fontSize: 13, fontFamily: boldFont, marginBottom: 6 }}>
            {section.title || `Sección ${si + 1}`} — Pág. {tocPageNumberOffset + si + 1}
          </Text>
          {model.tocConfig.showSubtitles !== false &&
            section.records
              .filter((r) => r.type === 'subtitle')
              .map((record, ri) => (
                <Text
                  key={`rec-${section.id}-${ri}`}
                  style={{ fontSize: 11, fontFamily: baseFont, color: '#4B5563', marginLeft: 14, marginBottom: 4 }}
                >
                  {record.content || record.title || 'Apartado'}
                </Text>
              ))}
        </React.Fragment>
      ))}
      <AnchorMarker id="ANCHOR_END:editorial_toc" active={interactiveAnchors} />
    </Page>
  ) : null;

  // Generar páginas de sección
  const sectionPages = model.sections.map((section, secIndex) => {
    const rawSec = visibleSections[secIndex];
    const isBibSection =
      rawSec?.sectionKey === 'bibliografia' ||
      section.records.some((r) => r.type === 'bibliography_item');
    return (
    <Page key={section.id} size={resolvedPageSize} style={styles.page}>
      <AnchorMarker id={`ANCHOR_START:${section.id}`} active={interactiveAnchors} />
      {isBibSection && <AnchorMarker id="ANCHOR_START:editorial_bibliografia" active={interactiveAnchors} />}
      {secIndex === 0 && <AnchorMarker id="ANCHOR_START:editorial_secciones" active={interactiveAnchors} />}
      {secIndex === model.sections.length - 1 && (
        <>
          <AnchorMarker id="ANCHOR_START:editorial_diseño" active={interactiveAnchors} />
          <AnchorMarker id="ANCHOR_START:editorial_metadata" active={interactiveAnchors} />
        </>
      )}
      <Text
        style={[
          styles.sectionTitle,
          rawDesign.normId === 'apa7' ? { textAlign: 'center', fontSize: resolvedFontSize } : {},
        ]}
      >
        {formatTextoLiso(section.title || `Sección ${secIndex + 1}`)}
      </Text>
      {section.records.length > 0 && (
        <View style={styles.sectionDivider} />
      )}
      {section.records.map((record, recIndex) => {
        switch (record.type) {
          case 'paragraph': return (
            <Text key={recIndex} style={styles.bodyText}>{formatTextoLiso(record.content || '')}</Text>
          );
          case 'subtitle': return (
            <Text key={recIndex} style={{ ...styles.bodyText, textIndent: 0, fontFamily: boldFont, fontSize: Math.round(resolvedFontSize * 1.25) }}>
              {formatTextoLiso(record.content || '')}
            </Text>
          );
          case 'quote': return (
            <View key={recIndex} style={styles.callout}>
              <Text style={{ ...styles.calloutTitle, fontFamily: italicFont }}>{formatTextoLiso(record.content || '')}</Text>
              {record.quoteAttribution && <Text style={{ fontSize: 9, fontFamily: baseFont, color: '#6B7280' }}>— {formatTextoLiso(record.quoteAttribution)}</Text>}
            </View>
          );
          case 'callout': return (
            <View key={recIndex} style={styles.callout}>
              <Text style={styles.calloutTitle}>{formatTextoLiso(record.content || '')}</Text>
            </View>
          );
          case 'list': return (
            <View key={recIndex} style={styles.listItem}>
              {String(record.content || '').split('\n').filter(Boolean).map((line, li) => (
                <Text key={li} style={styles.listBullet}>• {formatTextoLiso(line)}</Text>
              ))}
            </View>
          );
          case 'table': {
            const headers = record.tableHeaders || [];
            const rows = record.tableRows || [];
            return (
              <View key={recIndex} style={styles.table}>
                <View style={styles.tableHeader}>
                  {headers.map((h, hi) => (
                    <Text key={hi} style={{ ...styles.tableHeader, marginRight: 8 }}>{h}</Text>
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
            const caption = record.imageCaption || '';
            return (
              <View key={recIndex} style={{ textAlign: 'center', margin: 8 }}>
                {imgSrc && <Image style={{ maxWidth: 360, maxHeight: 260, objectFit: 'contain', alignSelf: 'center' }} src={imgSrc} />}
                {caption && <Text style={styles.imageCaption}>{formatTextoLiso(caption)}</Text>}
              </View>
            );
          }
          case 'bibliography_item': {
            const bibIndex = section.records
              .slice(0, recIndex)
              .filter((r) => r.type === 'bibliography_item').length;
            const cite = formatEditorialCitation(
              record,
              rawDesign.bibliographyStyle || rawDesign.normId || pdfPreset.bibliographyStyle,
              bibIndex,
            );
            const useHanging =
              cite.usesHangingIndent && rawDesign.bibliographyHangingIndent !== false;
            return (
              <View
                key={recIndex}
                style={{
                  ...styles.bibItemWrap,
                  paddingLeft: useHanging ? 18 : 0,
                }}
              >
                <Text
                  style={{
                    ...styles.bibText,
                    textIndent: useHanging ? -18 : 0,
                  }}
                >
                  {cite.prefixText}
                  {cite.italicSegment ? (
                    <Text style={{ fontFamily: italicFont }}>{cite.italicSegment}</Text>
                  ) : null}
                  {cite.suffixText ? ` ${cite.suffixText}` : ''}
                </Text>
              </View>
            );
          }
          case 'qr_or_break': {
            if (record.isBreak) return <Text key={recIndex} break />;
            if (record.qrCode) return (
              <Image key={recIndex} style={styles.qrCode} src={record.qrCode} />
            );
            return <Text key={recIndex} style={{ opacity: 0 }} />;
          }
          default: return <Text key={recIndex} style={styles.bodyText}>{formatTextoLiso(record.content || '')}</Text>;
        }
      })}
      {rawDesign.pageNumbers !== false && (
        <Text
          fixed
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `${model.title} · Página ${pageNumber} de ${totalPages}`
          }
        />
      )}
      <AnchorMarker id={`ANCHOR_END:${section.id}`} active={interactiveAnchors} />
      {isBibSection && <AnchorMarker id="ANCHOR_END:editorial_bibliografia" active={interactiveAnchors} />}
      {secIndex === 0 && <AnchorMarker id="ANCHOR_END:editorial_secciones" active={interactiveAnchors} />}
    </Page>
    );
  });

  const fallbackEmptyPage = !coverPage && !tocPage && sectionPages.length === 0 ? (
    <Page size={resolvedPageSize} style={styles.page}>
      <Text style={styles.sectionTitle}>{formatTextoLiso(model.title)}</Text>
      <Text style={styles.bodyText}>Agregá secciones o activá la carátula desde el panel lateral para comenzar tu publicación.</Text>
    </Page>
  ) : null;

  return (
    <Document title={model.title} author={coverAuthorText || 'EditorLee'} creator="LEECV" producer="LEECV">
      {coverPage}
      {tocPage}
      {sectionPages}
      {fallbackEmptyPage}
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
    interactiveAnchors: false,
  });
  const blob = await pdf(docElement as any).toBlob();
  const safeTitle = (draft.metadata?.title || 'Publicacion-Editorial')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .slice(0, 50);
  downloadBlob(blob, `${safeTitle}.pdf`);
  return true;
});