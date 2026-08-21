import { ContentSection } from './recordTypes';

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
}

/** Capa 4 (frente): traduce los datos de la tarjeta a ContentSection[] para el sector 'main' */
export function cardDataToFrontSections(card: BusinessCardData): ContentSection[] {
  return [
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
}

/** Capa 4 (dorso): marca + eslogan corto */
export function cardDataToBackSections(card: BusinessCardData): ContentSection[] {
  return [
    {
      id: 'marca-y-eslogan',
      titleText: '',
      records: [
        {
          id: 'rec-brand',
          kind: 'card-heading',
          targetSectorRole: 'main',
          fields: { fullName: card.brandName || card.fullName || '', role: card.tagline || '' }
        }
      ]
    }
  ];
}
