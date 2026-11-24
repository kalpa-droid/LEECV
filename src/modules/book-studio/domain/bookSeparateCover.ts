/**
 * Plan y armado de la hoja de tapa y contratapa SEPARADAS (destinos B y C).
 *
 * - En casa (guillotina): una hoja apaisada con la Contratapa a la IZQUIERDA y la
 *   Tapa a la DERECHA (sin lomo), para cortar al medio.
 * - En imprenta (envolvente): Contratapa | Lomo | Tapa, a sangre (sin margen).
 *
 * Módulo puro de dominio: no importa el motor de imposición (evita ciclos) y su
 * lógica de decisión (`resolveSeparateCoverPlan`) la comparten el motor y el
 * conteo de páginas (`bookPageCount.ts`) para no desincronizarse nunca.
 */
import { PDFDocument, PDFEmbeddedPage, rgb } from 'pdf-lib';
import { resolveCanvasColor, COVER_FALLBACK_BG, COVER_FALLBACK_TEXT } from '../../../shared/kits/print-imposition/canvasColors';
import { getCoverPresetById } from '../../../shared/core/pdf-engine/layers/presets/coverPresetCatalog';
import { BookPaperSizeId, BookPrintTarget, inferBookPrintTarget, resolveBookPaperSpec } from './bookPrintProfileEngine';

/** Forma estructural mínima de las opciones que necesita el plan. */
export interface SeparateCoverOptionsLike {
  destination?: 'A' | 'B' | 'C';
  printTarget?: BookPrintTarget;
  paperSize?: BookPaperSizeId;
  unprintableMarginMm?: number;
  hasCover?: boolean;
  hasBackCover?: boolean;
  customCover?: { type?: string } | null;
  customBackCover?: { type?: string } | null;
  extractPdfCoversWhenSeparate?: boolean;
}

export interface SeparateCoverPlan {
  isSeparate: boolean;
  frontSource: 'custom' | 'pdf-first' | 'none';
  backSource: 'custom' | 'pdf-last' | 'none';
  layout: 'home-guillotine' | 'print-shop-wrap';
  spineEnabled: boolean;
}

const isCustom = (c: { type?: string } | null | undefined): boolean =>
  Boolean(c && (c.type === 'upload' || c.type === 'template'));

/**
 * Decide de dónde sale cada cubierta cuando el destino es separado (B o C).
 * `activeLogicalPdfPages` = páginas activas del PDF (sin separadores).
 */
export function resolveSeparateCoverPlan(
  options: SeparateCoverOptionsLike,
  activeLogicalPdfPages: number,
): SeparateCoverPlan {
  const dest = options.destination || 'A';
  const target = inferBookPrintTarget({
    printTarget: options.printTarget,
    paperSize: options.paperSize,
    unprintableMarginMm: options.unprintableMarginMm,
    destination: dest,
  });
  const layout: SeparateCoverPlan['layout'] = target === 'home' ? 'home-guillotine' : 'print-shop-wrap';

  const hasCustomFront = isCustom(options.customCover);
  const hasCustomBack = isCustom(options.customBackCover);
  const canExtractFirst = activeLogicalPdfPages >= 2;
  const extractWhenSeparate = dest !== 'A' && options.extractPdfCoversWhenSeparate === true;

  let frontSource: SeparateCoverPlan['frontSource'] = 'none';
  if (hasCustomFront) frontSource = 'custom';
  else if ((options.hasCover || extractWhenSeparate) && canExtractFirst && dest !== 'A') frontSource = 'pdf-first';

  const canExtractBack = frontSource === 'pdf-first' ? activeLogicalPdfPages >= 3 : canExtractFirst;
  let backSource: SeparateCoverPlan['backSource'] = 'none';
  if (hasCustomBack) backSource = 'custom';
  else if ((options.hasBackCover || extractWhenSeparate) && canExtractBack && dest !== 'A') backSource = 'pdf-last';

  return {
    isSeparate: dest !== 'A' && (frontSource !== 'none' || backSource !== 'none'),
    frontSource,
    backSource,
    layout,
    spineEnabled: layout === 'print-shop-wrap',
  };
}

