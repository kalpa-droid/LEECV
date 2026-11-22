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

import type { EditorialBibliographyStyle, EditorialNormId, EditorialRecord } from './editorialTypes';

export interface FormattedCitationParts {
  style: Exclude<EditorialBibliographyStyle, 'apa'>;
  citationNumber?: number;
  prefixText: string;
  italicSegment?: string;
  suffixText: string;
  fullText: string;
  usesHangingIndent: boolean;
}

export interface BibliographyNormGuide {
  id: EditorialBibliographyStyle;
  label: string;
  shortRule: string;
  inTextExample: string;
  referenceExample: string;
  usesHangingIndent: boolean;
  sortOrder: 'alphabetical' | 'appearance';
}

export function normalizeBibliographyStyle(
  raw?: EditorialBibliographyStyle | EditorialNormId | string,
): Exclude<EditorialBibliographyStyle, 'apa'> {
  if (raw === 'apa' || raw === 'apa7') return 'apa7';
  if (raw === 'vancouver') return 'vancouver';
  if (raw === 'chicago') return 'chicago';
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
  const style = normalizeBibliographyStyle(record.bibStyle || rawStyle);
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
      sourceTail = `${journal.replace(/\.+$/, '')}. ${withPages ? `${withPages}.` : ''}`;
    } else if (isOnline) {
      const citDate = accessDate ? ` [citado ${accessDate}]` : '';
      sourceTail = `${pubLabel ? `${pubLabel}. ` : ''}${year ? `${year}` : ''}${citDate}.`;
    } else {
      const cityPrefix = record.bibCity ? `${cleanStr(record.bibCity)}: ` : '';
      sourceTail = [cityPrefix + editorial, year].filter(Boolean).join('; ') + (editorial || year ? '.' : '');
    }

    const linkTail = doiOrUrl ? ` Disponible en: ${doiOrUrl}` : '';
    const prefixText = `${num}. ${authorPart}${titleClean}`;
    const italicSegment = '';
    const suffixText = `${sourceTail}${linkTail}`.trim();

    return {
      style: 'vancouver',
      citationNumber: num,
      prefixText,
      italicSegment,
      suffixText,
      fullText: `${prefixText}${suffixText}`.replace(/\s+/g, ' ').trim(),
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

  // Tradicional
  const fullText = [
    author,
    year ? `(${year})` : '',
    title ? `"${title}"` : '',
    journal || editorial,
    doiOrUrl,
  ]
    .filter(Boolean)
    .join('. ')
    .replace(/\.\s*\(/, ' (')
    .trim();

  return {
    style: 'tradicional',
    prefixText: fullText,
    suffixText: '',
    fullText,
    usesHangingIndent: false,
  };
}

/**
 * Ordena las referencias bibliográficas según el estándar activo:
 * - APA 7 / Chicago: alfabético por apellido del primer autor (o título).
 * - Vancouver: orden de aparición en el documento (o `bibOrderNumber`), renumerado [1..N].
 */
export function sortBibliographyRecords(
  records: EditorialRecord[],
  rawStyle?: EditorialBibliographyStyle | EditorialNormId | string,
): EditorialRecord[] {
  const style = normalizeBibliographyStyle(rawStyle);
  const nonBib = records.filter((r) => r.type !== 'bibliography_item');
  const bib = records.filter((r) => r.type === 'bibliography_item');

  if (style === 'vancouver') {
    const sorted = [...bib].sort((a, b) => {
      const na = typeof a.bibOrderNumber === 'number' ? a.bibOrderNumber : Number.MAX_SAFE_INTEGER;
      const nb = typeof b.bibOrderNumber === 'number' ? b.bibOrderNumber : Number.MAX_SAFE_INTEGER;
      return na - nb;
    });
    const renumbered = sorted.map((rec, idx) => ({
      ...rec,
      bibStyle: 'vancouver' as EditorialBibliographyStyle,
      bibOrderNumber: idx + 1,
    }));
    return [...nonBib, ...renumbered];
  }

  if (style === 'apa7' || style === 'chicago') {
    const sorted = [...bib].sort((a, b) => normalizeSortKey(a).localeCompare(normalizeSortKey(b), 'es'));
    return [...nonBib, ...sorted.map((rec) => ({ ...rec, bibStyle: style }))];
  }

  return records;
}

export const BIBLIOGRAPHY_NORM_GUIDES: Record<Exclude<EditorialBibliographyStyle, 'apa'>, BibliographyNormGuide> = {
  apa7: {
    id: 'apa7',
    label: 'Normas APA 7.ª ed.',
    shortRule:
      'Orden alfabético por apellido, citas (Autor, Año), interlineado doble (2.0), margen lateral de 25 mm y escalón de referencia en la segunda línea.',
    inTextExample: 'En el texto: (García, 2024) o García (2024) señala...',
    referenceExample: 'García, M. (2024). Metodología de investigación. Editorial Universitaria. https://doi.org/...',
    usesHangingIndent: true,
    sortOrder: 'alphabetical',
  },
  vancouver: {
    id: 'vancouver',
    label: 'Vancouver (ICMJE / Salud y Ciencia)',
    shortRule:
      'Referencias numeradas del 1 en adelante en el orden exacto en que se citan por primera vez en el texto. Se mantiene el mismo número si se vuelve a citar.',
    inTextExample: 'En el texto: ...según estudios recientes [1] o (1-3).',
    referenceExample: '1. García M, Pérez JL. Protocolo clínico. Rev Med. 2024;42(3):112-8.',
    usesHangingIndent: true,
    sortOrder: 'appearance',
  },
  chicago: {
    id: 'chicago',
    label: 'Chicago (Humanidades e Historia)',
    shortRule:
      'Orden alfabético por apellido con título completo de obra, ciudad, editorial y año de publicación.',
    inTextExample: 'En el texto: (García 2024, 45).',
    referenceExample: 'García, Marta. Historia contemporánea. Buenos Aires: Eudeba, 2024.',
    usesHangingIndent: true,
    sortOrder: 'alphabetical',
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
  },
};
