/**
 * Núcleo puro — Exportador Word (.docx) Íntegro de EditorLee (editorialDocxExporter.ts)
 *
 * Genera un archivo Microsoft Word (.docx) fiel a la maquetación configurada en EditorLee:
 * - Doble faz ('duplex'): `<w:mirrorMargins/>` real en `word/settings.xml`, encabezados y pies
 *   alternados par/impar (`evenAndOddHeaderAndFooters: true`) y saltos `SectionType.ODD_PAGE`
 *   cuando corresponde iniciar capítulos en página impar (derecha).
 * - Simple faz ('simplex'): márgenes fijos sin espejado, sin páginas impares forzadas y saltos
 *   `SectionType.NEXT_PAGE` o `SectionType.CONTINUOUS`.
 * - Encabezados y pies configurables con campos dinámicos reales (`PageNumber.CURRENT` / `TOTAL_PAGES`,
 *   incluyendo `Página X de Y`) y supresión en la primera hoja de cada capítulo (`titlePage: true`).
 * - Índice General / Tabla de Contenidos sincronizado con los folios calculados en el PDF.
 *
 * Importa `docx` y `jszip` dinámicamente para mantener 0 KB de impacto en el bundle inicial.
 */

import { getPageSize } from '../../../shared/core/pdf-engine/layers/page/pageSizes';
import { downloadBlob } from '../../../shared/core/utils/downloadUtils';
import {
  collectBibliographyFromSections,
  computeCitationAppearanceOrder,
  formatEditorialCitation,
  normalizeBibliographyStyle,
  resolveInlineCitationsInText,
  syncSectionsBibliographyOrder,
} from './editorialCitationFormatter';
import { resolveEditorialNormMetrics } from './editorialNormEngine';
import {
  resolveEffectiveEditorialPagination,
  resolveSectionEffectiveStartNewPage,
} from './editorialPaginationEngine';
import { DEFAULT_EDITORIAL_PRESET, getEditorialPreset } from './editorialPresetCatalog';
import { isEditorialPreliminarySection } from './editorialTocResolver';
import type { EditorialPresetId, EditorialRecord, EditorialSection } from './editorialTypes';

const MM_TO_TWIPS = 56.692913;
const PT_TO_TWIPS = 20;

function mmToTwips(mm: number): number {
  return Math.max(0, Math.round(mm * MM_TO_TWIPS));
}

function ptToTwips(pt: number): number {
  return Math.max(0, Math.round(pt * PT_TO_TWIPS));
}

function mapDocxFontFamily(rawFont: string): string {
  const lower = String(rawFont || '').toLowerCase();
  if (lower.includes('helvetica') || lower.includes('arial') || lower.includes('arimo') || lower.includes('sans')) {
    return 'Arial';
  }
  if (lower.includes('courier') || lower.includes('mono')) {
    return 'Courier New';
  }
  return 'Times New Roman';
}

function dataUrlToUint8Array(dataUrl: string): { bytes: Uint8Array; type: 'png' | 'jpg' | 'gif' | 'bmp' } | null {
  const match = String(dataUrl || '').match(/^data:image\/(png|jpeg|jpg|gif|bmp);base64,(.+)$/i);
  if (!match) return null;
  const rawType = match[1].toLowerCase();
  const type: 'png' | 'jpg' | 'gif' | 'bmp' = rawType === 'jpeg' ? 'jpg' : (rawType as any);
  const b64 = match[2];
  try {
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      arr[i] = bin.charCodeAt(i);
    }
    return { bytes: arr, type };
  } catch {
    return null;
  }
}

export interface BuildEditorialDocxOptions {
  resolvedTocMap?: Record<string, string>;
  courtesyBlankBeforeMap?: Record<string, boolean>;
}

/**
 * Construye el Blob `.docx` en memoria (reutilizable desde UI y desde Vitest).
 */
