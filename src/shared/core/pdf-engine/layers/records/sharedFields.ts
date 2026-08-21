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
  { key: 'phone', cvLabel: '📞' },
  { key: 'email', cvLabel: '✉️' },
  { key: 'address', cvLabel: '📍' },
  { key: 'cityProvince', cvLabel: '🏙️', cardOmit: true },
  { key: 'dni', cvLabel: 'DNI:', cardOmit: true },
  { key: 'cuit', cvLabel: 'CUIT:', cardOmit: true },
  { key: 'birthDate', cvLabel: 'Nac.:', cardOmit: true },
];

/** Devuelve solo los campos con valor real, en el orden canónico de arriba */
export function getPresentContactFields(rec: ContentRecord, variant: 'document' | 'card') {
  return CONTACT_FIELDS.filter((f) => {
    if (variant === 'card' && f.cardOmit) return false;
    return Boolean(rec.fields[f.key]);
  }).map((f) => ({ ...f, value: String(rec.fields[f.key]) }));
}
