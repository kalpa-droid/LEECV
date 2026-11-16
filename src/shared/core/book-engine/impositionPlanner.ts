/**
 * Planificación pura de imposición editorial (Fase 3).
 *
 * Cubre los modos definidos en la especificación técnica aprobada:
 *  - Cuadernillo único / múltiples (fijo / equilibrado) — saddle-stitch.
 *  - Cuarto (4 págs. por cara) y Octavo (8 págs. por cara) — doblez en cruz.
 *  - Cut-and-Stack: simplex, duplex (volteo por borde largo) y step-and-repeat.
 *
 * Todo es puro y testeable: no toca DOM, canvas ni PDF.js.
 * Las rotaciones 180° son las que exige el plegado para que las páginas
 * queden al derecho (los negativos de la especificación = 180° aquí).
 */

/** Rellena al múltiplo de `multiple` superior. Capacidad genérica: 4 cuadernillo, 8 cuarto, 16 octavo, G cut-and-stack. */
export function padToMultiple(pageCount: number, multiple: number): number {
  if (pageCount <= 0 || multiple <= 0) return 0;
  return pageCount + ((multiple - (pageCount % multiple)) % multiple);
}

/** Páginas en blanco que se agregan al final para completar la capacidad del pliego. */
export function countBlanksForPadding(totalPages: number, capacity: number): number {
  if (totalPages <= 0 || capacity <= 0) return 0;
  const mod = totalPages % capacity;
  return mod === 0 ? 0 : capacity - mod;
}

/** ¿La página numerada `page` es un relleno en blanco del documento real de `realTotal` páginas? */
export function isBlankPageNumber(page: number, realTotal: number): boolean {
  return page > realTotal;
}

/* ------------------------------------------------------------------ */
/* Cuadernillos (saddle-stitch): plan de firmas                        */
/* ------------------------------------------------------------------ */

export type SignatureStrategy = 'single' | 'multi-fixed' | 'multi-balanced';

export interface SignaturePlan {
  /** Páginas por cuadernillo, siempre múltiplo de 4. */
  signatures: number[];
  /** Total final con relleno (múltiplo de 4). */
  totalPages: number;
  /** Páginas en blanco agregadas al final. */
  blanksAdded: number;
  /** Total de hojas físicas dobladas. */
  totalSheets: number;
}

export function planBookletSignatures(
  totalPages: number,
  strategy: SignatureStrategy,
  sheetsPerSignature = 4
): SignaturePlan {
  if (sheetsPerSignature < 1) {
    throw new Error('Debe haber al menos 1 hoja por cuadernillo.');
  }
  const sigPages = sheetsPerSignature * 4;
  const padded = padToMultiple(totalPages, 4);
  const blanksAdded = padded - totalPages;

  let signatures: number[];
  if (strategy === 'single' || padded <= sigPages) {
    signatures = padded > 0 ? [padded] : [];
  } else if (strategy === 'multi-fixed') {
    const full = Math.floor(padded / sigPages);
    const rest = padded % sigPages;
    signatures = Array(full).fill(sigPages);
    if (rest > 0) signatures.push(rest);
  } else {
    // Equilibrado: mismas páginas para todos, diferencia <= 4, múltiplo de 4.
    const count = Math.ceil(padded / sigPages);
    const base = Math.floor(padded / count / 4) * 4;
    let remainder = padded - base * count;
    signatures = Array(count).fill(base);
    for (let i = 0; i < count && remainder > 0; i++, remainder -= 4) {
      signatures[i] += 4;
    }
  }

  const totalSheets = signatures.reduce((acc, p) => acc + p / 4, 0);
  return { signatures, totalPages: padded, blanksAdded, totalSheets };
}

/**
 * Pares de páginas por hoja dentro de un cuadernillo, en orden de impresión.
 * Devuelve un par [izquierda, derecha] por hoja, con índice global (0-based).
 * @param signatureLength Páginas del cuadernillo (múltiplo de 4).
 * @param offset Índice global donde arranca el cuadernillo.
 */
export function getSignatureSheetPairs(signatureLength: number, offset = 0): Array<[number, number]> {
  if (!Number.isFinite(signatureLength) || signatureLength <= 0 || signatureLength % 4 !== 0) {
    return [];
  }
  const pairs: Array<[number, number]> = [];
  for (let i = 0; i < signatureLength / 2; i++) {
    const isFront = i % 2 === 0;
    const left = isFront ? offset + signatureLength - 1 - i : offset + i;
    const right = isFront ? offset + i : offset + signatureLength - 1 - i;
    pairs.push([left, right]);
  }
  return pairs;
}

/* ------------------------------------------------------------------ */
/* Cuarto y Octavo (doblez en cruz): matrices de imposición            */
/* ------------------------------------------------------------------ */

