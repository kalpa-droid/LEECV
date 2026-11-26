import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { ensurePdfjsWorkerConfigured } from '../../../shared/core/pdf-engine/pdfjsWorkerSetup';
import { ensureAcademicOrCustomFontRegistered } from '../../../shared/core/pdf-engine/layers/typography/pdfFontRegistry';
import { resolveDefaultUnicodeFontForPreset } from '../../../shared/core/pdf-engine/layers/typography/academicFontCatalog';
import {
  DEFAULT_EDITORIAL_PRESET,
  getEditorialPreset,
} from '../domain/editorialPresetCatalog';
import { EditorialPresetId } from '../domain/editorialTypes';
import { extractTocAnchorMapFromPageTexts } from '../domain/editorialTocResolver';
import {
  computePaginationWithCourtesyBlanks,
  resolveEffectiveEditorialPagination,
} from '../domain/editorialPaginationEngine';
import { resolveEditorialNormMetrics } from '../domain/editorialNormEngine';
import { resolveEditorialSectionCoverState } from '../domain/sanitizeEditorialData';

export const MAX_TOC_PASSES = 2;

/**
 * Precarga fuentes Unicode locales (Tinos / Arimo) y la fuente activa del manuscrito
 * antes de generar el PDF para impedir corrupción WinAnsi (`◆ -> Æ`, desapariciones de `©`, `—`).
 */
export async function ensureEditorialFontsReady(
  data: any,
  presetId?: EditorialPresetId,
): Promise<void> {
  const preset = getEditorialPreset(presetId || data?.design?.presetId) || DEFAULT_EDITORIAL_PRESET;
  const rawFont = data?.design?.typography?.fontFamily || preset.typography.fontFamily;
  const activeUnicode = resolveDefaultUnicodeFontForPreset(rawFont);

  const candidates = Array.from(
    new Set([activeUnicode, 'Times New Roman', 'Arial'].filter(Boolean)),
  );

  await Promise.all(
    candidates.map((family) => ensureAcademicOrCustomFontRegistered(family).catch(() => false)),
  );
}

async function scanPdfPagesText(blob: Blob): Promise<Record<number, string>> {
  const pdfjsLib = ensurePdfjsWorkerConfigured();
  const buffer = await blob.arrayBuffer();
  const pdfDoc = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pageTexts: Record<number, string> = {};

  try {
    for (let p = 1; p <= pdfDoc.numPages; p++) {
      const page = await pdfDoc.getPage(p);
      const tc = await page.getTextContent();
      pageTexts[p] = (tc.items as any[])
        .map((item) => (typeof item?.str === 'string' ? item.str : ''))
        .join(' ');
    }
  } finally {
    void pdfDoc.destroy?.();
  }

  return pageTexts;
}

/**
 * Espeja físicamente los márgenes de encuadernación en páginas pares cuando el documento
 * está configurado en Doble Faz (2 caras) y el lomo difiere del margen exterior.
 */
async function mirrorDuplexEvenPageMargins(
  blob: Blob,
  data: any,
  rawPageMap: Record<string, number>,
): Promise<Blob> {
  const pagination = resolveEffectiveEditorialPagination(data);
  if (pagination.printSides !== 'duplex') return blob;

  const normMetrics = resolveEditorialNormMetrics(data);
  const rawOverrides =
    data?.design?.manualOverrides && typeof data.design.manualOverrides === 'object'
      ? data.design.manualOverrides
      : {};
  const effectiveGutterMm =
    !rawOverrides.gutter && pagination.printSides === 'duplex'
      ? Math.max(normMetrics.marginsMm.gutter, pagination.safeGutterMm)
      : data?.design?.gutter ?? normMetrics.marginsMm.gutter ?? normMetrics.marginsMm.left;
  const MM_TO_PT = 2.83465;
  const marginLeftPt = Math.max(32, effectiveGutterMm * MM_TO_PT);
  const marginRightPt = Math.max(32, normMetrics.marginsMm.right * MM_TO_PT);
  const dx = marginRightPt - marginLeftPt;
  if (Math.abs(dx) <= 0.5) return blob;

  // Evitar desplazar portada o portadillas separadoras a sangre si alguna cayera en página par
  const skipPages = new Set<number>([1]);
  const sections = Array.isArray(data?.sections) ? data.sections.filter((s: any) => s?.visible !== false) : [];
  for (const sec of sections) {
    const coverState = resolveEditorialSectionCoverState(sec, data?.design, data?.cover);
    if (coverState.enabled && typeof rawPageMap[sec.id] === 'number') {
      skipPages.add(rawPageMap[sec.id]);
    }
  }

  try {
    const { PDFDocument } = await import('pdf-lib');
    const bytes = await blob.arrayBuffer();
    const pdfDoc = await PDFDocument.load(bytes);
    const pages = pdfDoc.getPages();
    for (let i = 0; i < pages.length; i++) {
      const pageNum = i + 1;
      if (pageNum % 2 === 0 && !skipPages.has(pageNum)) {
        pages[i].translateContent(dx, 0);
      }
    }
    const outBytes = await pdfDoc.save();
    return new Blob([new Uint8Array(outBytes)], { type: 'application/pdf' });
  } catch (err) {
    console.warn('No se pudo aplicar espejado duplex de márgenes PDF:', err);
    return blob;
  }
}

