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
import {
  buildResolvedTocPageLabels,
  extractTocAnchorMapFromPageTexts,
} from '../domain/editorialTocResolver';

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

  for (let p = 1; p <= pdfDoc.numPages; p++) {
    const page = await pdfDoc.getPage(p);
    const tc = await page.getTextContent();
    pageTexts[p] = (tc.items as any[])
      .map((item) => (typeof item?.str === 'string' ? item.str : ''))
      .join(' ');
  }

  return pageTexts;
}

/**
 * Renderiza el PDF editorial en 2 pasadas exactas (`MAX_TOC_PASSES = 2`) con un máximo
 * de 1 micro-pasada de convergencia si el Índice cambió su propia cantidad de páginas.
 * Los marcadores `__TOC_ID:<id>__` se omiten en la versión final descargable.
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
}> {
  await ensureEditorialFontsReady(data, presetId);

  const usePrelimRoman = data?.design?.preliminaryRomanNumerals !== false;
  const sections = Array.isArray(data?.sections) ? data.sections : [];
  const interactive = Boolean(options.interactiveAnchors);
  const DocumentComponent = options.DocumentComponent;

  // Pasada 1: render con marcadores __TOC_ID:<id>__ visibles para pdfjs-dist
  const pass1Doc = React.createElement(DocumentComponent, {
    data,
    preset: presetId,
    interactiveAnchors: interactive,
    emitTocAnchors: true,
  });
  let currentBlob = await pdf(pass1Doc as any).toBlob();
  let pageTexts = await scanPdfPagesText(currentBlob);
  let rawMap = extractTocAnchorMapFromPageTexts(pageTexts);
  let resolved = buildResolvedTocPageLabels(sections, rawMap, usePrelimRoman);

  const tocEnabled = Boolean(data?.tocConfig?.enabled && sections.length > 0);
  if (!tocEnabled) {
    // Si no hay TOC, eliminar igual los marcadores internos en el archivo final
    const cleanDoc = React.createElement(DocumentComponent, {
      data,
      preset: presetId,
      interactiveAnchors: interactive,
      resolvedTocMap: resolved.map,
      bodyStartPage: resolved.bodyStartPage,
      emitTocAnchors: false,
    });
    currentBlob = await pdf(cleanDoc as any).toBlob();
    return {
      blob: currentBlob,
      rawPageMap: resolved.rawMap,
      displayPageMap: resolved.map,
      bodyStartPage: resolved.bodyStartPage,
    };
  }

  // Pasada 2: inyecta el mapa exacto de páginas en el TOC; conservamos emitTocAnchors en false
  // salvo que queramos detectar desplazamiento por TOC multi-página en libros extensos.
  const pass2Doc = React.createElement(DocumentComponent, {
    data,
    preset: presetId,
    interactiveAnchors: interactive,
    resolvedTocMap: resolved.map,
    bodyStartPage: resolved.bodyStartPage,
    emitTocAnchors: true,
  });
  const pass2Blob = await pdf(pass2Doc as any).toBlob();
  const pass2Texts = await scanPdfPagesText(pass2Blob);
  const pass2RawMap = extractTocAnchorMapFromPageTexts(pass2Texts);
  const pass2Resolved = buildResolvedTocPageLabels(sections, pass2RawMap, usePrelimRoman);

  const firstBodyKey = Object.keys(rawMap)[0];
  const shiftedPages =
    firstBodyKey &&
    pass2RawMap[firstBodyKey] !== undefined &&
    pass2RawMap[firstBodyKey] !== rawMap[firstBodyKey];

  const finalResolved = shiftedPages ? pass2Resolved : resolved;

  // Render final limpio SIN marcadores invisibles `__TOC_ID:` en el PDF exportado
  const finalDoc = React.createElement(DocumentComponent, {
    data,
    preset: presetId,
    interactiveAnchors: interactive,
    resolvedTocMap: finalResolved.map,
    bodyStartPage: finalResolved.bodyStartPage,
    emitTocAnchors: false,
  });
  currentBlob = await pdf(finalDoc as any).toBlob();

  return {
    blob: currentBlob,
    rawPageMap: finalResolved.rawMap,
    displayPageMap: finalResolved.map,
    bodyStartPage: finalResolved.bodyStartPage,
  };
}
