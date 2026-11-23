/**
 * FACTURADOR ENGINE — TIPOS CANÓNICOS
 *
 * FacturLee es una app 100% local: los datos fiscales viven cifrados en una
 * bóveda (IndexedDB) y NUNCA se suben a Supabase. Este archivo define el
 * contrato de datos que consumen el motor de cálculo, la bóveda cifrada, el
 * adaptador de PDF y la UI.
 */

export type ComprobanteLetra = 'A' | 'B' | 'C' | 'X' | 'R';

export type ComprobanteTipo = 'factura' | 'nota_credito' | 'presupuesto' | 'remito' | 'recibo';

export type ComprobanteEstado = 'borrador' | 'emitida' | 'cobrada' | 'anulada';

export type CondicionIva =
  | 'responsable_inscripto'
  | 'monotributista'
  | 'exento'
  | 'consumidor_final';

export type CopiaTipo = 'original' | 'duplicado' | 'triplicado';

export interface EmpresaConfig {
  razonSocial: string;
  nombreFantasia: string;
  cuit: string;
  condicionIva: CondicionIva;
  domicilio: string;
  localidad: string;
  provincia: string;
  telefono: string;
  email: string;
  ingresosBrutos: string;
  inicioActividades: string;
  /** SVG original tal como lo subió la persona (se guarda en el respaldo portátil). */
  logoSvgRaw?: string;
  /** PNG transparente rasterizado para el PDF (600 px de ancho). */
  logoPngDataUrl?: string;
}

export interface ClienteFactura {
  id: string;
  nombre: string;
  cuit: string;
  condicionIva: CondicionIva;
  domicilio: string;
  localidad: string;
  telefono: string;
  email: string;
  /** Último comprobante emitido a este cliente (informativo). */
  ultimoTipoComprobante?: ComprobanteTipo;
  ultimaLetraComprobante?: ComprobanteLetra;
  /** Tipo/letra habitual de factura para este cliente (no se pisa con presupuestos/remitos). */
  tipoFacturaHabitual?: ComprobanteTipo;
  letraFacturaHabitual?: ComprobanteLetra;
}

export interface CatalogItem {
  id: string;
  nombre: string;
  descripcion: string;
  precioBase: number;
  stock: number;
  stockMinimo: number;
  /** Escalones mayoristas: a partir de `minQty` unidades se aplica `discountPct`. */
  escalones: EscalonMayorista[];
}

export interface EscalonMayorista {
  minQty: number;
  discountPct: number;
}

export interface InvoiceLineItem {
  id: string;
  catalogItemId?: string;
  /** Nombre corto del producto o servicio (si falta en borradores viejos, cae a `descripcion`). */
  nombre?: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuentoPct: number;
}

export interface InvoiceDraft {
  id: string;
  tipo: ComprobanteTipo;
  letra: ComprobanteLetra;
  puntoVenta: string;
  numero: string;
  fecha: string;
  vencimiento: string;
  cliente: ClienteFactura | null;
  items: InvoiceLineItem[];
  observaciones: string;
  estado: ComprobanteEstado;
  /** Si es true el comprobante descuenta stock al emitirse (una sola vez). */
  stockDeducido?: boolean;
  /** Nivel 3 (configCascadeEngine): marcas de ajuste manual en este borrador. */
  manualOverrides?: Record<string, boolean>;
  /** True cuando se visualiza un comprobante emitido/cobrado/anulado en modo solo lectura/reimpresión. */
  readonlyHistorical?: boolean;
}

export interface SavedInvoice extends InvoiceDraft {
  total: number;
  emitidaAt?: string;
}

export interface NumeracionEstado {
  puntoVenta: string;
  ultimoNumero: number;
}

export interface FacturadorBackupConfig {
  lastBackupAt?: string;
  cadenceDays: number;
}

export interface FacturadorDesignConfig {
  presetId: string;
  pageSizeId: string;
  /** Dos copias idénticas en una hoja A4 para cortar al medio en el mostrador. */
  duplicateHalfSheet: boolean;
  mostrarLogo: boolean;
  mostrarObservaciones: boolean;
}

export interface FacturadorVaultData {
  version: 1;
  empresa: EmpresaConfig;
  numeracion: Partial<Record<ComprobanteLetra, NumeracionEstado>> & Record<'A' | 'B' | 'C' | 'X', NumeracionEstado>;
  /** Talonarios compuestos por `${puntoVenta}|${tipo}|${letra}` para no mezclar Facturas, Presupuestos y NC. */
  talonarios?: Record<string, NumeracionEstado>;
  catalogo: CatalogItem[];
  clientes: ClienteFactura[];
  comprobantes: SavedInvoice[];
  design: FacturadorDesignConfig;
  backup: FacturadorBackupConfig;
  /** Comprobante en edición (se guarda cifrado para no perder el trabajo a medias). */
  draftActual?: InvoiceDraft | null;
  updatedAt: string;
}

export interface VaultKdfConfig {
  algo: 'PBKDF2-SHA256';
  iterations: number;
  saltB64: string;
}

export interface WrappedKey {
  ivB64: string;
  dataB64: string;
}

/** Sobre cifrado que se guarda en IndexedDB y viaja en el pendrive. */
export interface VaultEnvelope {
  version: 1;
  vaultId: string;
  kdf: VaultKdfConfig;
  wrappedDekPassword: WrappedKey;
  wrappedDekRecovery?: WrappedKey;
  payload: WrappedKey;
  createdAt: string;
  updatedAt: string;
}

export interface VaultSession {
  vaultId: string;
  dek: CryptoKey;
  envelope: VaultEnvelope;
}

export interface VaultUnlockResult {
  data: FacturadorVaultData;
  session: VaultSession;
}
