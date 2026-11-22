import { CatalogItem, ClienteFactura, FacturadorVaultData } from './facturadorTypes';
import { CONDICION_IVA_LABEL } from './invoiceMath';

/**
 * RESPALDO EN EXCEL REAL (.xlsx)
 *
 * El exportador viejo generaba un XML de Excel 2003 con extensión .xls, que
 * Excel marca como archivo sospechoso. Acá usamos `exceljs` con importación
 * dinámica: 0 KB en el bundle inicial, 5 hojas reales y re-importación
 * validada de catálogo y clientes.
 */

const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

type ExcelJSModule = typeof import('exceljs');

async function loadExcelJs(): Promise<ExcelJSModule> {
  const mod: any = await import('exceljs');
  return (mod?.default?.Workbook ? mod.default : mod) as ExcelJSModule;
}

function money(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export async function exportVaultToXlsx(vault: FacturadorVaultData): Promise<Blob> {
  const ExcelJS = await loadExcelJs();
  const wb = new ExcelJS.Workbook();
  wb.creator = 'LEECV FacturLee';
  wb.created = new Date();

  const comprobantes = wb.addWorksheet('Comprobantes');
  comprobantes.columns = [
    { header: 'Fecha', key: 'fecha', width: 12 },
    { header: 'Tipo', key: 'tipo', width: 14 },
    { header: 'Letra', key: 'letra', width: 7 },
    { header: 'Punto de venta', key: 'puntoVenta', width: 15 },
    { header: 'Número', key: 'numero', width: 14 },
    { header: 'Cliente', key: 'cliente', width: 30 },
    { header: 'CUIT', key: 'cuit', width: 16 },
    { header: 'Neto', key: 'neto', width: 14 },
    { header: 'IVA', key: 'iva', width: 14 },
    { header: 'Total', key: 'total', width: 14 },
    { header: 'Estado', key: 'estado', width: 12 },
  ];

  const detalle = wb.addWorksheet('Detalle_Items');
  detalle.columns = [
    { header: 'Comprobante', key: 'comprobante', width: 26 },
    { header: 'Descripción', key: 'descripcion', width: 40 },
    { header: 'Cantidad', key: 'cantidad', width: 10 },
    { header: 'Precio unitario', key: 'precioUnitario', width: 16 },
    { header: 'Descuento %', key: 'descuentoPct', width: 12 },
    { header: 'Subtotal', key: 'subtotal', width: 14 },
  ];

  const catalogo = wb.addWorksheet('Catalogo_Precios');
  catalogo.columns = [
    { header: 'Nombre', key: 'nombre', width: 32 },
    { header: 'Descripción', key: 'descripcion', width: 40 },
    { header: 'Precio base', key: 'precioBase', width: 14 },
    { header: 'Stock', key: 'stock', width: 10 },
    { header: 'Stock mínimo', key: 'stockMinimo', width: 13 },
    { header: 'Escalón 1 (desde)', key: 'e1qty', width: 16 },
    { header: 'Escalón 1 (%)', key: 'e1pct', width: 14 },
    { header: 'Escalón 2 (desde)', key: 'e2qty', width: 16 },
    { header: 'Escalón 2 (%)', key: 'e2pct', width: 14 },
    { header: 'Escalón 3 (desde)', key: 'e3qty', width: 16 },
    { header: 'Escalón 3 (%)', key: 'e3pct', width: 14 },
  ];

  const clientes = wb.addWorksheet('Clientes');
  clientes.columns = [
    { header: 'Nombre', key: 'nombre', width: 32 },
    { header: 'CUIT', key: 'cuit', width: 16 },
    { header: 'Condición IVA', key: 'condicionIva', width: 22 },
    { header: 'Domicilio', key: 'domicilio', width: 32 },
    { header: 'Localidad', key: 'localidad', width: 22 },
    { header: 'Teléfono', key: 'telefono', width: 18 },
    { header: 'Email', key: 'email', width: 28 },
  ];

  const config = wb.addWorksheet('Entidad_Config');
  config.columns = [
    { header: 'Campo', key: 'campo', width: 24 },
    { header: 'Valor', key: 'valor', width: 48 },
  ];

  vault.comprobantes.forEach((comp) => {
    const total = money(comp.total);
    comprobantes.addRow({
      fecha: comp.fecha,
      tipo: comp.tipo,
      letra: comp.letra,
      puntoVenta: comp.puntoVenta,
      numero: comp.numero,
      cliente: comp.cliente?.nombre || '',
      cuit: comp.cliente?.cuit || '',
      neto: money(total / 1.21),
      iva: money(total - total / 1.21),
      total,
      estado: comp.estado,
    });
    comp.items.forEach((item) => {
      detalle.addRow({
        comprobante: `${comp.letra} ${comp.puntoVenta}-${comp.numero}`,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        precioUnitario: money(item.precioUnitario),
        descuentoPct: item.descuentoPct,
        subtotal: money(item.cantidad * item.precioUnitario * (1 - (item.descuentoPct || 0) / 100)),
      });
    });
  });

  vault.catalogo.forEach((item) => {
    const [e1, e2, e3] = item.escalones || [];
    catalogo.addRow({
      nombre: item.nombre,
      descripcion: item.descripcion,
      precioBase: money(item.precioBase),
      stock: item.stock,
      stockMinimo: item.stockMinimo,
      e1qty: e1?.minQty, e1pct: e1?.discountPct,
      e2qty: e2?.minQty, e2pct: e2?.discountPct,
      e3qty: e3?.minQty, e3pct: e3?.discountPct,
    });
  });

  vault.clientes.forEach((cli) => {
    clientes.addRow({
      nombre: cli.nombre,
      cuit: cli.cuit,
      condicionIva: CONDICION_IVA_LABEL[cli.condicionIva] || 'Consumidor Final',
      domicilio: cli.domicilio,
      localidad: cli.localidad,
      telefono: cli.telefono,
      email: cli.email,
    });
  });

  const e = vault.empresa;
  [
    ['Razón social', e.razonSocial],
    ['Nombre de fantasía', e.nombreFantasia],
    ['CUIT', e.cuit],
    ['Condición IVA', CONDICION_IVA_LABEL[e.condicionIva] || ''],
    ['Domicilio', e.domicilio],
    ['Localidad', e.localidad],
    ['Provincia', e.provincia],
    ['Teléfono', e.telefono],
    ['Email', e.email],
    ['Ingresos brutos', e.ingresosBrutos],
    ['Inicio de actividades', e.inicioActividades],
  ].forEach(([campo, valor]) => config.addRow({ campo, valor }));

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer as ArrayBuffer], { type: MIME_XLSX });
}

