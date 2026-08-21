// src/shared/core/pdf-engine/layers/cardObject/CardSheetRenderer.tsx
//
// Dibuja la hoja completa (A4/A3/etc, fija) con N tarjetas adentro,
// cada una con su sangrado real y sus marcas de corte — así el usuario
// imprime, corta por las marcas, y la tarjeta le queda con el color/imagen
// llegando hasta el borde, sin franjas blancas.
import React from 'react';
import { Page, View, Svg, Line } from '@react-pdf/renderer';
import { PageSize } from '../page/pageSizes';
import { CardObjectConfig } from './cardObjectSchema';
import { SheetLayoutResult, CardSlot } from './sheetLayoutEngine';
import { TemplateRenderer } from '../../renderer/TemplateRenderer'; // reusa el mismo motor de capas del CV
import { Preset } from '../presets/presetSchema';

const MM_TO_PT = 2.8346;
const mm = (v: number) => v * MM_TO_PT;

const CROP_MARK_LENGTH_MM = 4;
const CROP_MARK_GAP_MM = 1.5; // separación entre la marca y el borde de corte real

function CropMarks({ slot }: { slot: CardSlot }) {
  // 4 esquinas, cada una con 2 líneas cortitas (horizontal + vertical),
  // separadas del borde de corte por CROP_MARK_GAP_MM — estándar de imprenta,
  // así la marca no se confunde con el propio borde de la tarjeta.
  const x0 = mm(slot.xMm), y0 = mm(slot.yMm);
  const x1 = mm(slot.xMm + slot.widthMm), y1 = mm(slot.yMm + slot.heightMm);
  const gap = mm(CROP_MARK_GAP_MM);
  const len = mm(CROP_MARK_LENGTH_MM);

  const corners = [
    { cx: x0, cy: y0, dx: -1, dy: -1 },
    { cx: x1, cy: y0, dx: 1, dy: -1 },
    { cx: x0, cy: y1, dx: -1, dy: 1 },
    { cx: x1, cy: y1, dx: 1, dy: 1 },
  ];

  return (
    <>
      {corners.map((c, i) => (
        <React.Fragment key={i}>
          <Line
            x1={c.cx + c.dx * gap} y1={c.cy}
            x2={c.cx + c.dx * (gap + len)} y2={c.cy}
            stroke="#000000" strokeWidth={0.5}
          />
          <Line
            x1={c.cx} y1={c.cy + c.dy * gap}
            x2={c.cx} y2={c.cy + c.dy * (gap + len)}
            stroke="#000000" strokeWidth={0.5}
          />
        </React.Fragment>
      ))}
    </>
  );
}

export function CardSheetRenderer({
  sheet,
  card,
  layout,
  preset,
  sections,
  personalInfo,
}: {
  sheet: PageSize;
  card: CardObjectConfig;
  layout: SheetLayoutResult;
  preset: Preset;
  sections: any[];
  personalInfo?: any;
}) {
  return (
    <Page size={{ width: mm(sheet.widthMm), height: mm(sheet.heightMm) }}>
      {layout.slots.map((slot, i) => {
        // El sangrado agranda el rectángulo de fondo/imagen MÁS ALLÁ del
        // corte real — por eso al cortar por la marca, el color llega
        // siempre hasta el borde final, sin franja blanca.
        const bleedSlot = {
          xMm: slot.xMm - card.bleedMm,
          yMm: slot.yMm - card.bleedMm,
          widthMm: slot.widthMm + card.bleedMm * 2,
          heightMm: slot.heightMm + card.bleedMm * 2,
        };

        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: mm(bleedSlot.xMm),
              top: mm(bleedSlot.yMm),
              width: mm(bleedSlot.widthMm),
              height: mm(bleedSlot.heightMm),
            }}
          >
            {/* Contenido de la tarjeta ocupando TODO el rectángulo con sangrado,
                así el fondo llega hasta el borde de sangrado, no solo hasta el
                corte final. Mismo motor de capas que el CV, en modo embedded. */}
            <TemplateRenderer
              preset={preset}
              sections={sections}
              personalInfo={personalInfo}
              embedded
              canvasWidthMm={bleedSlot.widthMm}
              canvasHeightMm={bleedSlot.heightMm}
            />
          </View>
        );
      })}

      {/* Marcas de corte por encima de todo, en coordenadas de la hoja completa */}
      <Svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
        {layout.slots.map((slot, i) => (
          <CropMarks key={i} slot={slot} />
        ))}
      </Svg>
    </Page>
  );
}
