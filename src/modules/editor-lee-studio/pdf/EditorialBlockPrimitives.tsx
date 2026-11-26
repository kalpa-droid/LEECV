import React from 'react';
import { View, Text, Image as PdfImage, Svg, Path } from '@react-pdf/renderer';
import type { Styles } from '@react-pdf/renderer';
import {
  EditorialCalloutVariant,
  EditorialRecord,
} from '../domain/editorialTypes';
import {
  parseInlineRichRuns,
  sanitizeEditorialText,
} from '../domain/editorialTypographyEngine';
import { computeOptimalTableLayout } from '../domain/editorialLayoutEngines';
import { resolveDefaultUnicodeFontForPreset } from '../../../shared/core/pdf-engine/layers/typography/academicFontCatalog';
import { sanitizeFontFamily } from '../../../shared/core/pdf-engine/layers/typography/pdfFontRegistry';
import { isDynamicFontRegistered } from '../../../shared/core/pdf-engine/layers/typography/fontSanitizer';

export type EditorialFontStyleObject = Styles[string] & { fontFamily: string };

export interface EditorialFontStyleSet {
  regular: EditorialFontStyleObject;
  bold: EditorialFontStyleObject;
  italic: EditorialFontStyleObject;
  boldItalic: EditorialFontStyleObject;
}

function buildVariantStyle(
  family: string,
  isBold: boolean,
  isItalic: boolean,
): EditorialFontStyleObject {
  const resolved = sanitizeFontFamily(family, isBold, isItalic);
  if (isDynamicFontRegistered(resolved)) {
    return {
      fontFamily: resolved,
      fontWeight: isBold ? 'bold' : 'normal',
      fontStyle: isItalic ? 'italic' : 'normal',
    };
  }
  return { fontFamily: resolved };
}

/**
 * Resuelve la familia tipográfica activa priorizando fuentes TTF Unicode locales (Tinos/Arimo)
 * registradas dinámicamente, sin perder compatibilidad con fuentes Type1 en tests sin navegador.
 */
export function resolveEditorialPdfFontStyles(rawFamily?: string): {
  styles: EditorialFontStyleSet;
  isUnicodeFont: boolean;
  resolvedFamilyName: string;
} {
  const unicodeCandidate = resolveDefaultUnicodeFontForPreset(rawFamily);
  let targetFamily = String(rawFamily || '').trim() || 'Times-Roman';
  let isUnicodeFont = false;

  if (isDynamicFontRegistered(unicodeCandidate)) {
    targetFamily = unicodeCandidate;
    isUnicodeFont = true;
  } else if (isDynamicFontRegistered(targetFamily)) {
    isUnicodeFont = true;
  }

  return {
    resolvedFamilyName: sanitizeFontFamily(targetFamily, false, false),
    isUnicodeFont,
    styles: {
      regular: buildVariantStyle(targetFamily, false, false),
      bold: buildVariantStyle(targetFamily, true, false),
      italic: buildVariantStyle(targetFamily, false, true),
      boldItalic: buildVariantStyle(targetFamily, true, true),
    },
  };
}

/**
 * Rombo editorial ◆ dibujado como vector SVG puro para evitar la corrupción `◆ -> Æ`
 * cuando las fuentes no traen el rango Unicode Geometric Shapes.
 */
export const EditorialDiamondSvg: React.FC<{ size?: number; color?: string }> = ({
  size = 8,
  color = '#1E293B',
}) => (
  <Svg width={size} height={size} viewBox="0 0 10 10">
    <Path d="M5 0 L10 5 L5 10 L0 5 Z" fill={color} />
  </Svg>
);

export const EditorialDiamondSeparator: React.FC<{ color?: string; marginVertical?: number }> = ({
  color = '#475569',
  marginVertical = 10,
}) => (
  <View
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      marginVertical,
    }}
  >
    <View style={{ width: 28, height: 0.75, backgroundColor: '#CBD5E1' }} />
    <EditorialDiamondSvg size={7} color={color} />
    <View style={{ width: 28, height: 0.75, backgroundColor: '#CBD5E1' }} />
  </View>
);

