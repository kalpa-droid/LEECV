import {
  CatalogItem,
  ComprobanteLetra,
  CondicionIva,
  InvoiceLineItem,
} from './facturadorTypes';

const ARS = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatARS(value: number): string {
  return ARS.format(Number.isFinite(value) ? value : 0);
}

export function formatPointOfSale(value: string | number): string {
  return String(value || '0').padStart(5, '0').slice(-5);
}

export function formatCompNro(value: string | number): string {
  return String(value || '0').padStart(8, '0').slice(-8);
}

export function formatQuantity(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace('.', ',');
}

/** Código de comprobante AFIP/ARCA por letra (informativo, no reemplaza el CAE). */
export function getCodigoAfipPorLetra(letra: ComprobanteLetra): string {
  switch (letra) {
    case 'A':
      return '01';
    case 'B':
      return '06';
    case 'C':
      return '11';
    default:
      return '00';
  }
}

export const CONDICION_IVA_LABEL: Record<CondicionIva, string> = {
  responsable_inscripto: 'Responsable Inscripto',
  monotributista: 'Monotributista',
  exento: 'IVA Exento',
  consumidor_final: 'Consumidor Final',
};

export interface TierResolution {
  unitPrice: number;
  discountPct: number;
  tierIndex: number;
  nextTierMinQty?: number;
  nextTierDiscountPct?: number;
  nextTierAhorroPct?: number;
}

/**
 * Precio unitario final según los escalones mayoristas del catálogo.
 * Los escalones se evalúan de mayor a menor y gana el primero que aplica.
 */
export function resolveTierPrice(item: Pick<CatalogItem, 'precioBase' | 'escalones'>, qty: number): TierResolution {
  const base = Number(item?.precioBase) || 0;
  const escalones = (item?.escalones || [])
    .filter((e) => Number(e.minQty) > 0)
    .sort((a, b) => a.minQty - b.minQty);

  let discountPct = 0;
  let tierIndex = -1;
  escalones.forEach((tier, idx) => {
    if (qty >= tier.minQty) {
      discountPct = Number(tier.discountPct) || 0;
      tierIndex = idx;
    }
  });

  const next = escalones.find((tier) => qty < tier.minQty);
  return {
    unitPrice: base * (1 - discountPct / 100),
    discountPct,
    tierIndex,
    nextTierMinQty: next?.minQty,
    nextTierDiscountPct: next?.discountPct,
    nextTierAhorroPct: next ? Math.max(0, next.discountPct - discountPct) : undefined,
  };
}

export function nextTierHint(item: Pick<CatalogItem, 'precioBase' | 'escalones'>, qty: number): string | null {
  const tier = resolveTierPrice(item, qty);
  if (!tier.nextTierMinQty || !tier.nextTierAhorroPct) return null;
  const faltan = Math.max(0, tier.nextTierMinQty - qty);
  if (faltan <= 0) return null;
  return `Sumá ${faltan} más y ahorrás ${tier.nextTierAhorroPct}%`;
}

export interface LineRow {
  item: InvoiceLineItem;
  unitPrice: number;
  bruto: number;
  descuento: number;
  subtotal: number;
}

export function computeLineRow(item: InvoiceLineItem): LineRow {
  const qty = Number(item.cantidad) || 0;
  const unit = Number(item.precioUnitario) || 0;
  const dtoPct = Number(item.descuentoPct) || 0;
  const bruto = qty * unit;
  const descuento = bruto * (dtoPct / 100);
  return { item, unitPrice: unit, bruto, descuento, subtotal: bruto - descuento };
}

export interface InvoiceTotals {
  subtotal: number;
  descuento: number;
  iva: number;
  total: number;
  subtotalConIva: number;
}

/**
 * Totales del comprobante.
 * - Letra A: el IVA se discrimina y se suma al subtotal.
 * - Letras B, C y X: los precios ya incluyen IVA; el IVA se informa como
 *   desglose interno y el total no cambia.
 */
export function computeInvoiceTotals(
  rows: LineRow[],
  ivaPct: number = 21,
  letra: ComprobanteLetra = 'B'
): InvoiceTotals {
  const subtotal = rows.reduce((acc, r) => acc + r.subtotal, 0);
  const descuento = rows.reduce((acc, r) => acc + r.descuento, 0);
  const pct = Math.max(0, Number(ivaPct) || 0) / 100;

  if (letra === 'A') {
    const iva = subtotal * pct;
    return { subtotal, descuento, iva, total: subtotal + iva, subtotalConIva: subtotal + iva };
  }

  const iva = pct > 0 ? subtotal - subtotal / (1 + pct) : 0;
  return { subtotal, descuento, iva, total: subtotal, subtotalConIva: subtotal };
}

export function isLowStock(item: Pick<CatalogItem, 'stock' | 'stockMinimo'>): boolean {
  const stock = Number(item?.stock) || 0;
  const minimo = Number(item?.stockMinimo) || 0;
  return stock <= minimo;
}

export type DueStatus = 'sin_vencimiento' | 'vigente' | 'por_vencer' | 'vencida';

/** Días entre hoy y el vencimiento (negativo = vencido). */
export function daysUntil(dateIso: string, today: Date = new Date()): number | null {
  if (!dateIso) return null;
  const target = new Date(`${dateIso}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target.getTime() - base.getTime()) / 86_400_000);
}

export function getInvoiceDueStatus(vencimiento: string, today: Date = new Date()): DueStatus {
  const days = daysUntil(vencimiento, today);
  if (days === null) return 'sin_vencimiento';
  if (days < 0) return 'vencida';
  if (days <= 7) return 'por_vencer';
  return 'vigente';
}

export function isInvoiceDueAlert(vencimiento: string, today: Date = new Date()): boolean {
  const status = getInvoiceDueStatus(vencimiento, today);
  return status === 'vencida' || status === 'por_vencer';
}

/** Descripción legible del comprobante: "Factura B 00001-00000042". */
export function describeComprobante(draft: {
  tipo: string;
  letra: ComprobanteLetra;
  puntoVenta: string;
  numero: string;
}): string {
  const tipoLabel =
    draft.tipo === 'presupuesto' ? 'Presupuesto' : draft.tipo === 'nota_credito' ? 'Nota de Crédito' : 'Factura';
  const nro = `${formatPointOfSale(draft.puntoVenta)}-${formatCompNro(draft.numero)}`;
  return `${tipoLabel} ${draft.letra} ${nro}`;
}
