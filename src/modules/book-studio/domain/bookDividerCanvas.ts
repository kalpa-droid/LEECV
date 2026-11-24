/**
 * Motor de Separadores y Carátulas de Capítulos para Libro Folleto
 * (bookDividerCanvas.ts)
 *
 * Consume el catálogo compartido `COVER_PRESETS_CATALOG` (`coverPresetCatalog.ts`)
 * para renderizar portadillas separadoras de capítulos o secciones (1 página sola
 * o con hoja en blanco detrás como preset de doble cara), manteniendo coherencia
 * estética con la Tapa principal y con EditorLee.
 */

import { getCoverPresetById } from '../../../shared/core/pdf-engine/layers/presets/coverPresetCatalog';
import {
  resolveCanvasColor,
  COVER_FALLBACK_BG,
  COVER_FALLBACK_TEXT,
} from '../../../shared/kits/print-imposition/canvasColors';

export interface BookSectionDivider {
  id: string;
  /** Página del PDF (1-indexada) antes de la cual se inserta esta carátula separadora. */
  insertBeforePage: number;
  /** Etiqueta superior opcional (ej. "Capítulo 1", "Parte I", "Unidad 2"). */
  kicker?: string;
  /** Título principal del capítulo o sección. */
  title: string;
  /** Subtítulo o epígrafe opcional. */
  subtitle?: string;
  /** Modo visual: plantilla del catálogo existente o imagen subida. */
  type: 'template' | 'upload';
  /** ID del preset de `COVER_PRESETS_CATALOG` (si se omite, hereda `options.coverStyle`). */
  coverStyle?: string;
  bgColor?: string;
  textColor?: string;
  assetId?: string;
  imageUri?: string;
  imageFit?: 'crop' | 'fit' | 'stretch';
  /**
   * Preset de hoja:
   * - `true`: Separador + hoja en blanco detrás (2 páginas, reverso limpio para doble cara).
   * - `false`: Solo 1 página separadora.
   */
  blankBehind: boolean;
}

export const DIVIDER_TOKEN_PREFIX = 'divider:';

export function makeDividerPageToken(dividerId: string): string {
  return `${DIVIDER_TOKEN_PREFIX}${dividerId}`;
}

export function isDividerPageToken(item: unknown): boolean {
  return typeof item === 'string' && item.startsWith(DIVIDER_TOKEN_PREFIX);
}

export function extractDividerIdFromToken(item: unknown): string | null {
  if (!isDividerPageToken(item)) return null;
  return String(item).slice(DIVIDER_TOKEN_PREFIX.length) || null;
}

/**
 * Construye la secuencia lineal efectiva de ítems del interior (páginas del PDF,
 * hojas en blanco insertadas y separadores de capítulo) respetando `pageOrder`
 * e inyectando los separadores que aún no tengan su token explícito en `pageOrder`.
 */
export function resolveBookOrderedItems(params: {
  pdfPageCount: number;
  pageOrder?: ReadonlyArray<number | string>;
  sectionDividers?: ReadonlyArray<BookSectionDivider>;
}): Array<number | string> {
  const { pdfPageCount, pageOrder, sectionDividers = [] } = params;
  const baseOrder: Array<number | string> =
    pageOrder && pageOrder.length > 0
      ? [...pageOrder]
      : Array.from({ length: Math.max(0, pdfPageCount) }, (_, i) => i + 1);

  if (sectionDividers.length === 0) {
    // Limpiar tokens huérfanos si se borraron todos los separadores
    return baseOrder.filter((it) => !isDividerPageToken(it));
  }

  const validDividerIds = new Set(sectionDividers.map((d) => d.id));
  const cleanedOrder = baseOrder.filter((it) => {
    const divId = extractDividerIdFromToken(it);
    return divId === null || validDividerIds.has(divId);
  });

  const existingTokens = new Set(
    cleanedOrder.filter((it) => isDividerPageToken(it)).map((it) => String(it)),
  );

  // Insertar los separadores que todavía no estén presentes en cleanedOrder
  const sortedMissing = sectionDividers
    .filter((d) => !existingTokens.has(makeDividerPageToken(d.id)))
    .sort((a, b) => a.insertBeforePage - b.insertBeforePage);

  for (const div of sortedMissing) {
    const token = makeDividerPageToken(div.id);
    const targetPage = Math.max(1, Number(div.insertBeforePage) || 1);
    const idx = cleanedOrder.findIndex((it) => {
      if (typeof it === 'number') return it >= targetPage;
      const str = String(it);
      if (str.startsWith('blank') || isDividerPageToken(str)) return false;
      const baseNum = Number(str.split('_')[0]);
      return Number.isFinite(baseNum) && baseNum >= targetPage;
    });
    if (idx === -1) {
      cleanedOrder.push(token);
    } else {
      cleanedOrder.splice(idx, 0, token);
    }
  }

  return cleanedOrder;
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

async function loadDividerImage(
  config: BookSectionDivider,
  resolveAsset?: (ref: string) => Promise<string | null>,
): Promise<HTMLImageElement> {
  let src = config.assetId || config.imageUri || '';
  if (src.startsWith('asset:') && resolveAsset) {
    src = (await resolveAsset(src)) || '';
  }
  if (!src) {
    throw new Error('Falta la imagen del separador de capítulo.');
  }
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No pudimos cargar la imagen del separador.'));
    img.src = src;
  });
}

