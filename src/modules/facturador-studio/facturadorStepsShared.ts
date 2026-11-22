import {
  CatalogItem,
  ClienteFactura,
  FacturadorVaultData,
  InvoiceDraft,
  InvoiceLineItem,
} from './domain/facturadorTypes';

export interface FactNotify {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

/** Props comunes de los 8 pasos del Dock de FacturLee. */
export interface FactStepBaseProps {
  vault: FacturadorVaultData;
  updateVault: (updater: (prev: FacturadorVaultData) => FacturadorVaultData) => void;
  draft: InvoiceDraft;
  updateDraft: (updater: (prev: InvoiceDraft) => InvoiceDraft) => void;
  notify: FactNotify;
}

export const CONDICIONES_IVA: Array<{ value: ClienteFactura['condicionIva']; label: string }> = [
  { value: 'responsable_inscripto', label: 'Responsable Inscripto' },
  { value: 'monotributista', label: 'Monotributista' },
  { value: 'exento', label: 'IVA Exento' },
  { value: 'consumidor_final', label: 'Consumidor Final' },
];

export function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function emptyCatalogItem(): CatalogItem {
  return {
    id: makeId('cat'),
    nombre: '',
    descripcion: '',
    precioBase: 0,
    stock: 0,
    stockMinimo: 0,
    escalones: [],
  };
}

export function emptyCliente(): ClienteFactura {
  return {
    id: makeId('cli'),
    nombre: '',
    cuit: '',
    condicionIva: 'consumidor_final',
    domicilio: '',
    localidad: '',
    telefono: '',
    email: '',
  };
}

export function lineFromCatalog(item: CatalogItem): InvoiceLineItem {
  return {
    id: makeId('ln'),
    catalogItemId: item.id,
    descripcion: item.nombre,
    cantidad: 1,
    precioUnitario: item.precioBase,
    descuentoPct: 0,
  };
}

/** El próximo número de la letra elegida, sin consumirlo. */
export function nextNumberPreview(vault: FacturadorVaultData, letra: InvoiceDraft['letra']): string {
  const current = vault.numeracion[letra] || { ultimoNumero: 0 };
  return String((current.ultimoNumero || 0) + 1).padStart(8, '0');
}
