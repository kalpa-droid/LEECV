import { ContentSection, ContentRecord } from './recordTypes';
import { generateVCardQRCodeDataUrl } from './vcardGenerator';

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
  /** QR Data URL generado con vCard */
  qrDataUrl?: string;
}

/**
 * Traduce cvData directamente a BusinessCardData (Cero doble tipeo)
 * y genera automáticamente el QR vCard.
 */
export async function buildCardDataFromCV(cvData: any): Promise<BusinessCardData> {
  const personalInfo = cvData?.personalInfo || {};
  const role = cvData?.roles?.[0] || cvData?.profession?.[0]?.degree || 'Profesional';
  const fullName = `${personalInfo.surname || ''} ${personalInfo.givenNames || ''}`.trim() || 'Juan Pérez';
  
  const qrDataUrl = await generateVCardQRCodeDataUrl({
    surname: personalInfo.surname,
    givenNames: personalInfo.givenNames,
    fullName,
    role,
    phone: personalInfo.phone,
    email: personalInfo.email,
    cityProvince: personalInfo.cityProvince,
    website: personalInfo.facebook || personalInfo.website
  });

  return {
    fullName,
    role,
    phone: personalInfo.phone || '',
    email: personalInfo.email || '',
    website: personalInfo.cityProvince || '',
    brandName: personalInfo.surname ? `${personalInfo.surname} Studio` : 'Marca Personal',
    tagline: personalInfo.quote || 'Servicios Profesionales de Alta Calidad',
    qrDataUrl
  };
}

/** Capa 4 (frente): traduce los datos de la tarjeta a ContentSection[] para el sector 'main' */
export function cardDataToFrontSections(card: BusinessCardData): ContentSection[] {
  const sections: ContentSection[] = [
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
  ];

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
    records.push({
      id: 'rec-card-qr',
      kind: 'qr',
      targetSectorRole: 'main',
      fields: { dataUrl: card.qrDataUrl, caption: 'Escanear para guardar contacto' }
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