/** Convierte un color CSS simple (#hex, rgb()) en componentes 0..1 para pdf-lib. */
export function parseCssColorToRgb(css: string, fallback = COVER_FALLBACK_BG): { r: number; g: number; b: number } {
  const tryParse = (value: string): { r: number; g: number; b: number } | null => {
    const v = value.trim();
    const hex = v.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})/);
    if (hex) {
      let h = hex[1];
      if (h.length === 3) h = h.split('').map((c) => c + c).join('');
      return {
        r: parseInt(h.slice(0, 2), 16) / 255,
        g: parseInt(h.slice(2, 4), 16) / 255,
        b: parseInt(h.slice(4, 6), 16) / 255,
      };
    }
    const fn = v.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i);
    if (fn) return { r: Number(fn[1]) / 255, g: Number(fn[2]) / 255, b: Number(fn[3]) / 255 };
    return null;
  };
  return tryParse(css) || tryParse(fallback) || { r: 0.1, g: 0.1, b: 0.18 };
}

/** Una pieza de cubierta: imagen renderizada (canvas) o una página ya armada de un PDF. */
export type CoverPiece =
  | { kind: 'canvas'; canvas: HTMLCanvasElement }
  | { kind: 'pdf'; doc: PDFDocument; pageIndex: number };

export interface BuildSeparateCoverParams {
  plan: SeparateCoverPlan;
  front: CoverPiece | null;
  back: CoverPiece | null;
  paperSize: BookPaperSizeId;
  spineWidthMm: number;
  spineBgCss?: string;
  spineFgCss?: string;
  showGuides: boolean;
  unprintableMarginMm: number;
}

const MM = 2.83465;

async function embedPiece(target: PDFDocument, piece: CoverPiece): Promise<
  { kind: 'image'; img: Awaited<ReturnType<PDFDocument['embedJpg']>>; w: number; h: number } |
  { kind: 'page'; emb: PDFEmbeddedPage; w: number; h: number }
> {
  if (piece.kind === 'canvas') {
    const img = await target.embedJpg(piece.canvas.toDataURL('image/jpeg', 0.92));
    return { kind: 'image', img, w: piece.canvas.width, h: piece.canvas.height };
  }
  const [copied] = await target.copyPages(piece.doc, [piece.pageIndex]);
  const emb = await target.embedPage(copied);
  return { kind: 'page', emb, w: emb.width, h: emb.height };
}

async function drawPieceFit(
  target: PDFDocument,
  page: ReturnType<PDFDocument['addPage']>,
  piece: CoverPiece | null,
  box: { x: number; y: number; w: number; h: number },
): Promise<void> {
  if (!piece) return;
  const e = await embedPiece(target, piece);
  const scale = Math.min(box.w / e.w, box.h / e.h);
  const w = e.w * scale;
  const h = e.h * scale;
  const x = box.x + (box.w - w) / 2;
  const y = box.y + (box.h - h) / 2;
  if (e.kind === 'image') page.drawImage(e.img, { x, y, width: w, height: h });
  else page.drawPage(e.emb, { x, y, width: w, height: h });
}

/**
 * Arma la hoja (1 página) de tapa y contratapa separadas.
 * SIEMPRE: IZQUIERDA = Contratapa, DERECHA = Tapa (y lomo al centro en imprenta).
 */
