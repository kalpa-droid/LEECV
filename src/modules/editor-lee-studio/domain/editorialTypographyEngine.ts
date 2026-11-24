/**
 * Motor Tipográfico Editorial Puro (PR 1 — Fase 2).
 *
 * Responsabilidades:
 * 1. Normalizar glifos Unicode sin corromper puntuación tipográfica (—, –, «, », ©, ·, •)
 *    ni deshacerse de espacios duros (\u00A0).
 * 2. Preservar saltos de línea en poemas, estrofas, cajas didácticas y epígrafes.
 * 3. Limpiar puntuación sobrante en encabezados corrientes (ej. "Mi obra." -> "Mi obra").
 * 4. Prevenir líneas finales viudas de una palabra (runts) insertando \u00A0 entre las dos
 *    últimas palabras cuando el párrafo tiene suficiente longitud.
 * 5. Parsear runs en línea (**negrita**, *cursiva*, ***ambas***, rombo ◆ y notas [^N]).
 *
 * REGLA ESTRICTA DE ARCHIVO: 100% TypeScript puro, sin importar `@react-pdf/renderer`
 * ni usar hex sueltos, para mantener el presupuesto de bundle inicial en 0 KB.
 */

export interface EditorialInlineRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  isDiamond?: boolean;
  footnoteNumber?: number;
}

export interface SanitizeEditorialTextOptions {
  preserveLineBreaks?: boolean;
  /** Cuando es true (fuentes Unicode Tinos/Arimo), conserva símbolos científicos, guiones y comillas. */
  targetFontIsUnicode?: boolean;
  /** Cuando es true, deja el carácter ◆ (\u25C6) intacto para que el renderer lo dibuje con SVG vectorial. */
  preserveDiamondGlyph?: boolean;
  /** Si es true, inserta espacio duro (\u00A0) antes de la última palabra corta para evitar runts. */
  preventRunts?: boolean;
}

/** Abreviaturas frecuentes que legítimamente terminan en punto. */
const ABBREVIATION_END_REGEX =
  /(?:\b(?:Dr|Dra|Prof|Sr|Sra|Srta|Lic|Ing|Arq|Mg|Mag|Pbro|Cap|Art|Vol|Ed|Nro|Inc|Ltda|etc|et al)\.|(?:\.{2,}|\u2026))$/i;

/** Glifos fuera de WinAnsi y no presentes en Tinos/Arimo estándar que deben sustituirse si se imprimen como texto plano. */
const FALLBACK_DINGBAT_MAP: Record<string, string> = {
  '\u2713': '✓',
  '\u2714': '✓',
  '\u2715': 'x',
  '\u2716': 'x',
  '\u2717': 'x',
  '\u2718': 'x',
  '\u2756': '*', // ❖
  '\u25B8': '>', // ▸
  '\u25BA': '>', // ►
  '\u2605': '*', // ★
  '\u2606': '*', // ☆
};

/** Mapa conservador para fuentes Type1 WinAnsi legacy (cuando no hay TTF Unicode cargado). */
const WINANSI_UNSAFE_REPLACEMENTS: Record<string, string> = {
  '\u25C6': '*',     // ◆
  '\u25C7': '*',     // ◇
  '\u2192': '->',    // →
  '\u2190': '<-',    // ←
  '\u2194': '<->',   // ↔
  '\u21D2': '=>',    // ⇒
  '\u2264': '<=',    // ≤
  '\u2265': '>=',    // ≥
  '\u2260': '!=',    // ≠
  '\u2248': '~=',    // ≈
  '\u03B1': 'alpha', // α
  '\u03B2': 'beta',  // β
  '\u03B3': 'gamma', // γ
  '\u0394': 'Delta', // Δ
  '\u03BC': 'u',     // μ
  '\u03C3': 'sigma', // σ
  '\u2713': '[ok]',  // ✓
  '\u2714': '[ok]',  // ✔
  '\u2715': '[x]',   // ✕
};

