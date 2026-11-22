import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet, pdf } from '@react-pdf/renderer';
import { getPageSize } from '../../../shared/core/pdf-engine/layers/page/pageSizes';
import {
  ivaCaption,
  prepareInvoiceRenderModel,
  formatFechaAR,
} from './invoicePdfAdapter';
import {
  EmpresaConfig,
  FacturadorDesignConfig,
  InvoiceDraft,
} from '../domain/facturadorTypes';
import { EMPTY_EMPRESA } from '../domain/facturadorDefaults';
import { registerPdfCategoryExporter } from '../../../shared/core/pdf-engine/pdfCategoryRegistry';
import { downloadBlob } from '../../../shared/core/utils/downloadUtils';

interface InvoicePdfProps {
  draft: InvoiceDraft;
  empresa: EmpresaConfig;
  design: FacturadorDesignConfig;
}

function toPdfPageSize(pageSizeId: string): 'A4' | 'LETTER' | 'LEGAL' | [number, number] {
  if (pageSizeId === 'carta') return 'LETTER';
  if (pageSizeId === 'legal') return 'LEGAL';
  if (pageSizeId === 'a4') return 'A4';
  const def = getPageSize(pageSizeId);
  return [def.widthPt, def.heightPt];
}

/**
 * Comprobante de FacturLee — un solo documento @react-pdf para preview y
 * descarga (mismo PDF, cero diferencias entre lo que se ve y lo que se imprime).
 *
 * El aviso fiscal va SIEMPRE impreso: sin CAE de ARCA esto es un comprobante
 * interno / presupuesto, nunca una factura fiscal.
 */