/**
 * Renderiza un separador de capítulo o sección en un `<canvas>` usando cualquiera
 * de los 6 arquetipos de `COVER_PRESETS_CATALOG` o una imagen subida por el usuario.
 */
export async function crearCanvasSeparadorCapitulo(
  divider: BookSectionDivider,
  defaultCoverStyle = 'monica-classic',
  canvasSize = { width: 1748, height: 2480 },
  renderScale = 1,
  resolveAsset?: (ref: string) => Promise<string | null>,
): Promise<HTMLCanvasElement> {
  const width = canvasSize.width;
  const height = canvasSize.height;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  if (divider.type === 'upload' && (divider.assetId || divider.imageUri)) {
    const img = await loadDividerImage(divider, resolveAsset);
    ctx.fillStyle = 'rgb(255, 255, 255)';
    ctx.fillRect(0, 0, width, height);

    const scaleX = width / (img.width || width);
    const scaleY = height / (img.height || height);
    if (divider.imageFit === 'stretch') {
      ctx.drawImage(img, 0, 0, width, height);
    } else if (divider.imageFit === 'fit') {
      const s = Math.min(scaleX, scaleY);
      const w = (img.width || width) * s;
      const h = (img.height || height) * s;
      ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
    } else {
      const s = Math.max(scaleX, scaleY);
      const w = (img.width || width) * s;
      const h = (img.height || height) * s;
      ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
    }
    return canvas;
  }

  const styleId = divider.coverStyle || defaultCoverStyle || 'monica-classic';
  const preset = getCoverPresetById(styleId);
  const accentColor = resolveCanvasColor(divider.bgColor || preset?.badgeBg || '', COVER_FALLBACK_BG);
  const onAccentColor = resolveCanvasColor(divider.textColor || preset?.badgeTextColor || '', COVER_FALLBACK_TEXT);

  const kickerText = (divider.kicker || '').trim().toUpperCase();
  const titleText = (divider.title || 'Sección').trim();
  const subtitleText = (divider.subtitle || '').trim();

  const kickerSize = Math.max(10, Math.round(38 * renderScale));
  const titleSize = Math.max(14, Math.round(88 * renderScale));
  const subSize = Math.max(11, Math.round(46 * renderScale));
  const fontFamily = 'Georgia, serif';

  // Fondo base limpio tipo portadilla interior (ahorra tinta en casa y luce editorial)
  ctx.fillStyle = 'rgb(255, 255, 255)';
  ctx.fillRect(0, 0, width, height);

  if (styleId === 'magazine-executive' || styleId === 'bold-impact') {
    // Banda superior de color de acento (Masthead / Bold)
    const bandH = Math.round(height * 0.42);
    ctx.fillStyle = accentColor;
    ctx.fillRect(0, 0, width, bandH);

    ctx.fillStyle = onAccentColor;
    ctx.textAlign = 'left';
    const marginX = Math.round(width * 0.12);
    const maxW = width - marginX * 2;
    let y = Math.round(bandH * 0.34);

    if (kickerText) {
      ctx.font = `bold ${kickerSize}px sans-serif`;
      ctx.fillText(kickerText, marginX, y);
      y += Math.round(titleSize * 1.15);
    }
    ctx.font = `bold ${titleSize}px ${fontFamily}`;
    for (const line of wrapCanvasText(ctx, titleText, maxW)) {
      ctx.fillText(line, marginX, y);
      y += Math.round(titleSize * 1.2);
    }

    if (subtitleText) {
      ctx.fillStyle = 'rgb(51, 65, 85)';
      ctx.font = `italic ${subSize}px ${fontFamily}`;
      let subY = bandH + Math.round(height * 0.1);
      for (const line of wrapCanvasText(ctx, subtitleText, maxW)) {
        ctx.fillText(line, marginX, subY);
        subY += Math.round(subSize * 1.35);
      }
    }
    return canvas;
  }

  if (styleId === 'creative-sustentable') {
    // Banda lateral orgánica izquierda
    const spineW = Math.max(8, Math.round(width * 0.045));
    ctx.fillStyle = accentColor;
    ctx.fillRect(0, 0, spineW, height);

    const marginX = Math.round(width * 0.15);
    const maxW = width - marginX - Math.round(width * 0.1);
    ctx.textAlign = 'left';
    let y = Math.round(height * 0.38);

    if (kickerText) {
      ctx.fillStyle = accentColor;
      ctx.font = `bold ${kickerSize}px sans-serif`;
      ctx.fillText(kickerText, marginX, y);
      y += Math.round(titleSize * 1.15);
    }
    ctx.fillStyle = 'rgb(15, 23, 42)';
    ctx.font = `bold ${titleSize}px ${fontFamily}`;
    for (const line of wrapCanvasText(ctx, titleText, maxW)) {
      ctx.fillText(line, marginX, y);
      y += Math.round(titleSize * 1.2);
    }
    if (subtitleText) {
      y += Math.round(subSize * 0.5);
      ctx.fillStyle = 'rgb(71, 85, 105)';
      ctx.font = `italic ${subSize}px ${fontFamily}`;
      for (const line of wrapCanvasText(ctx, subtitleText, maxW)) {
        ctx.fillText(line, marginX, y);
        y += Math.round(subSize * 1.35);
      }
    }
    return canvas;
  }

  if (styleId === 'modern-corporate' || styleId === 'minimal-editorial') {
    const marginX = Math.round(width * 0.13);
    const maxW = width - marginX * 2;
    ctx.textAlign = 'left';

    if (styleId === 'modern-corporate') {
      // Caja Bento modular
      const boxY = Math.round(height * 0.28);
      const boxH = Math.round(height * 0.42);
      ctx.fillStyle = 'rgb(248, 250, 252)';
      ctx.fillRect(marginX, boxY, maxW, boxH);
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = Math.max(2, Math.round(4 * renderScale));
      ctx.strokeRect(marginX, boxY, maxW, boxH);

      const pad = Math.round(width * 0.05);
      ctx.fillStyle = accentColor;
      ctx.fillRect(marginX + pad, boxY + pad, Math.round(width * 0.14), Math.max(4, Math.round(10 * renderScale)));

      let y = boxY + pad + Math.round(titleSize * 1.1);
      if (kickerText) {
        ctx.font = `bold ${kickerSize}px sans-serif`;
        ctx.fillText(kickerText, marginX + pad, y);
        y += Math.round(titleSize * 1.1);
      }
      ctx.fillStyle = 'rgb(15, 23, 42)';
      ctx.font = `bold ${titleSize}px sans-serif`;
      for (const line of wrapCanvasText(ctx, titleText, maxW - pad * 2)) {
        ctx.fillText(line, marginX + pad, y);
        y += Math.round(titleSize * 1.2);
      }
      if (subtitleText) {
        y += Math.round(subSize * 0.4);
        ctx.fillStyle = 'rgb(71, 85, 105)';
        ctx.font = `${subSize}px sans-serif`;
        for (const line of wrapCanvasText(ctx, subtitleText, maxW - pad * 2)) {
          ctx.fillText(line, marginX + pad, y);
          y += Math.round(subSize * 1.35);
        }
      }
      return canvas;
    }

    // Minimalista radical
    let y = Math.round(height * 0.36);
    if (kickerText) {
      ctx.fillStyle = accentColor;
      ctx.font = `bold ${kickerSize}px sans-serif`;
      ctx.fillText(kickerText, marginX, y);
      y += Math.round(titleSize * 1.15);
    }
    ctx.fillStyle = 'rgb(15, 23, 42)';
    ctx.font = `bold ${titleSize}px ${fontFamily}`;
    for (const line of wrapCanvasText(ctx, titleText, maxW)) {
      ctx.fillText(line, marginX, y);
      y += Math.round(titleSize * 1.2);
    }
    ctx.fillStyle = accentColor;
    ctx.fillRect(marginX, y + Math.round(12 * renderScale), Math.round(width * 0.12), Math.max(3, Math.round(6 * renderScale)));
    y += Math.round(subSize * 1.4);

    if (subtitleText) {
      ctx.fillStyle = 'rgb(71, 85, 105)';
      ctx.font = `italic ${subSize}px ${fontFamily}`;
      for (const line of wrapCanvasText(ctx, subtitleText, maxW)) {
        ctx.fillText(line, marginX, y);
        y += Math.round(subSize * 1.35);
      }
    }
    return canvas;
  }

  // Por defecto: Canon Clásico & Proporción Áurea (monica-classic).
  // Con color propio (selector/cuentagotas) la portadilla va a color pleno,
  // igual que la tapa y la contratapa de color propio.
  const hasCustomColor = Boolean(divider.bgColor);
  const inkMain = hasCustomColor ? onAccentColor : 'rgb(15, 23, 42)';
  const inkSoft = hasCustomColor ? onAccentColor : 'rgb(71, 85, 105)';
  const lineColor = hasCustomColor ? onAccentColor : accentColor;
  if (hasCustomColor) {
    ctx.fillStyle = accentColor;
    ctx.fillRect(0, 0, width, height);
  }

  const framePad = Math.round(width * 0.09);
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = Math.max(2, Math.round(5 * renderScale));
  ctx.strokeRect(framePad, framePad, width - framePad * 2, height - framePad * 2);

  ctx.textAlign = 'center';
  const maxW = width - framePad * 3;
  let y = Math.round(height * 0.38);

  if (kickerText) {
    ctx.fillStyle = lineColor;
    ctx.font = `bold ${kickerSize}px sans-serif`;
    ctx.fillText(kickerText, width / 2, y);
    y += Math.round(kickerSize * 1.1);
  }

  const ruleW = Math.round(width * 0.16);
  ctx.fillStyle = lineColor;
  ctx.fillRect((width - ruleW) / 2, y, ruleW, Math.max(2, Math.round(5 * renderScale)));
  y += Math.round(titleSize * 1.2);

  ctx.fillStyle = inkMain;
  ctx.font = `bold ${titleSize}px ${fontFamily}`;
  for (const line of wrapCanvasText(ctx, titleText, maxW)) {
    ctx.fillText(line, width / 2, y);
    y += Math.round(titleSize * 1.22);
  }

  if (subtitleText) {
    y += Math.round(subSize * 0.4);
    ctx.fillStyle = inkSoft;
    ctx.font = `italic ${subSize}px ${fontFamily}`;
    for (const line of wrapCanvasText(ctx, subtitleText, maxW)) {
      ctx.fillText(line, width / 2, y);
      y += Math.round(subSize * 1.35);
    }
  }

  ctx.fillStyle = lineColor;
  ctx.fillRect((width - ruleW) / 2, y + Math.round(16 * renderScale), ruleW, Math.max(2, Math.round(5 * renderScale)));

  return canvas;
}

