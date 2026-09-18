import { hasCapability } from '../../capabilities/capabilityRegistry';

export function generateDocumentId(prefix: string): string {
  const now = new Date();
  
  const pad = (n: number) => n.toString().padStart(2, '0');
  
  const YYYY = now.getFullYear();
  const MM = pad(now.getMonth() + 1);
  const DD = pad(now.getDate());
  
  const HH = pad(now.getHours());
  const mm = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  
  const decimas = Math.floor(now.getMilliseconds() / 100);
  
  const randomStr = Math.random().toString(36).substring(2, 5);
  return `doc_${prefix}_${YYYY}${MM}${DD}_${HH}${mm}${ss}_${decimas}_${randomStr}`;
}

/** Prefijo normativo del título de pestaña/documento según el tipo. */
export const DOC_TITLE_PREFIX: Record<string, string> = {
  cv: 'CV',
  business_card: 'Tarjeta',
  cover_letter: 'Carta',
  book: 'Libro',
};

/** DD/MM HH:mm:ss.d — con décima de segundo. */
export function formatCompactDateTime(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const tenths = Math.floor(date.getMilliseconds() / 100);
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${tenths}`;
}

const STAMP_SRC = '\\d{2}/\\d{2} \\d{2}:\\d{2}:\\d{2}\\.\\d';
const ID_STAMP_RE = /_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})_(\d)_[a-z0-9]+$/;

/**
 * Sello de creación CONGELADO del documento (nunca cambia una vez asignado):
 * 1) el que ya lleva su título ("CV - 18/09 11:38:15.4", con o sin " — versión"),
 * 2) el que codifica su id (generateDocumentId: doc_<tipo>_YYYYMMDD_HHmmss_d_xxx),
 * 3) recién ahora (borradores de id fijo, p. ej. draft_cv).
 */
function frozenStamp(prefix: string, docData: any): string {
  const title: string = typeof docData?.title === 'string' ? docData.title : '';
  const fromTitle = title.match(new RegExp(`^${prefix} - (${STAMP_SRC})(?: — .*)?$`));
  if (fromTitle) return fromTitle[1];

  const m = typeof docData?.id === 'string' ? docData.id.match(ID_STAMP_RE) : null;
  if (m) return `${m[3]}/${m[2]} ${m[4]}:${m[5]}:${m[6]}.${m[7]}`;

  return formatCompactDateTime();
}

/**
 * Título del documento / pestaña:
 *   sin nombre cargado  → "CV - 18/09 11:38:15.4"                       (sello congelado)
 *   con nombre          → "CV - José Ramiro Burgos - Base"                (documento base)
 *   copia con versión   → "CV - José Ramiro Burgos — Desarrollador Frontend"
 * La marca "Base" y la versión solo aplican a documentos con `job_versioning`
 * (CV y Carta). Tarjeta: "Tarjeta - Nombre". El Libro NO es nombrable: queda para
 * siempre como "Libro - <sello>".
 */
export function deriveDocumentTitle(docType: string, docData: any): string {
  const prefix = DOC_TITLE_PREFIX[docType] || DOC_TITLE_PREFIX.cv;
  const versionable = hasCapability(docType, 'job_versioning');
  const versionLabel = versionable
    ? String(docData?.version_label || docData?.versionLabel || '').trim()
    : '';

  if (hasCapability(docType, 'nameable_title')) {
    const info = docData?.personalInfo;
    const names: string[] = [];
    if (info?.givenNames || info?.surname) {
      if (info.givenNames) names.push(info.givenNames);
      if (info.surname) names.push(info.surname);
    } else if (info?.fullName) {
      names.push(info.fullName);
    }
    if (names.length > 0) {
      const base = `${prefix} - ${names.join(' ').trim()}`;
      if (versionLabel) return `${base} — ${versionLabel}`;
      return versionable ? `${base} - Base` : base;
    }
  }

  const stamped = `${prefix} - ${frozenStamp(prefix, docData)}`;
  return versionLabel ? `${stamped} — ${versionLabel}` : stamped;
}
