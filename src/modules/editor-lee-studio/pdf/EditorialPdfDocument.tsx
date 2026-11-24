import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { getPageSize } from '../../../shared/core/pdf-engine/layers/page/pageSizes';
import {
  EditorialSection,
  EditorialRecord,
  EditorialPresetId,
  EditorialCoverMode,
  EditorialDesignConfig,
  EditorialTocConfig,
  EditorialManifestRules,
  EditorialLegalFields,
  EditorialMetadata,
} from '../domain/editorialTypes';
import {
  EditorialPreset,
  getEditorialPreset,
  DEFAULT_EDITORIAL_PRESET,
} from '../domain/editorialPresetCatalog';
import { registerPdfCategoryExporter } from '../../../shared/core/pdf-engine/pdfCategoryRegistry';
import { renderEditorialPdfWithExactToc } from './editorialTwoPassRenderer';
import {
  partitionRecordsIntoColumnBands,
  splitTextAroundImage,
} from '../domain/editorialLayoutEngines';
import { downloadBlob } from '../../../shared/core/utils/downloadUtils';
import { EditorialPdfCoverPage, EditorialSectionDividerPage } from './EditorialPdfCovers';
import { resolveEditorialSectionCoverState } from '../domain/sanitizeEditorialData';
import { resolveSectionBadgeLabel } from '../domain/editorialDockEngine';
import {
  normalizeBibliographyStyle,
  collectBibliographyFromSections,
  computeCitationAppearanceOrder,
  formatEditorialCitation,
  resolveInlineCitationsInText,
  syncSectionsBibliographyOrder,
} from '../domain/editorialCitationFormatter';
import { resolveEditorialNormMetrics } from '../domain/editorialNormEngine';
import {
  sanitizeEditorialText,
  stripTrailingHeaderPunctuation,
} from '../domain/editorialTypographyEngine';
import {
  formatEditorialDisplayPageNumber,
  formatTocAnchorToken,
  isEditorialPreliminarySection,
  toLowerRoman,
} from '../domain/editorialTocResolver';
import {
  EditorialCalloutBlock,
  EditorialEpigraphBlock,
  EditorialFigurePlaceholderBlock,
  EditorialFootnoteListBlock,
  EditorialPoemBlock,
  EditorialRichText,
  EditorialTableBlock,
  resolveEditorialPdfFontStyles,
} from './EditorialBlockPrimitives';

