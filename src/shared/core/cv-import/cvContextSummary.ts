/**
 * Contexto rodante entre páginas del importador de CV con IA (V2.10).
 *
 * La IA lee cada página aislada; sin contexto, un bloque de texto suelto arriba
 * de la página i+1 que en realidad es la continuación de una experiencia de la
 * página i se extrae como registro nuevo o se pierde. Este helper arma un
 * resumen compacto (~120–150 tokens) con: nombre detectado, idioma del CV,
 * última sección con datos y último registro de esa página. Se envía como
 * `contextSummary` a la siguiente página para que el modelo marque
 * `continuesFromPrevious: true` cuando corresponda.
 */

interface FragmentLike {
  personalInfo?: Record<string, unknown> | null;
  languages?: Array<{ language?: string } | any> | null;
  experience?: Array<Record<string, any>> | null;
  education?: Array<Record<string, any>> | null;
  coursesAndCertificates?: Array<Record<string, any>> | null;
  projects?: Array<Record<string, any>> | null;
  publications?: Array<Record<string, any>> | null;
  achievements?: Array<Record<string, any>> | null;
  skills?: Array<Record<string, any>> | null;
}

/** De menor a mayor prioridad: si hay varias secciones con datos, gana la de MÁS arriba
 * (experience es la que más texto continuable genera entre páginas). */
const SECTION_KEYS = [
  'skills',
  'achievements',
  'publications',
  'projects',
  'coursesAndCertificates',
  'education',
  'experience',
] as const;

function trimTo(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars - 1)}…`;
}

function lastRecordLabel(key: (typeof SECTION_KEYS)[number], record: Record<string, any>): string {
  switch (key) {
    case 'experience':
      return [record.role, record.company].filter(Boolean).join(' en ') || '(sin rol)';
    case 'education':
      return [record.degree, record.institution].filter(Boolean).join(' en ') || '(sin título)';
    case 'coursesAndCertificates':
      return [record.title, record.institution].filter(Boolean).join(' — ') || '(sin título)';
    case 'projects':
      return record.title || '(sin título)';
    case 'publications':
      return record.title || '(sin título)';
    case 'achievements':
      return record.title || '(sin título)';
    case 'skills':
      return record.name || '(sin nombre)';
  }
}

/** Construye el resumen de contexto que se envía a la siguiente página. */
export function buildContextSummary(fragment: FragmentLike | null | undefined, pageNumber: number): string {
  if (!fragment) return '';

  const fullName = typeof fragment.personalInfo?.fullName === 'string' ? fragment.personalInfo.fullName.trim() : '';
  const language = Array.isArray(fragment.languages)
    ? String(fragment.languages[0]?.language ?? '').trim()
    : '';

  let lastSection = '';
  let lastRecord = '';
  let lastDates = '';
  for (const key of SECTION_KEYS) {
    const list = fragment[key];
    if (!Array.isArray(list) || list.length === 0) continue;
    lastSection = key;
    const last = list[list.length - 1] || {};
    lastRecord = lastRecordLabel(key, last);
    lastDates = String(last.endDate || last.year || last.startDate || '').trim();
  }

  const parts: string[] = [`Página ${pageNumber} leída.`];
  if (fullName) parts.push(`Nombre detectado: ${fullName}.`);
  if (language) parts.push(`Idioma del CV: ${language}.`);
  if (lastSection) {
    parts.push(`Última sección con datos: ${lastSection}. Último registro: ${lastRecord}${lastDates ? ` (${lastDates})` : ''}.`);
  } else {
    parts.push('Sin registros todavía.');
  }
  parts.push('Si arriba de esta página hay un bloque que es continuación del último registro, marcá continuesFromPrevious: true.');

  return trimTo(parts.join(' '), 600); // ~150 tokens
}