export const InvoicePdfDocument: React.FC<InvoicePdfProps> = ({ draft, empresa, design }) => {
  const model = prepareInvoiceRenderModel(draft, empresa, design);
  const { palette, typography } = model.preset;

  const styles = StyleSheet.create({
    page: {
      fontFamily: typography.fontFamily,
      backgroundColor: palette.background,
      color: palette.text,
      padding: 26,
      fontSize: typography.body,
    },
    halfPage: { padding: 18, fontSize: Math.max(6.5, typography.body - 1.5) },
    halfDivider: {
      borderTopWidth: 1,
      borderTopColor: palette.secondary,
      borderTopStyle: 'dashed',
      marginVertical: 8,
    },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    brand: { flexDirection: 'row', gap: 8, flex: 1 },
    logo: { width: 84, maxHeight: 46, objectFit: 'contain' },
    brandText: { flex: 1 },
    razonSocial: { fontSize: typography.sectionHeading, fontFamily: 'Helvetica-Bold' },
    fantasia: { fontSize: typography.caption + 0.5, color: palette.secondary, marginBottom: 2 },
    metaLine: { fontSize: typography.caption, lineHeight: 1.35 },
    box: {
      borderWidth: 1.2,
      borderColor: palette.primary,
      paddingVertical: 5,
      paddingHorizontal: 7,
      minWidth: 128,
    },
    letra: {
      fontSize: typography.title + 6,
      fontFamily: 'Helvetica-Bold',
      textAlign: 'center',
      color: palette.primary,
    },
    boxLabel: { fontSize: typography.caption, textAlign: 'center', color: palette.secondary },
    boxValue: { fontSize: typography.body, textAlign: 'center', fontFamily: 'Helvetica-Bold' },
    fiscalBand: {
      marginTop: 8,
      borderWidth: 0.8,
      borderColor: palette.accent,
      backgroundColor: '#FEF3C7',
      paddingVertical: 4,
      paddingHorizontal: 6,
    },
    fiscalText: { fontSize: typography.caption, color: '#7C2D12' },
    client: {
      marginTop: 8,
      padding: 6,
      borderWidth: 0.6,
      borderColor: palette.secondary,
      backgroundColor: '#F8FAFC',
    },
    clientTitle: { fontSize: typography.caption, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
    clientLine: { fontSize: typography.caption, lineHeight: 1.4 },
    table: { marginTop: 8, borderWidth: 0.6, borderColor: palette.secondary },
    tableHead: {
      flexDirection: 'row',
      backgroundColor: palette.primary,
      paddingVertical: 3,
      paddingHorizontal: 4,
    },
    tableHeadCell: { fontSize: typography.caption, color: palette.textOnPrimary, fontFamily: 'Helvetica-Bold' },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: 3,
      paddingHorizontal: 4,
      borderTopWidth: 0.4,
      borderTopColor: palette.secondary,
    },
    colDesc: { flex: 1, paddingRight: 4 },
    colQty: { width: 30, textAlign: 'right' },
    colUnit: { width: 54, textAlign: 'right' },
    colDto: { width: 32, textAlign: 'right' },
    colSub: { width: 58, textAlign: 'right' },
    emptyRow: { fontSize: typography.caption, color: palette.secondary, paddingVertical: 8, textAlign: 'center' },
    totalsRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
    totalsBox: { width: 168 },
    totalLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 1.5 },
    totalLineText: { fontSize: typography.caption },
    grandTotal: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 3,
      paddingVertical: 4,
      paddingHorizontal: 5,
      backgroundColor: palette.primary,
    },
    grandTotalText: { fontSize: typography.itemTitle, color: palette.textOnPrimary, fontFamily: 'Helvetica-Bold' },
    notes: { marginTop: 8 },
    notesTitle: { fontSize: typography.caption, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
    notesText: { fontSize: typography.caption, lineHeight: 1.4 },
    footer: {
      position: 'absolute',
      bottom: 14,
      left: 26,
      right: 26,
      borderTopWidth: 0.6,
      borderTopColor: palette.secondary,
      paddingTop: 4,
    },
    footerText: { fontSize: typography.caption - 0.5, color: palette.secondary, textAlign: 'center' },
  });

  const Copy = ({ compact = false }: { compact?: boolean }) => (
    <View style={compact ? styles.halfPage : undefined}>
      <View style={styles.header}>
        <View style={styles.brand}>
          {design.mostrarLogo && empresa.logoPngDataUrl ? (
            <Image style={styles.logo} src={empresa.logoPngDataUrl} />
          ) : null}
          <View style={styles.brandText}>
            <Text style={styles.razonSocial}>{empresa.razonSocial || 'TU NEGOCIO'}</Text>
            {empresa.nombreFantasia ? <Text style={styles.fantasia}>{empresa.nombreFantasia}</Text> : null}
            <Text style={styles.metaLine}>CUIT: {empresa.cuit || '—'}</Text>
            {empresa.domicilio ? (
              <Text style={styles.metaLine}>
                {empresa.domicilio}
                {empresa.localidad ? `, ${empresa.localidad}` : ''}
                {empresa.provincia ? `, ${empresa.provincia}` : ''}
              </Text>
            ) : null}
            {empresa.telefono || empresa.email ? (
              <Text style={styles.metaLine}>
                {[empresa.telefono, empresa.email].filter(Boolean).join(' · ')}
              </Text>
            ) : null}
            <Text style={styles.metaLine}>{model.condicionIvaEmisor}</Text>
            {empresa.ingresosBrutos ? (
              <Text style={styles.metaLine}>Ingresos Brutos: {empresa.ingresosBrutos}</Text>
            ) : null}
            {empresa.inicioActividades ? (
              <Text style={styles.metaLine}>
                Inicio de actividades: {formatFechaAR(empresa.inicioActividades)}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.box}>
          <Text style={styles.letra}>{draft.letra}</Text>
          <Text style={styles.boxLabel}>{model.tipoLabel}</Text>
          <Text style={styles.boxValue}>{model.numeroLabel}</Text>
          <Text style={styles.boxLabel}>Fecha: {model.fechaLabel || '—'}</Text>
          <Text style={styles.boxLabel}>Cód. ARCA: {model.codigoAfip}</Text>
        </View>
      </View>

      <View style={styles.fiscalBand}>
        <Text style={styles.fiscalText}>{model.disclaimer}</Text>
      </View>

      <View style={styles.client}>
        <Text style={styles.clientTitle}>Señores</Text>
        <Text style={styles.clientLine}>
          {model.cliente?.nombre || 'Consumidor Final'}
          {model.cliente?.cuit ? ` · CUIT ${model.cliente.cuit}` : ''}
          {model.condicionIvaCliente ? ` · ${model.condicionIvaCliente}` : ''}
        </Text>
        {model.cliente?.domicilio ? (
          <Text style={styles.clientLine}>
            {model.cliente.domicilio}
            {model.cliente.localidad ? `, ${model.cliente.localidad}` : ''}
          </Text>
        ) : null}
      </View>

      <View style={styles.table}>
        <View style={styles.tableHead}>
          <Text style={[styles.tableHeadCell, styles.colDesc]}>Descripción</Text>
          <Text style={[styles.tableHeadCell, styles.colQty]}>Cant.</Text>
          <Text style={[styles.tableHeadCell, styles.colUnit]}>P. Unit.</Text>
          <Text style={[styles.tableHeadCell, styles.colDto]}>Dto. %</Text>
          <Text style={[styles.tableHeadCell, styles.colSub]}>Subtotal</Text>
        </View>
        {model.rows.length === 0 ? (
          <Text style={styles.emptyRow}>Todavía no agregaste ítems a este comprobante.</Text>
        ) : (
          model.rows.map((row) => (
            <View key={row.item.id} style={styles.tableRow} wrap={false}>
              <Text style={styles.colDesc}>{row.descripcion}</Text>
              <Text style={styles.colQty}>{row.cantidadLabel}</Text>
              <Text style={styles.colUnit}>{row.unitPrice.toFixed(2)}</Text>
              <Text style={styles.colDto}>{row.item.descuentoPct ? row.item.descuentoPct : '—'}</Text>
              <Text style={styles.colSub}>{row.subtotal.toFixed(2)}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.totalsRow}>
        <View style={styles.totalsBox}>
          <View style={styles.totalLine}>
            <Text style={styles.totalLineText}>Subtotal</Text>
            <Text style={styles.totalLineText}>{model.subtotalLabel}</Text>
          </View>
          {model.totals.descuento > 0 ? (
            <View style={styles.totalLine}>
              <Text style={styles.totalLineText}>Descuento</Text>
              <Text style={styles.totalLineText}>- {model.descuentoLabel}</Text>
            </View>
          ) : null}
          <View style={styles.totalLine}>
            <Text style={styles.totalLineText}>{ivaCaption(draft.letra)}</Text>
            <Text style={styles.totalLineText}>{model.ivaLabel}</Text>
          </View>
          <View style={styles.grandTotal}>
            <Text style={styles.grandTotalText}>TOTAL</Text>
            <Text style={styles.grandTotalText}>{model.totalLabel}</Text>
          </View>
          {model.vencimientoLabel ? (
            <Text style={styles.totalLineText}>Vence: {model.vencimientoLabel}</Text>
          ) : null}
        </View>
      </View>

      {model.observaciones ? (
        <View style={styles.notes}>
          <Text style={styles.notesTitle}>Observaciones</Text>
          <Text style={styles.notesText}>{model.observaciones}</Text>
        </View>
      ) : null}

      {!compact ? (
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {model.empresa.razonSocial || 'FacturLee'} · {model.comprobanteLabel} · Documento interno generado en
            LEECV
          </Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <Document title={model.comprobanteLabel} author={empresa.razonSocial || 'FacturLee'}>
      <Page size={toPdfPageSize(design.pageSizeId)} style={styles.page} wrap>
        {design.duplicateHalfSheet ? (
          <>
            <Copy compact />
            <View style={styles.halfDivider} />
            <Copy compact />
          </>
        ) : (
          <Copy />
        )}
      </Page>
    </Document>
  );
};

export default InvoicePdfDocument;

registerPdfCategoryExporter('factura', async (cvData, preset) => {
  const draft = cvData?.draft;
  const empresa = cvData?.empresa || EMPTY_EMPRESA;
  const design = cvData?.design || {
    presetId: preset.id,
    pageSizeId: 'a4',
    duplicateHalfSheet: false,
    mostrarLogo: true,
    mostrarObservaciones: true,
  };
  if (!draft) return false;
  const docElement = React.createElement(InvoicePdfDocument, { draft, empresa, design });
  const blob = await pdf(docElement as any).toBlob();
  const nro = `${String(draft.puntoVenta || '0').padStart(5, '0')}-${String(draft.numero || '0').padStart(8, '0')}`;
  const tipo = draft.tipo === 'presupuesto' ? 'Presupuesto' : draft.tipo === 'nota_credito' ? 'Nota de Credito' : 'Factura';
  downloadBlob(blob, `${tipo}-${draft.letra}-${nro}.pdf`);
  return true;
});
