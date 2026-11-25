import {
  CatalogItem,
  ClienteFactura,
  ComprobanteLetra,
  EmpresaConfig,
  FacturadorVaultData,
  InvoiceDraft,
  NumeracionEstado,
} from './facturadorTypes';

/**
 * Arranque en blanco: CERO datos reales de personas o empresas.
 * El repo de LEECV es público, así que la app nunca trae CUIT, direcciones ni
 * clientes de ejemplo. Si la persona ya usaba Facturador CMYK, puede importar
 * su respaldo JSON con `importLegacyCmykJsonBackup()`.
 */
export const EMPTY_EMPRESA: EmpresaConfig = {
  razonSocial: '',
  nombreFantasia: '',
  cuit: '',
  condicionIva: 'monotributista',
  domicilio: '',
  localidad: '',
  provincia: '',
  telefono: '',
  email: '',
  ingresosBrutos: '',
  inicioActividades: '',
};

const EMPTY_NUMERACION = (letra: ComprobanteLetra): NumeracionEstado => ({
  puntoVenta: '00001',
  ultimoNumero: 0,
});

export const EMPTY_CATALOGO: CatalogItem[] = [];
export const EMPTY_CLIENTES: ClienteFactura[] = [];

export const EMPTY_FACTURADOR_VAULT: FacturadorVaultData = {
  version: 1,
  empresa: { ...EMPTY_EMPRESA },
  numeracion: {
    A: EMPTY_NUMERACION('A'),
    B: EMPTY_NUMERACION('B'),
    C: EMPTY_NUMERACION('C'),
    X: EMPTY_NUMERACION('X'),
  },
  catalogo: EMPTY_CATALOGO,
  clientes: EMPTY_CLIENTES,
  comprobantes: [],
  design: {
    presetId: 'fact-clasico-fiscal',
    pageSizeId: 'a4',
    duplicateHalfSheet: false,
    mostrarLogo: true,
    mostrarObservaciones: true,
  },
  backup: { cadenceDays: 7, freeExportsUsed: 0 },
  draftActual: null,
  updatedAt: new Date().toISOString(),
};

export function createEmptyInvoice(patch: Partial<InvoiceDraft> = {}): InvoiceDraft {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    tipo: 'factura',
    letra: 'B',
    puntoVenta: '00001',
    numero: '00000001',
    fecha: today,
    vencimiento: '',
    cliente: null,
    items: [],
    observaciones: '',
    estado: 'borrador',
    ...patch,
  };
}

/** Normaliza el estado de numeración por letra sin mutar la bóveda original. */
export function withNextInvoiceNumber(
  vault: FacturadorVaultData,
  letra: ComprobanteLetra
): { vault: FacturadorVaultData; draftPatch: Partial<InvoiceDraft> } {
  const current = vault.numeracion[letra] || { puntoVenta: '00001', ultimoNumero: 0 };
  const next = current.ultimoNumero + 1;
  return {
    vault: {
      ...vault,
      numeracion: {
        ...vault.numeracion,
        [letra]: { ...current, ultimoNumero: next },
      },
      updatedAt: new Date().toISOString(),
    },
    draftPatch: {
      letra,
      puntoVenta: current.puntoVenta,
      numero: String(next).padStart(8, '0'),
    },
  };
}
