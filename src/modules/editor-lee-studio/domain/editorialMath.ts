/**
 * Núcleo puro — Métricas editoriales de EditorLee (editorialMath.ts)
 *
 * Cálculo real de caja tipográfica, caracteres por línea, sobrante inferior en mm,
 * espesor de lomo según papel (Bookcel 80/65, Obra 80/90), dimensiones de cubierta
 * abierta con sangrado y auditoría de preflight.
 *
 * Este módulo es PURO (sin React, sin DOM).
 */

/** Resultado de auditoría de preflight. */
export interface EditorialPreflightAudit {
  passed: boolean;
  issues: string[];
  warnings: string[];
}

/** Datos para calcular el espesor de lomo. */
export interface SpineCalculation {
  paperType: 'bookcel-80' | 'bookcel-65' | 'obra-80' | 'obra-90';
  pageCount: number;
  thicknessMm: number;
}

/** Datos de la cubierta abierta. */
export interface CoverDimensions {
  widthMm: number;
  heightMm: number;
  spineMm: number;
  bleedMm: number;
  coverOpenWidthMm: number;
}

/** Datos de la caja tipográfica. */
export interface TypographicBox {
  widthMm: number;
  heightMm: number;
  charsPerLine: number;
  linesPerPage: number;
  bottomSurplusMm: number;
}

// ── Constantes ───────────────────────────────────────────────────────

const BLEED_MM = 3;                   // Sangrado estándar 3 mm
export const INNER_MARGIN_DEFAULT_MM = 20;   // Margen interior mínimo de encuadernación

/** Factores de espesor de papel (mm por hoja). */
const PAPER_THICKNESS_MM_PER_SHEET: Record<string, number> = {
  'bookcel-80': 0.092,
  'bookcel-65': 0.075,
  'obra-80': 0.100,
  'obra-90': 0.113,
};

// ── Espesor de lomo ──────────────────────────────────────────────────

/**
 * Calcula el espesor de lomo en mm según tipo de papel y cantidad de páginas.
 * rounded pageCount hacia arriba al número par (hojas impresas por ambas caras).
 */
export function calculateSpineThickness(pages: number, paperType: string): number {
  const perSheet = PAPER_THICKNESS_MM_PER_SHEET[paperType] || PAPER_THICKNESS_MM_PER_SHEET['bookcel-80'];
  // Las páginas se imprimen por ambas caras → hojas = pages / 2, redondeado al alza
  const sheets = Math.ceil(pages / 2);
  return Math.round((sheets * perSheet + Number.EPSILON) * 100) / 100;
}

/**
 * Dimensiones de la cubierta abierta (pliego completo: contraportada + lomo + tapa).
 */
export function calculateCoverDimensions(
  pageWidthMm: number,
  pageHeightMm: number,
  spineMm: number,
  bleedMm: number = BLEED_MM,
): CoverDimensions {
  const widthMm = pageWidthMm * 2 + spineMm;
  const heightMm = pageHeightMm;
  return {
    widthMm,
    heightMm,
    spineMm,
    bleedMm,
    coverOpenWidthMm: widthMm,
  };
}

// ── Caja tipográfica ─────────────────────────────────────────────────

/**
 * Calcula la caja tipográfica (área de texto usable) de una página.
 * @param pageWidthMm  Ancho de la hoja en mm.
 * @param pageHeightMm Alto de la hoja en mm.
 * @param margins      Márgenes en mm (top, bottom, left, right, gutter opcional).
 * @param fontSize     Tamaño de fuente en pt.
 * @param lineHeight   Interlineado (1.2, 1.5, etc.).
 */
export function calculateTypographicBox(
  pageWidthMm: number,
  pageHeightMm: number,
  margins: { top: number; bottom: number; left: number; right: number; gutter?: number },
  fontSize: number,
  lineHeight: number,
): TypographicBox {
  const innerMargin = margins.gutter ?? 0;
  const widthMm = pageWidthMm - margins.left - margins.right - innerMargin;
  const heightMm = pageHeightMm - margins.top - margins.bottom;

  // 1 pt ≈ 0.3528 mm. Altura de línea en mm ≈ fontSize * lineHeight * 0.3528
  const lineHeightMm = fontSize * lineHeight * 0.3528;
  const linesPerPage = Math.floor(heightMm / lineHeightMm);

  // Caracteres por línea: heurística estándar ~0.5 * ancho_en_pt / fontSize
  const widthPt = widthMm / 0.3528;
  const charsPerLine = Math.max(1, Math.floor(widthPt / (fontSize * 0.5)));

  const bottomSurplusMm = Math.max(0, heightMm - linesPerPage * lineHeightMm);

  return {
    widthMm,
    heightMm,
    charsPerLine,
    linesPerPage,
    bottomSurplusMm: Math.round(bottomSurplusMm * 10) / 10,
  };
}

// ── Normalización tipográfica ────────────────────────────────────────

/**
 * Limpia espacios duplicados, guiones largos, saltos de línea raros
 * y normaliza texto tipográfico antes de renderizar.
 */
export function normalizeTypographyText(text: string): string {
  return text
    .replace(/\s+/g, ' ')            // Espacios múltiples → uno solo
    .replace(/\n+/g, '\n')           // Saltos múltiples → uno
    .replace(/--/g, '–')             // Guión largo
    .replace(/\u00A0/g, ' ')         // Espacio no separable → normal
    .trim();
}

// ── Auditoría preflight ──────────────────────────────────────────────

/**
 * Ejecuta auditoría de preflight sobre el documento editorial.
 * Devuelve issues (bloqueantes) y warnings (recomendaciones).
 */
export function runPreflightAudit({
  pageCount,
  imageMinDpi,
  qrHasQuietZone,
  hasShortLastWords,
  urlQrValid,
}: {
  pageCount: number;
  imageMinDpi?: number;
  qrHasQuietZone?: boolean;
  hasShortLastWords?: boolean;
  urlQrValid?: boolean;
}): EditorialPreflightAudit {
  const issues: string[] = [];
  const warnings: string[] = [];

  if (pageCount === 0) {
    issues.push('El documento no tiene páginas.');
  }

  if (imageMinDpi !== undefined && imageMinDpi < 150) {
    issues.push(`Una imagen está por debajo del umbral de calidad recomendado`);
  }

  if (qrHasQuietZone === false) {
    issues.push('El código QR no tiene zona de silencio (4 módulos).');
  }

  if (!urlQrValid) {
    warnings.push('Verifica que la URL del código QR sea válida.');
  }

  if (hasShortLastWords) {
    warnings.push('Palabras cortas al final de línea pueden afectar la justificación.');
  }

  if (pageCount > 0 && pageCount > 400) {
    warnings.push('Documento muy largo para una sola cubierta; considera dividir en tomos.');
  }

  return {
    passed: issues.length === 0,
    issues,
    warnings,
  };
}

/** Verifica si un valor DPI es aceptable para impresión. */ // plain-language:allow — verificación de DPI mínimo para impresión
export function isDpiAcceptable(dpi: number): boolean {
  return dpi >= 150;
}

/** Verifica si un valor DPI es óptimo para imprenta. */
export function isDpiOptimal(dpi: number): boolean {
  return dpi >= 300;
}