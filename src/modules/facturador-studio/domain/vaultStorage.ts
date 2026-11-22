import JSZip from 'jszip';
import { idbStorage } from '../../../shared/core/storage/storageIndexedDB';
import { EMPTY_FACTURADOR_VAULT } from './facturadorDefaults';
import { isVaultEnvelope } from './vaultCrypto';
import {
  CatalogItem,
  ClienteFactura,
  FacturadorBackupConfig,
  FacturadorVaultData,
  VaultEnvelope,
} from './facturadorTypes';

/**
 * PERSISTENCIA DE LA BÓVEDA (100% local)
 *
 * El sobre cifrado se guarda con el wrapper IndexedDB canónico del repo
 * (`idbStorage`). Nada de Supabase: la capability `cloud_backup` NO está
 * declarada para `invoice`, así que el documento tampoco se sincroniza.
 */

export const DEFAULT_VAULT_ID = 'facturalee_local';
const VAULT_KEY = (vaultId: string) => `facturalee_vault_v1:${vaultId}`;

export async function loadEnvelope(vaultId: string = DEFAULT_VAULT_ID): Promise<VaultEnvelope | null> {
  const stored = await idbStorage.getItem(VAULT_KEY(vaultId));
  return isVaultEnvelope(stored) ? stored : null;
}

export async function saveEnvelope(envelope: VaultEnvelope): Promise<void> {
  await idbStorage.setItem(VAULT_KEY(envelope.vaultId), envelope);
}

export async function deleteVault(vaultId: string = DEFAULT_VAULT_ID): Promise<void> {
  await idbStorage.removeItem(VAULT_KEY(vaultId));
}

export async function hasVault(vaultId: string = DEFAULT_VAULT_ID): Promise<boolean> {
  return Boolean(await loadEnvelope(vaultId));
}

const PACKAGE_MANIFEST = 'manifest.json';
const PACKAGE_PAYLOAD = 'vault.enc';

export interface PortableManifest {
  app: 'LEECV-FacturLee';
  format: 1;
  vaultId: string;
  createdAt: string;
  updatedAt: string;
  encrypted: true;
  note: string;
}

/**
 * Paquete portátil `.leecv-fact` para llevar en pendrive.
 * El logo y los datos fiscales viajan DENTRO del payload cifrado: el paquete
 * no expone nada legible salvo el manifiesto técnico.
 */
export async function exportPortablePackage(envelope: VaultEnvelope): Promise<Blob> {
  const zip = new JSZip();
  const manifest: PortableManifest = {
    app: 'LEECV-FacturLee',
    format: 1,
    vaultId: envelope.vaultId,
    createdAt: envelope.createdAt,
    updatedAt: envelope.updatedAt,
    encrypted: true,
    note: 'Los datos fiscales están cifrados con tu contraseña. Sin ella este archivo no se puede abrir.',
  };
  zip.file(PACKAGE_MANIFEST, JSON.stringify(manifest, null, 2));
  zip.file(PACKAGE_PAYLOAD, JSON.stringify(envelope));
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

export async function readPortablePackage(file: File | Blob): Promise<VaultEnvelope> {
  const zip = await JSZip.loadAsync(file);
  const payload = zip.file(PACKAGE_PAYLOAD);
  if (!payload) throw new Error('paquete_invalido');
  const raw = await payload.async('string');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('paquete_invalido');
  }
  if (!isVaultEnvelope(parsed)) throw new Error('paquete_invalido');
  return parsed;
}

/** Cadencia de respaldo: avisa cuando pasaron los días configurados. */
export function isBackupDue(backup: FacturadorBackupConfig, now: Date = new Date()): boolean {
  if (!backup?.lastBackupAt) return true;
  const last = new Date(backup.lastBackupAt).getTime();
  if (Number.isNaN(last)) return true;
  const days = (now.getTime() - last) / 86_400_000;
  return days >= (Number(backup.cadenceDays) || 7);
}

function str(value: any): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function num(value: any): number {
  const parsed = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function pick(source: any, ...keys: string[]): any {
  for (const key of keys) {
    if (source && source[key] !== undefined && source[key] !== null && source[key] !== '') return source[key];
  }
  return undefined;
}

/**
 * Importador tolerante del respaldo JSON del Facturador CMYK anterior.
 * No inventa datos: sólo toma lo que reconoce y deja el resto en blanco.
 */
export function importLegacyCmykJsonBackup(json: any): FacturadorVaultData {
  if (!json || typeof json !== 'object') throw new Error('respaldo_invalido');

  const empresaRaw = json.empresa || json.config || json.entidad || {};
  const clientesRaw = json.clientes || json.clients || [];
  const catalogoRaw = json.catalogo || json.productos || json.items || [];
  const comprobantesRaw = json.comprobantes || json.facturas || json.invoices || [];

  const empresa = {
    ...EMPTY_FACTURADOR_VAULT.empresa,
    razonSocial: str(pick(empresaRaw, 'razonSocial', 'nombre', 'name')),
    nombreFantasia: str(pick(empresaRaw, 'nombreFantasia', 'fantasia')),
    cuit: str(pick(empresaRaw, 'cuit', 'CUIT')),
    domicilio: str(pick(empresaRaw, 'domicilio', 'direccion', 'address')),
    localidad: str(pick(empresaRaw, 'localidad', 'ciudad')),
    provincia: str(pick(empresaRaw, 'provincia')),
    telefono: str(pick(empresaRaw, 'telefono', 'tel')),
    email: str(pick(empresaRaw, 'email', 'mail')),
  };

  const clientes: ClienteFactura[] = Array.isArray(clientesRaw)
    ? clientesRaw
        .map((c: any, idx: number) => ({
          id: str(pick(c, 'id')) || `cli_${idx}_${Date.now()}`,
          nombre: str(pick(c, 'nombre', 'name', 'razonSocial')),
          cuit: str(pick(c, 'cuit', 'CUIT')),
          condicionIva: 'consumidor_final' as const,
          domicilio: str(pick(c, 'domicilio', 'direccion')),
          localidad: str(pick(c, 'localidad', 'ciudad')),
          telefono: str(pick(c, 'telefono', 'tel')),
          email: str(pick(c, 'email', 'mail')),
        }))
        .filter((c: ClienteFactura) => c.nombre || c.cuit)
    : [];

  const catalogo: CatalogItem[] = Array.isArray(catalogoRaw)
    ? catalogoRaw
        .map((p: any, idx: number) => ({
          id: str(pick(p, 'id')) || `cat_${idx}_${Date.now()}`,
          nombre: str(pick(p, 'nombre', 'name', 'descripcion')),
          descripcion: str(pick(p, 'descripcion', 'detalle')),
          precioBase: num(pick(p, 'precioBase', 'precio', 'price')),
          stock: Math.round(num(pick(p, 'stock', 'cantidad'))),
          stockMinimo: Math.round(num(pick(p, 'stockMinimo', 'minimo'))) || 0,
          escalones: [],
        }))
        .filter((p: CatalogItem) => p.nombre)
    : [];

  const reconocidos = clientes.length + catalogo.length + (empresa.razonSocial ? 1 : 0);
  if (reconocidos === 0) throw new Error('respaldo_no_reconocido');

  return {
    ...EMPTY_FACTURADOR_VAULT,
    empresa,
    clientes,
    catalogo,
    comprobantes: Array.isArray(comprobantesRaw) ? comprobantesRaw : [],
    updatedAt: new Date().toISOString(),
  };
}
