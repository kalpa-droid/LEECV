/**
 * Portadas Vectoriales Adaptadas de EditorLee (EditorialPdfCovers.tsx)
 *
 * Adapta los 6 arquetipos visuales del núcleo compartido (`COVER_PRESETS_CATALOG`)
 * y las paletas WCAG de `PRESET_COLORS` al dominio editorial (Libro, Académica
 * secundaria/terciaria/universitaria APA 7 y Ejecutiva), sin acoplarse a `cv-builder`.
 */
import React from 'react';
import { Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import type { CoverStyleId } from '../../../shared/core/pdf-engine/layers/presets/coverPresetCatalog';
import { PRESET_COLORS } from '../../../shared/core/pdf-engine/layers/presets/presetRegistry';
import type { EditorialCoverMode, EditorialLegalFields, EditorialMetadata } from '../domain/editorialTypes';
import type { ColorPalette } from '../../../shared/core/pdf-engine/layers/presets/presetSchema';
import { sanitizeEditorialText } from '../domain/editorialTypographyEngine';
import { isRenderablePdfImageSrc } from '../../../shared/core/utils/imageCompressor';
import {
  EditorialDiamondSeparator,
  resolveEditorialPdfFontStyles,
} from './EditorialBlockPrimitives';

export interface EditorialCoverPageProps {
  pageSize: 'A4' | 'A5' | 'LETTER' | [number, number];
  coverMode: EditorialCoverMode;
  coverStyleId?: CoverStyleId | string;
  coverPaletteKey?: string;
  fallbackPalette: ColorPalette;
  title: string;
  subtitle?: string;
  author?: string;
  editor?: string;
  metadata?: Partial<EditorialMetadata>;
  legalFields?: EditorialLegalFields;
  qrCodeUrl?: string;
  baseFont: string;
  boldFont: string;
  italicFont: string;
  startAnchors?: React.ReactNode;
  endAnchors?: React.ReactNode;
}

function cleanText(raw?: string): string {
  return sanitizeEditorialText(String(raw || ''), {
    preserveLineBreaks: false,
    targetFontIsUnicode: true,
    preserveDiamondGlyph: true,
  });
}

export const EditorialPdfCoverPage: React.FC<EditorialCoverPageProps> = ({
  pageSize,
  coverMode,
  coverStyleId = 'monica-classic',
  coverPaletteKey,
  fallbackPalette,
  title,
  subtitle,
  author,
  editor,
  metadata,
  legalFields,
  qrCodeUrl,
  baseFont,
  boldFont,
  italicFont,
  startAnchors,
  endAnchors,
}) => {
  const palette: ColorPalette =
    (coverPaletteKey && PRESET_COLORS[coverPaletteKey]?.palette) || fallbackPalette;

  const { styles: resolvedFonts, isUnicodeFont } = resolveEditorialPdfFontStyles(baseFont);
  const regStyle = isUnicodeFont ? resolvedFonts.regular : { fontFamily: baseFont };
  const bldStyle = isUnicodeFont ? resolvedFonts.bold : { fontFamily: boldFont };
  const itlStyle = isUnicodeFont ? resolvedFonts.italic : { fontFamily: italicFont };

  const year = metadata?.year ? String(metadata.year) : '';
  const institution = cleanText(legalFields?.institucion);
  const facultyOrCourse = cleanText(legalFields?.catedra || legalFields?.curso);
  const teacher = cleanText(legalFields?.docente);
  const members = cleanText(legalFields?.integrantes);
  const studentId = cleanText(legalFields?.legajo);

  const isAcademic = coverMode === 'academica';
  const isExecutive = coverMode === 'ejecutiva';

  const s = StyleSheet.create({
    page: {
      ...regStyle,
      backgroundColor: '#FFFFFF',
      color: palette.text,
      minHeight: '100%',
      position: 'relative',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: coverStyleId === 'bold-impact' || coverStyleId === 'magazine-executive' ? 0 : 42,
    },
    frameClassic: {
      flexGrow: 1,
      borderWidth: 1.5,
      borderColor: palette.primary,
      padding: 28,
      flexDirection: 'column',
      justifyContent: 'space-between',
      alignItems: 'center',
      textAlign: 'center',
    },
    innerRule: {
      width: 64,
      height: 2,
      backgroundColor: palette.primary,
      marginVertical: 10,
      alignSelf: 'center',
    },
    mastheadBand: {
      backgroundColor: palette.primary,
      color: palette.textOnPrimary,
      paddingTop: 36,
      paddingBottom: 28,
      paddingHorizontal: 40,
    },
    leftSpineBand: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      width: 18,
      backgroundColor: palette.primary,
    },
    bentoGrid: {
      borderWidth: 1,
      borderColor: palette.secondary,
      borderRadius: 8,
      padding: 24,
      backgroundColor: '#F8FAFC',
    },
    bentoAccentBar: {
      height: 6,
      width: 72,
      backgroundColor: palette.primary,
      borderRadius: 3,
      marginBottom: 16,
    },
    kicker: {
      fontSize: 9,
      ...bldStyle,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      color: palette.secondary,
      marginBottom: 8,
    },
    titleHero: {
      fontSize: coverStyleId === 'bold-impact' ? 32 : 26,
      ...bldStyle,
      color: palette.text,
      lineHeight: 1.18,
      marginBottom: 10,
    },
    titleOnBand: {
      fontSize: 28,
      ...bldStyle,
      color: palette.textOnPrimary,
      lineHeight: 1.18,
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 13,
      ...itlStyle,
      color: '#475569',
      lineHeight: 1.35,
      marginBottom: 12,
    },
    subtitleOnBand: {
      fontSize: 13,
      ...itlStyle,
      color: palette.textOnPrimary,
      opacity: 0.9,
      lineHeight: 1.35,
    },
    authorBlock: {
      fontSize: 13,
      ...bldStyle,
      color: palette.text,
      marginBottom: 4,
    },
    metaLine: {
      fontSize: 10,
      ...regStyle,
      color: '#475569',
      marginTop: 3,
      lineHeight: 1.4,
    },
    academicBox: {
      borderTopWidth: 1,
      borderTopColor: '#CBD5E1',
      paddingTop: 14,
      marginTop: 14,
      width: '100%',
    },
    qrImage: {
      width: 48,
      height: 48,
    },
  });

  const renderAcademicBlock = (alignCenter = false) => {
    if (!isAcademic && !institution && !facultyOrCourse && !teacher && !members) return null;
    return (
      <View style={[s.academicBox, alignCenter ? { alignItems: 'center', textAlign: 'center' } : {}]}>
        {institution && <Text style={[s.metaLine, bldStyle, { color: palette.text }]}>{institution}</Text>}
        {facultyOrCourse && <Text style={s.metaLine}>{facultyOrCourse}</Text>}
        {teacher && <Text style={s.metaLine}>Docente / Tutor: {teacher}</Text>}
        {members && <Text style={s.metaLine}>Integrantes: {members}</Text>}
        {studentId && <Text style={s.metaLine}>Legajo / Matrícula: {studentId}</Text>}
      </View>
    );
  };

  const renderFooterRow = (alignCenter = false) => (
    <View
      style={{
        flexDirection: alignCenter ? 'column' : 'row',
        alignItems: alignCenter ? 'center' : 'flex-end',
        justifyContent: 'space-between',
        gap: 10,
        marginTop: 16,
      }}
    >
      <View style={alignCenter ? { alignItems: 'center', textAlign: 'center' } : {}}>
        {author && <Text style={s.authorBlock}>{cleanText(author)}</Text>}
        {(editor || year) && (
          <Text style={s.metaLine}>
            {[cleanText(editor), year].filter(Boolean).join(' · ')}
          </Text>
        )}
        {isExecutive && !author && editor && (
          <Text style={s.metaLine}>{cleanText(editor)}</Text>
        )}
      </View>
      {isRenderablePdfImageSrc(qrCodeUrl) && <Image style={s.qrImage} src={qrCodeUrl} />}
    </View>
  );

  // Arquetipo 1: Masthead Revista / Cátedra (magazine-executive) o Bold Impact
  if (coverStyleId === 'magazine-executive' || coverStyleId === 'bold-impact') {
    return (
      <Page size={pageSize} style={s.page}>
        {startAnchors}
        <View style={s.mastheadBand}>
          <Text style={[s.kicker, { color: palette.textOnPrimary, opacity: 0.85 }]}>
            {institution || (isAcademic ? 'Trabajo Académico' : isExecutive ? 'Documento Ejecutivo' : 'Edición Literaria')}
          </Text>
          <Text style={s.titleOnBand}>{cleanText(title)}</Text>
          {subtitle && <Text style={s.subtitleOnBand}>{cleanText(subtitle)}</Text>}
        </View>

        <View style={{ paddingHorizontal: 40, paddingBottom: 38, flexGrow: 1, justifyContent: 'space-between' }}>
          <View style={{ marginTop: 28 }}>
            {coverStyleId === 'bold-impact' && (
              <View style={{ width: 56, height: 4, backgroundColor: palette.primary, marginBottom: 14 }} />
            )}
            {renderAcademicBlock(false)}
          </View>
          {renderFooterRow(false)}
        </View>
        {endAnchors}
      </Page>
    );
  }

  // Arquetipo 2: Bento Grid Modular (modern-corporate)
  if (coverStyleId === 'modern-corporate') {
    return (
      <Page size={pageSize} style={s.page}>
        {startAnchors}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={s.kicker}>
            {institution || (isAcademic ? 'Presentación Académica' : 'Edición Estructurada')}
          </Text>
          {year && <Text style={[s.kicker, { color: palette.primary }]}>{year}</Text>}
        </View>

        <View style={s.bentoGrid}>
          <View style={s.bentoAccentBar} />
          <Text style={s.titleHero}>{cleanText(title)}</Text>
          {subtitle && <Text style={s.subtitle}>{cleanText(subtitle)}</Text>}
          {renderAcademicBlock(false)}
        </View>

        {renderFooterRow(false)}
        {endAnchors}
      </Page>
    );
  }

  // Arquetipo 3: Minimalista Radical (minimal-editorial)
  if (coverStyleId === 'minimal-editorial') {
    return (
      <Page size={pageSize} style={s.page}>
        {startAnchors}
        <View style={{ marginTop: 44 }}>
          {(institution || facultyOrCourse) && (
            <Text style={s.kicker}>{[institution, facultyOrCourse].filter(Boolean).join(' · ')}</Text>
          )}
          <Text style={[s.titleHero, { marginTop: 8 }]}>{cleanText(title)}</Text>
          {subtitle && <Text style={s.subtitle}>{cleanText(subtitle)}</Text>}
          <View style={{ width: 38, height: 1.5, backgroundColor: palette.primary, marginTop: 10 }} />
        </View>

        <View>
          {renderAcademicBlock(false)}
          {renderFooterRow(false)}
        </View>
        {endAnchors}
      </Page>
    );
  }

  // Arquetipo 4: Orgánico & Banda Lateral (creative-sustentable)
  if (coverStyleId === 'creative-sustentable') {
    return (
      <Page size={pageSize} style={[s.page, { paddingLeft: 56 }]}>
        {startAnchors}
        <View style={s.leftSpineBand} />
        <View style={{ marginTop: 32 }}>
          <Text style={[s.kicker, { color: palette.primary }]}>
            {institution || (isAcademic ? 'Monografía / Estudio' : 'Obra Editorial')}
          </Text>
          <Text style={s.titleHero}>{cleanText(title)}</Text>
          {subtitle && <Text style={s.subtitle}>{cleanText(subtitle)}</Text>}
        </View>

        <View>
          {renderAcademicBlock(false)}
          {renderFooterRow(false)}
        </View>
        {endAnchors}
      </Page>
    );
  }

  // Arquetipo 5 (por defecto): Canon Clásico Van de Graaf (monica-classic)
  return (
    <Page size={pageSize} style={s.page}>
      {startAnchors}
      <View style={s.frameClassic}>
        <View style={{ alignItems: 'center', textAlign: 'center', marginTop: 12 }}>
          {institution && (
            <Text style={[s.kicker, { color: palette.primary }]}>{institution}</Text>
          )}
          {facultyOrCourse && <Text style={s.metaLine}>{facultyOrCourse}</Text>}
        </View>

        <View style={{ alignItems: 'center', textAlign: 'center', paddingHorizontal: 14 }}>
          <View style={s.innerRule} />
          <Text style={[s.titleHero, { textAlign: 'center', marginTop: 10 }]}>{cleanText(title)}</Text>
          {subtitle && <Text style={[s.subtitle, { textAlign: 'center' }]}>{cleanText(subtitle)}</Text>}
          <View style={s.innerRule} />
        </View>

        <View style={{ width: '100%', alignItems: 'center' }}>
          {renderAcademicBlock(true)}
          {renderFooterRow(true)}
        </View>
      </View>
      {endAnchors}
    </Page>
  );
};