const WINANSI_SUPPORTED_HIGH_CODEPOINTS = new Set<number>([
  0x20ac, // €
  0x201a, // ‚
  0x0192, // ƒ
  0x201e, // „
  0x2026, // …
  0x2020, // †
  0x2021, // ‡
  0x02c6, // ˆ
  0x2030, // ‰
  0x0160, // Š
  0x2039, // ‹
  0x0152, // Œ
  0x017d, // Ž
  0x2018, // ‘
  0x2019, // ’
  0x201c, // “
  0x201d, // ”
  0x2022, // •
  0x2013, // –
  0x2014, // —
  0x02dc, // ˜
  0x2122, // ™
  0x0161, // š
  0x203a, // ›
  0x0153, // œ
  0x017e, // ž
  0x0178, // Ÿ
]);

/** Rango BMP soportado por Tinos / Arimo full TTF descargados en public/fonts/editorial/. */
export function isCharWinAnsiSafe(char: string): boolean {
  if (!char) return true;
  const cp = char.codePointAt(0) ?? 0;
  if (cp <= 0xff) return true;
  return WINANSI_SUPPORTED_HIGH_CODEPOINTS.has(cp);
}

/** Detecta caracteres problemáticos para fuentes WinAnsi estándar (útil para diagnósticos y tests). */
export function detectUnsafeWinAnsiChars(text: string): string[] {
  if (!text) return [];
  const found = new Set<string>();
  for (const ch of text) {
    if (!isCharWinAnsiSafe(ch)) {
      found.add(ch);
    }
  }
  return Array.from(found);
}

/**
 * Quita puntuación final espuria en encabezados corrientes o títulos de libro
 * (por ejemplo "Mi obra." -> "Mi obra"), preservando abreviaturas ("Dr.", "etc.")
 * y puntos suspensivos ("...").
 */
export function stripTrailingHeaderPunctuation(title: string): string {
  const clean = (title || '').replace(/[ \t]+/g, ' ').trim();
  if (!clean) return '';
  if (ABBREVIATION_END_REGEX.test(clean)) return clean;
  return clean.replace(/[.,;:]+$/u, '').trim();
}

/**
 * Evita "runts" (última línea de un párrafo compuesta por una sola palabra huérfana)
 * reemplazando el último espacio normal por espacio duro (\u00A0).
 */
export function preventParagraphRunts(text: string): string {
  if (!text || text.includes('\n')) return text;
  const trimmed = text.trimEnd();
  const words = trimmed.split(' ').filter(Boolean);
  if (words.length < 5) return text;
  const lastWord = words[words.length - 1];
  const prevWord = words[words.length - 2];
  // No unir si las palabras finales ya forman una expresión muy larga (> 24 chars)
  if (!lastWord || !prevWord || lastWord.length + prevWord.length > 24) {
    return text;
  }
  const lastSpaceIdx = trimmed.lastIndexOf(' ');
  if (lastSpaceIdx <= 0) return text;
  return `${trimmed.slice(0, lastSpaceIdx)}\u00A0${trimmed.slice(lastSpaceIdx + 1)}`;
}

/**
 * Sanitiza un texto editorial corrigiendo espacios, comillas angulares mal convertidas
 * y glifos no soportados sin destruir `\u00A0` ni los saltos de verso en poemas.
 */
