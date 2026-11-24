/**
 * Núcleo puro — Formateador y ordenador bibliográfico Editorial (editorialCitationFormatter.ts)
 *
 * Implementa las reglas formales de:
 * - APA 7.ª edición: orden alfabético por primer autor/título, Autor (Año). Título. Fuente. DOI/URL,
 *   soporte de margen francés en PDF.
 * - Vancouver (ICMJE): orden numérico secuencial [1], [2] por aparición en texto,
 *   Autor AA. Título. Revista. Año;Vol(Nro):Páginas. Disponible en: URL.
 * - Chicago y Tradicional.
 *
 * Este módulo es PURO (sin React, sin DOM) para testeo unitario y uso compartido en UI + PDF.
 */

import type {
  EditorialBibliographyStyle,
  EditorialNormId,
  EditorialRecord,
  EditorialSection,
} from './editorialTypes';

export type CanonicalCitationStyle = Exclude<EditorialBibliographyStyle, 'apa'>;

export interface FormattedCitationParts {
  style: CanonicalCitationStyle;
  citationNumber?: number;
  citationMarkerLabel?: string;
  citationBodyWithoutNumber?: string;
  usesTabulatedNumberIndent?: boolean;
  prefixText: string;
  italicSegment?: string;
  suffixText: string;
  fullText: string;
  usesHangingIndent: boolean;
}

export interface BibliographyNormGuide {
  id: CanonicalCitationStyle;
  label: string;
  shortRule: string;
  inTextExample: string;
  referenceExample: string;
  usesHangingIndent: boolean;
  sortOrder: 'alphabetical' | 'appearance';
  recommendedStructuralNorm: 'apa7' | 'chicago' | 'mla' | 'libre';
}

export function normalizeBibliographyStyle(
  raw?: EditorialBibliographyStyle | EditorialNormId | string,
): CanonicalCitationStyle {
  if (raw === 'apa' || raw === 'apa7') return 'apa7';
  if (raw === 'vancouver') return 'vancouver';
  if (raw === 'ieee') return 'ieee';
  if (raw === 'harvard') return 'harvard';
  if (raw === 'chicago') return 'chicago';
  if (raw === 'mla') return 'mla';
  if (raw === 'tradicional' || raw === 'libre') return 'tradicional';
  return 'apa7';
}

function cleanStr(val: unknown): string {
  return typeof val === 'string' ? val.trim() : '';
}

function normalizeSortKey(record: EditorialRecord): string {
  const base = cleanStr(record.bibAuthor) || cleanStr(record.bibTitle) || cleanStr(record.content);
  return base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function normalizeAuthorForVancouver(rawAuthor: string): string {
  const trimmed = rawAuthor.trim();
  if (!trimmed) return '';
  // Si el autor viene como "Apellido, Nombre" o "Apellido, N.", compactar a "Apellido N"
  const commaMatch = trimmed.match(/^([^,;]+),\s*([A-Za-zÁÉÍÓÚÜÑáéíóúüñ.\s]+)$/);
  if (commaMatch) {
    const surname = commaMatch[1].trim();
    const initials = commaMatch[2]
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.replace(/\./g, '').charAt(0).toUpperCase())
      .join('');
    return initials ? `${surname} ${initials}` : surname;
  }
  return trimmed.replace(/\.+$/, '');
}

/**
 * Formatea una cita individual respetando la norma elegida (APA 7, Vancouver, Chicago o Tradicional).
 * Devuelve partes estructuradas para que tanto la UI como el PDF puedan aplicar cursiva real
 * al título o revista según corresponda.
 */