export interface ImposedCell {
  page: number;
  rotation: 0 | 180;
  slot: string;
}

export interface ImposedSheet {
  /** Frente (Tiro), celdas en orden de grilla (izq->der, arriba->abajo). */
  front: ImposedCell[];
  /** Dorso (Retiro), celdas en orden de grilla. */
  back: ImposedCell[];
}

/**
 * Cuarto: 4 páginas por cara (grilla 2x2), doble doblez en cruz.
 * `sheetNumber` es 1-based; para múltiples pliegos se suma 8*(N-1) a cada página.
 */
export function getQuarterSheet(sheetNumber: number): ImposedSheet {
  const n = Math.max(1, Math.floor(sheetNumber));
  const off = 8 * (n - 1);
  return {
    front: [
      { page: 4 + off, rotation: 180, slot: 'top-left' },
      { page: 5 + off, rotation: 180, slot: 'top-right' },
      { page: 1 + off, rotation: 0, slot: 'bottom-left' },
      { page: 8 + off, rotation: 0, slot: 'bottom-right' },
    ],
    back: [
      { page: 6 + off, rotation: 180, slot: 'top-left' },
      { page: 3 + off, rotation: 180, slot: 'top-right' },
      { page: 7 + off, rotation: 0, slot: 'bottom-left' },
      { page: 2 + off, rotation: 0, slot: 'bottom-right' },
    ],
  };
}

/**
 * Octavo: 8 páginas por cara (grilla 4x2), triple doblez en cruz.
 * `sheetNumber` es 1-based; para múltiples pliegos se suma 16*(N-1) a cada página.
 */
