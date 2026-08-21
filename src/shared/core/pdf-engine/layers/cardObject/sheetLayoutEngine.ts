// src/shared/core/pdf-engine/layers/cardObject/sheetLayoutEngine.ts
//
// Calcula CUÁNTAS tarjetas entran de verdad en una hoja fija (A4/A3/etc.) y
// DÓNDE va cada una — con sangrado real y separación de corte entre ellas.
//
// El dato que más cambia el resultado no es el tamaño de la tarjeta: es si
// la impresora del usuario puede imprimir "sin márgenes" (borderless) o no.
// La inmensa mayoría de impresoras hogareñas/oficina NO pueden imprimir
// hasta el borde físico exacto — dejan una franja de 3-5mm no imprimible en
// los bordes. Si no se tiene esto en cuenta, el usuario imprime, corta, y
// la primera fila/columna de tarjetas le sale con un borde blanco o cortada.

import { PageSize } from '../page/pageSizes';
import { CardObjectConfig } from './cardObjectSchema';

export type PrinterMarginMode = 'con_margen_estandar' | 'sin_margen_borderless';

/** Margen no imprimible típico de impresoras hogareñas/oficina (mm) */
export const STANDARD_PRINTER_UNPRINTABLE_MM = 5;

export interface CardSlot {
  /** Posición del RECTÁNGULO DE CORTE final (sin sangrado) en mm, desde el borde de la hoja */
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
}

export interface SheetLayoutResult {
  slots: CardSlot[];
  cols: number;
  rows: number;
  totalPerSheet: number;
  usableMarginMm: number;
  warning?: string;
}

export function calculateSheetLayout(
  sheet: PageSize,
  card: CardObjectConfig,
  printerMode: PrinterMarginMode
): SheetLayoutResult {
  const usableMarginMm = printerMode === 'sin_margen_borderless' ? 0 : STANDARD_PRINTER_UNPRINTABLE_MM;

  const usableWidthMm = sheet.widthMm - usableMarginMm * 2;
  const usableHeightMm = sheet.heightMm - usableMarginMm * 2;

  // El "paso" (pitch) entre tarjetas incluye la tarjeta + el gutter que ya
  // reparte el sangrado compartido entre vecinas (ver cardObjectSchema).
  const stepWidthMm = card.widthMm + card.gutterMm;
  const stepHeightMm = card.heightMm + card.gutterMm;

  const cols = Math.max(1, Math.floor((usableWidthMm + card.gutterMm) / stepWidthMm));
  const rows = Math.max(1, Math.floor((usableHeightMm + card.gutterMm) / stepHeightMm));

  const gridWidthMm = cols * stepWidthMm - card.gutterMm;
  const gridHeightMm = rows * stepHeightMm - card.gutterMm;

  // Centrado dentro del área realmente imprimible (no del borde físico)
  const offsetXMm = usableMarginMm + (usableWidthMm - gridWidthMm) / 2;
  const offsetYMm = usableMarginMm + (usableHeightMm - gridHeightMm) / 2;

  const slots: CardSlot[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      slots.push({
        xMm: offsetXMm + c * stepWidthMm,
        yMm: offsetYMm + r * stepHeightMm,
        widthMm: card.widthMm,
        heightMm: card.heightMm,
      });
    }
  }

  const result: SheetLayoutResult = {
    slots,
    cols,
    rows,
    totalPerSheet: cols * rows,
    usableMarginMm,
  };

  if (cols === 0 || rows === 0) {
    result.warning = 'La tarjeta es más grande que el área imprimible de esta hoja.';
  } else if (printerMode === 'sin_margen_borderless') {
    result.warning = 'Modo sin margen: solo funciona si tu impresora admite impresión "borderless" real. Si no estás seguro, usá "con margen estándar".';
  }

  return result;
}