export function formatEditorialCitation(
  record: EditorialRecord,
  rawStyle?: EditorialBibliographyStyle | EditorialNormId | string,
  sequentialIndex: number = 0,
): FormattedCitationParts {
  const style = normalizeBibliographyStyle(rawStyle || record.bibStyle);
  const author = cleanStr(record.bibAuthor);
  const year = cleanStr(record.bibYear);
  const title = cleanStr(record.bibTitle) || cleanStr(record.content);
  const editorial = cleanStr(record.bibEditorial);
  const journal = cleanStr(record.bibJournal);
  const volume = cleanStr(record.bibVolume);
  const issue = cleanStr(record.bibIssue);
  const pages = cleanStr(record.bibPages);
  const doiOrUrl = cleanStr(record.bibDoiOrUrl);
  const accessDate = cleanStr(record.bibAccessDate);
  const sourceType = record.bibSourceType || (journal ? 'articulo' : 'libro');

  if (!author && !title && !editorial && !journal) {
    const fallback = cleanStr(record.content);
    return {
      style,
      prefixText: fallback,
      suffixText: '',
      fullText: fallback,
      usesHangingIndent: style === 'apa7' || style === 'chicago',
    };
  }

  if (style === 'vancouver') {
    const num = record.bibOrderNumber && record.bibOrderNumber > 0 ? record.bibOrderNumber : sequentialIndex + 1;
    const vAuthors = author
      ? author
          .split(/\s*;\s*/)
          .slice(0, 6)
          .map(normalizeAuthorForVancouver)
          .filter(Boolean)
          .join(', ')
      : '';
    const authorPart = vAuthors
      ? author.split(/\s*;\s*/).length > 6
        ? `${vAuthors}, et al. `
        : `${vAuthors}. `
      : '';

    const titleClean = title ? `${title.replace(/\.+$/, '')}. ` : '';
    const pubLabel = journal || editorial;
    const isOnline = sourceType === 'web' || Boolean(!journal && doiOrUrl && !editorial);

    let sourceTail = '';
    if (sourceType === 'articulo' && journal) {
      const volIssue = volume ? (issue ? `${volume}(${issue})` : volume) : '';
      const yearVol = [year, volIssue].filter(Boolean).join(';');
      const withPages = pages ? `${yearVol}:${pages}` : yearVol;
      sourceTail = `${withPages ? `. ${withPages}.` : '.'}`;
      const prefixBody = `${authorPart}${titleClean}`;
      const italicJournal = journal.replace(/\.+$/, '');
      const fullBody = `${prefixBody}${italicJournal}${sourceTail}`.replace(/\s+/g, ' ').trim();
      const linkTail = doiOrUrl ? ` Disponible en: ${doiOrUrl}` : '';
      return {
        style: 'vancouver',
        citationNumber: num,
        citationMarkerLabel: `${num}.`,
        citationBodyWithoutNumber: `${fullBody}${linkTail}`.trim(),
        usesTabulatedNumberIndent: true,
        prefixText: `${num}. ${prefixBody}`,
        italicSegment: italicJournal,
        suffixText: `${sourceTail}${linkTail}`.trim(),
        fullText: `${num}. ${fullBody}${linkTail}`.replace(/\s+/g, ' ').trim(),
        usesHangingIndent: true,
      };
    } else if (isOnline) {
      const citDate = accessDate ? ` [citado ${accessDate}]` : '';
      sourceTail = `${pubLabel ? `${pubLabel}. ` : ''}${year ? `${year}` : ''}${citDate}.`;
    } else {
      const cityPrefix = record.bibCity ? `${cleanStr(record.bibCity)}: ` : '';
      sourceTail = [cityPrefix + editorial, year].filter(Boolean).join('; ') + (editorial || year ? '.' : '');
    }

    const linkTail = doiOrUrl ? ` Disponible en: ${doiOrUrl}` : '';
    const prefixBody = `${authorPart}`;
    const italicTitle = !journal && title ? title.replace(/\.+$/, '') : '';
    const tailText = `${!italicTitle ? titleClean : `. `}${sourceTail}${linkTail}`.trim();
    const prefixText = `${num}. ${prefixBody}`;
    const bodyWithoutNumber = `${prefixBody}${italicTitle || ''}${italicTitle ? `. ${sourceTail}${linkTail}` : `${titleClean}${sourceTail}${linkTail}`}`
      .replace(/\s+/g, ' ')
      .trim();

    return {
      style: 'vancouver',
      citationNumber: num,
      citationMarkerLabel: `${num}.`,
      citationBodyWithoutNumber: bodyWithoutNumber,
      usesTabulatedNumberIndent: true,
      prefixText: italicTitle ? prefixText : `${num}. ${authorPart}${titleClean}`,
      italicSegment: italicTitle,
      suffixText: italicTitle ? `. ${sourceTail}${linkTail}`.replace(/\s+/g, ' ').trim() : `${sourceTail}${linkTail}`.trim(),
      fullText: `${num}. ${authorPart}${titleClean}${sourceTail}${linkTail}`.replace(/\s+/g, ' ').trim(),
      usesHangingIndent: true,
    };
  }

  if (style === 'apa7') {
    const yearParen = year ? `(${year}).` : '(s. f.).';
    const prefixAuthorYear = author ? `${author.replace(/\.+$/, '')}. ${yearParen} ` : `${yearParen} `;

    if (sourceType === 'articulo' && journal) {
      const volStr = volume || '';
      const issueStr = issue ? `(${issue})` : '';
      const pagesStr = pages ? `, ${pages}` : '';
      const bibMeta = `${volStr}${issueStr}${pagesStr}`.trim();
      const suffixParts = [bibMeta ? `, ${bibMeta}.` : '.', doiOrUrl].filter(Boolean).join(' ');
      return {
        style: 'apa7',
        prefixText: `${prefixAuthorYear}${title ? `${title.replace(/\.+$/, '')}. ` : ''}`,
        italicSegment: journal.replace(/\.+$/, ''),
        suffixText: suffixParts.trim(),
        fullText: `${prefixAuthorYear}${title ? `${title.replace(/\.+$/, '')}. ` : ''}${journal.replace(/\.+$/, '')}${suffixParts ? ` ${suffixParts}` : ''}`
          .replace(/\s+,/g, ',')
          .replace(/\s+/g, ' ')
          .trim(),
        usesHangingIndent: true,
      };
    }

    // Libro, tesis o web en APA 7: título en cursiva
    const italicTitle = title ? `${title.replace(/\.+$/, '')}.` : '';
    const sourcePublisher = editorial || journal;
    const suffix = [sourcePublisher ? `${sourcePublisher.replace(/\.+$/, '')}.` : '', doiOrUrl].filter(Boolean).join(' ');
    return {
      style: 'apa7',
      prefixText: prefixAuthorYear,
      italicSegment: italicTitle,
      suffixText: suffix,
      fullText: `${prefixAuthorYear}${italicTitle} ${suffix}`.replace(/\s+/g, ' ').trim(),
      usesHangingIndent: true,
    };
  }

  if (style === 'chicago') {
    const prefixText = `${author ? `${author}. ` : ''}`;
    const italicSegment = sourceType === 'articulo' ? journal : title;
    const mid = sourceType === 'articulo' && title ? `«${title}». ` : '';
    const suffixParts = [editorial, year, pages ? `pp. ${pages}` : '', doiOrUrl].filter(Boolean).join(', ');
    const fullText = `${prefixText}${mid}${italicSegment}${suffixParts ? `. ${suffixParts}.` : '.'}`
      .replace(/\s+/g, ' ')
      .trim();
    return {
      style: 'chicago',
      prefixText: `${prefixText}${mid}`,
      italicSegment,
      suffixText: suffixParts ? `. ${suffixParts}.` : '.',
      fullText,
      usesHangingIndent: true,
    };
  }

  if (style === 'ieee') {
    const num = record.bibOrderNumber && record.bibOrderNumber > 0 ? record.bibOrderNumber : sequentialIndex + 1;
    const authorPart = author ? `${author.replace(/\.+$/, '')}, ` : '';
    const quotedTitle = title ? `«${title.replace(/\.+$/, '')}», ` : '';
    const venueItalic = (journal || editorial || '').replace(/\.+$/, '');
    const metaParts = [
      volume ? `vol. ${volume}` : '',
      issue ? `n.º ${issue}` : '',
      pages ? `pp. ${pages}` : '',
      year,
    ]
      .filter(Boolean)
      .join(', ');
    const tail = [metaParts ? `${venueItalic ? ', ' : ''}${metaParts}.` : venueItalic ? '.' : '', doiOrUrl]
      .filter(Boolean)
      .join(' ')
      .trim();
    const prefixText = `[${num}] ${authorPart}${quotedTitle}`;
    const bodyWithoutNumber = `${authorPart}${quotedTitle}${venueItalic}${tail}`.replace(/\s+/g, ' ').trim();
    return {
      style: 'ieee',
      citationNumber: num,
      citationMarkerLabel: `[${num}]`,
      citationBodyWithoutNumber: bodyWithoutNumber,
      usesTabulatedNumberIndent: true,
      prefixText,
      italicSegment: venueItalic,
      suffixText: tail,
      fullText: `${prefixText}${venueItalic}${tail}`.replace(/\s+/g, ' ').trim(),
      usesHangingIndent: true,
    };
  }

  if (style === 'harvard') {
    const authorYear = `${author ? `${author.replace(/\.+$/, '')} ` : ''}${year ? `(${year})` : '(s. f.)'}`.trim();
    const prefixText = `${authorYear} `;
    if (sourceType === 'articulo' && journal) {
      const volIssue = volume ? `${volume}${issue ? `(${issue})` : ''}` : '';
      const meta = [volIssue, pages ? `pp. ${pages}` : '', doiOrUrl].filter(Boolean).join(', ');
      const suffixText = meta ? `, ${meta}.` : '.';
      const titlePart = title ? `'${title.replace(/\.+$/, '')}', ` : '';
      return {
        style: 'harvard',
        prefixText: `${prefixText}${titlePart}`,
        italicSegment: journal.replace(/\.+$/, ''),
        suffixText,
        fullText: `${prefixText}${titlePart}${journal.replace(/\.+$/, '')}${suffixText}`.replace(/\s+/g, ' ').trim(),
        usesHangingIndent: true,
      };
    }
    const italicSegment = title ? `${title.replace(/\.+$/, '')}.` : '';
    const pubPart = (editorial || journal) ? `${(editorial || journal).replace(/\.+$/, '')}.` : '';
    const suffixText = [pubPart, doiOrUrl].filter(Boolean).join(' ');
    return {
      style: 'harvard',
      prefixText,
      italicSegment,
      suffixText,
      fullText: `${prefixText}${italicSegment}${suffixText ? ` ${suffixText}` : ''}`.replace(/\s+/g, ' ').trim(),
      usesHangingIndent: true,
    };
  }

  if (style === 'mla') {
    const authorPart = author ? `${author.replace(/\.+$/, '')}. ` : '';
    if (sourceType === 'articulo' && journal) {
      const quoted = title ? `"${title.replace(/\.+$/, '')}." ` : '';
      const tail = [
        volume ? `vol. ${volume}` : '',
        issue ? `no. ${issue}` : '',
        year,
        pages ? `pp. ${pages}` : '',
      ]
        .filter(Boolean)
        .join(', ');
      const suffixText = [tail ? `, ${tail}.` : '.', doiOrUrl].filter(Boolean).join(' ');
      return {
        style: 'mla',
        prefixText: `${authorPart}${quoted}`,
        italicSegment: journal.replace(/\.+$/, ''),
        suffixText,
        fullText: `${authorPart}${quoted}${journal.replace(/\.+$/, '')}${suffixText}`.replace(/\s+/g, ' ').trim(),
        usesHangingIndent: true,
      };
    }
    const italicTitle = title ? `${title.replace(/\.+$/, '')}.` : '';
    const pubAndYear = [editorial || journal, year].filter(Boolean).join(', ');
    const suffix = [pubAndYear ? `${pubAndYear.replace(/\.+$/, '')}.` : '', doiOrUrl].filter(Boolean).join(' ');
    return {
      style: 'mla',
      prefixText: authorPart,
      italicSegment: italicTitle,
      suffixText: suffix,
      fullText: `${authorPart}${italicTitle}${suffix ? ` ${suffix}` : ''}`.replace(/\s+/g, ' ').trim(),
      usesHangingIndent: true,
    };
  }

  // Tradicional (emite cursiva real en título o publicación)
  const prefixTrad = [author, year ? `(${year})` : '']
    .filter(Boolean)
    .join(' ')
    .trim();
  const italicTrad = title ? `"${title}"` : '';
  const suffixTrad = [journal || editorial, doiOrUrl].filter(Boolean).join('. ').trim();
  const fullText = [
    author,
    year ? `(${year})` : '',
    italicTrad,
    journal || editorial,
    doiOrUrl,
  ]
    .filter(Boolean)
    .join('. ')
    .replace(/\.\s*\(/, ' (')
    .trim();

  return {
    style: 'tradicional',
    prefixText: prefixTrad ? `${prefixTrad}. ` : '',
    italicSegment: italicTrad,
    suffixText: suffixTrad ? `. ${suffixTrad}` : '',
    fullText,
    usesHangingIndent: false,
  };
}

/**
 * Ordena las referencias bibliográficas según el estándar activo:
 * - APA 7 / Harvard / Chicago / MLA: alfabético por apellido del primer autor (o título).
 * - Vancouver / IEEE: orden de aparición en el documento (o `bibOrderNumber`), renumerado [1..N].
 */
export function sortBibliographyRecords(
  records: EditorialRecord[],
  rawStyle?: EditorialBibliographyStyle | EditorialNormId | string,
  appearanceOrderMap?: Map<string, number>,
): EditorialRecord[] {
  const style = normalizeBibliographyStyle(rawStyle);
  const nonBib = records.filter((r) => r.type !== 'bibliography_item');
  const bib = records.filter((r) => r.type === 'bibliography_item');

  if (style === 'vancouver' || style === 'ieee') {
    const sorted = [...bib].sort((a, b) => {
      const appA = appearanceOrderMap?.get(a.id);
      const appB = appearanceOrderMap?.get(b.id);
      const na = appA ?? (typeof a.bibOrderNumber === 'number' ? 10000 + a.bibOrderNumber : Number.MAX_SAFE_INTEGER);
      const nb = appB ?? (typeof b.bibOrderNumber === 'number' ? 10000 + b.bibOrderNumber : Number.MAX_SAFE_INTEGER);
      return na - nb;
    });
    const renumbered = sorted.map((rec, idx) => ({
      ...rec,
      bibStyle: style as EditorialBibliographyStyle,
      bibOrderNumber: idx + 1,
    }));
    return [...nonBib, ...renumbered];
  }

  if (style === 'apa7' || style === 'harvard' || style === 'chicago' || style === 'mla') {
    const sorted = [...bib].sort((a, b) => normalizeSortKey(a).localeCompare(normalizeSortKey(b), 'es'));
    return [...nonBib, ...sorted.map((rec) => ({ ...rec, bibStyle: style as EditorialBibliographyStyle }))];
  }

  return records;
}

export const BIBLIOGRAPHY_NORM_GUIDES: Record<CanonicalCitationStyle, BibliographyNormGuide> = {
  apa7: {
    id: 'apa7',
    label: 'Normas APA 7.ª ed.',
    shortRule:
      'Orden alfabético por apellido, citas (Autor, Año), interlineado doble (2.0), margen lateral de 25 mm y escalón de referencia en la segunda línea.',
    inTextExample: 'En el texto: (García, 2024) o García (2024) señala...',
    referenceExample: 'García, M. (2024). Metodología de investigación. Editorial Universitaria. https://doi.org/...',
    usesHangingIndent: true,
    sortOrder: 'alphabetical',
    recommendedStructuralNorm: 'apa7',
  },
  vancouver: {
    id: 'vancouver',
    label: 'Vancouver (ICMJE / Salud y Ciencia)',
    shortRule:
      'Referencias numeradas del 1 en adelante en el orden exacto en que se citan por primera vez en el texto. Toma el diseño visual limpio de APA 7 cuando no exige formato propio.',
    inTextExample: 'En el texto: ...según estudios recientes [1] o [1, 2].',
    referenceExample: '1. García M, Pérez JL. Protocolo clínico. Rev Med. 2024;42(3):112-8.',
    usesHangingIndent: true,
    sortOrder: 'appearance',
    recommendedStructuralNorm: 'apa7',
  },
  ieee: {
    id: 'ieee',
    label: 'IEEE (Ingeniería y Tecnología)',
    shortRule:
      'Referencias numeradas [1], [2] por orden exacto de aparición en los capítulos y títulos entre comillas. Se integra naturalmente con el diseño visual de APA 7 o limpio.',
    inTextExample: 'En el texto: ...como propuso [1] en arquitecturas distribuidas.',
    referenceExample: '[1] M. García, «Protocolo de red», IEEE Trans., vol. 14, n.º 2, pp. 45-52, 2024.',
    usesHangingIndent: true,
    sortOrder: 'appearance',
    recommendedStructuralNorm: 'apa7',
  },
  harvard: {
    id: 'harvard',
    label: 'Harvard (Ciencias Sociales y Economía)',
    shortRule:
      'Orden alfabético por autor con formato Autor (Año) y título entre comillas simples en artículos. Suele tomar la diagramación de página de APA 7.',
    inTextExample: 'En el texto: (García, 2024, p. 18).',
    referenceExample: "García, M. (2024) Metodología de estudio. Buenos Aires: Eudeba.",
    usesHangingIndent: true,
    sortOrder: 'alphabetical',
    recommendedStructuralNorm: 'apa7',
  },
  chicago: {
    id: 'chicago',
    label: 'Chicago (Humanidades e Historia)',
    shortRule:
      'Orden alfabético por apellido con título completo, ciudad, editorial y año. Posee reglas estéticas propias acopladas al estilo Chicago.',
    inTextExample: 'En el texto: (García 2024, 45).',
    referenceExample: 'García, Marta. Historia contemporánea. Buenos Aires: Eudeba, 2024.',
    usesHangingIndent: true,
    sortOrder: 'alphabetical',
    recommendedStructuralNorm: 'chicago',
  },
  mla: {
    id: 'mla',
    label: 'MLA 9.ª ed. (Literatura y Lenguas)',
    shortRule:
      'Orden alfabético en "Obras citadas", citas autor-página sin coma (García 45) y formato estricto MLA (25 mm, doble espacio 2.0).',
    inTextExample: 'En el texto: (García 45).',
    referenceExample: 'García, Marta. Historia contemporánea. Eudeba, 2024.',
    usesHangingIndent: true,
    sortOrder: 'alphabetical',
    recommendedStructuralNorm: 'mla',
  },
  tradicional: {
    id: 'tradicional',
    label: 'Tradicional / Escolar libre',
    shortRule:
      'Listado simple de libros, apuntes o sitios web consultados para trabajos prácticos escolares.',
    inTextExample: 'En el texto: Mencioná autor o libro consultado.',
    referenceExample: 'Marta García (2024). "Guía de estudio". Editorial Kapelusz.',
    usesHangingIndent: false,
    sortOrder: 'appearance',
    recommendedStructuralNorm: 'libre',
  },
};

// =====================================================================
// Citas dinámicas en línea dentro de capítulos, secciones y anexos
// =====================================================================

export interface ParsedInlineCitationToken {
  rawToken: string;
  bibId: string;
  locator?: string;
}

const INLINE_CITE_REGEX = /\[\[cite:([a-zA-Z0-9_-]+)(?:\|([^\]]+))?\]\]/g;

