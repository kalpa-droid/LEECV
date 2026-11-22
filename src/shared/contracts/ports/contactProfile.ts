/**
 * Contrato de puerto entre apps: `contact-profile@1`.
 *
 * Permite que apps consumidoras (como `card-studio`, futuras credenciales o firmas)
 * lean datos de contacto/perfil desde un CV u otro proveedor registrado SIN importar
 * ningún archivo del módulo proveedor.
 */

import type { LocalAssetUri } from '../persistenceContract';

export const PORT_CONTACT_PROFILE_V1 = 'contact-profile@1' as const;

export type PortId = typeof PORT_CONTACT_PROFILE_V1;

export type ContactProfileFieldKey =
  | 'fullName'
  | 'role'
  | 'company'
  | 'email'
  | 'phone'
  | 'website'
  | 'cityProvince'
  | 'address'
  | 'linkedin'
  | 'github'
  | 'instagram'
  | 'photoAssetUri';

export interface ContactProfileV1 {
  readonly fullName?: string;
  readonly role?: string;
  readonly company?: string;
  readonly email?: string;
  readonly phone?: string;
  readonly website?: string;
  readonly cityProvince?: string;
  readonly address?: string;
  readonly linkedin?: string;
  readonly github?: string;
  readonly instagram?: string;
  readonly photoAssetUri?: LocalAssetUri;
}

export interface ContactProfileSourceRef {
  readonly portId: typeof PORT_CONTACT_PROFILE_V1;
  readonly sourceDocType: string;
  readonly sourceDocId: string;
  readonly sourceRevision: number;
  readonly importedFields: readonly ContactProfileFieldKey[];
  readonly importedAt: string;
}

export interface ContactProfileProvider<TData = unknown> {
  readonly portId: typeof PORT_CONTACT_PROFILE_V1;
  readonly extractContactProfile: (data: TData) => ContactProfileV1;
}
