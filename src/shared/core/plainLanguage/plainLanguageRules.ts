/**
 * REGLAS DE LENGUAJE SENCILLO (Plain Language)
 *
 * LEECV es para gente común: alguien que tiene su impresora de casa, o que quiere
 * llevar el archivo a una imprenta. No sabe (ni tiene por qué saber) qué es un
 * "vectorial", qué mide una hoja A4 ni qué es el sangrado. Todo texto visible de la
 * página habla en términos de lo que la persona HACE:
 *
 *      "imprimilo en tu casa"   ·   "llevalo a una imprenta"
 *
 * Cada regla detecta una jerga y dice cómo decirlo en criollo. Las audita
 * `scripts/check-plain-language.ts` (commit y check-all). Para agregar una palabra
 * nueva a la lista negra, agregá una regla acá: no hace falta tocar nada más.
 *
 * Un caso legítimo (p. ej. un texto solo para administradores) se exime con el
 * comentario `plain-language:allow` en la misma línea o en la anterior.
 */

export interface PlainLanguageRule {
  id: string;
  /** Detecta la jerga en un texto visible. Sin flag `g`. */
  pattern: RegExp;
  /** Cómo decirlo para una persona que no sabe nada de imprenta. */
  say: string;
}

export const PLAIN_LANGUAGE_RULES: readonly PlainLanguageRule[] = [
  {
    id: 'vectorial',
    pattern: /vectorial(es)?/i,
    say: 'Decí lo que la persona gana: "se ve nítido al imprimir", "las letras salen bien definidas". Nunca "vectorial".',
  },
  {
    id: 'imprenta-pro',
    pattern: /(imprenta|impresi[oó]n)\s+(pro\b|profesional)|(calidad|nivel|est[aá]ndar)\s+(de\s+)?imprenta/i,
    say: 'Decí solo lo que hace: "imprimilo en tu casa" o "llevalo a una imprenta". Sin "pro", "profesional" ni "calidad de imprenta".',
  },
  {
    id: 'tamano-de-pagina',
    pattern: /(tama[ñn]os?|formatos?|medidas?)\s+(f[ií]sic[oa]s?\s+)?(de\s+)?(la\s+|una\s+|tu\s+)?(hojas?|papel(es)?|p[aá]ginas?)|hojas?\s+f[ií]sicas?|\bpapel\s*:/i,
    say: 'No hables de tamaños de hoja ni de página. Decí dónde lo imprime: "en tu impresora de casa" o "en una imprenta".',
  },
  {
    id: 'a4-a3-a5',
    pattern: /\bA[3-5]\b/,
    say: 'No nombres tamaños (A3/A4/A5). Decí "en tu impresora de casa" o "en una imprenta".',
  },
  {
    id: 'medidas-en-mm',
    pattern: /\b\d{2,3}\s*[x×]\s*\d{2,3}\s*mm\b/i,
    say: 'No des medidas en milímetros: "tamaño clásico de tarjeta de presentación".',
  },
  {
    id: 'sangrado',
    pattern: /sangr(ado|[ií]a)s?|\bbleed\b/i,
    say: '"Margen extra para que el corte salga parejo".',
  },
  {
    id: 'marcas-de-corte',
    pattern: /marcas?\s+de\s+(corte|registro)|\bcrop\s+marks?\b/i,
    say: '"Líneas guía para cortar".',
  },
  {
    id: 'imposicion',
    pattern: /imposici[oó]n|\bpliegos?\b|medianil(es)?/i,
    say: 'Decí el resultado: "varias tarjetas en una hoja, listas para recortar" o "el libro listo para doblar y armar".',
  },
  {
    id: 'pdf-tecnico',
    pattern: /\bPDF\s+(nativo|vectorial|de\s+alta\s+fidelidad|optimizad[oa])|renderizad[oa]|perfiles?\s+de\s+color/i,
    say: 'Decí "PDF" a secas, o "archivo listo para imprimir". Sin adjetivos técnicos.',
  },
  {
    id: 'resolucion',
    pattern: /\b(dpi|ppp)\b/i,
    say: 'No hables de resolución: "se ve nítido al imprimir".',
  },
];
