/**
 * Núcleo puro — Motor Integral de Paginación, Doble Faz y Saltos de Capítulo (editorialPaginationEngine.ts)
 *
 * Centraliza las reglas físicas de impresión para EditorLee:
 * 1. Simple faz ('simplex', 1 cara): márgenes fijos, sin páginas en blanco artificiales.
 *    Aunque el usuario tuviera marcado 'odd_page', al pasar a simple faz se normaliza a 'next_page'
 *    para nunca generar hojas vacías al imprimir de un solo lado.
 * 2. Doble faz ('duplex', 2 caras): márgenes espejados en páginas pares/impares,
 *    encabezado espejo par/impar y modo opcional 'odd_page' que inserta una hoja blanca
 *    de cortesía limpia únicamente cuando el capítulo siguiente caería en página par.
 * 3. Recuperación de páginas intrínsecas + desplazamiento exacto para que el Índice General
 *    y los números de página del PDF, vista previa y Word (.docx) coincidan sin oscilación.
 * 4. Márgenes automáticos seguros cuando se activan encabezados y pies de página.
 *
 * Módulo 100% PURO (sin React, sin DOM, testeable en Node/Vitest).
 */

import { DEFAULT_EDITORIAL_PRESET, getEditorialPreset } from './editorialPresetCatalog';
import { buildResolvedTocPageLabels } from './editorialTocResolver';
import { resolveEditorialSectionCoverState } from './sanitizeEditorialData';
import type {
  EditorialChapterBreakMode,
  EditorialFooterAlignment,
  EditorialFooterMode,
  EditorialHeaderMode,
  EditorialPrintSides,
  EditorialSection,
} from './editorialTypes';

export interface EffectiveEditorialPagination {
  printSides: EditorialPrintSides;
  rawChapterBreakMode: EditorialChapterBreakMode;
  effectiveChapterBreakMode: EditorialChapterBreakMode;
  breakOnH2: boolean;
  headerMode: Exclude<EditorialHeaderMode, 'auto'>;
  footerMode: Exclude<EditorialFooterMode, 'auto'>;
  footerAlignment: EditorialFooterAlignment;
  headerCustomText: string;
  footerCustomText: string;
  suppressHeaderOnChapterStart: boolean;
  preliminaryRomanNumerals: boolean;
  pageNumbers: boolean;
  safeMarginTopMm: number;
  safeMarginBottomMm: number;
  safeOuterMarginMm: number;
  safeGutterMm: number;
}

export interface CourtesyBlankComputationResult {
  courtesyBlankBeforeMap: Record<string, boolean>;
  rawPageMap: Record<string, number>;
  displayPageMap: Record<string, string>;
  bodyStartPage: number;
}

/**
 * Resuelve toda la política de paginación, saltos, encabezados, pies y márgenes seguros
 * a partir del borrador actual, del preset base y de los overrides manuales.
 */
