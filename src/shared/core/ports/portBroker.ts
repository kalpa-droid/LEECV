/**
 * PortBroker — Intercambio versionado de datos entre apps sin imports cruzados (Fase 5 / Fase 9).
 *
 * Ejemplo principal (`contact-profile@1`):
 * - `cv-builder` provee un extractor `extractContactProfile(cvData) -> ContactProfileV1`.
 * - `card-studio` (o futuras apps como credenciales/firmas) lista los documentos locales
 *   disponibles que proveen `contact-profile@1`, permite al usuario elegir qué campos importar
 *   o editar manualmente, y guarda copia + `ContactProfileSourceRef` para detectar cambios de revisión.
 */

import type {
  ContactProfileFieldKey,
  ContactProfileSourceRef,
  ContactProfileV1,
  PortId,
} from '../../contracts/ports/contactProfile';
import { PORT_CONTACT_PROFILE_V1 } from '../../contracts/ports/contactProfile';
import {
  ALL_DOCUMENT_TYPE_IDS,
  DOCUMENT_TYPE_REGISTRY,
  type RegisteredDocumentTypeId,
} from '../capabilities/capabilityRegistry';
import { localDocumentStore } from '../storage/localDocumentStore';
import { loadDocumentById } from '../storage/documentStorageService';

export type PortExtractor<TOut = unknown> = (docData: any) => TOut;

interface RegisteredPortProvider {
  readonly portId: PortId;
  readonly docType: RegisteredDocumentTypeId;
  readonly extract: PortExtractor<any>;
}

const providersByPort = new Map<PortId, Map<RegisteredDocumentTypeId, RegisteredPortProvider>>();

export function registerPortProvider<TOut>(
  portId: PortId,
  docType: RegisteredDocumentTypeId,
  extract: PortExtractor<TOut>
): void {
  let byDocType = providersByPort.get(portId);
  if (!byDocType) {
    byDocType = new Map();
    providersByPort.set(portId, byDocType);
  }
  byDocType.set(docType, { portId, docType, extract });
}

export function getPortProviderDocTypes(portId: PortId): RegisteredDocumentTypeId[] {
  const declared = ALL_DOCUMENT_TYPE_IDS.filter((id) => {
    const cfg = DOCUMENT_TYPE_REGISTRY[id];
    const provides = 'ports' in cfg && cfg.ports && 'provides' in cfg.ports ? cfg.ports.provides : [];
    return (provides as readonly string[]).includes(portId);
  });
  const registered = [...(providersByPort.get(portId)?.keys() ?? [])];
  return [...new Set([...declared, ...registered])];
}

export interface AvailablePortSource {
  readonly docId: string;
  readonly docType: RegisteredDocumentTypeId;
  readonly title: string;
  readonly subtitle?: string;
  readonly updatedAt: string;
  readonly revision: number;
}

/**
 * Lista todos los documentos locales disponibles que pueden alimentar un puerto dado
 * (por ejemplo, todos los CVs guardados para `contact-profile@1`).
 */