export async function buildEditorialDocxBlob(
  draft: any,
  options: BuildEditorialDocxOptions = {},
): Promise<{ blob: Blob; fileName: string }> {
  const docx = await import('docx');
  const JSZip = (await import('jszip')).default;

  const {
    AlignmentType,
    BorderStyle,
    Document,
    Footer,
    Header,
    HeadingLevel,
    ImageRun,
    NumberFormat,
    Packer,
    PageBreak,
    PageNumber,
    Paragraph,
    SectionType,
    ShadingType,
    Table,
    TableCell,
    TableRow,
    TabStopPosition,
    TabStopType,
    TextRun,
    WidthType,
  } = docx;

  const design = draft?.design || {};
  const presetId = (design.presetId || DEFAULT_EDITORIAL_PRESET.id) as EditorialPresetId;
  const preset = getEditorialPreset(presetId) || DEFAULT_EDITORIAL_PRESET;
  const pagination = resolveEffectiveEditorialPagination(draft);
  const normMetrics = resolveEditorialNormMetrics(draft);
  const resolvedBibStyle = normalizeBibliographyStyle(
    design.bibliographyStyle || design.normId || preset.bibliographyStyle,
  );

  const pageSizeId = design.pageSizeId || design.pageSize || preset.pageSize || 'a4';
  const pageSizeDef = getPageSize(pageSizeId);
  const rawOverrides =
    design.manualOverrides && typeof design.manualOverrides === 'object' ? design.manualOverrides : {};

  const topMm =
    !rawOverrides.marginTop && pagination.headerMode !== 'none'
      ? Math.max(normMetrics.marginsMm.top, pagination.safeMarginTopMm)
      : normMetrics.marginsMm.top;
  const bottomMm =
    !rawOverrides.marginBottom && pagination.footerMode !== 'none' && pagination.pageNumbers
      ? Math.max(normMetrics.marginsMm.bottom, pagination.safeMarginBottomMm)
      : normMetrics.marginsMm.bottom;
  const insideOrLeftMm =
    !rawOverrides.gutter && pagination.printSides === 'duplex'
      ? Math.max(normMetrics.marginsMm.gutter, pagination.safeGutterMm)
      : design.gutter ?? normMetrics.marginsMm.gutter ?? normMetrics.marginsMm.left;
  const outsideOrRightMm = normMetrics.marginsMm.right;

  const bodyFont = mapDocxFontFamily(design.typography?.fontFamily || preset.typography.fontFamily);
  const bodySizePt =
    Number(design.typography?.fontSize) > 0
      ? Number(design.typography.fontSize)
      : preset.typography.fontSize;
  const bodySizeHalfPt = Math.round(bodySizePt * 2);
  const bodyLineHeight =
    Number(design.typography?.lineHeight) > 0
      ? Number(design.typography.lineHeight)
      : preset.typography.lineHeight;
  const lineSpacingVal = Math.round(bodyLineHeight * 240);
  const paragraphAfterTwips = ptToTwips(normMetrics.paragraphSpacingAfterPt);
  const firstLineTwips = ptToTwips(normMetrics.firstLineIndentPt);
  const hangingTwips = ptToTwips(normMetrics.hangingIndentPt);

  const bookTitle = String(draft?.metadata?.title || draft?.cover?.title || 'Mi obra').trim() || 'Mi obra';
  const bookSubtitle = String(draft?.metadata?.subtitle || draft?.cover?.subtitle || '').trim();
  const bookAuthor = String(draft?.metadata?.author || draft?.cover?.author || '').trim();
  const bookEditorial = String(draft?.metadata?.editorial || draft?.cover?.editor || '').trim();
  const bookYear = draft?.metadata?.year ? String(draft.metadata.year) : '';

  const visibleSections: EditorialSection[] = syncSectionsBibliographyOrder(
    (Array.isArray(draft?.sections) ? draft.sections : []).filter(
      (s: any) => s && s.visible !== false,
    ),
    resolvedBibStyle,
  );
  const { map: bibMap } = collectBibliographyFromSections(visibleSections);
  const appearanceMap = computeCitationAppearanceOrder(visibleSections);
  const resolveInline = (rawText: string) =>
    resolveInlineCitationsInText(rawText, bibMap, resolvedBibStyle, appearanceMap);

  const buildInlineRuns = (
    text: string,
    opts: { font?: string; size?: number; color?: string; italics?: boolean; bold?: boolean } = {},
  ) => {
    const runs: InstanceType<typeof TextRun>[] = [];
    const tokenRegex = /(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g;
    let lastIdx = 0;
    let m: RegExpExecArray | null;
    while ((m = tokenRegex.exec(text)) !== null) {
      if (m.index > lastIdx) {
        runs.push(
          new TextRun({
            text: text.slice(lastIdx, m.index),
            font: opts.font || bodyFont,
            size: opts.size || bodySizeHalfPt,
            color: opts.color || '111827',
            italics: opts.italics,
            bold: opts.bold,
          }),
        );
      }
      const token = m[0];
      if (token.startsWith('**') && token.endsWith('**')) {
        runs.push(
          new TextRun({
            text: token.slice(2, -2),
            font: opts.font || bodyFont,
            size: opts.size || bodySizeHalfPt,
            color: opts.color || '111827',
            bold: true,
            italics: opts.italics,
          }),
        );
      } else {
        runs.push(
          new TextRun({
            text: token.slice(1, -1),
            font: opts.font || bodyFont,
            size: opts.size || bodySizeHalfPt,
            color: opts.color || '111827',
            italics: true,
            bold: opts.bold,
          }),
        );
      }
      lastIdx = m.index + token.length;
    }
    if (lastIdx < text.length || runs.length === 0) {
      runs.push(
        new TextRun({
          text: text.slice(lastIdx),
          font: opts.font || bodyFont,
          size: opts.size || bodySizeHalfPt,
          color: opts.color || '111827',
          italics: opts.italics,
          bold: opts.bold,
        }),
      );
    }
    return runs;
  };

  const pageMargins = {
    top: mmToTwips(topMm),
    bottom: mmToTwips(bottomMm),
    left: mmToTwips(insideOrLeftMm),
    right: mmToTwips(outsideOrRightMm),
    gutter: 0,
  };
  const pageSizeProps = {
    width: ptToTwips(pageSizeDef.widthPt),
    height: ptToTwips(pageSizeDef.heightPt),
  };

  const makeHeader = (labelText: string, alignRight: boolean) =>
    new Header({
      children: [
        new Paragraph({
          alignment: alignRight ? AlignmentType.RIGHT : AlignmentType.LEFT,
          children: [
            new TextRun({
              text: labelText,
              font: bodyFont,
              size: 18,
              italics: true,
              color: '64748B',
            }),
          ],
        }),
      ],
    });

  const makeFooter = (
    mode: typeof pagination.footerMode,
    align: typeof AlignmentType.CENTER | typeof AlignmentType.RIGHT | typeof AlignmentType.LEFT,
  ) => {
    const customLabel = String(pagination.footerCustomText || '').trim();
    const runs: Array<InstanceType<typeof TextRun>> = [];
    if (mode === 'page_x_of_y') {
      runs.push(new TextRun({ text: 'Página ', font: bodyFont, size: 18, color: '64748B' }));
      runs.push(new TextRun({ children: [PageNumber.CURRENT], font: bodyFont, size: 18, color: '64748B' }));
      runs.push(new TextRun({ text: ' de ', font: bodyFont, size: 18, color: '64748B' }));
      runs.push(new TextRun({ children: [PageNumber.TOTAL_PAGES], font: bodyFont, size: 18, color: '64748B' }));
    } else if (mode === 'book_and_folio') {
      runs.push(new TextRun({ text: `${bookTitle} · `, font: bodyFont, size: 18, color: '64748B' }));
      runs.push(new TextRun({ children: [PageNumber.CURRENT], font: bodyFont, size: 18, color: '64748B' }));
    } else if (mode === 'custom_and_folio' && customLabel) {
      runs.push(new TextRun({ text: `${customLabel} · `, font: bodyFont, size: 18, color: '64748B' }));
      runs.push(new TextRun({ children: [PageNumber.CURRENT], font: bodyFont, size: 18, color: '64748B' }));
    } else {
      runs.push(new TextRun({ children: [PageNumber.CURRENT], font: bodyFont, size: 18, color: '64748B' }));
    }
    return new Footer({
      children: [
        new Paragraph({
          alignment: align,
          children: runs,
        }),
      ],
    });
  };

  const docSections: any[] = [];
  const showCover = Boolean(draft?.cover?.mode && draft.cover.mode !== 'sin-caratula');
  const isDuplex = pagination.printSides === 'duplex';

  // 1. Portada
  if (showCover) {
    const coverChildren: any[] = [
      new Paragraph({ spacing: { before: 1400, after: 240 }, alignment: AlignmentType.CENTER, children: [] }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 180 },
        children: [
          new TextRun({
            text: bookTitle,
            font: bodyFont,
            size: 52,
            bold: true,
            color: '0F172A',
          }),
        ],
      }),
    ];
    if (bookSubtitle) {
      coverChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 320 },
          children: [
            new TextRun({
              text: bookSubtitle,
              font: bodyFont,
              size: 28,
              color: '334155',
            }),
          ],
        }),
      );
    }
    if (bookAuthor) {
      coverChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 480, after: 120 },
          children: [
            new TextRun({
              text: bookAuthor,
              font: bodyFont,
              size: 24,
              bold: true,
              color: '1E293B',
            }),
          ],
        }),
      );
    }
    const institution = String(draft?.legalFields?.institucion || bookEditorial || '').trim();
    const metaFooter = [institution, bookYear].filter(Boolean).join(' · ');
    if (metaFooter) {
      coverChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 800 },
          children: [
            new TextRun({
              text: metaFooter,
              font: bodyFont,
              size: 20,
              color: '475569',
            }),
          ],
        }),
      );
    }

    docSections.push({
      properties: {
        type: SectionType.NEXT_PAGE,
        page: { size: pageSizeProps, margin: pageMargins },
      },
      children: coverChildren,
    });
  }

  // Construir Índice como una sección propia
  const buildTocSectionObj = () => {
    const tocListed = visibleSections.filter(
      (s) => s.includeInToc !== false && s.sectionKey !== 'indice',
    );
    const tocTitle = String(draft?.tocConfig?.title || 'Índice General').trim() || 'Índice General';
    const tocChildren: any[] = [
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 240 },
        children: [
          new TextRun({
            text: tocTitle,
            font: bodyFont,
            size: 32,
            bold: true,
            color: '0F172A',
          }),
        ],
      }),
    ];

    tocListed.forEach((sec, idx) => {
      const pageLabel = options.resolvedTocMap?.[sec.id] || String(idx + (showCover ? 3 : 2));
      tocChildren.push(
        new Paragraph({
          spacing: { before: 80, after: 60 },
          tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
          children: [
            new TextRun({
              text: `${sec.title || `Sección ${idx + 1}`}\t${pageLabel}`,
              font: bodyFont,
              size: bodySizeHalfPt,
              bold: true,
              color: '0F172A',
            }),
          ],
        }),
      );
      if (draft?.tocConfig?.showSubtitles !== false) {
        (sec.records || [])
          .filter((r) => r.type === 'subtitle' && String(r.content || '').trim())
          .forEach((sub) => {
            const subPage = options.resolvedTocMap?.[`${sec.id}-${sub.id}`] || pageLabel;
            tocChildren.push(
              new Paragraph({
                indent: { left: 360 },
                spacing: { after: 40 },
                tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
                children: [
                  new TextRun({
                    text: `${String(sub.content || '').trim()}\t${subPage}`,
                    font: bodyFont,
                    size: Math.max(18, bodySizeHalfPt - 2),
                    color: '475569',
                  }),
                ],
              }),
            );
          });
      }
    });

    return {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: {
          size: pageSizeProps,
          margin: pageMargins,
          pageNumbers: {
            formatType: pagination.preliminaryRomanNumerals
              ? NumberFormat.LOWER_ROMAN
              : NumberFormat.DECIMAL,
          },
        },
      },
      footers:
        pagination.pageNumbers && pagination.footerMode !== 'none'
          ? { default: makeFooter('folio_only', AlignmentType.CENTER) }
          : undefined,
      children: tocChildren,
    };
  };

  const renderSectionRecordsToDocx = (sec: EditorialSection): any[] => {
    const children: any[] = [];
    if (sec.kickerLabel) {
      children.push(
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: String(sec.kickerLabel).toUpperCase(),
              font: bodyFont,
              size: 18,
              bold: true,
              color: '475569',
            }),
          ],
        }),
      );
    }

    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        alignment:
          normMetrics.structuralNormId === 'apa7' || sec.sectionKey === 'bibliografia'
            ? AlignmentType.CENTER
            : AlignmentType.LEFT,
        spacing: { before: 80, after: 180 },
        children: [
          new TextRun({
            text: sec.title || 'Sección',
            font: bodyFont,
            size: 30,
            bold: true,
            color: '0F172A',
          }),
        ],
      }),
    );

    if (sec.epigraphText) {
      children.push(
        new Paragraph({
          indent: { left: 720 },
          spacing: { after: 160 },
          children: [
            new TextRun({
              text: `«${sec.epigraphText}»${sec.epigraphAuthor ? ` — ${sec.epigraphAuthor}` : ''}`,
              font: bodyFont,
              size: Math.max(18, bodySizeHalfPt - 2),
              italics: true,
              color: '475569',
            }),
          ],
        }),
      );
    }

    const records = Array.isArray(sec.records) ? sec.records : [];
    records.forEach((rec, rIdx) => {
      switch (rec.type) {
        case 'subtitle': {
          const isH2 = (rec.subtitleLevel ?? 2) === 2;
          children.push(
            new Paragraph({
              heading: isH2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
              pageBreakBefore: Boolean(pagination.breakOnH2 && isH2 && rIdx > 0),
              spacing: { before: 180, after: 100 },
              children: [
                new TextRun({
                  text: resolveInline(String(rec.content || '')),
                  font: bodyFont,
                  size: isH2 ? Math.round((bodySizePt + 2) * 2) : Math.round((bodySizePt + 1) * 2),
                  bold: true,
                  color: '1E293B',
                }),
              ],
            }),
          );
          break;
        }
        case 'paragraph': {
          const prevType = rIdx > 0 ? records[rIdx - 1]?.type : undefined;
          const suppressIndent =
            normMetrics.suppressFirstParagraphIndent &&
            (rIdx === 0 || prevType === 'subtitle' || prevType === 'epigraph' || prevType === 'qr_or_break');
          children.push(
            new Paragraph({
              indent: !suppressIndent && firstLineTwips > 0 ? { firstLine: firstLineTwips } : undefined,
              spacing: { line: lineSpacingVal, after: paragraphAfterTwips },
              children: buildInlineRuns(resolveInline(String(rec.content || ''))),
            }),
          );
          break;
        }
        case 'quote': {
          children.push(
            new Paragraph({
              indent: { left: 720, right: 360 },
              border: {
                left: { style: BorderStyle.SINGLE, size: 12, color: '94A3B8', space: 8 },
              },
              shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'F8FAFC' },
              spacing: { before: 120, after: 120, line: Math.round(normMetrics.blockQuoteLineHeight * 240) },
              children: [
                ...buildInlineRuns(resolveInline(String(rec.content || '')), { italics: true, color: '1E293B' }),
                ...(rec.quoteAttribution
                  ? [
                      new TextRun({
                        text: `\n— ${rec.quoteAttribution}`,
                        font: bodyFont,
                        size: 18,
                        color: '475569',
                      }),
                    ]
                  : []),
              ],
            }),
          );
          break;
        }
        case 'callout': {
          const calloutLines = [
            rec.calloutTitle ? `**${rec.calloutTitle}**` : '',
            resolveInline(String(rec.content || '')),
            ...(Array.isArray(rec.calloutItems) ? rec.calloutItems.map((it) => `• ${resolveInline(it)}`) : []),
          ].filter(Boolean);
          calloutLines.forEach((ln) => {
            children.push(
              new Paragraph({
                indent: { left: 240, right: 240 },
                shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'F1F5F9' },
                spacing: { before: 60, after: 60 },
                children: buildInlineRuns(ln),
              }),
            );
          });
          break;
        }
        case 'list': {
          const lines = String(rec.content || '')
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean);
          lines.forEach((ln, li) => {
            const prefix =
              /^(?:\d+[.)]\s|•\s)/.test(ln)
                ? ''
                : rec.listStyle === 'numbered'
                  ? `${li + 1}. `
                  : '• ';
            children.push(
              new Paragraph({
                indent: { left: 360 },
                spacing: { after: 60, line: lineSpacingVal },
                children: buildInlineRuns(`${prefix}${resolveInline(ln)}`),
              }),
            );
          });
          break;
        }
        case 'table': {
          const headers = Array.isArray(rec.tableHeaders) ? rec.tableHeaders : [];
          const rows = Array.isArray(rec.tableRows) ? rec.tableRows : [];
          const docxRows: any[] = [];
          if (headers.length > 0 && rec.tableHasHeaderRow !== false) {
            docxRows.push(
              new TableRow({
                tableHeader: true,
                children: headers.map(
                  (h) =>
                    new TableCell({
                      shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'F1F5F9' },
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: String(h || ''),
                              font: bodyFont,
                              size: 20,
                              bold: true,
                              color: '0F172A',
                            }),
                          ],
                        }),
                      ],
                    }),
                ),
              }),
            );
          }
          rows.forEach((row) => {
            if (!Array.isArray(row)) return;
            docxRows.push(
              new TableRow({
                children: row.map(
                  (cell) =>
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: resolveInline(String(cell ?? '')),
                              font: bodyFont,
                              size: 20,
                              color: '111827',
                            }),
                          ],
                        }),
                      ],
                    }),
                ),
              }),
            );
          });
          if (docxRows.length > 0) {
            children.push(
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: docxRows,
              }),
            );
            children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
          }
          break;
        }
        case 'image': {
          const parsedImg = rec.imagePath ? dataUrlToUint8Array(rec.imagePath) : null;
          if (parsedImg) {
            children.push(
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 120, after: 80 },
                children: [
                  new ImageRun({
                    data: parsedImg.bytes,
                    type: parsedImg.type,
                    transformation: { width: 380, height: 240 },
                  }),
                ],
              }),
            );
          }
          if (rec.imageCaption) {
            children.push(
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 120 },
                children: [
                  new TextRun({
                    text: rec.imageCaption,
                    font: bodyFont,
                    size: 18,
                    italics: true,
                    color: '475569',
                  }),
                ],
              }),
            );
          }
          break;
        }
        case 'bibliography_item': {
          const cite = formatEditorialCitation(rec, resolvedBibStyle, rIdx);
          children.push(
            new Paragraph({
              indent: cite.usesHangingIndent ? { left: hangingTwips, hanging: hangingTwips } : undefined,
              spacing: { after: ptToTwips(normMetrics.bibliographyEntryGapPt), line: lineSpacingVal },
              children: [
                new TextRun({ text: cite.prefixText, font: bodyFont, size: bodySizeHalfPt, color: '111827' }),
                ...(cite.italicSegment
                  ? [
                      new TextRun({
                        text: cite.italicSegment,
                        font: bodyFont,
                        size: bodySizeHalfPt,
                        italics: true,
                        color: '111827',
                      }),
                    ]
                  : []),
                ...(cite.suffixText
                  ? [
                      new TextRun({
                        text: `${/^[.,;:)\]]/.test(cite.suffixText) ? '' : ' '}${cite.suffixText}`,
                        font: bodyFont,
                        size: bodySizeHalfPt,
                        color: '111827',
                      }),
                    ]
                  : []),
              ],
            }),
          );
          break;
        }
        case 'qr_or_break':
          if (rec.isBreak) {
            children.push(new Paragraph({ children: [new PageBreak()] }));
          }
          break;
        default:
          if (rec.content) {
            children.push(
              new Paragraph({
                spacing: { line: lineSpacingVal, after: paragraphAfterTwips },
                children: buildInlineRuns(resolveInline(String(rec.content))),
              }),
            );
          }
          break;
      }
    });

    return children;
  };

  const tocEnabled = Boolean(draft?.tocConfig?.enabled && visibleSections.some((s) => s.includeInToc !== false));
  const placeTocAfterPrelims = draft?.tocConfig?.position === 'tras-preliminares';

  if (tocEnabled && !placeTocAfterPrelims) {
    docSections.push(buildTocSectionObj());
  }

  let tocInsertedAfterPrelims = false;
  let bodyNumberingStarted = false;

  visibleSections.forEach((sec, idx) => {
    const isPrelim = isEditorialPreliminarySection(sec);
    if (tocEnabled && placeTocAfterPrelims && !tocInsertedAfterPrelims && !isPrelim) {
      docSections.push(buildTocSectionObj());
      tocInsertedAfterPrelims = true;
    }

    const startsNew = resolveSectionEffectiveStartNewPage(
      sec,
      pagination.effectiveChapterBreakMode,
      design,
      draft?.cover,
    );

    const sectionBreakType =
      idx === 0 && !showCover && !tocEnabled
        ? SectionType.NEXT_PAGE
        : !startsNew
          ? SectionType.CONTINUOUS
          : isDuplex && pagination.effectiveChapterBreakMode === 'odd_page'
            ? SectionType.ODD_PAGE
            : SectionType.NEXT_PAGE;

    const cleanSecTitle = String(sec.runningHeaderText || sec.title || `Sección ${idx + 1}`).trim();
    const headerMode = pagination.headerMode;

    let headersObj: { default?: any; even?: any } | undefined;
    if (!isPrelim && headerMode !== 'none') {
      if (headerMode === 'mirror_book_chapter' && isDuplex) {
        headersObj = {
          default: makeHeader(cleanSecTitle, true),
          even: makeHeader(bookTitle, false),
        };
      } else {
        const textVal =
          headerMode === 'custom'
            ? pagination.headerCustomText || bookTitle
            : headerMode === 'chapter_title'
              ? cleanSecTitle
              : bookTitle;
        headersObj = { default: makeHeader(textVal, true) };
      }
    }

    let footersObj: { default?: any; even?: any } | undefined;
    if (pagination.pageNumbers && pagination.footerMode !== 'none' && sec.masterPageMode !== 'clean') {
      const fMode = isPrelim ? 'folio_only' : pagination.footerMode;
      if (isDuplex) {
        footersObj = {
          default: makeFooter(
            fMode,
            pagination.footerAlignment === 'center' ? AlignmentType.CENTER : AlignmentType.RIGHT,
          ),
          even: makeFooter(
            fMode,
            pagination.footerAlignment === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT,
          ),
        };
      } else {
        footersObj = {
          default: makeFooter(
            fMode,
            pagination.footerAlignment === 'right' ? AlignmentType.RIGHT : AlignmentType.CENTER,
          ),
        };
      }
    }

    const shouldRestartArabicBody = Boolean(
      !isPrelim && !bodyNumberingStarted && pagination.preliminaryRomanNumerals,
    );
    if (!isPrelim) {
      bodyNumberingStarted = true;
    }

    docSections.push({
      properties: {
        type: sectionBreakType,
        titlePage: Boolean(pagination.suppressHeaderOnChapterStart && startsNew),
        page: {
          size: pageSizeProps,
          margin: pageMargins,
          pageNumbers: isPrelim && pagination.preliminaryRomanNumerals
            ? { formatType: NumberFormat.LOWER_ROMAN }
            : shouldRestartArabicBody
              ? { start: 1, formatType: NumberFormat.DECIMAL }
              : { formatType: NumberFormat.DECIMAL },
        },
      },
      headers: headersObj,
      footers: footersObj,
      children: renderSectionRecordsToDocx(sec),
    });
  });

  if (tocEnabled && placeTocAfterPrelims && !tocInsertedAfterPrelims) {
    docSections.push(buildTocSectionObj());
  }

  if (docSections.length === 0) {
    docSections.push({
      properties: { page: { size: pageSizeProps, margin: pageMargins } },
      children: [new Paragraph({ children: [new TextRun({ text: bookTitle, font: bodyFont, size: 28 })] })],
    });
  }

  const doc = new Document({
    title: bookTitle,
    creator: bookAuthor || 'EditorLee · LEECV',
    evenAndOddHeaderAndFooters: isDuplex,
    sections: docSections,
  });

  const arrayBuffer = await Packer.toArrayBuffer(doc);
  let finalBlob = new Blob([arrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  // Inyectar `<w:mirrorMargins/>` nativo OOXML en `word/settings.xml` cuando es Doble Faz
  if (isDuplex) {
    const zip = await JSZip.loadAsync(arrayBuffer);
    const settingsFile = zip.file('word/settings.xml');
    if (settingsFile) {
      const settingsXml = await settingsFile.async('string');
      if (!settingsXml.includes('w:mirrorMargins')) {
        const updatedXml = settingsXml.replace(
          '</w:settings>',
          '<w:mirrorMargins/></w:settings>',
        );
        zip.file('word/settings.xml', updatedXml);
        const mirroredBytes = await zip.generateAsync({ type: 'uint8array' });
        finalBlob = new Blob([new Uint8Array(mirroredBytes)], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });
      }
    }
  }

  const safeTitle = bookTitle.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 50) || 'Publicacion-Editorial';
  return {
    blob: finalBlob,
    fileName: `${safeTitle}.docx`,
  };
}

/**
 * Construye y descarga el archivo Word `.docx` en el dispositivo del usuario.
 */
export async function exportEditorialToDocx(
  draft: any,
  options: BuildEditorialDocxOptions = {},
): Promise<string> {
  const { blob, fileName } = await buildEditorialDocxBlob(draft, options);
  downloadBlob(blob, fileName);
  return fileName;
}
