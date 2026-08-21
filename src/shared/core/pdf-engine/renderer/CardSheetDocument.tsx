import React from 'react';
import { Document, Page, View } from '@react-pdf/renderer';
import { Preset } from '../layers/presets/presetSchema';
import { getPageSize, PageSize } from '../layers/page/pageSizes';
import { MARGIN_PRESETS, resolveMargins, MarginPreset } from '../layers/margins/marginPresets';
import { BLEED_PRESETS, resolveBleedBox } from '../layers/bleed/bleedSpec';
import { IMPOSITION_PRESETS, resolveImposition, mirrorImpositionForBackSide, ImpositionResult } from '../layers/imposition/resolveImposition';
import { CardFace } from './cardFaceRenderer';
import { ContentSection } from '../layers/records/recordTypes';
import { BusinessCardData, cardDataToFrontSections, cardDataToBackSections } from '../layers/records/cardDataAdapter';

const MM_TO_PT = 2.8346;
const mmToPt = (mm: number) => mm * MM_TO_PT;

interface CardSheetDocumentProps {
  card: BusinessCardData;
  preset: Preset;
}

export function CardSheetDocument({ card, preset }: CardSheetDocumentProps) {
  if (!preset.print || !preset.back) return null;

  const trimPage = getPageSize(preset.pageSizeId);
  const sheetPageSize = getPageSize(preset.print.defaultSheetPageSizeId);
  const bleedSpec = BLEED_PRESETS[preset.print.bleedPresetId] || BLEED_PRESETS.ninguno;
  const impositionSpec = IMPOSITION_PRESETS[preset.print.impositionPresetId] || IMPOSITION_PRESETS.impresora_oficina;
  const cardMarginPreset = MARGIN_PRESETS[preset.marginPresetId] || MARGIN_PRESETS.tarjeta_ajustada;

  const bleedBox = resolveBleedBox({ trimWidthMm: trimPage.widthMm, trimHeightMm: trimPage.heightMm }, bleedSpec);
  const outerWidthPt = mmToPt(bleedBox.bleedWidthMm);
  const outerHeightPt = mmToPt(bleedBox.bleedHeightMm);

  const syntheticBleedPage: PageSize = {
    id: 'bleed-box', name: 'Bleed box', label: 'Bleed box',
    widthMm: bleedBox.bleedWidthMm, heightMm: bleedBox.bleedHeightMm,
    widthPt: outerWidthPt, heightPt: outerHeightPt, category: 'tarjeta'
  };
  const addBleedToMargin = <T extends number | { percentOfHeight: number } | { percentOfWidth: number }>(v: T): T =>
    (typeof v === 'number' ? ((v + bleedSpec.bleedMm) as T) : v);
  const marginWithBleed: MarginPreset = {
    id: 'auto-bleed', name: 'Auto (margen + sangrado)',
    top: addBleedToMargin(cardMarginPreset.top),
    bottom: addBleedToMargin(cardMarginPreset.bottom),
    left: addBleedToMargin(cardMarginPreset.left),
    right: addBleedToMargin(cardMarginPreset.right)
  };
  const usableArea = resolveMargins(syntheticBleedPage, marginWithBleed);

  const impositionFront = resolveImposition(sheetPageSize, bleedBox, impositionSpec);
  const impositionBack = mirrorImpositionForBackSide(impositionFront, sheetPageSize, bleedBox, preset.print.duplexMode);

  const frontSections = cardDataToFrontSections(card);
  const backSections = cardDataToBackSections(card);

  const pdfPaperSize = sheetPageSize.id === 'carta' ? 'LETTER' : sheetPageSize.id === 'legal' ? 'LEGAL' : sheetPageSize.id === 'afiche_a3' ? 'A3' : 'A4';

  const renderSheet = (imposition: ImpositionResult, sections: ContentSection[], isBack = false) => (
    <Page size={pdfPaperSize} style={{ backgroundColor: '#ffffff' }}>
      {/* Tarjetas en grilla */}
      {imposition.cards.map((c) => (
        <View key={`${c.row}-${c.col}`} style={{ position: 'absolute', left: mmToPt(c.xMm), top: mmToPt(c.yMm) }}>
          <CardFace
            preset={preset}
            sectors={isBack ? preset.back!.sectors : preset.sectors}
            fixedObjects={isBack ? preset.back!.fixedObjects : preset.fixedObjects}
            sectionOrder={isBack ? preset.back!.sectionOrder : preset.sectionOrder}
            sections={sections}
            outerWidthPt={outerWidthPt}
            outerHeightPt={outerHeightPt}
            usable={usableArea}
          />
        </View>
      ))}

      {/* Marcas de corte */}
      {imposition.cropMarks.map((mark, i) => (
        <View
          key={`mark-${i}`}
          style={{
            position: 'absolute',
            left: mmToPt(Math.min(mark.x1, mark.x2)),
            top: mmToPt(Math.min(mark.y1, mark.y2)),
            width: Math.max(0.5, mmToPt(Math.abs(mark.x2 - mark.x1))),
            height: Math.max(0.5, mmToPt(Math.abs(mark.y2 - mark.y1))),
            backgroundColor: '#999999'
          }}
        />
      ))}
    </Page>
  );

  return (
    <Document title={`Tarjetas - ${card.fullName || 'Sin nombre'}`}>
      {renderSheet(impositionFront, frontSections, false)}
      {renderSheet(impositionBack, backSections, true)}
    </Document>
  );
}
