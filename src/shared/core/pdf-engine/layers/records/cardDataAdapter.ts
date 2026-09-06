import { ContentSection, ContentRecord } from './recordTypes';
import { generateVCardQRCodeDataUrl } from './vcardGenerator';
import { resolveActivePreset } from '../presets/presetRegistry';
import { navigation } from '../../../utils/navigation';

export interface BusinessCardData {
  fullName: string;
  role?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  /** Frase corta para el dorso — si no se pone, el dorso queda solo con la marca */
  tagline?: string;
  /** Nombre de marca/empresa mostrado en el dorso (si no se pone, usa fullName) */
  brandName?: string;
  /** QR Data URL generado con vCard o Link Web Público */
  qrDataUrl?: string;
  /** Modo del QR: 'vcard' (agenda) o 'public_link' (link web) */
  qrMode?: 'vcard' | 'public_link';
  // ── Campos nuevos extraídos del CV ──
  linkedin?: string;
  instagram?: string;
  logoDataUrl?: string;
  profilePhotoUrl?: string;
  publishedCvUrl?: string;
  sourceCvTabId?: string;
}

/**
 * Traduce cvData directamente a BusinessCardData (Cero doble tipeo)
 * y genera automáticamente el QR (vCard o URL Pública) con la Capa 9 de colores.
 * Soporta cascada de overrides manuales (cardOverrides) y modo standalone.
 */
export async function buildCardDataFromCV(
  cvData?: any,
  publishedSlug?: string
): Promise<BusinessCardData> {
  const ov = cvData?.cardOverrides || {};
  const personalInfo = cvData?.personalInfo || {};

  const fullName = ov.fullName || `${personalInfo.givenNames || ''} ${personalInfo.surname || ''}`.trim() || personalInfo.fullName || '';
  const role = ov.role || cvData?.roles?.[0] || cvData?.profession?.[0]?.degree || '';
  const phone = ov.phone ?? personalInfo.phone ?? '';
  const email = ov.email ?? personalInfo.email ?? '';
  const website = ov.website ?? personalInfo.website ?? personalInfo.facebook ?? '';
  const address = ov.address ?? personalInfo.cityProvince ?? personalInfo.address ?? '';
  const brandName = ov.brandName ?? '';
  const tagline = ov.tagline ?? personalInfo.quote ?? '';
  const linkedin = ov.linkedin ?? personalInfo.linkedin ?? '';
  const instagram = ov.instagram ?? personalInfo.instagram ?? '';
  const logoDataUrl = ov.logoDataUrl || undefined;

  const qrMode = cvData?.qrMode || 'vcard';
  const origin = typeof window !== 'undefined' ? window.location.origin : (navigation?.getOrigin() || '');
  const publishedCvUrl = publishedSlug
    ? `${origin}/c/${publishedSlug}`
    : undefined;

  const publicProfileUrl = publishedCvUrl || `${origin}/?publicCv=${cvData?.id || ''}`;
  const activePreset = resolveActivePreset(cvData);

  const qrDataUrl = await generateVCardQRCodeDataUrl({
    surname: personalInfo.surname,
    givenNames: personalInfo.givenNames,
    fullName: fullName || 'Contacto',
    role,
    phone,
    email,
    cityProvince: address,
    website,
    mode: qrMode,
    publicProfileUrl
  }, activePreset?.palette);

  return {
    fullName,
    role,
    phone,
    email,
    website,
    address,
    brandName,
    tagline,
    linkedin,
    instagram,
    logoDataUrl,
    profilePhotoUrl: personalInfo.profilePhoto || undefined,
    publishedCvUrl,
    qrDataUrl,
    qrMode,
    sourceCvTabId: cvData?.id
  };
}

/** Capa 4 (frente): traduce los datos de la tarjeta a ContentSection[] para el sector 'main' */
export function cardDataToFrontSections(card: BusinessCardData): ContentSection[] {
  const sections: ContentSection[] = [];

  if (card.logoDataUrl) {
    sections.push({
      id: 'logo-seccion',
      titleText: '',
      records: [
        {
          id: 'rec-logo',
          kind: 'card-logo',
          targetSectorRole: 'main',
          fields: { logoDataUrl: card.logoDataUrl }
        }
      ]
    });
  }

  sections.push(
    {
      id: 'nombre-y-cargo',
      titleText: '',
      records: [
        {
          id: 'rec-heading',
          kind: 'card-heading',
          targetSectorRole: 'main',
          fields: { fullName: card.fullName || '', role: card.role || '' }
        }
      ]
    },
    {
      id: 'contacto',
      titleText: '',
      records: [
        {
          id: 'rec-contact',
          kind: 'contact-item',
          targetSectorRole: 'main',
          fields: {
            phone: card.phone || '',
            email: card.email || '',
            address: card.website || card.address || ''
          }
        }
      ]
    }
  );

  return sections;
}

/** Capa 4 (dorso): marca + eslogan corto + código QR vCard */
export function cardDataToBackSections(card: BusinessCardData): ContentSection[] {
  const records: ContentRecord[] = [
    {
      id: 'rec-brand',
      kind: 'card-heading',
      targetSectorRole: 'main',
      fields: { fullName: card.brandName || card.fullName || '', role: card.tagline || '' }
    }
  ];

  if (card.qrDataUrl) {
    const caption = card.qrMode === 'public_link' 
      ? 'Escanear para ver Perfil Web' 
      : 'Escanear para guardar contacto';

    records.push({
      id: 'rec-card-qr',
      kind: 'qr',
      targetSectorRole: 'main',
      fields: { dataUrl: card.qrDataUrl, caption }
    });
  }

  return [
    {
      id: 'marca-y-eslogan',
      titleText: '',
      records
    }
  ];
}
