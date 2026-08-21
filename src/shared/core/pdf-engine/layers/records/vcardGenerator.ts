import QRCode from 'qrcode';
import { resolveThemeRoles } from '../colors/colorSystem';

export interface VCardData {
  surname?: string;
  givenNames?: string;
  fullName?: string;
  role?: string;
  phone?: string;
  email?: string;
  cityProvince?: string;
  website?: string;
  publicProfileUrl?: string;
  mode?: 'vcard' | 'public_link';
}

/**
 * Genera una cadena vCard v3.0 estándar internacional para que al escanear el QR
 * con un smartphone se guarde directamente el contacto en la agenda.
 */
export function generateVCardString(card: VCardData): string {
  const surname = card.surname || '';
  const givenNames = card.givenNames || '';
  const fn = card.fullName || `${surname} ${givenNames}`.trim() || 'Contacto LEECV';

  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${fn}`,
    `N:${surname};${givenNames};;;`
  ];

  if (card.role) lines.push(`TITLE:${card.role}`);
  if (card.phone) lines.push(`TEL;TYPE=CELL:${card.phone}`);
  if (card.email) lines.push(`EMAIL:${card.email}`);
  if (card.website) lines.push(`URL:${card.website}`);
  if (card.cityProvince) lines.push(`ADR;TYPE=WORK:;;${card.cityProvince};;;;`);

  lines.push('END:VCARD');

  return lines.join('\n');
}

/**
 * Genera una imagen Data URL PNG del código QR (vCard o URL pública)
 * utilizando los colores de contraste óptimo garantizados por la Capa 9.
 */
export async function generateVCardQRCodeDataUrl(card: VCardData, theme?: any): Promise<string> {
  const contentToEncode = (card.mode === 'public_link' && card.publicProfileUrl)
    ? card.publicProfileUrl
    : generateVCardString(card);

  const roles = resolveThemeRoles(theme || {});

  try {
    return await QRCode.toDataURL(contentToEncode, {
      margin: 1,
      width: 256,
      color: {
        dark: roles.qrColors.dark,
        light: roles.qrColors.light
      }
    });
  } catch (err) {
    console.error('Error generando QR DataURL:', err);
    return '';
  }
}