function pickRunStyle(
  fontStyles: EditorialFontStyleSet,
  bold?: boolean,
  italic?: boolean,
): EditorialFontStyleObject {
  if (bold && italic) return fontStyles.boldItalic;
  if (bold) return fontStyles.bold;
  if (italic) return fontStyles.italic;
  return fontStyles.regular;
}

export interface EditorialRichTextProps {
  text: string;
  fontStyles: EditorialFontStyleSet;
  isUnicodeFont: boolean;
  preserveLineBreaks?: boolean;
  preventRunts?: boolean;
  style?: any;
  accentColor?: string;
}

/**
 * Renderiza texto con runs enriquecidos (`**negrita**`, `*cursiva*`, `***ambas***`),
 * notas superíndice `[^N]` y ornamentos `◆` vectoriales seguros.
 */
export const EditorialRichText: React.FC<EditorialRichTextProps> = ({
  text,
  fontStyles,
  isUnicodeFont,
  preserveLineBreaks = false,
  preventRunts = false,
  style,
  accentColor = '#1E293B',
}) => {
  const sanitized = sanitizeEditorialText(text, {
    preserveLineBreaks,
    targetFontIsUnicode: isUnicodeFont,
    preserveDiamondGlyph: true,
    preventRunts,
  });

  if (!sanitized) return null;

  // Separador ornamental puro ("◆" o "◆ ◆ ◆")
  if (/^[\u25C6\s]+$/.test(sanitized)) {
    return <EditorialDiamondSeparator color={accentColor} />;
  }

  const lines = preserveLineBreaks ? sanitized.split('\n') : [sanitized];

  return (
    <>
      {lines.map((line, lineIdx) => {
        if (!line.trim()) {
          return <Text key={`empty-${lineIdx}`} style={[fontStyles.regular, style]}>{' '}</Text>;
        }
        if (/^[\u25C6\s]+$/.test(line.trim())) {
          return <EditorialDiamondSeparator key={`dia-${lineIdx}`} color={accentColor} marginVertical={6} />;
        }

        const runs = parseInlineRichRuns(line);
        const leadingDiamond = runs.length > 0 && runs[0].isDiamond;
        const inlineRuns = leadingDiamond ? runs.slice(1) : runs;

        const textElement = (
          <Text
            key={`line-${lineIdx}`}
            orphans={2}
            widows={2}
            style={[fontStyles.regular, style]}
          >
            {inlineRuns.map((run, ri) => {
              if (run.isDiamond) {
                return (
                  <Text key={`r-${ri}`} style={fontStyles.regular}>
                    {' · '}
                  </Text>
                );
              }
              if (run.footnoteNumber !== undefined) {
                return (
                  <Text
                    key={`r-${ri}`}
                    style={[
                      fontStyles.bold,
                      {
                        fontSize: Math.max(7, (Number(style?.fontSize) || 11) * 0.68),
                        color: accentColor,
                      },
                    ]}
                  >
                    {`[${run.footnoteNumber}]`}
                  </Text>
                );
              }
              return (
                <Text key={`r-${ri}`} style={pickRunStyle(fontStyles, run.bold, run.italic)}>
                  {run.text}
                </Text>
              );
            })}
          </Text>
        );

        if (leadingDiamond) {
          return (
            <View
              key={`row-${lineIdx}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: style?.marginBottom ?? 4 }}
            >
              <EditorialDiamondSvg size={7} color={accentColor} />
              <View style={{ flex: 1 }}>{textElement}</View>
            </View>
          );
        }

        return textElement;
      })}
    </>
  );
};

interface CalloutThemeSpec {
  borderColor: string;
  bgColor: string;
  titleColor: string;
  textColor: string;
}

function getCalloutTheme(variant?: EditorialCalloutVariant): CalloutThemeSpec {
  switch (variant) {
    case 'resguardo':
      return {
        borderColor: '#0F766E',
        bgColor: '#F0FDFA',
        titleColor: '#0F766E',
        textColor: '#134E4A',
      };
    case 'importante':
      return {
        borderColor: '#B45309',
        bgColor: '#FFFBEB',
        titleColor: '#92400E',
        textColor: '#1F2937',
      };
    case 'definicion':
    case 'clave':
      return {
        borderColor: '#1D4ED8',
        bgColor: '#EFF6FF',
        titleColor: '#1E40AF',
        textColor: '#1E293B',
      };
    case 'testimonio':
      return {
        borderColor: '#475569',
        bgColor: '#F8FAFC',
        titleColor: '#334155',
        textColor: '#1E293B',
      };
    case 'caja':
    case 'consigna':
    default:
      return {
        borderColor: '#334155',
        bgColor: '#F8FAFC',
        titleColor: '#0F172A',
        textColor: '#1E293B',
      };
  }
}

export const EditorialCalloutBlock: React.FC<{
  record: EditorialRecord;
  fontStyles: EditorialFontStyleSet;
  isUnicodeFont: boolean;
  baseFontSize: number;
  lineHeight: number;
}> = ({ record, fontStyles, isUnicodeFont, baseFontSize, lineHeight }) => {
  const theme = getCalloutTheme(record.calloutVariant);
  const bodySize = Math.max(9.5, baseFontSize - 0.5);
  const items = Array.isArray(record.calloutItems) ? record.calloutItems.filter(Boolean) : [];
  const totalCalloutChars =
    (record.content?.length || 0) + items.reduce((acc, it) => acc + String(it || '').length, 0);
  const fitsSinglePageSafely = totalCalloutChars <= 480 && items.length <= 5;
  const shouldKeepTogether =
    fitsSinglePageSafely &&
    (record.keepTogether !== undefined ? record.keepTogether : true);

  return (
    <View
      wrap={shouldKeepTogether ? false : undefined}
      style={{
        borderLeftWidth: 3,
        borderLeftColor: theme.borderColor,
        borderTopWidth: 0.5,
        borderRightWidth: 0.5,
        borderBottomWidth: 0.5,
        borderTopColor: '#E2E8F0',
        borderRightColor: '#E2E8F0',
        borderBottomColor: '#E2E8F0',
        backgroundColor: theme.bgColor,
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginVertical: 10,
        borderRadius: 3,
      }}
    >
      {record.calloutTitle ? (
        <Text
          minPresenceAhead={36}
          style={[
            fontStyles.bold,
            {
              fontSize: bodySize + 0.5,
              color: theme.titleColor,
              marginBottom: record.content || items.length > 0 ? 5 : 0,
            },
          ]}
        >
          {sanitizeEditorialText(record.calloutTitle, { targetFontIsUnicode: isUnicodeFont })}
        </Text>
      ) : null}

      {record.content ? (
        <EditorialRichText
          text={record.content}
          fontStyles={fontStyles}
          isUnicodeFont={isUnicodeFont}
          preserveLineBreaks={true}
          accentColor={theme.borderColor}
          style={{
            fontSize: bodySize,
            lineHeight: Math.min(1.5, lineHeight),
            color: theme.textColor,
            marginBottom: items.length > 0 ? 4 : 3,
          }}
        />
      ) : null}

      {items.length > 0 ? (
        <View style={{ marginTop: 2 }}>
          {items.map((item, idx) => (
            <View
              key={`ci-${idx}`}
              style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 3 }}
            >
              <Text
                style={[
                  fontStyles.bold,
                  { fontSize: bodySize, color: theme.borderColor, width: 12 },
                ]}
              >
                •
              </Text>
              <View style={{ flex: 1 }}>
                <EditorialRichText
                  text={item}
                  fontStyles={fontStyles}
                  isUnicodeFont={isUnicodeFont}
                  preserveLineBreaks={false}
                  accentColor={theme.borderColor}
                  style={{
                    fontSize: bodySize,
                    lineHeight: Math.min(1.48, lineHeight),
                    color: theme.textColor,
                  }}
                />
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
};

export const EditorialTableBlock: React.FC<{
  record: EditorialRecord;
  fontStyles: EditorialFontStyleSet;
  isUnicodeFont: boolean;
  baseFontSize: number;
  sectionColumns?: 1 | 2;
  accentColor?: string;
}> = ({
  record,
  fontStyles,
  isUnicodeFont,
  baseFontSize,
  sectionColumns = 1,
  accentColor = '#1E293B',
}) => {
  const rawHeaders = Array.isArray(record.tableHeaders)
    ? record.tableHeaders.map((h) => String(h ?? ''))
    : [];
  const rawRows = Array.isArray(record.tableRows)
    ? record.tableRows
        .filter((r) => Array.isArray(r))
        .map((r) => r.map((c) => String(c ?? '')))
    : [];
  const hasExplicitHeader = record.tableHasHeaderRow !== false;

  const normalizedRows = hasExplicitHeader
    ? rawRows
    : rawHeaders.length > 0
      ? [rawHeaders, ...rawRows]
      : rawRows;

  const headerLabels = hasExplicitHeader
    ? rawHeaders
    : rawHeaders.map((_, idx) => `Columna ${idx + 1}`);

  if (headerLabels.length === 0 && normalizedRows.length === 0) {
    if (record.content && record.content.trim()) {
      return (
        <View style={{ marginVertical: 6 }}>
          <EditorialRichText
            text={record.content}
            fontStyles={fontStyles}
            isUnicodeFont={isUnicodeFont}
            preserveLineBreaks={true}
            style={{ fontSize: baseFontSize, lineHeight: 1.4, color: '#1E293B' }}
          />
        </View>
      );
    }
    return null;
  }

  const autoLayout = computeOptimalTableLayout(headerLabels, normalizedRows, {
    sectionColumns,
  });

  const colWidths =
    Array.isArray(record.tableColWidthsPct) && record.tableColWidthsPct.length === headerLabels.length
      ? record.tableColWidthsPct
      : autoLayout.colWidthsPct;
  const colAlignments =
    Array.isArray(record.tableColAlignments) && record.tableColAlignments.length === headerLabels.length
      ? record.tableColAlignments
      : autoLayout.colAlignments;
  const tableFontSize =
    typeof record.tableFontSizePt === 'number' && record.tableFontSizePt > 0
      ? record.tableFontSizePt
      : Math.min(autoLayout.suggestedFontSizePt, Math.max(8, baseFontSize - 1));
  const isApa = (record.tableStylePreset || 'apa') === 'apa';

  return (
    <View style={{ marginVertical: 10 }}>
      {record.tableCaption ? (
        <Text
          minPresenceAhead={40}
          style={[
            fontStyles.italic,
            { fontSize: Math.max(8.5, tableFontSize), color: '#334155', marginBottom: 4 },
          ]}
        >
          {sanitizeEditorialText(record.tableCaption, { targetFontIsUnicode: isUnicodeFont })}
        </Text>
      ) : null}

      <View
        style={{
          width: '100%',
          borderTopWidth: 1.2,
          borderTopColor: accentColor,
          borderBottomWidth: 1.2,
          borderBottomColor: accentColor,
        }}
      >
        {hasExplicitHeader && rawHeaders.length > 0 ? (
          <View
            fixed
            wrap={false}
            style={{
              flexDirection: 'row',
              backgroundColor: isApa ? '#F1F5F9' : accentColor,
              borderBottomWidth: 1,
              borderBottomColor: accentColor,
            }}
          >
            {rawHeaders.map((hdr, ci) => (
              <View
                key={`th-${ci}`}
                style={{
                  width: `${colWidths[ci] ?? Math.floor(100 / rawHeaders.length)}%`,
                  paddingVertical: 5,
                  paddingHorizontal: 6,
                }}
              >
                <EditorialRichText
                  text={hdr}
                  fontStyles={fontStyles}
                  isUnicodeFont={isUnicodeFont}
                  preserveLineBreaks={true}
                  style={[
                    fontStyles.bold,
                    {
                      fontSize: tableFontSize,
                      lineHeight: 1.3,
                      color: isApa ? '#0F172A' : '#FFFFFF',
                      textAlign: colAlignments[ci] || 'left',
                    },
                  ]}
                />
              </View>
            ))}
          </View>
        ) : null}

        {normalizedRows.map((row, ri) => {
          const maxCellLen = row.reduce((m, c) => Math.max(m, String(c ?? '').length), 0);
          return (
          <View
            key={`tr-${ri}`}
            wrap={maxCellLen <= 260 ? false : undefined}
            style={{
              flexDirection: 'row',
              backgroundColor: ri % 2 === 1 ? '#F8FAFC' : '#FFFFFF',
              borderTopWidth: ri > 0 || (hasExplicitHeader && rawHeaders.length > 0) ? 0.5 : 0,
              borderTopColor: '#CBD5E1',
            }}
          >
            {colWidths.map((pct, ci) => {
              const cellText = String(row[ci] ?? '');
              return (
                <View
                  key={`tc-${ri}-${ci}`}
                  style={{
                    width: `${pct}%`,
                    paddingVertical: 4.5,
                    paddingHorizontal: 6,
                  }}
                >
                  <EditorialRichText
                    text={cellText}
                    fontStyles={fontStyles}
                    isUnicodeFont={isUnicodeFont}
                    preserveLineBreaks={true}
                    accentColor={accentColor}
                    style={{
                      fontSize: tableFontSize,
                      lineHeight: 1.32,
                      color: '#1E293B',
                      textAlign: colAlignments[ci] || 'left',
                    }}
                  />
                </View>
              );
            })}
          </View>
          );
        })}
      </View>
    </View>
  );
};

export const EditorialPoemBlock: React.FC<{
  record: EditorialRecord;
  fontStyles: EditorialFontStyleSet;
  isUnicodeFont: boolean;
  baseFontSize: number;
  lineHeight: number;
}> = ({ record, fontStyles, isUnicodeFont, baseFontSize, lineHeight }) => {
  const cleanPoem = sanitizeEditorialText(record.content || '', {
    preserveLineBreaks: true,
    targetFontIsUnicode: isUnicodeFont,
    preserveDiamondGlyph: true,
  });
  if (!cleanPoem) return null;

  const stanzas = cleanPoem.split(/\n{2,}/).filter((s) => s.trim().length > 0);
  const verseSize = Math.max(9.5, baseFontSize - 0.5);

  return (
    <View style={{ marginVertical: 10, paddingLeft: 28, paddingRight: 12 }}>
      {stanzas.map((stanza, si) => {
        const verses = stanza.split('\n');
        return (
          <View
            key={`stanza-${si}`}
            wrap={verses.length <= 16 ? false : undefined}
            style={{ marginBottom: si < stanzas.length - 1 ? 10 : 0 }}
          >
            {verses.map((verse, vi) => (
              <EditorialRichText
                key={`v-${si}-${vi}`}
                text={verse}
                fontStyles={fontStyles}
                isUnicodeFont={isUnicodeFont}
                preserveLineBreaks={false}
                style={[
                  fontStyles.italic,
                  {
                    fontSize: verseSize,
                    lineHeight: Math.min(1.45, lineHeight),
                    color: '#1E293B',
                    marginBottom: 2,
                  },
                ]}
              />
            ))}
          </View>
        );
      })}
    </View>
  );
};

export const EditorialFigurePlaceholderBlock: React.FC<{
  record: EditorialRecord;
  fontStyles: EditorialFontStyleSet;
  isUnicodeFont: boolean;
  accentColor?: string;
}> = ({ record, fontStyles, isUnicodeFont, accentColor = '#475569' }) => (
  <View
    wrap={false}
    style={{
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: '#94A3B8',
      backgroundColor: '#F8FAFC',
      paddingVertical: 14,
      paddingHorizontal: 16,
      marginVertical: 10,
      alignItems: 'center',
      borderRadius: 4,
    }}
  >
    <Text
      style={[
        fontStyles.bold,
        {
          fontSize: 9,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          color: accentColor,
          marginBottom: 4,
        },
      ]}
    >
      {sanitizeEditorialText(record.figureNumber || 'Figura', { targetFontIsUnicode: isUnicodeFont })}
    </Text>
    <Text
      style={[
        fontStyles.italic,
        { fontSize: 10, color: '#1E293B', textAlign: 'center', lineHeight: 1.35 },
      ]}
    >
      {sanitizeEditorialText(record.figureCaption || record.content || 'Espacio reservado para figura', {
        targetFontIsUnicode: isUnicodeFont,
      })}
    </Text>
    {record.figureHint ? (
      <Text
        style={[
          fontStyles.regular,
          { fontSize: 8, color: '#64748B', textAlign: 'center', marginTop: 4 },
        ]}
      >
        {sanitizeEditorialText(record.figureHint, { targetFontIsUnicode: isUnicodeFont })}
      </Text>
    ) : null}
  </View>
);

export const EditorialEpigraphBlock: React.FC<{
  record: EditorialRecord;
  fontStyles: EditorialFontStyleSet;
  isUnicodeFont: boolean;
  baseFontSize: number;
}> = ({ record, fontStyles, isUnicodeFont, baseFontSize }) => (
  <View wrap={false} style={{ marginLeft: 72, marginRight: 12, marginTop: 4, marginBottom: 14 }}>
    <EditorialRichText
      text={record.content || ''}
      fontStyles={fontStyles}
      isUnicodeFont={isUnicodeFont}
      preserveLineBreaks={true}
      style={[
        fontStyles.italic,
        {
          fontSize: Math.max(9.5, baseFontSize - 0.5),
          lineHeight: 1.4,
          color: '#334155',
          textAlign: 'right',
        },
      ]}
    />
    {record.quoteAttribution ? (
      <Text
        style={[
          fontStyles.regular,
          {
            fontSize: Math.max(8.5, baseFontSize - 1.5),
            color: '#475569',
            textAlign: 'right',
            marginTop: 4,
          },
        ]}
      >
        — {sanitizeEditorialText(record.quoteAttribution, { targetFontIsUnicode: isUnicodeFont })}
      </Text>
    ) : null}
  </View>
);

export const EditorialFootnoteListBlock: React.FC<{
  record: EditorialRecord;
  fontStyles: EditorialFontStyleSet;
  isUnicodeFont: boolean;
}> = ({ record, fontStyles, isUnicodeFont }) => {
  const notes = Array.isArray(record.footnotes) && record.footnotes.length > 0
    ? record.footnotes
    : [];
  if (notes.length === 0 && !record.content) return null;

  return (
    <View style={{ marginTop: 14, paddingTop: 8 }}>
      <View style={{ width: '34%', height: 0.75, backgroundColor: '#94A3B8', marginBottom: 6 }} />
      {notes.length > 0 ? (
        notes.map((fn, idx) => (
          <View key={`fn-${fn.number}-${idx}`} wrap={false} style={{ flexDirection: 'row', marginBottom: 3 }}>
            <Text style={[fontStyles.bold, { fontSize: 8.5, color: '#475569', width: 20 }]}>
              {`[${fn.number}]`}
            </Text>
            <View style={{ flex: 1 }}>
              <EditorialRichText
                text={fn.text}
                fontStyles={fontStyles}
                isUnicodeFont={isUnicodeFont}
                preserveLineBreaks={false}
                style={{ fontSize: 8.5, lineHeight: 1.35, color: '#334155' }}
              />
            </View>
          </View>
        ))
      ) : (
        <EditorialRichText
          text={record.content || ''}
          fontStyles={fontStyles}
          isUnicodeFont={isUnicodeFont}
          preserveLineBreaks={true}
          style={{ fontSize: 8.5, lineHeight: 1.35, color: '#334155' }}
        />
      )}
    </View>
  );
};

export const EditorialBlockPrimitives: React.FC = () => (
  <View style={{ padding: 12 }}>
    <PdfImage
      style={{ width: 1, height: 1 }}
      src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
    />
  </View>
);