/**
 * Renderiza el PDF editorial en pasadas exactas (`MAX_TOC_PASSES = 2`),
 * insertando hojas blancas de cortesía en doble faz cuando corresponde que un capítulo
 * abra en página impar y manteniendo 100% sincronizado el Índice.
 */
export async function renderEditorialPdfWithExactToc(
  data: any,
  presetId: EditorialPresetId,
  options: { interactiveAnchors?: boolean; DocumentComponent: React.ComponentType<any> },
): Promise<{
  blob: Blob;
  rawPageMap: Record<string, number>;
  displayPageMap: Record<string, string>;
  bodyStartPage: number;
  courtesyBlankBeforeMap: Record<string, boolean>;
}> {
  await ensureEditorialFontsReady(data, presetId);

  const pagination = resolveEffectiveEditorialPagination(data);
  const sections = Array.isArray(data?.sections) ? data.sections : [];
  const interactive = Boolean(options.interactiveAnchors);
  const DocumentComponent = options.DocumentComponent;

  // Pasada 1: render sin hojas de cortesía con marcadores __TOC_ID:<id>__ visibles
  const pass1Doc = React.createElement(DocumentComponent, {
    data,
    preset: presetId,
    interactiveAnchors: interactive,
    emitTocAnchors: true,
    courtesyBlankBeforeMap: {},
  });
  let currentBlob = await pdf(pass1Doc as any).toBlob();
  const pageTexts = await scanPdfPagesText(currentBlob);
  const rawMap = extractTocAnchorMapFromPageTexts(pageTexts);
  const resolved = computePaginationWithCourtesyBlanks(sections, rawMap, {}, pagination);

  const tocEnabled = Boolean(data?.tocConfig?.enabled && sections.length > 0);
  const hasCourtesyBlanks = Object.keys(resolved.courtesyBlankBeforeMap).length > 0;

  if (!tocEnabled && !hasCourtesyBlanks) {
    const cleanDoc = React.createElement(DocumentComponent, {
      data,
      preset: presetId,
      interactiveAnchors: interactive,
      resolvedTocMap: resolved.displayPageMap,
      bodyStartPage: resolved.bodyStartPage,
      emitTocAnchors: false,
      courtesyBlankBeforeMap: {},
    });
    currentBlob = await pdf(cleanDoc as any).toBlob();
    currentBlob = await mirrorDuplexEvenPageMargins(currentBlob, data, resolved.rawPageMap);
    return {
      blob: currentBlob,
      rawPageMap: resolved.rawPageMap,
      displayPageMap: resolved.displayPageMap,
      bodyStartPage: resolved.bodyStartPage,
      courtesyBlankBeforeMap: {},
    };
  }

  // Pasada 2: inyecta hojas blancas de cortesía y el mapa del índice para confirmar convergencia
  const pass2Doc = React.createElement(DocumentComponent, {
    data,
    preset: presetId,
    interactiveAnchors: interactive,
    resolvedTocMap: resolved.displayPageMap,
    bodyStartPage: resolved.bodyStartPage,
    emitTocAnchors: true,
    courtesyBlankBeforeMap: resolved.courtesyBlankBeforeMap,
  });
  const pass2Blob = await pdf(pass2Doc as any).toBlob();
  const pass2Texts = await scanPdfPagesText(pass2Blob);
  const pass2RawMap = extractTocAnchorMapFromPageTexts(pass2Texts);
  const pass2Resolved = computePaginationWithCourtesyBlanks(
    sections,
    pass2RawMap,
    resolved.courtesyBlankBeforeMap,
    pagination,
  );

  const firstBodyKey = Object.keys(rawMap)[0];
  const shiftedPages =
    firstBodyKey &&
    pass2RawMap[firstBodyKey] !== undefined &&
    pass2RawMap[firstBodyKey] !== resolved.rawPageMap[firstBodyKey];

  const finalResolved = shiftedPages ? pass2Resolved : resolved;

  // Render final limpio SIN marcadores invisibles `__TOC_ID:` en el PDF exportado
  const finalDoc = React.createElement(DocumentComponent, {
    data,
    preset: presetId,
    interactiveAnchors: interactive,
    resolvedTocMap: finalResolved.displayPageMap,
    bodyStartPage: finalResolved.bodyStartPage,
    emitTocAnchors: false,
    courtesyBlankBeforeMap: finalResolved.courtesyBlankBeforeMap,
  });
  currentBlob = await pdf(finalDoc as any).toBlob();
  currentBlob = await mirrorDuplexEvenPageMargins(currentBlob, data, finalResolved.rawPageMap);

  return {
    blob: currentBlob,
    rawPageMap: finalResolved.rawPageMap,
    displayPageMap: finalResolved.displayPageMap,
    bodyStartPage: finalResolved.bodyStartPage,
    courtesyBlankBeforeMap: finalResolved.courtesyBlankBeforeMap,
  };
}
