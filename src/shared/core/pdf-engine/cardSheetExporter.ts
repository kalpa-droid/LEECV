import React from 'react';
import { pdf, Document, Page, View } from '@react-pdf/renderer';
import { Preset } from './layers/presets/presetSchema';
import { getPageSize, PageSize } from './layers/page/pageSizes';
import { MARGIN_PRESETS, resolveMargins, MarginPreset } from './layers/margins/marginPresets';
import { BLEED_PRESETS, resolveBleedBox } from './layers/bleed/bleedSpec';
import { IMPOSITION_PRESETS, resolveImposition, mirrorImpositionForBackSide, ImpositionResult } from './layers/imposition/resolveImposition';
import { CardFace } from './renderer/cardFaceRenderer';
import { ContentSection } from './layers/records/recordTypes';
import { BusinessCardData, cardDataToFrontSections, cardDataToBackSections } from './layers/records/cardDataAdapter';

const MM_TO_PT = 2.8346;
const mmToPt = (mm: number) => mm * MM_TO_PT;

interface RenderSheetProps {
  preset: Preset;
  sheetPageSize: PageSize;
  imposition: ImpositionResult;
  sections: ContentSection[];
  sectors: Preset['sectors'];
  fixedObjects: Preset['fixedObjects'];
  sectionOrder: Preset['sectionOrder'];
  outerWidthPt: number;
  outerHeightPt: number;
  usableArea: ReturnType<typeof resolveMargins>;
}

function SheetPage({ preset, sheetPageSize, imposition, sections, sectors, fixedObjects, sectionOrder, outerWidthPt, outerHeightPt, usableArea }: RenderSheetProps) {
  const pdfPaperSize = sheetPageSize.id === 'carta' ? 'LETTER' : sheetPageSize.id === 'legal' ? 'LEGAL' : sheetPageSize.id === 'afiche_a3' ? 'A3' : 'A4';

  return React.createElement(
    Page,
    { size: pdfPaperSize, style: { backgroundColor: '#ffffff' } },
    // Tarjetas repetidas
    imposition.cards.map((card) =>
      React.createElement(
        View,
        {
          key: `${card.row}-${card.col}`,
          style: { position: 'absolute', left: mmToPt(card.xMm), top: mmToPt(card.yMm) }
        },
        React.createElement(CardFace, {
          preset,
          sectors,
          fixedObjects,
          sectionOrder,
          sections,
          outerWidthPt,
          outerHeightPt,
          usable: usableArea
        })
      )
    ),
    // Marcas de corte
    imposition.cropMarks.map((mark, i) =>
      React.createElement(View, {
        key: `mark-${i}`,
        style: {
          position: 'absolute',
          left: mmToPt(Math.min(mark.x1, mark.x2)),
          top: mmToPt(Math.min(mark.y1, mark.y2)),
          width: Math.max(0.5, mmToPt(Math.abs(mark.x2 - mark.x1))),
          height: Math.max(0.5, mmToPt(Math.abs(mark.y2 - mark.y1))),
          backgroundColor: '#999999'
        }
      })
    )
  );
}

/**
 * Orquesta las capas 6 (sangrado), 7 (imposición) y 8 (dorso) para un preset
 * de tarjeta, y arma un PDF de 2 páginas: hoja de frentes + hoja de dorsos,
 * ya reflejada en espejo según preset.print.duplexMode para que al imprimir
 * a doble faz frente y dorso queden alineados.
 */
export async function exportBusinessCardSheetToPDF(card: BusinessCardData, preset: Preset, sheetPageSizeIdOverride?: string): Promise<boolean> {
  if (!preset.print) throw new Error('Este preset no tiene configuración de impresión (preset.print)');
  if (!preset.back) throw new Error('Este preset no tiene dorso definido (preset.back)');

  const trimPage = getPageSize(preset.pageSizeId);
  const sheetPageSize = getPageSize(sheetPageSizeIdOverride || preset.print.defaultSheetPageSizeId);
  const bleedSpec = BLEED_PRESETS[preset.print.bleedPresetId] || BLEED_PRESETS.ninguno;
  const impositionSpec = IMPOSITION_PRESETS[preset.print.impositionPresetId] || IMPOSITION_PRESETS.impresora_oficina;
  const cardMarginPreset = MARGIN_PRESETS[preset.marginPresetId] || MARGIN_PRESETS.tarjeta_ajustada;

  const bleedBox = resolveBleedBox({ trimWidthMm: trimPage.widthMm, trimHeightMm: trimPage.heightMm }, bleedSpec);
  const outerWidthPt = mmToPt(bleedBox.bleedWidthMm);
  const outerHeightPt = mmToPt(bleedBox.bleedHeightMm);

  // El área de contenido de la tarjeta se calcula sobre una "página" sintética del
  // tamaño del bleed box, con el margen del preset + el sangrado sumado a cada lado
  // — así el texto nunca cae ni en la zona de sangrado ni pegado al borde de corte.
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

  const frontPage = SheetPage({
    preset, sheetPageSize, imposition: impositionFront, sections: frontSections,
    sectors: preset.sectors, fixedObjects: preset.fixedObjects, sectionOrder: preset.sectionOrder,
    outerWidthPt, outerHeightPt, usableArea
  });
  const backPage = SheetPage({
    preset, sheetPageSize, imposition: impositionBack, sections: backSections,
    sectors: preset.back.sectors, fixedObjects: preset.back.fixedObjects, sectionOrder: preset.back.sectionOrder,
    outerWidthPt, outerHeightPt, usableArea
  });

  const docElement = React.createElement(Document, { title: `Tarjetas - ${card.fullName || 'Sin nombre'}` }, frontPage, backPage);

  const blob = await pdf(docElement as any).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Tarjetas - ${card.fullName || 'Sin nombre'} (hoja ${sheetPageSize.name}, ${impositionFront.totalPerSheet} por hoja).pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return true;
}