export function getOctavoSheet(sheetNumber: number): ImposedSheet {
  const n = Math.max(1, Math.floor(sheetNumber));
  const off = 16 * (n - 1);
  return {
    front: [
      { page: 5 + off, rotation: 180, slot: 'top-1' },
      { page: 12 + off, rotation: 180, slot: 'top-2' },
      { page: 9 + off, rotation: 180, slot: 'top-3' },
      { page: 8 + off, rotation: 180, slot: 'top-4' },
      { page: 4 + off, rotation: 0, slot: 'bottom-1' },
      { page: 13 + off, rotation: 0, slot: 'bottom-2' },
      { page: 16 + off, rotation: 0, slot: 'bottom-3' },
      { page: 1 + off, rotation: 0, slot: 'bottom-4' },
    ],
    back: [
      { page: 7 + off, rotation: 180, slot: 'top-1' },
      { page: 10 + off, rotation: 180, slot: 'top-2' },
      { page: 11 + off, rotation: 180, slot: 'top-3' },
      { page: 6 + off, rotation: 180, slot: 'top-4' },
      { page: 2 + off, rotation: 0, slot: 'bottom-1' },
      { page: 15 + off, rotation: 0, slot: 'bottom-2' },
      { page: 14 + off, rotation: 0, slot: 'bottom-3' },
      { page: 3 + off, rotation: 0, slot: 'bottom-4' },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Cut-and-Stack (cortar y apilar): sin dobleces                       */
/* ------------------------------------------------------------------ */

export type CutAndStackVariant =
  | 'simplex'
  | 'duplex-long-edge'
  | 'step-and-repeat'
  | 'step-and-repeat-duplex';

export interface CutAndStackSheet {
  /** Páginas por casillero en orden de grilla (izq->der, arriba->abajo). */
  front: number[];
  /** Dorso, en orden de grilla ESPEJADO horizontalmente (p=1 arriba a la derecha). */
  back?: number[];
}

export interface CutAndStackPlan {
  variant: CutAndStackVariant;
  gridSlots: number;
  sheets: CutAndStackSheet[];
  /** Total con relleno (múltiplo de la capacidad de la hoja). */
  paddedTotal: number;
  blanksAdded: number;
}

export function cutAndStackPlan(
  totalPages: number,
  gridSlots: number,
  variant: CutAndStackVariant
): CutAndStackPlan {
  if (!Number.isInteger(gridSlots) || gridSlots < 1) {
    throw new Error('La grilla debe tener al menos 1 casillero.');
  }
  const G = gridSlots;
  const T = Math.max(0, Math.floor(totalPages));

  if (variant === 'step-and-repeat' || variant === 'step-and-repeat-duplex') {
    // Cada hoja repite una sola página en todos sus casilleros (folletos/etiquetas).
    if (T <= 0) {
      return { variant, gridSlots: G, sheets: [], paddedTotal: 0, blanksAdded: 0 };
    }
    const duplex = variant === 'step-and-repeat-duplex';
    const H = duplex ? Math.ceil(T / 2) : T;
    const sheets: CutAndStackSheet[] = [];
    for (let h = 1; h <= H; h++) {
      if (duplex) {
        sheets.push({
          front: Array(G).fill(2 * h - 1),
          back: Array(G).fill(2 * h),
        });
      } else {
        sheets.push({ front: Array(G).fill(h) });
      }
    }
    return { variant, gridSlots: G, sheets, paddedTotal: T, blanksAdded: 0 };
  }

  if (variant === 'simplex') {
    const H = Math.ceil(T / G);
    const padded = H * G;
    const sheets: CutAndStackSheet[] = [];
    for (let h = 1; h <= H; h++) {
      const front: number[] = [];
      for (let p = 1; p <= G; p++) front.push((p - 1) * H + h);
      sheets.push({ front });
    }
    return {
      variant,
      gridSlots: G,
      sheets,
      paddedTotal: padded,
      blanksAdded: padded - T,
    };
  }

  // duplex-long-edge: frente y dorso, dorso espejado horizontalmente.
  const H = Math.ceil(T / (2 * G));
  const padded = 2 * H * G;
  const sheets: CutAndStackSheet[] = [];
  for (let h = 1; h <= H; h++) {
    const front: number[] = [];
    const back: number[] = [];
    for (let p = 1; p <= G; p++) {
      front.push((p - 1) * 2 * H + (2 * h - 1));
      // Casillero p del dorso = posición espejada p' = G + 1 - p del frente.
      const pMirrored = G + 1 - p;
      back.push((pMirrored - 1) * 2 * H + 2 * h);
    }
    sheets.push({ front, back });
  }
  return {
    variant,
    gridSlots: G,
    sheets,
    paddedTotal: padded,
    blanksAdded: padded - T,
  };
}

/* ------------------------------------------------------------------ */
/* Creep y lomo                                                        */
/* ------------------------------------------------------------------ */

/**
 * Compensación de creep (desplazamiento hacia el lomo, en mm) para un pliego
 * dentro de un cuadernillo: cada pliego compensa el espesor del papel por cada
 * pliego más interno que tenga por encima. El pliego más externo no compensa.
 * Sin grosor de papel (guillotina/anillado) → 0.
 */
export function calculateCreepOffset(
  sheetIndex: number,
  sheetsInSignature: number,
  paperThicknessMm: number
): number {
  if (sheetsInSignature <= 1 || paperThicknessMm <= 0) return 0;
  const innerSheets = sheetsInSignature - 1 - Math.max(0, Math.floor(sheetIndex));
  return Math.max(0, innerSheets * paperThicknessMm);
}

export interface SpineInput {
  /** Espesor de UNA hoja en mm (0.10 común / 0.12 ahuesado / manual). */
  paperThicknessMm?: number;
  /** Alternativa: páginas por pulgada (PPI) del papel elegido. */
  pagesPerInch?: number;
}

/** Ancho del lomo en mm. "Sin grosor de papel" (guillotina/anillado) → 0. */
export function calculateSpineWidth(pageCount: number, input: SpineInput = {}): number {
  if (pageCount <= 0) return 0;
  if (input.pagesPerInch && input.pagesPerInch > 0) {
    return (pageCount / input.pagesPerInch) * 25.4;
  }
  const thickness = input.paperThicknessMm ?? 0;
  if (thickness <= 0) return 0;
  return (pageCount / 2) * thickness;
}

/* ------------------------------------------------------------------ */
/* Perfil Casero: área no imprimible (5 mm perimetral estándar)        */
/* ------------------------------------------------------------------ */

export interface MarginCheckInput {
  designBoxMm: { x: number; y: number; width: number; height: number };
  sheetMm: { width: number; height: number };
  /** Margen no imprimible de la impresora de escritorio (por defecto 5 mm). */
  unprintableMarginMm?: number;
}

export interface MarginCheckResult {
  fits: boolean;
  violations: Array<'left' | 'right' | 'top' | 'bottom'>;
  /** Escala máxima (<= 1) para que entre en el área imprimible. */
  fitScale: number;
}

export function checkHomePrinterMargins(input: MarginCheckInput): MarginCheckResult {
  const m = input.unprintableMarginMm ?? 5;
  const { x, y, width, height } = input.designBoxMm;
  const W = input.sheetMm.width;
  const H = input.sheetMm.height;

  const violations: MarginCheckResult['violations'] = [];
  if (x < m) violations.push('left');
  if (y < m) violations.push('top');
  if (x + width > W - m) violations.push('right');
  if (y + height > H - m) violations.push('bottom');

  const scaleW = width > 0 ? (W - 2 * m) / width : 1;
  const scaleH = height > 0 ? (H - 2 * m) / height : 1;
  const fitScale = violations.length > 0 ? Math.max(0, Math.min(1, scaleW, scaleH)) : 1;

  return { fits: violations.length === 0, violations, fitScale };
}