export function buildInlineCiteToken(bibId: string, locator?: string): string {
  const cleanId = bibId.trim();
  const cleanLoc = cleanStr(locator);
  return cleanLoc ? `[[cite:${cleanId}|${cleanLoc}]]` : `[[cite:${cleanId}]]`;
}

export function extractInlineCitationTokens(text: string): ParsedInlineCitationToken[] {
  if (!text) return [];
  const matches: ParsedInlineCitationToken[] = [];
  const re = new RegExp(INLINE_CITE_REGEX.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    matches.push({
      rawToken: m[0],
      bibId: m[1],
      locator: m[2]?.trim() || undefined,
    });
  }
  return matches;
}

export function collectBibliographyFromSections(sections: EditorialSection[] = []): {
  items: EditorialRecord[];
  map: Map<string, EditorialRecord>;
} {
  const items: EditorialRecord[] = [];
  const map = new Map<string, EditorialRecord>();
  for (const sec of sections) {
    for (const rec of sec?.records || []) {
      if (rec?.type === 'bibliography_item') {
        items.push(rec);
        map.set(rec.id, rec);
      }
    }
  }
  return { items, map };
}

/**
 * Recorre las secciones visibles del manuscrito en orden de lectura y asigna
 * un número secuencial (1, 2, 3...) a cada fuente según su PRIMERA aparición.
 * Citar la misma fuente más adelante conserva el mismo número (Vancouver / IEEE).
 */
