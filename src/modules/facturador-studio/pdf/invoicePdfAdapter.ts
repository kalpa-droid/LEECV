import {
  ClienteFactura,
  EmpresaConfig,
  FacturadorDesignConfig,
  InvoiceDraft,
} from '../domain/facturadorTypes';
import {
  CONDICION_IVA_LABEL,
  computeInvoiceTotals,
  computeLineRow,
  describeComprobante,
  formatARS,
  getCodigoAfip,
  LineRow,
} from '../domain/invoiceMath';
import { getInvoicePreset } from './facturadorPresets';

/**
 * CAPA REGISTROS — ADAPTADOR DE FACTURA
 *
 * Traduce los datos del facturador (bóveda cifrada) al modelo plano que
 * consume `InvoicePdfDocument`. Toda la aritmética vive en `invoiceMath.ts`;
 * acá solo se arma la presentación (textos, totales y avisos legales).
 */

export const FISCAL_DISCLAIMER =
  'Comprobante interno sin CAE de ARCA. No es una factura fiscal y no reemplaza al comprobante que emite el organismo.';

export interface InvoiceRenderRow extends LineRow {
  nombre: string;
  detalle: string;
  descripcion: string;
  cantidadLabel: string;
  unitPriceLabel: string;
  subtotalLabel: string;
}

export interface InvoiceRenderModel {
  empresa: EmpresaConfig;
  cliente: ClienteFactura | null;
  design: FacturadorDesignConfig;
  preset: ReturnType<typeof getInvoicePreset>;
  tipoLabel: string;
  comprobanteLabel: string;
  numeroLabel: string;
  fechaLabel: string;
  vencimientoLabel: string;
  condicionIvaEmisor: string;
  condicionIvaCliente: string;
  codigoAfip: string;
  rows: InvoiceRenderRow[];
  totals: ReturnType<typeof computeInvoiceTotals>;
  totalLabel: string;
  subtotalLabel: string;
  descuentoLabel: string;
  ivaLabel: string;
  observaciones: string;
  disclaimer: string;
  esFiscal: false;
}

const TIPO_LABEL: Record<string, string> = {
  factura: 'FACTURA',
  nota_credito: 'NOTA DE CRÉDITO',
  presupuesto: 'PRESUPUESTO',
  remito: 'REMITO',
  recibo: 'RECIBO',
};

/** La fecha se guarda ISO (YYYY-MM-DD) y se muestra DD/MM/AAAA. */
export function formatFechaAR(iso: string): string {
  if (!iso) return '';
  const [year, month, day] = iso.split('-');
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

export function prepareInvoiceRenderModel(
  draft: InvoiceDraft,
  empresa: EmpresaConfig,
  design: FacturadorDesignConfig
): InvoiceRenderModel {
  const preset = getInvoicePreset(design.presetId);
  const rows = (draft.items || []).map((item) => {
    const row = computeLineRow(item);
    const nombre = (item.nombre || item.descripcion || 'Ítem sin nombre').trim();
    const detalle =
      item.nombre && item.descripcion && item.descripcion.trim() !== item.nombre.trim()
        ? item.descripcion.trim()
        : '';
    return {
      ...row,
      nombre,
      detalle,
      descripcion: nombre,
      cantidadLabel: String(item.cantidad ?? 0).replace('.', ','),
      unitPriceLabel: formatARS(row.unitPrice),
      subtotalLabel: formatARS(row.subtotal),
    };
  });

  const totals = computeInvoiceTotals(rows, 21, draft.letra);

  return {
    empresa,
    cliente: draft.cliente,
    design,
    preset,
    tipoLabel: TIPO_LABEL[draft.tipo] || 'COMPROBANTE',
    comprobanteLabel: describeComprobante(draft),
    numeroLabel: `${String(draft.puntoVenta || '0').padStart(5, '0')}-${String(
      draft.numero || '0'
    ).padStart(8, '0')}`,
    fechaLabel: formatFechaAR(draft.fecha),
    vencimientoLabel: formatFechaAR(draft.vencimiento),
    condicionIvaEmisor: CONDICION_IVA_LABEL[empresa.condicionIva] || '',
    condicionIvaCliente: draft.cliente
      ? CONDICION_IVA_LABEL[draft.cliente.condicionIva] || ''
      : '',
    codigoAfip: getCodigoAfip(draft.tipo, draft.letra),
    rows,
    totals,
    totalLabel: formatARS(totals.total),
    subtotalLabel: formatARS(totals.subtotal),
    descuentoLabel: formatARS(totals.descuento),
    ivaLabel: formatARS(totals.iva),
    observaciones: design.mostrarObservaciones ? draft.observaciones || '' : '',
    disclaimer: FISCAL_DISCLAIMER,
    esFiscal: false,
  };
}

/** Etiqueta del IVA según letra: la A discrimina, la B y C lo informan incluido. */
export function ivaCaption(letra: InvoiceDraft['letra']): string {
  if (letra === 'A') return 'IVA 21%';
  return 'IVA 21% (incluido en el precio)';
}