export function resolveEffectiveEditorialPagination(draft: any): EffectiveEditorialPagination {
  const rawDesign = draft?.design || {};
  const preset = getEditorialPreset(rawDesign.presetId || '') || DEFAULT_EDITORIAL_PRESET;
  const manualOverrides: Record<string, boolean> =
    rawDesign.manualOverrides && typeof rawDesign.manualOverrides === 'object'
      ? rawDesign.manualOverrides
      : {};

  const printSides: EditorialPrintSides =
    rawDesign.printSides === 'duplex' || rawDesign.printSides === 'simplex'
      ? rawDesign.printSides
      : preset.printSides;

  const rawBreakCandidate = rawDesign.chapterBreakMode;
  const rawChapterBreakMode: EditorialChapterBreakMode =
    rawBreakCandidate === 'odd_page' ||
    rawBreakCandidate === 'next_page' ||
    rawBreakCandidate === 'continuous'
      ? rawBreakCandidate
      : preset.chapterBreakMode;

  // Regla de oro física: en impresión de 1 cara (simple faz) nunca se agregan hojas blancas
  // para forzar página impar.
  const effectiveChapterBreakMode: EditorialChapterBreakMode =
    printSides === 'simplex' && rawChapterBreakMode === 'odd_page'
      ? 'next_page'
      : rawChapterBreakMode;

  const presetHeader =
    preset.headerMode && preset.headerMode !== 'auto' ? preset.headerMode : 'book_title';
  const rawHeader = rawDesign.headerMode;
  const headerMode: Exclude<EditorialHeaderMode, 'auto'> =
    !rawHeader || rawHeader === 'auto'
      ? presetHeader
      : rawHeader === 'none' ||
          rawHeader === 'book_title' ||
          rawHeader === 'chapter_title' ||
          rawHeader === 'mirror_book_chapter' ||
          rawHeader === 'custom'
        ? rawHeader
        : presetHeader;

  const presetFooter =
    preset.footerMode && preset.footerMode !== 'auto' ? preset.footerMode : 'folio_only';
  const rawFooter = rawDesign.footerMode;
  const footerMode: Exclude<EditorialFooterMode, 'auto'> =
    !rawFooter || rawFooter === 'auto'
      ? presetFooter
      : rawFooter === 'none' ||
          rawFooter === 'folio_only' ||
          rawFooter === 'page_x_of_y' ||
          rawFooter === 'book_and_folio' ||
          rawFooter === 'custom_and_folio'
        ? rawFooter
        : presetFooter;

  const pageNumbers = rawDesign.pageNumbers !== false;
  const suppressHeaderOnChapterStart =
    typeof rawDesign.suppressHeaderOnChapterStart === 'boolean'
      ? rawDesign.suppressHeaderOnChapterStart
      : preset.suppressHeaderOnChapterStart;

  const preliminaryRomanNumerals =
    typeof rawDesign.preliminaryRomanNumerals === 'boolean'
      ? rawDesign.preliminaryRomanNumerals
      : preset.preliminaryRomanNumerals;

  const baseTop = typeof rawDesign.marginTop === 'number' ? rawDesign.marginTop : preset.margins.top;
  const baseBottom =
    typeof rawDesign.marginBottom === 'number' ? rawDesign.marginBottom : preset.margins.bottom;
  const baseOuter =
    typeof rawDesign.marginRight === 'number' ? rawDesign.marginRight : preset.margins.right;
  const baseGutter =
    typeof rawDesign.gutter === 'number'
      ? rawDesign.gutter
      : typeof rawDesign.marginLeft === 'number'
        ? rawDesign.marginLeft
        : preset.margins.gutter;

  const safeMarginTopMm =
    headerMode !== 'none' && !manualOverrides.marginTop ? Math.max(baseTop, 20) : baseTop;
  const safeMarginBottomMm =
    footerMode !== 'none' && pageNumbers && !manualOverrides.marginBottom
      ? Math.max(baseBottom, 20)
      : baseBottom;
  const safeGutterMm =
    printSides === 'duplex' && !manualOverrides.gutter ? Math.max(baseGutter, 22) : baseGutter;

  return {
    printSides,
    rawChapterBreakMode,
    effectiveChapterBreakMode,
    breakOnH2: Boolean(rawDesign.breakOnH2),
    headerMode,
    footerMode,
    footerAlignment:
      rawDesign.footerAlignment === 'center' ||
      rawDesign.footerAlignment === 'outside' ||
      rawDesign.footerAlignment === 'right'
        ? rawDesign.footerAlignment
        : 'auto',
    headerCustomText: typeof rawDesign.headerCustomText === 'string' ? rawDesign.headerCustomText : '',
    footerCustomText: typeof rawDesign.footerCustomText === 'string' ? rawDesign.footerCustomText : '',
    suppressHeaderOnChapterStart,
    preliminaryRomanNumerals,
    pageNumbers,
    safeMarginTopMm,
    safeMarginBottomMm,
    safeOuterMarginMm: baseOuter,
    safeGutterMm,
  };
}

/**
 * Determina si una sección individual comienza en página nueva respetando primero
 * si tiene carátula separadora (global o puntual), luego cualquier excepción explícita
 * (`startNewPageOverride`) y finalmente la regla global de impresión (`chapterBreakMode`).
 */
export function resolveSectionEffectiveStartNewPage(
  section: Partial<EditorialSection>,
  effectiveChapterBreakMode: EditorialChapterBreakMode,
  design?: Record<string, any> | null,
  cover?: Record<string, any> | null,
): boolean {
  if (resolveEditorialSectionCoverState(section, design, cover).enabled) {
    return true;
  }
  if (typeof section?.startNewPageOverride === 'boolean') {
    return section.startNewPageOverride;
  }
  return effectiveChapterBreakMode !== 'continuous';
}

/**
 * Dado el mapa crudo de páginas escaneado desde pdfjs-dist (`scannedRawAnchorMap`) y el mapa
 * de hojas blancas que estaban renderizadas en esa pasada (`renderedCourtesyMap`), calcula:
 * 1. Las páginas intrínsecas (sin hojas blancas de cortesía).
 * 2. Qué capítulos necesitan una hoja blanca de cortesía previa en `duplex + odd_page`.
 * 3. Los números de página físicos y visibles exactos (romanos/arábigos) para el Índice y Word.
 */
