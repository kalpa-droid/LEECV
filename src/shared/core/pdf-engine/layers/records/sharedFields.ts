/**
 * CAPA 4.5 — CAMPOS COMPARTIDOS ENTRE VARIANTES
 *
 * Un mismo `rec.kind` (ej: 'contact-item') se dibuja distinto en un CV que en
 * una tarjeta personal — eso está bien, son objetos físicos distintos. Lo que
 * NO debería pasar es que el CONJUNTO DE CAMPOS que existe para ese kind se
 * defina dos veces en dos archivos y termine divergiendo sin que nadie lo
 * haya decidido (ej: DNI/CUIT que aparecen en el CV pero se "olvidaron" en
 * la tarjeta). Esta lista es la única fuente de verdad de qué campos existen
 * para 'contact-item' — TemplateRenderer y CardFace la recorren, cada uno
 * con su propio estilo visual, pero nunca con su propia lista de campos.
 */

import { ContentRecord } from './recordTypes';
import { INTERNAL_METADATA_DENYLIST } from './recordLayoutEngine';

export interface ContactField {
  key: string;
  /** Prefijo/ícono opcional, solo lo usa la variante CV (sidebar) */
  cvLabel?: string;
  /** true = este campo es "denso" (DNI, CUIT, fecha de nac.) y en la tarjeta,
   *  pensada para caber en 89x51mm, no tiene sentido mostrarlo — pero queda
   *  documentado ACÁ que la omisión es a propósito, no un olvido. */
  cardOmit?: boolean;
}

export const CONTACT_FIELDS: ContactField[] = [
  { key: 'phone', cvLabel: 'Tel:' },
  { key: 'email', cvLabel: 'Email:' },
  { key: 'address', cvLabel: 'Dom:' },
  { key: 'cityProvince', cvLabel: 'Ubic.:', cardOmit: true },
  { key: 'dni', cvLabel: 'DNI:', cardOmit: true },
  { key: 'cuit', cvLabel: 'CUIT:', cardOmit: true },
  { key: 'birthDate', cvLabel: 'Nac.:', cardOmit: true },
];

function humanizeCamelCase(key: string): string {
  const withSpaces = key.replace(/([A-Z])/g, ' $1');
  const capitalized = withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
  return capitalized.trim() + ':';
}

/** Devuelve solo los campos con valor real, en el orden canónico de arriba, seguidos de los custom */
export function getPresentContactFields(rec: ContentRecord, variant: 'document' | 'card') {
  const knownFields = CONTACT_FIELDS.filter((f) => {
    if (variant === 'card' && f.cardOmit) return false;
    return Boolean(rec.fields[f.key]);
  }).map((f) => ({ ...f, value: String(rec.fields[f.key]) }));

  const knownKeys = new Set(CONTACT_FIELDS.map(f => f.key));
  const customFields: (ContactField & { value: string })[] = [];

  for (const [key, val] of Object.entries(rec.fields || {})) {
    if (INTERNAL_METADATA_DENYLIST.has(key.toLowerCase())) continue;
    if (knownKeys.has(key)) continue;
    if (val === undefined || val === null || String(val).trim() === '') continue;

    customFields.push({
      key,
      cvLabel: humanizeCamelCase(key),
      value: String(val)
    });
  }

  return [...knownFields, ...customFields];
}