export async function buildSeparateCoverDoc(params: BuildSeparateCoverParams): Promise<PDFDocument> {
  const { plan, front, back, paperSize, spineWidthMm, showGuides, unprintableMarginMm } = params;
  const spec = resolveBookPaperSpec(paperSize);
  const doc = await PDFDocument.create();

  if (plan.layout === 'home-guillotine') {
    const sheetW = spec.heightPt;
    const sheetH = spec.widthPt;
    const page = doc.addPage([sheetW, sheetH]);
    const half = sheetW / 2;
    const margin = Math.max(1 * MM, unprintableMarginMm * MM);
    const boxH = sheetH - margin * 2;
    await drawPieceFit(doc, page, back, { x: margin, y: margin, w: half - margin * 2, h: boxH });
    await drawPieceFit(doc, page, front, { x: half + margin, y: margin, w: half - margin * 2, h: boxH });

    if (showGuides) {
      const guide = rgb(0.85, 0.1, 0.1);
      page.drawLine({
        start: { x: half, y: 0 },
        end: { x: half, y: sheetH },
        thickness: 0.5,
        color: guide,
        dashArray: [6, 4],
      });
      const tick = 12;
      for (const cx of [margin, half - margin, half + margin, sheetW - margin]) {
        for (const cy of [margin, sheetH - margin]) {
          page.drawLine({ start: { x: Math.max(0, cx - tick), y: cy }, end: { x: Math.min(sheetW, cx + tick), y: cy }, thickness: 0.5, color: guide });
          page.drawLine({ start: { x: cx, y: Math.max(0, cy - tick) }, end: { x: cx, y: Math.min(sheetH, cy + tick) }, thickness: 0.5, color: guide });
        }
      }
    }
    return doc;
  }

  // Imprenta: Contratapa | Lomo | Tapa, a sangre (sin margen).
  const coverW = spec.widthPt;
  const coverH = spec.heightPt;
  const spinePt = Math.max(0, spineWidthMm * MM);
  const page = doc.addPage([coverW * 2 + spinePt, coverH]);

  await drawPieceFit(doc, page, back, { x: 0, y: 0, w: coverW, h: coverH });

  if (spinePt > 0) {
    const bg = parseCssColorToRgb(resolveCanvasColor(params.spineBgCss || '', COVER_FALLBACK_BG));
    const fg = parseCssColorToRgb(resolveCanvasColor(params.spineFgCss || '', COVER_FALLBACK_TEXT), COVER_FALLBACK_TEXT);
    page.drawRectangle({ x: coverW, y: 0, width: spinePt, height: coverH, color: rgb(bg.r, bg.g, bg.b) });
    page.drawRectangle({ x: coverW, y: 0, width: 0.8, height: coverH, color: rgb(fg.r, fg.g, fg.b), opacity: 0.4 });
    page.drawRectangle({ x: coverW + spinePt - 0.8, y: 0, width: 0.8, height: coverH, color: rgb(fg.r, fg.g, fg.b), opacity: 0.4 });
  }

  await drawPieceFit(doc, page, front, { x: coverW + spinePt, y: 0, w: coverW, h: coverH });

  if (showGuides) {
    const guide = rgb(0.85, 0.1, 0.1);
    for (const gx of [coverW, coverW + spinePt]) {
      page.drawLine({ start: { x: gx, y: 0 }, end: { x: gx, y: coverH }, thickness: 0.5, color: guide, dashArray: [6, 4] });
    }
  }
  return doc;
}

/** Color de lomo coherente: el color propio de tapa/contratapa si existe, si no el del preset. */
export function resolveSpineColors(
  customCover: { bgColor?: string; textColor?: string; coverStyle?: string } | null | undefined,
  customBackCover: { bgColor?: string; textColor?: string; coverStyle?: string } | null | undefined,
  fallbackStyle?: string,
): { bg: string; fg: string } {
  const preset = getCoverPresetById(customCover?.coverStyle || customBackCover?.coverStyle || fallbackStyle || 'monica-classic');
  return {
    bg: customCover?.bgColor || customBackCover?.bgColor || preset?.badgeBg || '',
    fg: customCover?.textColor || customBackCover?.textColor || preset?.badgeTextColor || '',
  };
}