export function computeCitationAppearanceOrder(sections: EditorialSection[] = []): Map<string, number> {
  const orderMap = new Map<string, number>();
  let nextNum = 1;

  for (const sec of sections) {
    if (!sec || sec.visible === false) continue;
    if (sec.sectionKey === 'bibliografia') continue;
    for (const rec of sec.records || []) {
      if (!rec || rec.type === 'bibliography_item') continue;
      const fieldsToScan = [
        rec.content,
        rec.quoteAttribution,
        rec.imageCaption,
        ...(Array.isArray(rec.tableRows) ? rec.tableRows.flat() : []),
      ];
      for (const rawField of fieldsToScan) {
        if (typeof rawField !== 'string' || !rawField.includes('[[cite:')) continue;
        for (const tok of extractInlineCitationTokens(rawField)) {
          if (!orderMap.has(tok.bibId)) {
            orderMap.set(tok.bibId, nextNum);
            nextNum += 1;
          }
        }
      }
    }
  }

  return orderMap;
}

function extractShortSurnamesForInText(rawAuthor: string): string {
  const clean = cleanStr(rawAuthor);
  if (!clean) return '';
  const parts = clean.split(/\s*;\s*/).filter(Boolean);
  const firstSurname = (parts[0].includes(',') ? parts[0].split(',')[0] : parts[0]).trim();
  if (parts.length === 1) return firstSurname;
  if (parts.length === 2) {
    const secondSurname = (parts[1].includes(',') ? parts[1].split(',')[0] : parts[1]).trim();
    return `${firstSurname} & ${secondSurname}`;
  }
  return `${firstSurname} et al.`;
}