interface SectionRenderModel {
  id: string;
  title: string;
  raw: EditorialSection;
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

export interface EditorialDocumentDesign extends EditorialDesignConfig {
  pageSizeId?: string;
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  gutter?: number;
}

export interface EditorialPdfDocumentProps {
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
  /** Mapa pre-resuelto `{ tocAnchorId -> folioVisible }` de la pasada 1. */
  resolvedTocMap?: Record<string, string>;
  /** Página física 1-indexada donde comienza el cuerpo principal (reinicio arábigo `1`). */
  bodyStartPage?: number;
  /** Emite tokens `__TOC_ID:<id>__` invisibles para el escaneo con pdfjs-dist. */
  emitTocAnchors?: boolean;
}

function toPdfPageSize(pageSizeId: string): 'A4' | 'A5' | 'LETTER' | [number, number] {
  if (pageSizeId === 'a4') return 'A4';
  if (pageSizeId === 'a5') return 'A5';
  if (pageSizeId === 'carta' || pageSizeId === 'legal') return 'LETTER';
  const def = getPageSize(pageSizeId);
  return [def.widthPt, def.heightPt];
}

const AnchorMarker = ({ id, active }: { id: string; active?: boolean }) =>
  active ? <Text style={{ fontSize: 1, color: '#ffffff', opacity: 0.001 }}>{id}</Text> : null;

const TocMarker = ({ id, emit }: { id: string; emit?: boolean }) =>
  emit ? (
    <Text style={{ fontSize: 1, color: '#ffffff', opacity: 0.001, lineHeight: 1 }}>
      {formatTocAnchorToken(id)}
    </Text>
  ) : null;

type MasterPageMode = 'clean' | 'preliminary' | 'body';

function resolveMasterPageMode(section: EditorialSection): MasterPageMode {
  if (section.masterPageMode && section.masterPageMode !== 'auto') {
    return section.masterPageMode;
  }
  if (section.sectionKey === 'portadilla' || section.sectionKey === 'dedicatoria') {
    return 'clean';
  }
  if (isEditorialPreliminarySection(section)) {
    return 'preliminary';
  }
  return 'body';
}

/**
 * Motor PDF Editorial Blindado de EditorLee (PR 1 — V3.8.0).
 */
export const EditorialPdfDocument: React.FC<EditorialPdfDocumentProps> = ({
  data,
  preset,
  interactiveAnchors = false,
  resolvedTocMap,
  bodyStartPage = 1,
  emitTocAnchors = false,
}) => {
  const pdfPreset = getEditorialPreset(preset) || DEFAULT_EDITORIAL_PRESET;
  const rawDesign: EditorialDocumentDesign = (data?.design || {}) as EditorialDocumentDesign;
  const resolvedPageSizeId = rawDesign.pageSizeId || rawDesign.pageSize || pdfPreset.pageSize || 'a4';
  const resolvedFontSize =
    Number(rawDesign.typography?.fontSize) > 0
      ? Number(rawDesign.typography.fontSize)
      : pdfPreset.typography.fontSize;
  const resolvedLineHeight =
    Number(rawDesign.typography?.lineHeight) > 0
      ? Number(rawDesign.typography.lineHeight)
      : pdfPreset.typography.lineHeight;
  const rawFontFamily = rawDesign.typography?.fontFamily || pdfPreset.typography.fontFamily;

  const { styles: fontStyles, isUnicodeFont } = resolveEditorialPdfFontStyles(rawFontFamily);
  const baseFont = fontStyles.regular.fontFamily;
  const boldFont = fontStyles.bold.fontFamily;
  const italicFont = fontStyles.italic.fontFamily;

  const activeBibStyle = normalizeBibliographyStyle(
    rawDesign.bibliographyStyle || rawDesign.normId || pdfPreset.bibliographyStyle,
  );
  const normMetrics = resolveEditorialNormMetrics({ ...data, design: rawDesign });
  const effectiveStructuralNorm = normMetrics.structuralNormId;

  const usePrelimRoman = rawDesign.preliminaryRomanNumerals !== false;
  const preventRunts = rawDesign.preventRunts !== false;
  const headerMode = rawDesign.headerMode || 'book_title';
  const footerMode = rawDesign.footerMode || 'folio_only';

  const visibleSections = (data?.sections || []).filter((s) => s.visible !== false);
  const syncedVisibleSections = syncSectionsBibliographyOrder(visibleSections, activeBibStyle);
  const { map: bibMap } = collectBibliographyFromSections(syncedVisibleSections);
  const appearanceMap = computeCitationAppearanceOrder(syncedVisibleSections);

  const resolveRecordText = (rawText: string) =>
    resolveInlineCitationsInText(rawText, bibMap, activeBibStyle, appearanceMap);

  const cleanBookTitle = stripTrailingHeaderPunctuation(
    sanitizeEditorialText(data?.metadata?.title || 'Mi obra', { targetFontIsUnicode: isUnicodeFont }),
  ) || 'Mi obra';

  const model: EditorialRenderModel = {
    title: cleanBookTitle,
    preset: pdfPreset,
    design: rawDesign,
    sections: syncedVisibleSections.map((s) => ({
      id: s.id,
      title: s.title,
      raw: s,
      records: Array.isArray(s.records) ? s.records : [],
    })),
    cover: data?.cover || {
      mode: pdfPreset.coverMode || 'libro',
      title: cleanBookTitle,
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

  const MM_TO_PT = 2.83465;
  const marginTopPt = Math.max(36, normMetrics.marginsMm.top * MM_TO_PT);
  const marginBottomPt = Math.max(38, normMetrics.marginsMm.bottom * MM_TO_PT);
  const marginLeftPt = Math.max(32, (rawDesign.gutter ?? normMetrics.marginsMm.gutter ?? normMetrics.marginsMm.left) * MM_TO_PT);
  const marginRightPt = Math.max(32, normMetrics.marginsMm.right * MM_TO_PT);
  const resolvedPageSize = toPdfPageSize(resolvedPageSizeId);
  const pageWidthPt = resolvedPageSizeId === 'a5' ? 419.53 : resolvedPageSizeId === 'carta' ? 612 : 595.28;
  const usableWidthPt = Math.max(220, pageWidthPt - marginLeftPt - marginRightPt);

  const paragraphIndentPt = normMetrics.firstLineIndentPt;
  const hangingIndentPt = normMetrics.hangingIndentPt;

  const styles = StyleSheet.create({
    page: {
      ...fontStyles.regular,
      backgroundColor: '#FFFFFF',
      color: '#111827',
      paddingTop: marginTopPt,
      paddingBottom: marginBottomPt,
      paddingLeft: marginLeftPt,
      paddingRight: marginRightPt,
      fontSize: resolvedFontSize,
    },
    kickerLabel: {
      ...fontStyles.bold,
      fontSize: 9.5,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      color: '#475569',
      marginBottom: 4,
    },
    sectionTitle: {
      fontSize: 18,
      ...fontStyles.bold,
      marginTop: 6,
      marginBottom: 8,
      color: '#0F172A',
      lineHeight: 1.22,
    },
    subtitle: {
      ...fontStyles.bold,
      fontSize: Math.round(resolvedFontSize * 1.18),
      color: '#1E293B',
      marginTop: 12,
      marginBottom: 5,
      lineHeight: 1.28,
    },
    bodyText: {
      ...fontStyles.regular,
      fontSize: resolvedFontSize,
      lineHeight: resolvedLineHeight,
      marginBottom: normMetrics.paragraphSpacingAfterPt,
      textIndent: paragraphIndentPt,
      textAlign: normMetrics.bodyAlignment,
      color: '#111827',
    },
    quoteWrap: {
      borderLeftWidth: 2.5,
      borderLeftColor: '#94A3B8',
      backgroundColor: '#F8FAFC',
      paddingVertical: 8,
      paddingHorizontal: 12,
      marginLeft: effectiveStructuralNorm !== 'libre' ? 36 : 16,
      marginVertical: 9,
    },
    bibItemWrap: {
      marginBottom: normMetrics.bibliographyEntryGapPt,
    },
    bibText: {
      ...fontStyles.regular,
      fontSize: resolvedFontSize,
      lineHeight: normMetrics.bibliographyLineHeight,
      color: '#111827',
    },
    sectionDivider: {
      borderTopWidth: 1,
      borderTopColor: '#E2E8F0',
      marginTop: 6,
      marginBottom: 14,
    },
    runningHeader: {
      position: 'absolute',
      top: Math.max(14, marginTopPt - 22),
      left: marginLeftPt,
      right: marginRightPt,
      borderBottomWidth: 0.4,
      borderBottomColor: '#E2E8F0',
      paddingBottom: 3,
      fontSize: 8.5,
      ...fontStyles.italic,
      color: '#64748B',
      textAlign: 'right',
    },
    footerClean: {
      position: 'absolute',
      bottom: 16,
      left: marginLeftPt,
      right: marginRightPt,
      fontSize: 9,
      ...fontStyles.regular,
      color: '#64748B',
      textAlign: 'center',
    },
    listItem: {
      marginBottom: 6,
      paddingLeft: 10,
    },
    imageCaption: {
      fontSize: 9,
      ...fontStyles.italic,
      color: '#475569',
      textAlign: 'center',
      marginTop: 4,
    },
    qrCode: {
      width: 44,
      height: 44,
    },
  });

  const showCover = model.cover.mode && model.cover.mode !== 'sin-caratula';
  const coverTitleText = sanitizeEditorialText(
    data?.metadata?.title || model.cover.title || model.title,
    { targetFontIsUnicode: isUnicodeFont },
  );
  const coverSubtitleText = sanitizeEditorialText(
    data?.metadata?.subtitle || model.cover.subtitle || '',
    { targetFontIsUnicode: isUnicodeFont },
  );
  const coverAuthorText = sanitizeEditorialText(
    data?.metadata?.author || model.cover.author || '',
    { targetFontIsUnicode: isUnicodeFont },
  );
  const coverEditorialText = sanitizeEditorialText(
    data?.metadata?.editorial || model.cover.editor || '',
    { targetFontIsUnicode: isUnicodeFont },
  );

  // Portada (Master Page: clean — sin encabezados ni folio)
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

  const tocListedSections = model.sections.filter(
    (s) => s.raw.includeInToc !== false && s.raw.sectionKey !== 'indice',
  );
  const showToc = Boolean(model.tocConfig?.enabled && tocListedSections.length > 0);

  const tocPage = showToc ? (
    <Page key="toc" size={resolvedPageSize} style={styles.page}>
      <AnchorMarker id="ANCHOR_START:editorial_toc" active={interactiveAnchors} />
      <Text
        minPresenceAhead={56}
        style={[fontStyles.bold, { fontSize: 18, color: '#0F172A', marginBottom: 14 }]}
      >
        {sanitizeEditorialText(model.tocConfig?.title || 'Índice General', {
          targetFontIsUnicode: isUnicodeFont,
        })}
      </Text>
      <View style={styles.sectionDivider} />

      {tocListedSections.map((section, si) => {
        const pageLabel = resolvedTocMap?.[section.id] || String(si + (showCover ? 3 : 2));
        const subtitleRecords =
          model.tocConfig.showSubtitles !== false
            ? section.records.filter((r) => r.type === 'subtitle' && (r.content || '').trim())
            : [];

        return (
          <React.Fragment key={`toc-sec-${section.id}`}>
            <View
              wrap={false}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-end',
                marginTop: si > 0 ? 5 : 2,
                marginBottom: 4,
              }}
            >
              <Text style={[fontStyles.bold, { fontSize: 11, color: '#0F172A' }]}>
                {stripTrailingHeaderPunctuation(
                  sanitizeEditorialText(section.title || `Sección ${si + 1}`, {
                    targetFontIsUnicode: isUnicodeFont,
                  }),
                )}
              </Text>
              <View
                style={{
                  flexGrow: 1,
                  borderBottomWidth: 0.6,
                  borderBottomStyle: 'dotted',
                  borderBottomColor: '#CBD5E1',
                  marginHorizontal: 8,
                  marginBottom: 2.5,
                }}
              />
              <Text
                style={[
                  fontStyles.bold,
                  { fontSize: 10.5, color: '#334155', minWidth: 20, textAlign: 'right' },
                ]}
              >
                {pageLabel}
              </Text>
            </View>

            {subtitleRecords.map((subRec, ri) => {
              const subAnchorId = `${section.id}-${subRec.id}`;
              const subPageLabel = resolvedTocMap?.[subAnchorId] || pageLabel;
              return (
                <View
                  key={`toc-sub-${subRec.id}-${ri}`}
                  wrap={false}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-end',
                    marginLeft: 16,
                    marginBottom: 3,
                  }}
                >
                  <Text style={[fontStyles.regular, { fontSize: 9.8, color: '#475569' }]}>
                    {stripTrailingHeaderPunctuation(
                      sanitizeEditorialText(subRec.content || 'Apartado', {
                        targetFontIsUnicode: isUnicodeFont,
                      }),
                    )}
                  </Text>
                  <View
                    style={{
                      flexGrow: 1,
                      borderBottomWidth: 0.5,
                      borderBottomStyle: 'dotted',
                      borderBottomColor: '#E2E8F0',
                      marginHorizontal: 8,
                      marginBottom: 2.5,
                    }}
                  />
                  <Text
                    style={[
                      fontStyles.regular,
                      { fontSize: 9.5, color: '#475569', minWidth: 18, textAlign: 'right' },
                    ]}
                  >
                    {subPageLabel}
                  </Text>
                </View>
              );
            })}
          </React.Fragment>
        );
      })}