/**
 * Cuenta el corrimiento neto de páginas ANTES de la página `refPdfPage` del PDF:
 * +2 por separador con hoja detrás, +1 por separador simple, +1 por hoja en
 * blanco manual, -1 por cada página eliminada. Un resultado impar significa que
 * la página de referencia cambió de lado (derecha ↔ izquierda).
 */
export function countInsertedPagesBeforePdfPage(params: {
  pdfPageCount: number;
  pageOrder?: ReadonlyArray<number | string>;
  sectionDividers?: ReadonlyArray<BookSectionDivider>;
  deletedPages?: ReadonlyArray<number | string>;
  refPdfPage: number;
}): number {
  const { pdfPageCount, pageOrder, sectionDividers = [], deletedPages = [], refPdfPage } = params;
  if (!refPdfPage || refPdfPage <= 0) return 0;

  const items = resolveBookOrderedItems({ pdfPageCount, pageOrder, sectionDividers });
  const dividerMap = new Map(sectionDividers.map((d) => [d.id, d]));
  const deleted = new Set(deletedPages.map((p) => Number(p)));

  let delta = 0;
  for (const item of items) {
    const str = String(item);
    if (isDividerPageToken(str)) {
      const div = dividerMap.get(extractDividerIdFromToken(str) || '');
      delta += div ? (div.blankBehind ? 2 : 1) : 0;
      continue;
    }
    if (str.startsWith('blank')) {
      delta += 1;
      continue;
    }
    const base = Number(str.split('_')[0]);
    if (base === refPdfPage) return delta;
    if (deleted.has(base)) delta -= 1;
  }
  return delta;
}