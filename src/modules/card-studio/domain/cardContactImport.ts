import type {
  ContactProfileFieldKey,
  ContactProfileSourceRef,
  ContactProfileV1,
} from '../../../shared/contracts/ports/contactProfile';

export const CONTACT_FIELD_META: ReadonlyArray<{
  key: ContactProfileFieldKey;
  label: string;
}> = [
  { key: 'fullName', label: 'Nombre completo' },
  { key: 'role', label: 'Cargo o profesión' },
  { key: 'company', label: 'Empresa o marca' },
  { key: 'phone', label: 'Teléfono' },
  { key: 'email', label: 'Correo electrónico' },
  { key: 'website', label: 'Sitio web o portafolio' },
  { key: 'cityProvince', label: 'Ciudad / Provincia' },
  { key: 'address', label: 'Dirección' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'github', label: 'GitHub' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'photoAssetUri', label: 'Foto / imagen de referencia' },
];

export const DEFAULT_CARD_DOC_TITLE = 'Mi Tarjeta Personal';

/**
 * Crea el documento inicial autónomo para `card-studio` sin depender de `initialCVData` de `cv-builder`.
 */
export function createBlankCardDocumentData(cardId: string) {
  return {
    id: cardId,
    docType: 'business_card' as const,
    doc_type_id: 'business_card' as const,
    activePresetId: 'tarjeta-personal',
    cardSize: 'tarjeta_estandar',
    cardBleedMm: 3,
    qrMode: 'vcard' as const,
    personalInfo: {} as Record<string, string>,
    cardOverrides: {} as Record<string, string>,
    roles: [] as string[],
    profession: [] as Array<{ degree?: string; institution?: string; year?: string }>,
    layout: {
      pageSizeId: 'tarjeta_estandar',
      paperSize: 'tarjeta_estandar',
    },
    theme: {
      fontFamily: 'Helvetica',
    },
  };
}

/**
 * Aplica únicamente los campos seleccionados de `ContactProfileV1` a la tarjeta
 * y conserva la referencia versionada `contactSourceRef` para detectar cambios del CV origen.
 */
export function applySelectedContactFieldsToCard(
  prevCardData: any,
  picked: Partial<ContactProfileV1>,
  sourceRef: ContactProfileSourceRef,
): any {
  const prevPersonalInfo = { ...(prevCardData?.personalInfo || {}) };
  const prevOverrides = { ...(prevCardData?.cardOverrides || {}) };
  const locationValue = picked.cityProvince || picked.address;

  if (picked.fullName !== undefined) {
    prevPersonalInfo.fullName = picked.fullName;
    prevOverrides.fullName = picked.fullName;
  }
  if (picked.role !== undefined) {
    prevOverrides.role = picked.role;
  }
  if (picked.company !== undefined) {
    prevOverrides.brandName = picked.company;
  }
  if (picked.phone !== undefined) {
    prevPersonalInfo.phone = picked.phone;
    prevOverrides.phone = picked.phone;
  }
  if (picked.email !== undefined) {
    prevPersonalInfo.email = picked.email;
    prevOverrides.email = picked.email;
  }
  if (picked.website !== undefined) {
    prevPersonalInfo.website = picked.website;
    prevOverrides.website = picked.website;
  }
  if (locationValue !== undefined) {
    prevPersonalInfo.cityProvince = picked.cityProvince ?? locationValue;
    if (picked.address !== undefined) prevPersonalInfo.address = picked.address;
    prevOverrides.address = locationValue;
  }
  if (picked.linkedin !== undefined) {
    prevPersonalInfo.linkedin = picked.linkedin;
    prevOverrides.linkedin = picked.linkedin;
  }
  if (picked.github !== undefined) {
    prevPersonalInfo.github = picked.github;
  }
  if (picked.instagram !== undefined) {
    prevPersonalInfo.instagram = picked.instagram;
    prevOverrides.instagram = picked.instagram;
  }
  if (picked.photoAssetUri !== undefined) {
    prevPersonalInfo.profilePhoto = picked.photoAssetUri;
  }

  return {
    ...prevCardData,
    sourceCvTabId: sourceRef.sourceDocId,
    contactSourceRef: sourceRef,
    personalInfo: prevPersonalInfo,
    cardOverrides: prevOverrides,
  };
}