export async function listAvailablePortSources(portId: PortId): Promise<AvailablePortSource[]> {
  const providerDocTypes = getPortProviderDocTypes(portId);
  const all: AvailablePortSource[] = [];

  for (const docType of providerDocTypes) {
    const summaries = await localDocumentStore.list(docType);
    for (const item of summaries) {
      all.push({
        docId: item.id,
        docType,
        title: item.title,
        subtitle: item.displaySubtitle,
        updatedAt: item.updatedAt,
        revision: item.revision,
      });
    }
  }

  return all.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export interface ResolvedPortPayload<TOut> {
  readonly data: TOut;
  readonly docId: string;
  readonly docType: RegisteredDocumentTypeId;
  readonly revision: number;
}

/**
 * Resuelve el payload de un puerto leyendo un documento local existente a través de su proveedor.
 */
export async function resolvePortFromDocument<TOut = ContactProfileV1>(
  portId: PortId,
  docType: RegisteredDocumentTypeId,
  docId: string
): Promise<ResolvedPortPayload<TOut> | null> {
  const provider = providersByPort.get(portId)?.get(docType);
  if (!provider) return null;

  const envelope = await localDocumentStore.load(docId, docType);
  const loaded = await loadDocumentById(docId, docType);
  if (!loaded) return null;

  return {
    data: provider.extract(loaded) as TOut,
    docId,
    docType,
    revision: envelope?.revision ?? 1,
  };
}

/**
 * Extractor canónico de `ContactProfileV1` desde un documento de CV (sin importar `cv-builder`).
 */
export function extractContactProfileFromCv(cvData: any): ContactProfileV1 {
  const info = cvData?.personalInfo || {};
  const redes: any[] = Array.isArray(cvData?.redes) ? cvData.redes : [];

  const findNetwork = (pattern: RegExp): string | undefined => {
    const match = redes.find(
      (r) => typeof r?.plataforma === 'string' && pattern.test(r.plataforma) && (r.url || r.usuario)
    );
    return match ? String(match.url || match.usuario).trim() : undefined;
  };

  const fullName =
    String(info.fullName || `${info.givenNames || ''} ${info.surname || ''}`).trim() || undefined;
  const latestProf = Array.isArray(cvData?.profession) ? cvData.profession[0] : null;
  const latestExp = Array.isArray(cvData?.experience) ? cvData.experience[0] : null;
  const role =
    String(
      info.title ||
        info.role ||
        info.jobTitle ||
        latestProf?.title ||
        latestProf?.role ||
        latestExp?.role ||
        cvData?.title ||
        ''
    ).trim() || undefined;
  const company = String(latestExp?.company || latestExp?.empresa || '').trim() || undefined;
  const email = String(info.email || '').trim() || undefined;
  const phone = String(info.phone || '').trim() || undefined;
  const website = String(info.website || info.portfolioUrl || '').trim() || undefined;
  const cityProvince = String(info.cityProvince || info.location || '').trim() || undefined;
  const address = String(info.address || '').trim() || undefined;
  const linkedin = String(info.linkedin || '').trim() || findNetwork(/linkedin/i);
  const github = String(info.github || '').trim() || findNetwork(/github/i);
  const instagram = findNetwork(/instagram/i);
  const rawPhoto = typeof info.profilePhoto === 'string' ? info.profilePhoto.trim() : '';
  const photoAssetUri = rawPhoto.startsWith('asset://') ? (rawPhoto as `asset://${string}`) : undefined;

  return {
    ...(fullName ? { fullName } : {}),
    ...(role ? { role } : {}),
    ...(company ? { company } : {}),
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
    ...(website ? { website } : {}),
    ...(cityProvince ? { cityProvince } : {}),
    ...(address ? { address } : {}),
    ...(linkedin ? { linkedin } : {}),
    ...(github ? { github } : {}),
    ...(instagram ? { instagram } : {}),
    ...(photoAssetUri ? { photoAssetUri } : {}),
  };
}

/**
 * Selecciona solo los campos que el usuario eligió importar y construye la referencia de origen
 * para detectar actualizaciones futuras del CV sin pisar ediciones manuales.
 */
export function selectContactProfileFields(
  profile: ContactProfileV1,
  selectedFields: readonly ContactProfileFieldKey[],
  source: { docId: string; docType: RegisteredDocumentTypeId; revision: number }
): { picked: Partial<ContactProfileV1>; sourceRef: ContactProfileSourceRef } {
  const picked: Partial<ContactProfileV1> = {};
  const actuallyImported: ContactProfileFieldKey[] = [];

  for (const field of selectedFields) {
    const val = profile[field];
    if (val !== undefined && val !== '') {
      (picked as Record<string, unknown>)[field] = val;
      actuallyImported.push(field);
    }
  }

  return {
    picked,
    sourceRef: {
      portId: PORT_CONTACT_PROFILE_V1,
      sourceDocType: source.docType,
      sourceDocId: source.docId,
      sourceRevision: source.revision,
      importedFields: actuallyImported,
      importedAt: new Date().toISOString(),
    },
  };
}

/** Comprueba si el documento origen de una Tarjeta tiene una revisión más nueva que la importada. */
export async function checkPortSourceOutdated(sourceRef: ContactProfileSourceRef | null | undefined): Promise<{
  outdated: boolean;
  latestRevision: number | null;
}> {
  if (!sourceRef?.sourceDocId || !sourceRef?.sourceDocType) {
    return { outdated: false, latestRevision: null };
  }
  const env = await localDocumentStore.load(sourceRef.sourceDocId, sourceRef.sourceDocType);
  if (!env) return { outdated: false, latestRevision: null };
  return {
    outdated: env.revision > sourceRef.sourceRevision,
    latestRevision: env.revision,
  };
}

// Registrar proveedor por defecto de CV para `contact-profile@1`
registerPortProvider(PORT_CONTACT_PROFILE_V1, 'cv', extractContactProfileFromCv);