      {rawDesign.pageNumbers !== false && (
        <Text
          fixed
          style={styles.footerClean}
          render={({ pageNumber }) =>
            usePrelimRoman ? toLowerRoman(pageNumber) : String(pageNumber)
          }
        />
      )}
      <AnchorMarker id="ANCHOR_END:editorial_toc" active={interactiveAnchors} />
    </Page>
  ) : null;

  const badgeCounters = { prelim: 0, body: 0, annex: 0 };

  const renderRecordsList = (
    records: EditorialRecord[],
    sectionId: string,
    sectionRecordsForBib: EditorialRecord[],
    sectionCols: 1 | 2,
    colUsableWidthPt: number,
  ): React.ReactElement[] => {
    const elements: React.ReactElement[] = [];

    for (let idx = 0; idx < records.length; idx++) {
      const record = records[idx];
      const key = `${sectionId}_${record.id || idx}_${idx}`;

      // Envoltura de texto junto a imagen (`wrap-left` / `wrap-right`) consumiendo el párrafo contiguo
      if (
        record.type === 'image' &&
        (record.imageLayoutMode === 'wrap-left' || record.imageLayoutMode === 'wrap-right') &&
        records[idx + 1]?.type === 'paragraph'
      ) {
        const nextPara = records[idx + 1];
        const imgPct = record.imageWidthPct ?? 42;
        const wrapped = splitTextAroundImage(resolveRecordText(nextPara.content || ''), {
          usableWidthPt: colUsableWidthPt,
          imageWidthPct: imgPct,
          gapPt: 14,
          fontSizePt: resolvedFontSize,
          lineHeight: resolvedLineHeight,
        });
        const imgWidthPt = Math.max(80, Math.round((colUsableWidthPt * imgPct) / 100));
        const isLeft = record.imageLayoutMode === 'wrap-left';

        elements.push(
          <React.Fragment key={key}>
            <View
              wrap={false}
              style={{
                flexDirection: isLeft ? 'row' : 'row-reverse',
                gap: 12,
                alignItems: 'flex-start',
                marginVertical: 8,
              }}
            >
              <View style={{ width: imgWidthPt }}>
                {record.imagePath ? (
                  <Image style={{ width: '100%', objectFit: 'contain' }} src={record.imagePath} />
                ) : null}
                {record.imageCaption ? (
                  <Text style={styles.imageCaption}>
                    {sanitizeEditorialText(record.imageCaption, { targetFontIsUnicode: isUnicodeFont })}
                  </Text>
                ) : null}
              </View>
              <View style={{ flex: 1 }}>
                <EditorialRichText
                  text={wrapped.sideText}
                  fontStyles={fontStyles}
                  isUnicodeFont={isUnicodeFont}
                  preventRunts={preventRunts}
                  style={styles.bodyText}
                />
              </View>
            </View>
            {wrapped.belowText ? (
              <EditorialRichText
                text={wrapped.belowText}
                fontStyles={fontStyles}
                isUnicodeFont={isUnicodeFont}
                preventRunts={preventRunts}
                style={styles.bodyText}
              />
            ) : null}
          </React.Fragment>,
        );
        idx++;
        continue;
      }

      switch (record.type) {
        case 'paragraph': {
          const prevType = idx > 0 ? records[idx - 1]?.type : undefined;
          const suppressIndentHere =
            normMetrics.suppressFirstParagraphIndent &&
            (idx === 0 ||
              prevType === 'subtitle' ||
              prevType === 'epigraph' ||
              prevType === 'qr_or_break');
          elements.push(
            <View key={key} style={{ marginBottom: 0 }}>
              <EditorialRichText
                text={resolveRecordText(record.content || '')}
                fontStyles={fontStyles}
                isUnicodeFont={isUnicodeFont}
                preventRunts={preventRunts}
                style={
                  suppressIndentHere
                    ? { ...styles.bodyText, textIndent: 0 }
                    : styles.bodyText
                }
              />
            </View>,
          );
          break;
        }

        case 'subtitle':
          elements.push(
            <View key={key} minPresenceAhead={52}>
              <TocMarker id={`${sectionId}-${record.id}`} emit={emitTocAnchors} />
              <Text
                minPresenceAhead={48}
                style={[
                  styles.subtitle,
                  record.subtitleLevel === 3
                    ? { fontSize: Math.round(resolvedFontSize * 1.06), color: '#334155' }
                    : {},
                ]}
              >
                {stripTrailingHeaderPunctuation(
                  sanitizeEditorialText(resolveRecordText(record.content || ''), {
                    targetFontIsUnicode: isUnicodeFont,
                  }),
                )}
              </Text>
            </View>,
          );
          break;

        case 'quote':
          elements.push(
            <View key={key} style={styles.quoteWrap}>
              <EditorialRichText
                text={resolveRecordText(record.content || '')}
                fontStyles={fontStyles}
                isUnicodeFont={isUnicodeFont}
                preserveLineBreaks={Boolean(record.preserveLineBreaks)}
                style={[
                  fontStyles.italic,
                  {
                    fontSize: resolvedFontSize,
                    lineHeight: normMetrics.blockQuoteLineHeight,
                    color: '#1E293B',
                  },
                ]}
              />
              {record.quoteAttribution ? (
                <Text
                  style={[
                    fontStyles.regular,
                    { fontSize: 9, color: '#475569', marginTop: 4, textAlign: 'right' },
                  ]}
                >
                  — {sanitizeEditorialText(record.quoteAttribution, { targetFontIsUnicode: isUnicodeFont })}
                </Text>
              ) : null}
            </View>,
          );
          break;

        case 'epigraph':
          elements.push(
            <EditorialEpigraphBlock
              key={key}
              record={record}
              fontStyles={fontStyles}
              isUnicodeFont={isUnicodeFont}
              baseFontSize={resolvedFontSize}
            />,
          );
          break;

        case 'callout':
          elements.push(
            <EditorialCalloutBlock
              key={key}
              record={{ ...record, content: resolveRecordText(record.content || '') }}
              fontStyles={fontStyles}
              isUnicodeFont={isUnicodeFont}
              baseFontSize={resolvedFontSize}
              lineHeight={resolvedLineHeight}
            />,
          );
          break;

        case 'poem':
          elements.push(
            <EditorialPoemBlock
              key={key}
              record={record}
              fontStyles={fontStyles}
              isUnicodeFont={isUnicodeFont}
              baseFontSize={resolvedFontSize}
              lineHeight={resolvedLineHeight}
            />,
          );
          break;

        case 'figure_placeholder':
          elements.push(
            <EditorialFigurePlaceholderBlock
              key={key}
              record={record}
              fontStyles={fontStyles}
              isUnicodeFont={isUnicodeFont}
            />,
          );
          break;

        case 'footnote_list':
          elements.push(
            <EditorialFootnoteListBlock
              key={key}
              record={record}
              fontStyles={fontStyles}
              isUnicodeFont={isUnicodeFont}
            />,
          );
          break;

        case 'list': {
          const lines = String(record.content || '')
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean);
          elements.push(
            <View key={key} style={styles.listItem}>
              {lines.map((line, li) => {
                const alreadyNumbered = /^(?:\d+[.)]\s|•\s)/.test(line);
                const prefix = alreadyNumbered
                  ? ''
                  : record.listStyle === 'numbered'
                    ? `${li + 1}. `
                    : '• ';
                return (
                  <View key={`li-${li}`} style={{ marginBottom: 3 }}>
                    <EditorialRichText
                      text={`${prefix}${resolveRecordText(line)}`}
                      fontStyles={fontStyles}
                      isUnicodeFont={isUnicodeFont}
                      style={[
                        fontStyles.regular,
                        { fontSize: resolvedFontSize, lineHeight: resolvedLineHeight },
                      ]}
                    />
                  </View>
                );
              })}
            </View>,
          );
          break;
        }

        case 'table':
          elements.push(
            <EditorialTableBlock
              key={key}
              record={record}
              fontStyles={fontStyles}
              isUnicodeFont={isUnicodeFont}
              baseFontSize={resolvedFontSize}
              sectionColumns={sectionCols}
            />,
          );
          break;

        case 'image':
          elements.push(
            <View key={key} wrap={false} style={{ alignItems: 'center', marginVertical: 10 }}>
              {record.imagePath ? (
                <Image
                  style={{ maxWidth: Math.min(380, colUsableWidthPt), maxHeight: 260, objectFit: 'contain' }}
                  src={record.imagePath}
                />
              ) : null}
              {record.imageCaption ? (
                <Text style={styles.imageCaption}>
                  {sanitizeEditorialText(record.imageCaption, { targetFontIsUnicode: isUnicodeFont })}
                </Text>
              ) : null}
            </View>,
          );
          break;

        case 'bibliography_item': {
          const globalBibIdx = sectionRecordsForBib
            .slice(0, sectionRecordsForBib.indexOf(record))
            .filter((r) => r.type === 'bibliography_item').length;
          const cite = formatEditorialCitation(
            record,
            rawDesign.bibliographyStyle || rawDesign.normId || pdfPreset.bibliographyStyle,
            Math.max(0, globalBibIdx),
          );
          const useHanging =
            cite.usesHangingIndent && rawDesign.bibliographyHangingIndent !== false;
          const suffixSep =
            cite.suffixText && /^[.,;:)\]]/.test(cite.suffixText) ? '' : ' ';

          if (cite.usesTabulatedNumberIndent && cite.citationMarkerLabel) {
            const strippedPrefix = cite.prefixText.startsWith(`${cite.citationMarkerLabel} `)
              ? cite.prefixText.slice(cite.citationMarkerLabel.length + 1)
              : cite.prefixText;
            elements.push(
              <View key={key} wrap={false} style={styles.bibItemWrap}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <Text
                    style={[
                      fontStyles.bold,
                      {
                        width: 26,
                        fontSize: resolvedFontSize,
                        lineHeight: normMetrics.bibliographyLineHeight,
                        color: '#111827',
                      },
                    ]}
                  >
                    {cite.citationMarkerLabel}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text orphans={2} widows={2} style={styles.bibText}>
                      {sanitizeEditorialText(strippedPrefix, { targetFontIsUnicode: isUnicodeFont })}
                      {cite.italicSegment ? (
                        <Text style={fontStyles.italic}>
                          {sanitizeEditorialText(cite.italicSegment, { targetFontIsUnicode: isUnicodeFont })}
                        </Text>
                      ) : null}
                      {cite.suffixText
                        ? `${suffixSep}${sanitizeEditorialText(cite.suffixText, { targetFontIsUnicode: isUnicodeFont })}`
                        : ''}
                    </Text>
                  </View>
                </View>
                {rawDesign.annotatedBibliography && record.bibAnnotation ? (
                  <Text
                    style={[
                      fontStyles.italic,
                      {
                        fontSize: Math.max(8.5, resolvedFontSize - 1.5),
                        color: '#475569',
                        marginTop: 2,
                        marginLeft: 36,
                        lineHeight: Math.min(1.45, normMetrics.bibliographyLineHeight),
                      },
                    ]}
                  >
                    {sanitizeEditorialText(record.bibAnnotation, { targetFontIsUnicode: isUnicodeFont })}
                  </Text>
                ) : null}
              </View>,
            );
            break;
          }

          elements.push(
            <View
              key={key}
              wrap={false}
              style={{ ...styles.bibItemWrap, paddingLeft: useHanging ? hangingIndentPt : 0 }}
            >
              <Text
                orphans={2}
                widows={2}
                style={{ ...styles.bibText, textIndent: useHanging ? -hangingIndentPt : 0 }}
              >
                {sanitizeEditorialText(cite.prefixText, { targetFontIsUnicode: isUnicodeFont })}
                {cite.italicSegment ? (
                  <Text style={fontStyles.italic}>
                    {sanitizeEditorialText(cite.italicSegment, { targetFontIsUnicode: isUnicodeFont })}
                  </Text>
                ) : null}
                {cite.suffixText
                  ? `${suffixSep}${sanitizeEditorialText(cite.suffixText, { targetFontIsUnicode: isUnicodeFont })}`
                  : ''}
              </Text>
              {rawDesign.annotatedBibliography && record.bibAnnotation ? (
                <Text
                  style={[
                    fontStyles.italic,
                    {
                      fontSize: Math.max(8.5, resolvedFontSize - 1.5),
                      color: '#475569',
                      marginTop: 2,
                      marginLeft: 36,
                      lineHeight: Math.min(1.45, normMetrics.bibliographyLineHeight),
                    },
                  ]}
                >
                  {sanitizeEditorialText(record.bibAnnotation, { targetFontIsUnicode: isUnicodeFont })}
                </Text>
              ) : null}
            </View>,
          );
          break;
        }

        case 'qr_or_break':
          if (record.isBreak) {
            elements.push(<Text key={key} break />);
          } else if (record.qrCode) {
            elements.push(<Image key={key} style={styles.qrCode} src={record.qrCode} />);
          }
          break;

        default:
          elements.push(
            <EditorialRichText
              key={key}
              text={resolveRecordText(record.content || '')}
              fontStyles={fontStyles}
              isUnicodeFont={isUnicodeFont}
              preventRunts={preventRunts}
              style={styles.bodyText}
            />,
          );
          break;
      }
    }

    return elements;
  };

  const sectionPages = model.sections.flatMap((section, secIndex) => {
    const rawSec = syncedVisibleSections[secIndex];
    const { badgeLabel } = resolveSectionBadgeLabel(rawSec || (section as any), badgeCounters);
    const secCoverState = resolveEditorialSectionCoverState(rawSec, rawDesign, model.cover);
    const masterMode = resolveMasterPageMode(rawSec);
    const isBibSection =
      rawSec?.sectionKey === 'bibliografia' ||
      section.records.some((r) => r.type === 'bibliography_item');

    const pagesForThisSection: React.ReactElement[] = [];

    if (secCoverState.enabled) {
      const autoKicker =
        secCoverState.kicker ||
        rawSec?.kickerLabel ||
        (rawSec?.sectionKey === 'unidad'
          ? `UNIDAD ${badgeLabel}`
          : rawSec?.category === 'cierre'
            ? `ANEXO ${badgeLabel}`
            : rawSec?.category === 'preliminares'
              ? `PRELIMINAR ${badgeLabel}`
              : `CAPÍTULO ${badgeLabel}`);

      pagesForThisSection.push(
        <EditorialSectionDividerPage
          key={`${section.id}_divider`}
          pageSize={resolvedPageSize}
          coverStyleId={secCoverState.coverStyleId}
          coverPaletteKey={secCoverState.coverPaletteKey}
          fallbackPalette={{
            primary: '#1E293B',
            secondary: '#475569',
            accent: '#0F172A',
            text: '#0F172A',
            textOnPrimary: '#FFFFFF',
            background: '#FFFFFF',
          }}
          kicker={autoKicker}
          title={section.title || `Sección ${secIndex + 1}`}
          subtitle={secCoverState.subtitle}
          epigraphText={rawSec?.epigraphText}
          epigraphAuthor={rawSec?.epigraphAuthor}
          tocMarker={<TocMarker id={section.id} emit={emitTocAnchors} />}
          baseFont={baseFont}
          boldFont={boldFont}
          italicFont={italicFont}
        />,
      );

      if (secCoverState.blankBackPage) {
        pagesForThisSection.push(
          <Page key={`${section.id}_divider_blank`} size={resolvedPageSize} style={styles.page}>
            <Text style={{ opacity: 0 }}> </Text>
          </Page>,
        );
      }
    }

    const sectionCols: 1 | 2 = rawSec?.columnCount === 2 || rawSec?.columns === 2 ? 2 : 1;
    const cleanSectionTitle = stripTrailingHeaderPunctuation(
      sanitizeEditorialText(section.title || `Sección ${secIndex + 1}`, {
        targetFontIsUnicode: isUnicodeFont,
      }),
    );

    const runningHeaderLabel =
      headerMode === 'none'
        ? ''
        : headerMode === 'chapter_title'
          ? stripTrailingHeaderPunctuation(
              sanitizeEditorialText(rawSec?.runningHeaderText || cleanSectionTitle, {
                targetFontIsUnicode: isUnicodeFont,
              }),
            )
          : stripTrailingHeaderPunctuation(
              sanitizeEditorialText(rawSec?.runningHeaderText || cleanBookTitle, {
                targetFontIsUnicode: isUnicodeFont,
              }),
            );

    const colGapPt = (rawSec?.columnGapMm ?? 6) * MM_TO_PT;
    const twoColWidthPt = Math.max(120, (usableWidthPt - colGapPt) / 2);

    const sectionContentNodes: React.ReactElement[] =
      sectionCols === 2
        ? partitionRecordsIntoColumnBands(section.records, {
            columns: 2,
            usableWidthPt,
            columnGapPt: colGapPt,
            fontSizePt: resolvedFontSize,
            lineHeight: resolvedLineHeight,
            spanHeadingsFullWidth: rawSec?.spanHeadingsFullWidth !== false,
          }).map((band, bi) => {
            if (band.kind === 'full') {
              return (
                <React.Fragment key={`band-f-${bi}`}>
                  {renderRecordsList([band.record], section.id, section.records, 2, usableWidthPt)}
                </React.Fragment>
              );
            }
            return (
              <View
                key={`band-2c-${bi}`}
                style={{ flexDirection: 'row', gap: colGapPt, alignItems: 'flex-start' }}
              >
                <View style={{ width: twoColWidthPt }}>
                  {renderRecordsList(band.left, section.id, section.records, 2, twoColWidthPt)}
                </View>
                <View style={{ width: twoColWidthPt }}>
                  {renderRecordsList(band.right, section.id, section.records, 2, twoColWidthPt)}
                </View>
              </View>
            );
          })
        : renderRecordsList(section.records, section.id, section.records, 1, usableWidthPt);

    pagesForThisSection.push(
      <Page key={section.id} size={resolvedPageSize} style={styles.page}>
        <AnchorMarker id={`ANCHOR_START:${section.id}`} active={interactiveAnchors} />
        {!secCoverState.enabled && <TocMarker id={section.id} emit={emitTocAnchors} />}
        {isBibSection && <AnchorMarker id="ANCHOR_START:editorial_bibliografia" active={interactiveAnchors} />}
        {secIndex === 0 && <AnchorMarker id="ANCHOR_START:editorial_secciones" active={interactiveAnchors} />}
        {secIndex === model.sections.length - 1 && (
          <>
            <AnchorMarker id="ANCHOR_START:editorial_diseño" active={interactiveAnchors} />
            <AnchorMarker id="ANCHOR_START:editorial_metadata" active={interactiveAnchors} />
          </>
        )}

        {masterMode === 'body' && normMetrics.pageNumberPlacement === 'top-right' && rawDesign.pageNumbers !== false ? (
          <Text
            fixed
            style={[styles.runningHeader, { textAlign: 'right', borderBottomWidth: 0 }]}
            render={({ pageNumber }) => {
              const folio = formatEditorialDisplayPageNumber(pageNumber, bodyStartPage, usePrelimRoman);
              const authorSurname = coverAuthorText
                ? coverAuthorText.includes(',')
                  ? coverAuthorText.split(',')[0].trim()
                  : coverAuthorText.trim().split(/\s+/).slice(-1)[0]
                : '';
              return normMetrics.mlaAuthorSurnameHeader && authorSurname
                ? `${authorSurname} ${folio}`
                : folio;
            }}
          />
        ) : masterMode === 'body' && runningHeaderLabel ? (
          <Text fixed style={styles.runningHeader}>
            {runningHeaderLabel}
          </Text>
        ) : null}

        {normMetrics.structuralNormId === 'mla' && !showCover && secIndex === 0 && (coverAuthorText || data?.legalFields?.docente || data?.legalFields?.catedra) ? (
          <View style={{ marginBottom: 14 }}>
            {coverAuthorText ? <Text style={[styles.bodyText, { textIndent: 0 }]}>{coverAuthorText}</Text> : null}
            {data?.legalFields?.docente ? (
              <Text style={[styles.bodyText, { textIndent: 0 }]}>
                {sanitizeEditorialText(data.legalFields.docente, { targetFontIsUnicode: isUnicodeFont })}
              </Text>
            ) : null}
            {data?.legalFields?.catedra ? (
              <Text style={[styles.bodyText, { textIndent: 0 }]}>
                {sanitizeEditorialText(data.legalFields.catedra, { targetFontIsUnicode: isUnicodeFont })}
              </Text>
            ) : null}
            {data?.metadata?.year ? (
              <Text style={[styles.bodyText, { textIndent: 0 }]}>{String(data.metadata.year)}</Text>
            ) : null}
          </View>
        ) : null}

        {rawSec?.kickerLabel ? (
          <Text minPresenceAhead={72} style={styles.kickerLabel}>
            {sanitizeEditorialText(rawSec.kickerLabel, { targetFontIsUnicode: isUnicodeFont })}
          </Text>
        ) : null}

        <Text
          minPresenceAhead={56}
          style={[
            styles.sectionTitle,
            (effectiveStructuralNorm === 'apa7' || (isBibSection && normMetrics.bibliographyHeadingCentered))
              ? { textAlign: 'center', fontSize: Math.max(resolvedFontSize + 2, 14) }
              : {},
          ]}
        >
          {isBibSection && /^(?:bibliografía|bibliografia|referencias|obras citadas)$/i.test(cleanSectionTitle)
            ? normMetrics.bibliographyHeading
            : cleanSectionTitle}
        </Text>

        {rawSec?.epigraphText && !secCoverState.enabled ? (
          <EditorialEpigraphBlock
            record={{
              id: `${section.id}_epigraph`,
              type: 'epigraph',
              content: rawSec.epigraphText,
              quoteAttribution: rawSec.epigraphAuthor,
            }}
            fontStyles={fontStyles}
            isUnicodeFont={isUnicodeFont}
            baseFontSize={resolvedFontSize}
          />
        ) : null}

        {section.records.length > 0 && <View style={styles.sectionDivider} />}

        {sectionContentNodes}

        {rawDesign.pageNumbers !== false &&
          masterMode !== 'clean' &&
          !(masterMode === 'body' && normMetrics.pageNumberPlacement === 'top-right' && footerMode === 'folio_only') && (
          <Text
            fixed
            style={styles.footerClean}
            render={({ pageNumber }) => {
              if (masterMode === 'preliminary') {
                return usePrelimRoman ? toLowerRoman(pageNumber) : String(pageNumber);
              }
              const folio = formatEditorialDisplayPageNumber(pageNumber, bodyStartPage, usePrelimRoman);
              return footerMode === 'book_and_folio' ? `${cleanBookTitle} · ${folio}` : folio;
            }}
          />
        )}

        <AnchorMarker id={`ANCHOR_END:${section.id}`} active={interactiveAnchors} />
        {isBibSection && <AnchorMarker id="ANCHOR_END:editorial_bibliografia" active={interactiveAnchors} />}
        {secIndex === 0 && <AnchorMarker id="ANCHOR_END:editorial_secciones" active={interactiveAnchors} />}
      </Page>,
    );

    return pagesForThisSection;
  });

  const fallbackEmptyPage =
    !coverPage && !tocPage && sectionPages.length === 0 ? (
      <Page size={resolvedPageSize} style={styles.page}>
        <Text style={styles.sectionTitle}>{cleanBookTitle}</Text>
        <Text style={styles.bodyText}>
          Agregá secciones o activá la carátula desde el panel lateral para comenzar tu publicación.
        </Text>
      </Page>
    ) : null;

  return (
    <Document title={cleanBookTitle} author={coverAuthorText || 'EditorLee'} creator="LEECV" producer="LEECV">
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
  const result = await renderEditorialPdfWithExactToc(draft, preset.id as any, {
    interactiveAnchors: false,
    DocumentComponent: EditorialPdfDocument,
  });
  const safeTitle = (draft.metadata?.title || 'Publicacion-Editorial')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .slice(0, 50);
  downloadBlob(result.blob, `${safeTitle}.pdf`);
  return true;
});