export function formatInlineCitation(
  record: EditorialRecord | undefined,
  rawStyle?: EditorialBibliographyStyle | EditorialNormId | string,
  appearanceNumber?: number,
  locator?: string,
): string {
  const style = normalizeBibliographyStyle(rawStyle);
  const cleanLoc = cleanStr(locator);

  if (style === 'vancouver' || style === 'ieee') {
    const num = appearanceNumber || record?.bibOrderNumber || 1;
    return cleanLoc ? `[${num}, ${cleanLoc}]` : `[${num}]`;
  }

  if (!record) return '[Ref.]';

  const authorShort = extractShortSurnamesForInText(record.bibAuthor || '') || cleanStr(record.bibTitle).slice(0, 24) || 'Ref.';
  const year = cleanStr(record.bibYear) || 's. f.';

  if (style === 'mla') {
    const locNoPrefix = cleanLoc.replace(/^p\.\s*/i, '');
    return locNoPrefix ? `(${authorShort} ${locNoPrefix})` : `(${authorShort})`;
  }

  if (style === 'chicago') {
    const locNoPrefix = cleanLoc.replace(/^p\.\s*/i, '');
    return locNoPrefix ? `(${authorShort} ${year}, ${locNoPrefix})` : `(${authorShort} ${year})`;
  }

  // APA 7, Harvard y Tradicional
  return cleanLoc ? `(${authorShort}, ${year}, ${cleanLoc})` : `(${authorShort}, ${year})`;
}

export function resolveInlineCitationsInText(
  text: string,
  bibMap: Map<string, EditorialRecord>,
  rawStyle?: EditorialBibliographyStyle | EditorialNormId | string,
  appearanceOrderMap?: Map<string, number>,
): string {
  if (!text || !text.includes('[[cite:')) return text;
  const style = normalizeBibliographyStyle(rawStyle);
  return text.replace(INLINE_CITE_REGEX, (_match, bibId: string, locator?: string) => {
    const rec = bibMap.get(bibId);
    const num = appearanceOrderMap?.get(bibId);
    return formatInlineCitation(rec, style, num, locator);
  });
}

export function syncSectionsBibliographyOrder(
  sections: EditorialSection[] = [],
  rawStyle?: EditorialBibliographyStyle | EditorialNormId | string,
): EditorialSection[] {
  const style = normalizeBibliographyStyle(rawStyle);
  const appearanceMap = computeCitationAppearanceOrder(sections);
  return sections.map((sec) => {
    if (sec?.sectionKey !== 'bibliografia' && !sec?.records?.some((r) => r.type === 'bibliography_item')) {
      return sec;
    }
    return {
      ...sec,
      records: sortBibliographyRecords(sec.records || [], style, appearanceMap),
    };
  });
}