export interface EditorialSectionDividerPageProps {
  pageSize: 'A4' | 'A5' | 'LETTER' | [number, number];
  coverStyleId?: CoverStyleId | string;
  coverPaletteKey?: string;
  fallbackPalette: ColorPalette;
  kicker?: string;
  title: string;
  subtitle?: string;
  epigraphText?: string;
  epigraphAuthor?: string;
  tocMarker?: React.ReactNode;
  baseFont: string;
  boldFont: string;
  italicFont: string;
}

/**
 * Portadilla / Carátula separadora de capítulo o sección para EditorLee.
 * Consume los mismos 6 arquetipos de `COVER_PRESETS_CATALOG` y paletas de `PRESET_COLORS`
 * con una composición aireada de separador interno (sin pie de numeración).
 */
export const EditorialSectionDividerPage: React.FC<EditorialSectionDividerPageProps> = ({
  pageSize,
  coverStyleId = 'monica-classic',
  coverPaletteKey,
  fallbackPalette,
  kicker,
  title,
  subtitle,
  epigraphText,
  epigraphAuthor,
  tocMarker,
  baseFont,
  boldFont,
  italicFont,
}) => {
  const palette: ColorPalette =
    (coverPaletteKey && PRESET_COLORS[coverPaletteKey]?.palette) || fallbackPalette;

  const { styles: resolvedFonts, isUnicodeFont } = resolveEditorialPdfFontStyles(baseFont);
  const regStyle = isUnicodeFont ? resolvedFonts.regular : { fontFamily: baseFont };
  const bldStyle = isUnicodeFont ? resolvedFonts.bold : { fontFamily: boldFont };
  const itlStyle = isUnicodeFont ? resolvedFonts.italic : { fontFamily: italicFont };

  const cleanKicker = cleanText(kicker);
  const cleanTitle = cleanText(title);
  const cleanSubtitle = cleanText(subtitle);
  const cleanEpigraph = cleanText(epigraphText);
  const cleanEpigraphAuthor = cleanText(epigraphAuthor);

  const renderDividerEpigraph = () =>
    cleanEpigraph ? (
      <View style={{ marginTop: 28, paddingHorizontal: 18, maxWidth: 360 }}>
        <Text style={[itlStyle, { fontSize: 10.5, color: '#475569', lineHeight: 1.4, textAlign: 'center' }]}>
          {cleanEpigraph}
        </Text>
        {cleanEpigraphAuthor ? (
          <Text style={[regStyle, { fontSize: 9, color: '#64748B', marginTop: 4, textAlign: 'center' }]}>
            — {cleanEpigraphAuthor}
          </Text>
        ) : null}
      </View>
    ) : null;

  if (coverStyleId === 'magazine-executive' || coverStyleId === 'bold-impact') {
    return (
      <Page
        size={pageSize}
        style={{
          ...regStyle,
          backgroundColor: '#FFFFFF',
          color: palette.text,
          flexDirection: 'column',
        }}
      >
        {tocMarker}
        <View
          style={{
            backgroundColor: palette.primary,
            color: palette.textOnPrimary,
            paddingTop: 58,
            paddingBottom: 42,
            paddingHorizontal: 44,
          }}
        >
          {cleanKicker ? (
            <Text
              style={{
                fontSize: 10,
                ...bldStyle,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                color: palette.textOnPrimary,
                opacity: 0.85,
                marginBottom: 10,
              }}
            >
              {cleanKicker}
            </Text>
          ) : null}
          <Text
            style={{
              fontSize: 28,
              ...bldStyle,
              color: palette.textOnPrimary,
              lineHeight: 1.2,
            }}
          >
            {cleanTitle}
          </Text>
        </View>
        {cleanSubtitle ? (
          <View style={{ paddingHorizontal: 44, paddingTop: 32 }}>
            <Text style={{ fontSize: 13, ...itlStyle, color: '#475569', lineHeight: 1.4 }}>
              {cleanSubtitle}
            </Text>
          </View>
        ) : null}
        {renderDividerEpigraph()}
      </Page>
    );
  }

  if (coverStyleId === 'creative-sustentable') {
    return (
      <Page
        size={pageSize}
        style={{
          ...regStyle,
          backgroundColor: '#FFFFFF',
          color: palette.text,
          paddingLeft: 58,
          paddingRight: 42,
          justifyContent: 'center',
        }}
      >
        {tocMarker}
        <View
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: 18,
            backgroundColor: palette.primary,
          }}
        />
        <View>
          {cleanKicker ? (
            <Text
              style={{
                fontSize: 10,
                ...bldStyle,
                letterSpacing: 1.4,
                textTransform: 'uppercase',
                color: palette.primary,
                marginBottom: 8,
              }}
            >
              {cleanKicker}
            </Text>
          ) : null}
          <Text style={{ fontSize: 26, ...bldStyle, color: palette.text, marginBottom: 10 }}>
            {cleanTitle}
          </Text>
          {cleanSubtitle ? (
            <Text style={{ fontSize: 13, ...itlStyle, color: '#475569', lineHeight: 1.4 }}>
              {cleanSubtitle}
            </Text>
          ) : null}
          {renderDividerEpigraph()}
        </View>
      </Page>
    );
  }

  if (coverStyleId === 'modern-corporate' || coverStyleId === 'minimal-editorial') {
    return (
      <Page
        size={pageSize}
        style={{
          ...regStyle,
          backgroundColor: '#FFFFFF',
          color: palette.text,
          padding: 46,
          justifyContent: 'center',
        }}
      >
        {tocMarker}
        <View
          style={
            coverStyleId === 'modern-corporate'
              ? {
                  borderWidth: 1,
                  borderColor: palette.secondary,
                  borderRadius: 8,
                  padding: 28,
                  backgroundColor: '#F8FAFC',
                }
              : {}
          }
        >
          <View
            style={{
              height: 4,
              width: 56,
              backgroundColor: palette.primary,
              marginBottom: 14,
            }}
          />
          {cleanKicker ? (
            <Text
              style={{
                fontSize: 10,
                ...bldStyle,
                letterSpacing: 1.4,
                textTransform: 'uppercase',
                color: palette.secondary,
                marginBottom: 8,
              }}
            >
              {cleanKicker}
            </Text>
          ) : null}
          <Text style={{ fontSize: 26, ...bldStyle, color: palette.text, marginBottom: 10 }}>
            {cleanTitle}
          </Text>
          {cleanSubtitle ? (
            <Text style={{ fontSize: 13, ...itlStyle, color: '#475569', lineHeight: 1.4 }}>
              {cleanSubtitle}
            </Text>
          ) : null}
          {renderDividerEpigraph()}
        </View>
      </Page>
    );
  }

  // Canon Clásico Van de Graaf (monica-classic) con rombo SVG vectorial
  return (
    <Page
      size={pageSize}
      style={{
        ...regStyle,
        backgroundColor: '#FFFFFF',
        color: palette.text,
        padding: 42,
      }}
    >
      {tocMarker}
      <View
        style={{
          flexGrow: 1,
          borderWidth: 1.2,
          borderColor: palette.primary,
          padding: 32,
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        {cleanKicker ? (
          <Text
            style={{
              fontSize: 10,
              ...bldStyle,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              color: palette.primary,
              marginBottom: 10,
            }}
          >
            {cleanKicker}
          </Text>
        ) : null}
        <EditorialDiamondSeparator color={palette.primary} marginVertical={10} />
        <Text style={{ fontSize: 26, ...bldStyle, color: palette.text, textAlign: 'center', marginBottom: 10 }}>
          {cleanTitle}
        </Text>
        {cleanSubtitle ? (
          <Text style={{ fontSize: 13, ...itlStyle, color: '#475569', textAlign: 'center', marginBottom: 12 }}>
            {cleanSubtitle}
          </Text>
        ) : null}
        <EditorialDiamondSeparator color={palette.primary} marginVertical={8} />
        {renderDividerEpigraph()}
      </View>
    </Page>
  );
};