export function computePaginationWithCourtesyBlanks(
  sections: EditorialSection[],
  scannedRawAnchorMap: Record<string, number>,
  renderedCourtesyMap: Record<string, boolean>,
  pagination: EffectiveEditorialPagination,
  design?: Record<string, any> | null,
  cover?: Record<string, any> | null,
): CourtesyBlankComputationResult {
  const visibleSections = (sections || []).filter((s) => s && s.visible !== false);

  // 1. Recuperar posiciones intrínsecas restando hojas de cortesía ya presentes en la pasada escaneada
  const intrinsicMap: Record<string, number> = {};
  let renderedBlanksSoFar = 0;

  for (const sec of visibleSections) {
    if (renderedCourtesyMap && renderedCourtesyMap[sec.id]) {
      renderedBlanksSoFar += 1;
    }
    const rawSecPage = scannedRawAnchorMap?.[sec.id];
    if (typeof rawSecPage === 'number' && rawSecPage >= 1) {
      intrinsicMap[sec.id] = Math.max(1, rawSecPage - renderedBlanksSoFar);
    }
    const subPrefix = `${sec.id}-`;
    for (const [anchorId, rawPage] of Object.entries(scannedRawAnchorMap || {})) {
      if (anchorId.startsWith(subPrefix) && typeof rawPage === 'number' && rawPage >= 1) {
        intrinsicMap[anchorId] = Math.max(1, rawPage - renderedBlanksSoFar);
      }
    }
  }

  // Preservar cualquier marcador auxiliar ajeno a secciones por ID exacto
  for (const [anchorId, rawPage] of Object.entries(scannedRawAnchorMap || {})) {
    if (intrinsicMap[anchorId] === undefined && typeof rawPage === 'number' && rawPage >= 1) {
      intrinsicMap[anchorId] = rawPage;
    }
  }

  // 2. En Simple Faz o en modo No-Impar, jamás se insertan hojas en blanco
  const nextCourtesyMap: Record<string, boolean> = {};
  const shiftedRawMap: Record<string, number> = {};

  if (
    pagination.printSides !== 'duplex' ||
    pagination.effectiveChapterBreakMode !== 'odd_page'
  ) {
    for (const [k, v] of Object.entries(intrinsicMap)) {
      shiftedRawMap[k] = v;
    }
    const resolved = buildResolvedTocPageLabels(
      visibleSections,
      shiftedRawMap,
      pagination.preliminaryRomanNumerals,
    );
    return {
      courtesyBlankBeforeMap: nextCourtesyMap,
      rawPageMap: shiftedRawMap,
      displayPageMap: resolved.map,
      bodyStartPage: resolved.bodyStartPage,
    };
  }

  // 3. Doble faz + Capítulo siempre en impar: insertar hoja blanca solo cuando cae en página par
  let cumulativeNewBlanks = 0;
  for (const sec of visibleSections) {
    const startsNew = resolveSectionEffectiveStartNewPage(
      sec,
      pagination.effectiveChapterBreakMode,
      design,
      cover,
    );
    const intrinsicStart = intrinsicMap[sec.id];

    if (startsNew && typeof intrinsicStart === 'number' && intrinsicStart >= 1) {
      const projected = intrinsicStart + cumulativeNewBlanks;
      if (projected % 2 === 0) {
        nextCourtesyMap[sec.id] = true;
        cumulativeNewBlanks += 1;
      }
      shiftedRawMap[sec.id] = intrinsicStart + cumulativeNewBlanks;
    } else if (typeof intrinsicStart === 'number' && intrinsicStart >= 1) {
      shiftedRawMap[sec.id] = intrinsicStart + cumulativeNewBlanks;
    }

    const subPrefix = `${sec.id}-`;
    for (const [anchorId, intrPage] of Object.entries(intrinsicMap)) {
      if (anchorId.startsWith(subPrefix)) {
        shiftedRawMap[anchorId] = intrPage + cumulativeNewBlanks;
      }
    }
  }

  for (const [anchorId, intrPage] of Object.entries(intrinsicMap)) {
    if (shiftedRawMap[anchorId] === undefined) {
      shiftedRawMap[anchorId] = intrPage;
    }
  }

  const resolved = buildResolvedTocPageLabels(
    visibleSections,
    shiftedRawMap,
    pagination.preliminaryRomanNumerals,
  );

  return {
    courtesyBlankBeforeMap: nextCourtesyMap,
    rawPageMap: shiftedRawMap,
    displayPageMap: resolved.map,
    bodyStartPage: resolved.bodyStartPage,
  };
}

/** Compara dos mapas de páginas blancas de cortesía para cortar loops de render. */
export function areCourtesyMapsEqual(
  a: Record<string, boolean> | undefined,
  b: Record<string, boolean> | undefined,
): boolean {
  const keysA = Object.keys(a || {}).filter((k) => Boolean(a?.[k]));
  const keysB = Object.keys(b || {}).filter((k) => Boolean(b?.[k]));
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k) => Boolean(b?.[k]));
}