export function sanitizeEditorialText(
  rawText: string,
  options: SanitizeEditorialTextOptions = {},
): string {
  const {
    preserveLineBreaks = false,
    targetFontIsUnicode = true,
    preserveDiamondGlyph = true,
    preventRunts = false,
  } = options;

  let text = typeof rawText === 'string' ? rawText : '';
  if (!text) return '';

  // Reparar secuencias heredadas de angulares ("<<< texto >>>" -> "«texto»")
  text = text.replace(/<<<[ \t]*/g, '«').replace(/[ \t]*>>>/g, '»');

  // Normalizar fin de línea a \n
  text = text.replace(/\r\n?/g, '\n');

  if (preserveLineBreaks) {
    // Limpiar espacios múltiples horizontales pero conservar saltos de línea y versos
    text = text
      .split('\n')
      .map((line) => line.replace(/[ \t]+/g, ' ').trimEnd())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  } else {
    // IMPORTANTE: nunca usar `\s` aquí porque `\s` borraría `\u00A0` (espacio duro)
    text = text.replace(/[ \t\n]+/g, ' ').trim();
  }

  // Sustituir únicamente glifos problemáticos según el tipo de fuente
  if (!targetFontIsUnicode) {
    let rebuilt = '';
    for (const ch of text) {
      if (ch === '\u25C6' && preserveDiamondGlyph) {
        rebuilt += ch;
      } else if (WINANSI_UNSAFE_REPLACEMENTS[ch]) {
        rebuilt += WINANSI_UNSAFE_REPLACEMENTS[ch];
      } else if (FALLBACK_DINGBAT_MAP[ch]) {
        rebuilt += FALLBACK_DINGBAT_MAP[ch];
      } else {
        rebuilt += isCharWinAnsiSafe(ch) ? ch : '';
      }
    }
    text = rebuilt;
  } else {
    // Con Tinos / Arimo full TTF: conservar ◆ si se renderea como SVG; sustituir checkmarks faltantes por texto limpio
    let rebuilt = '';
    for (const ch of text) {
      if (ch === '\u25C6') {
        rebuilt += preserveDiamondGlyph ? ch : '*';
      } else if (ch === '\u2713' || ch === '\u2714') {
        rebuilt += '[v]';
      } else {
        rebuilt += ch;
      }
    }
    text = rebuilt;
  }

  if (preventRunts && !preserveLineBreaks) {
    text = preventParagraphRunts(text);
  }

  return text;
}

/**
 * Parsea marcado en línea mínimo producido por el extractor OOXML (`***bi***`, `**bold**`,
 * `*italic*`), además del ornamento `◆` (`isDiamond`) y marcadores de nota `[^N]`.
 */
export function parseInlineRichRuns(input: string): EditorialInlineRun[] {
  if (!input) return [];

  // Primero dividimos por ornamento ◆ (\u25C6) y marcadores [^N]
  const segmentRegex = /(\u25C6|\[\^\d+\])/g;
  const rawSegments = input.split(segmentRegex).filter((part) => part.length > 0);
  const runs: EditorialInlineRun[] = [];

  for (const segment of rawSegments) {
    if (segment === '\u25C6') {
      runs.push({ text: '\u25C6', isDiamond: true });
      continue;
    }
    const fnMatch = segment.match(/^\[\^(\d+)\]$/);
    if (fnMatch) {
      runs.push({ text: fnMatch[1], footnoteNumber: Number(fnMatch[1]) });
      continue;
    }

    // Parseo de énfasis en línea dentro del segmento de texto
    const inlineTokenRegex = /(\*\*\*[^\n*]+?\*\*\*|\*\*[^\n*]+?\*\*|\*[^\s\n*](?:[^\n*]*?[^\s\n*])?\*)/g;
    let lastIdx = 0;
    let match: RegExpExecArray | null;
    while ((match = inlineTokenRegex.exec(segment)) !== null) {
      if (match.index > lastIdx) {
        runs.push({ text: segment.slice(lastIdx, match.index) });
      }
      const token = match[0];
      if (token.startsWith('***') && token.endsWith('***')) {
        runs.push({ text: token.slice(3, -3), bold: true, italic: true });
      } else if (token.startsWith('**') && token.endsWith('**')) {
        runs.push({ text: token.slice(2, -2), bold: true });
      } else if (token.startsWith('*') && token.endsWith('*')) {
        runs.push({ text: token.slice(1, -1), italic: true });
      } else {
        runs.push({ text: token });
      }
      lastIdx = match.index + token.length;
    }
    if (lastIdx < segment.length) {
      runs.push({ text: segment.slice(lastIdx) });
    }
  }

  return runs;
}