function cellText(cell: any): string {
  const value = cell?.text ?? cell?.value ?? '';
  if (value && typeof value === 'object') {
    if ('result' in value) return String(value.result ?? '');
    if ('richText' in value) return value.richText.map((r: any) => r.text).join('');
  }
  return String(value ?? '').trim();
}

function cellNumber(cell: any): number {
  const parsed = Number(String(cellText(cell)).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

export interface XlsxImportResult {
  catalogo: CatalogItem[];
  clientes: ClienteFactura[];
}

function conditionFromLabel(label: string): ClienteFactura['condicionIva'] {
  const normalized = label.toLowerCase();
  if (normalized.includes('inscripto')) return 'responsable_inscripto';
  if (normalized.includes('monotribut')) return 'monotributista';
  if (normalized.includes('exento')) return 'exento';
  return 'consumidor_final';
}

/** Lee un .xlsx y devuelve catálogo y clientes normalizados (sin tocar la bóveda). */
export async function importCatalogAndClientsFromXlsx(file: File): Promise<XlsxImportResult> {
  const ExcelJS = await loadExcelJs();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());

  const catalogo: CatalogItem[] = [];
  const clientes: ClienteFactura[] = [];
  const stamp = Date.now();

  const wsCatalogo = wb.getWorksheet('Catalogo_Precios');
  if (wsCatalogo) {
    wsCatalogo.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const nombre = cellText(row.getCell(1));
      if (!nombre) return;
      const escalones = [
        { minQty: cellNumber(row.getCell(6)), discountPct: cellNumber(row.getCell(7)) },
        { minQty: cellNumber(row.getCell(8)), discountPct: cellNumber(row.getCell(9)) },
        { minQty: cellNumber(row.getCell(10)), discountPct: cellNumber(row.getCell(11)) },
      ].filter((tier) => tier.minQty > 0);
      catalogo.push({
        id: `cat_${stamp}_${rowNumber}`,
        nombre,
        descripcion: cellText(row.getCell(2)),
        precioBase: cellNumber(row.getCell(3)),
        stock: Math.round(cellNumber(row.getCell(4))),
        stockMinimo: Math.round(cellNumber(row.getCell(5))),
        escalones,
      });
    });
  }

  const wsClientes = wb.getWorksheet('Clientes');
  if (wsClientes) {
    wsClientes.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const nombre = cellText(row.getCell(1));
      if (!nombre) return;
      clientes.push({
        id: `cli_${stamp}_${rowNumber}`,
        nombre,
        cuit: cellText(row.getCell(2)),
        condicionIva: conditionFromLabel(cellText(row.getCell(3))),
        domicilio: cellText(row.getCell(4)),
        localidad: cellText(row.getCell(5)),
        telefono: cellText(row.getCell(6)),
        email: cellText(row.getCell(7)),
      });
    });
  }

  if (!wsCatalogo && !wsClientes) throw new Error('xlsx_sin_hojas_esperadas');
  return { catalogo, clientes };
}
