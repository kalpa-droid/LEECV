import { PDFDocument, PageSizes, rgb } from 'pdf-lib';
import { countBlanksBehindCover } from './impositionMath';
import { getCoverPresetById } from '../pdf-engine/layers/presets/coverPresetCatalog';
import { ensurePdfjsWorkerConfigured } from '../pdf-engine/pdfjsWorkerSetup';
import { resolveCanvasColor, COVER_FALLBACK_BG, COVER_FALLBACK_TEXT } from './canvasColors';
import { calculateSpineWidth, calculateCreepOffset, planBookletSignatures, getSignatureSheetPairs } from './impositionPlanner';

const pdfjsLib = typeof window !== 'undefined' ? ensurePdfjsWorkerConfigured() : (null as any);

export interface CoverConfig {
  type: 'upload' | 'template' | 'none';
  /** Ref de asset local ('asset:...') si la imagen se guarda vía bookAssetManager. Tiene prioridad sobre imageUri. */
  assetId?: string;
  imageUri?: string;
  title?: string;
  author?: string;
  publisher?: string;
  /** Preset del catálogo canónico de portadas (mismo que usa el CV) — ver coverPresetCatalog.ts. Si se define, sus colores gobiernan bgColor/textColor salvo que se sobreescriban explícitamente. */
  coverStyle?: string;
  bgColor?: string;
  textColor?: string;
  bgImageUri?: string;
  fontFamily?: string;
  fontSize?: number;
  lineHeightMultiplier?: number;
  imageFit?: 'crop' | 'fit' | 'stretch';
}

export interface BackCoverConfig {
  type: 'upload' | 'template' | 'none';
  /** Ref de asset local ('asset:...') si la imagen se guarda vía bookAssetManager. Tiene prioridad sobre imageUri. */
  assetId?: string;
  imageUri?: string;
  synopsis?: string;
  publisher?: string;
  isbn?: string;
  /** Mismo preset canónico que la tapa — ver coverPresetCatalog.ts. */
  coverStyle?: string;
  bgColor?: string;
  textColor?: string;
  bgImageUri?: string;
  fontFamily?: string;
  fontSize?: number;
  imageFit?: 'crop' | 'fit' | 'stretch';
}

export interface BookImpositionOptions {
  mode?: 'normal' | 'fotocopia';
  paperSize?: 'A4' | 'A3';
  hasCover?: boolean;
  coverSide?: 'derecha' | 'izquierda';
  hasBackCover?: boolean;
  backCoverSide?: 'izquierda' | 'derecha';
  refPdfPage?: number;
  refBookPage?: number;
  refPageSide?: 'derecha' | 'izquierda';
  pageRotations?: Record<number, number>;
  pageSplitOffsets?: Record<number, number>;
  customCover?: CoverConfig | null;
  customBackCover?: BackCoverConfig | null;
  /**
   * Resuelve una referencia de asset local ('asset:...') a una URL/DataURL
   * descargable por Canvas. La inyecta la UI (bookAssetManager); el motor no
   * toca IndexedDB directamente y sigue siendo puro/testeable.
   */
  assetResolver?: (ref: string) => Promise<string | null>;
  /**
   * Modo de exportación: 'vector' (embedPage/copyPages) o 'raster' (JPEG por página)
   */
  exportMode: 'vector' | 'raster';
  /**
   * Destino de la cubierta: 'A' (mismo papel que documento), 'B' (archivo de cubierta separado), 'C' (cubierta envolvente con lomo)
   */
  destination: 'A' | 'B' | 'C';
  /**
   * Grosor de papel para lomo (mm): 0.10 común, 0.12 ahuesado, 0 (sin grosor para guillotina/anillado)
   */
  paperThicknessMm?: number;
  /**
   * Aplicar compensación de creep (Adobe): calcula desplazamiento hacia el lomo para pliegos internos
   */
  applyCreep: boolean;
  /**
   * Estilo de cubierta (opcional): preset para definir colores y diseño específico
   */
  coverStyle?: string;
  /**
   * Mostrar guías vectoriales en la hoja final (línea de doblez, margen de seguridad, marcas de corte).
   */
  showGuides?: boolean;
  /**
   * Generar un PDF por cuadernillo dentro de un ZIP, en vez de un solo PDF.
   * Solo aplica en modo 'normal' y cuando el libro tiene más de un cuadernillo.
   */
  zipByBooklet?: boolean;
  deletedPages?: (number | string)[];
  pageOrder?: (number | string)[];
  blankBehindCover?: boolean;
  blankInFrontBackCover?: boolean;
  onProgress?: (message: string, percent: number) => void;
}

export const DEFAULT_BOOK_IMPOSITION_OPTIONS: BookImpositionOptions = {
  mode: 'normal',
  paperSize: 'A4',
  hasCover: false,
  coverSide: 'derecha',
  hasBackCover: false,
  backCoverSide: 'izquierda',
  refPdfPage: 0,
  refBookPage: 0,
  refPageSide: 'derecha',
  pageRotations: {},
  pageSplitOffsets: {},
  customCover: null,
  customBackCover: null,
  deletedPages: [],
  pageOrder: [],
  blankBehindCover: true,
  blankInFrontBackCover: true,
  exportMode: 'vector',
  destination: 'A',
  paperThicknessMm: 0,
  applyCreep: true,
  coverStyle: 'monica-classic',
  showGuides: false,
  zipByBooklet: false,
};

export function getCoverCanvasSize(paperSize: 'A4' | 'A3' = 'A4'): { width: number; height: number } {
  return paperSize === 'A3' ? { width: 2480, height: 3508 } : { width: 1748, height: 2480 };
}

/**
 * Carga una imagen para tapa/contratapa. Si falla, RECHAZA con un error en
 * español sencillo para que la UI lo muestre — nunca devuelve un canvas negro.
 */
function loadCoverImage(imageUri: string, kind: 'tapa' | 'contratapa'): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(
        new Error(
          kind === 'tapa'
            ? 'No pudimos cargar la imagen de la tapa. Probá guardarla como PNG o JPG y subirla de nuevo.'
            : 'No pudimos cargar la imagen de la contratapa. Probá guardarla como PNG o JPG y subirla de nuevo.'
        )
      );
    img.src = imageUri;
  });
}

/**
 * Toma la referencia de imagen de una config (assetId primero, imageUri después)
 * y la convierte en algo cargable por Image(). Los assets locales se resuelven
 * vía el resolver inyectado por la UI; nunca se duplica el PDF original.
 */
async function resolveCoverImageSrc(
  config: { assetId?: string; imageUri?: string },
  kind: 'tapa' | 'contratapa',
  resolveAsset?: (ref: string) => Promise<string | null>
): Promise<string> {
  const raw = config.assetId || config.imageUri || '';
  if (!raw) {
    throw new Error(
      kind === 'tapa'
        ? 'Falta la imagen de la tapa. Subila de nuevo para continuar.'
        : 'Falta la imagen de la contratapa. Subila de nuevo para continuar.'
    );
  }
  if (raw.startsWith('asset:')) {
    if (!resolveAsset) {
      throw new Error(
        kind === 'tapa'
          ? 'No se pudo acceder a la imagen guardada de la tapa. Volvé a subirla.'
          : 'No se pudo acceder a la imagen guardada de la contratapa. Volvé a subirla.'
      );
    }
    const url = await resolveAsset(raw);
    if (!url) {
      throw new Error(
        kind === 'tapa'
          ? 'No encontramos la imagen guardada de la tapa en este equipo. Volvé a subirla.'
          : 'No encontramos la imagen guardada de la contratapa en este equipo. Volvé a subirla.'
      );
    }
    return url;
  }
  return raw;
}

export async function crearCanvasTapaCustom(
  coverConfig: CoverConfig | null,
  canvasSize = { width: 1748, height: 2480 },
  renderScale = 1,
  resolveAsset?: (ref: string) => Promise<string | null>
): Promise<HTMLCanvasElement | null> {
  if (!coverConfig || coverConfig.type === 'none') return null;
  const width = canvasSize.width;
  const height = canvasSize.height;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  if (coverConfig.type === 'upload' && (coverConfig.imageUri || coverConfig.assetId)) {
    const imageSrc = await resolveCoverImageSrc(coverConfig, 'tapa', resolveAsset);
    const img = await loadCoverImage(imageSrc, 'tapa');

    // Canvas transparente + export JPEG = negro puro. Garantizar fondo blanco.
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    const scaleX = width / (img.width || width);
    const scaleY = height / (img.height || height);

    if (coverConfig.imageFit === 'stretch') {
      ctx.drawImage(img, 0, 0, width, height);
    } else if (coverConfig.imageFit === 'fit') {
      const scale = Math.min(scaleX, scaleY);
      const w = (img.width || width) * scale;
      const h = (img.height || height) * scale;
      ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
    } else {
      const scale = Math.max(scaleX, scaleY);
      const w = (img.width || width) * scale;
      const h = (img.height || height) * scale;
      ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
    }
  } else if (coverConfig.type === 'template') {
    const {
      title = '',
      author = '',
      publisher = '',
      coverStyle,
      bgColor,
      textColor,
      bgImageUri,
      fontFamily = 'Georgia, serif',
      fontSize = 95,
      lineHeightMultiplier = 1.25,
    } = coverConfig;

    // Mismo catálogo que gobierna la portada del CV (coverPresetCatalog.ts) —
    // un preset elegido acá y uno elegido en el editor de CV comparten
    // exactamente la misma identidad de color, no dos paletas parecidas.
    // Los presets guardan var(--token), que Canvas no entiende: resolver siempre.
    const preset = coverStyle ? getCoverPresetById(coverStyle) : null;
    const resolvedBgColor = resolveCanvasColor(bgColor || preset?.badgeBg || '', COVER_FALLBACK_BG);
    const resolvedTextColor = resolveCanvasColor(textColor || preset?.badgeTextColor || '', COVER_FALLBACK_TEXT);

    ctx.fillStyle = resolvedBgColor;
    ctx.fillRect(0, 0, width, height);

    if (bgImageUri) {
      const img = await loadCoverImage(bgImageUri, 'tapa');
      const scale = Math.max(width / (img.width || width), height / (img.height || height));
      const w = (img.width || width) * scale;
      const h = (img.height || height) * scale;
      ctx.globalAlpha = 0.35;
      ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
      ctx.globalAlpha = 1.0;
    }

    ctx.fillStyle = resolvedTextColor;
    ctx.textAlign = 'center';

    // Las miniaturas se renderizan a ~320px de ancho: las fuentes van a escala
    // para que el texto no desborde (renderScale=1 en la exportación real).
    const fontSizeScaled = Math.max(1, Math.round(fontSize * renderScale));

    const sideMargin = Math.round(width * 0.135);
    const maxWidth = width - sideMargin * 2;

    let currentY = Math.round(height * 0.28);

    if (title) {
      ctx.font = `bold ${fontSizeScaled}px ${fontFamily}`;
      const words = title.split(' ');
      let currentLine = '';
      const titleLines: string[] = [];

      for (let i = 0; i < words.length; i++) {
        const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && currentLine) {
          titleLines.push(currentLine);
          currentLine = words[i];
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) titleLines.push(currentLine);

      const lineStep = Math.round(fontSizeScaled * lineHeightMultiplier);
      titleLines.forEach((l) => {
        ctx.fillText(l, width / 2, currentY);
        currentY += lineStep;
      });
    }

    if (author) {
      const authorFontSize = Math.round(fontSizeScaled * 0.55);
      ctx.font = `500 ${authorFontSize}px ${fontFamily}`;
      const authorY = currentY + Math.round(fontSizeScaled * 0.4);
      ctx.fillText(author, width / 2, authorY);
    }

    if (publisher) {
      const publisherFontSize = Math.round(fontSizeScaled * 0.4);
      ctx.font = `400 ${publisherFontSize}px ${fontFamily}`;
      ctx.fillText(publisher.toUpperCase(), width / 2, height * 0.9);
    }
  }

  return canvas;
}

export async function crearCanvasContratapaCustom(
  backCoverConfig: BackCoverConfig | null,
  canvasSize = { width: 1748, height: 2480 },
  renderScale = 1,
  resolveAsset?: (ref: string) => Promise<string | null>
): Promise<HTMLCanvasElement | null> {
  if (!backCoverConfig || backCoverConfig.type === 'none') return null;
  const width = canvasSize.width;
  const height = canvasSize.height;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  if (backCoverConfig.type === 'upload' && (backCoverConfig.imageUri || backCoverConfig.assetId)) {
    const imageSrc = await resolveCoverImageSrc(backCoverConfig, 'contratapa', resolveAsset);
    const img = await loadCoverImage(imageSrc, 'contratapa');

    // Canvas transparente + export JPEG = negro puro. Garantizar fondo blanco.
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    const scaleX = width / (img.width || width);
    const scaleY = height / (img.height || height);

    if (backCoverConfig.imageFit === 'stretch') {
      ctx.drawImage(img, 0, 0, width, height);
    } else if (backCoverConfig.imageFit === 'fit') {
      const scale = Math.min(scaleX, scaleY);
      const w = (img.width || width) * scale;
      const h = (img.height || height) * scale;
      ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
    } else {
      const scale = Math.max(scaleX, scaleY);
      const w = (img.width || width) * scale;
      const h = (img.height || height) * scale;
      ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
    }
  } else if (backCoverConfig.type === 'template') {
    const {
      synopsis = '',
      publisher = '',
      isbn = '',
      coverStyle,
      bgColor,
      textColor,
      bgImageUri,
      fontFamily = 'Georgia, serif',
      fontSize = 50,
    } = backCoverConfig;

    const preset = coverStyle ? getCoverPresetById(coverStyle) : null;
    const resolvedBgColor = resolveCanvasColor(bgColor || preset?.badgeBg || '', COVER_FALLBACK_BG);
    const resolvedTextColor = resolveCanvasColor(textColor || preset?.badgeTextColor || '', COVER_FALLBACK_TEXT);

    ctx.fillStyle = resolvedBgColor;
    ctx.fillRect(0, 0, width, height);

    if (bgImageUri) {
      const img = await loadCoverImage(bgImageUri, 'contratapa');
      const scale = Math.max(width / (img.width || width), height / (img.height || height));
      const w = (img.width || width) * scale;
      const h = (img.height || height) * scale;
      ctx.globalAlpha = 0.35;
      ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
      ctx.globalAlpha = 1.0;
    }

    ctx.fillStyle = resolvedTextColor;
    ctx.textAlign = 'center';

    // Miniaturas a ~320px: fuentes a escala (renderScale=1 en exportación real).
    const fontSizeScaled = Math.max(1, Math.round(fontSize * renderScale));

    const sideMargin = Math.round(width * 0.135);
    const maxWidth = width - sideMargin * 2;

    if (synopsis) {
      ctx.font = `500 ${fontSizeScaled}px ${fontFamily}`;
      const words = synopsis.split(' ');
      let line = '';
      let y = Math.round(height * 0.3);
      const lineStep = Math.round(fontSizeScaled * 1.4);

      for (let n = 0; n < words.length; n++) {
        const testLine = line ? `${line} ${words[n]}` : words[n];
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && line) {
          ctx.fillText(line, width / 2, y);
          line = words[n];
          y += lineStep;
        } else {
          line = testLine;
        }
      }
      if (line) ctx.fillText(line, width / 2, y);
    }

    if (isbn) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(width / 2 - 200 * renderScale, height * 0.8 - 45 * renderScale, 400 * renderScale, 90 * renderScale);
      ctx.fillStyle = '#000000';
      ctx.font = `bold ${Math.round(36 * renderScale)}px monospace`;
      ctx.fillText(`ISBN ${isbn}`, width / 2, height * 0.8 + 10 * renderScale);
    }

    if (publisher) {
      ctx.fillStyle = resolveCanvasColor(textColor || '', COVER_FALLBACK_TEXT);
      ctx.font = `400 ${Math.round(38 * renderScale)}px ${fontFamily}`;
      ctx.fillText(publisher.toUpperCase(), width / 2, height * 0.92);
    }
  }

  return canvas;
}

/**
 * Construye la cubierta envolvente (contratapa | lomo | tapa, continua) como
 * un canvas ancho. Se usa en destino 'C' (va al final del mismo PDF) y en
 * destino 'B' (archivo aparte dentro del ZIP).
 */
async function buildWrapCoverCanvas(
  customCover: CoverConfig | null,
  customBackCover: BackCoverConfig | null,
  coverCanvasSize: { width: number; height: number },
  spineWidthMm: number,
  paperSize: 'A4' | 'A3',
  coverStyle: string | undefined,
  assetResolver?: (ref: string) => Promise<string | null>
): Promise<HTMLCanvasElement> {
  const paperWidthMm = paperSize === 'A3' ? 297 : 210;
  const pxPerMm = coverCanvasSize.width / paperWidthMm;
  const spinePx = Math.max(0, Math.round(spineWidthMm * pxPerMm));

  const wrap = document.createElement('canvas');
  wrap.width = coverCanvasSize.width * 2 + spinePx;
  wrap.height = coverCanvasSize.height;
  const ctx = wrap.getContext('2d');
  if (!ctx) throw new Error('No se pudo preparar la cubierta envolvente.');

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, wrap.width, wrap.height);

  // Contratapa (tercio izquierdo).
  const backCanvas =
    customBackCover && (customBackCover.type === 'upload' || customBackCover.type === 'template')
      ? await crearCanvasContratapaCustom(customBackCover, coverCanvasSize, 1, assetResolver)
      : null;
  if (backCanvas) {
    ctx.drawImage(backCanvas, 0, 0, coverCanvasSize.width, coverCanvasSize.height);
    backCanvas.width = 0;
    backCanvas.height = 0;
  }

  // Lomo (franja central), con el color del preset elegido.
  if (spinePx > 0) {
    const preset = coverStyle ? getCoverPresetById(coverStyle) : null;
    const spineBg = resolveCanvasColor(preset?.badgeBg || '', COVER_FALLBACK_BG);
    const spineFg = resolveCanvasColor(preset?.badgeTextColor || '', COVER_FALLBACK_TEXT);
    ctx.fillStyle = spineBg;
    ctx.fillRect(coverCanvasSize.width, 0, spinePx, wrap.height);
    ctx.fillStyle = spineFg;
    ctx.globalAlpha = 0.4;
    ctx.fillRect(coverCanvasSize.width, 0, 1, wrap.height);
    ctx.fillRect(coverCanvasSize.width + spinePx - 1, 0, 1, wrap.height);
    ctx.globalAlpha = 1;
  }

  // Tapa (tercio derecho).
  const frontCanvas =
    customCover && (customCover.type === 'upload' || customCover.type === 'template')
      ? await crearCanvasTapaCustom(customCover, coverCanvasSize, 1, assetResolver)
      : null;
  if (frontCanvas) {
    ctx.drawImage(frontCanvas, coverCanvasSize.width + spinePx, 0, coverCanvasSize.width, coverCanvasSize.height);
    frontCanvas.width = 0;
    frontCanvas.height = 0;
  }

  return wrap;
}

/**
 * Dibuja una hoja con dos páginas enfrentadas (pares impares del cuadernillo).
 * Si showGuides está activo, agrega la línea de doblez, el margen de seguridad
 (~5 mm) y las marcas de corte.
 */
async function drawBookletSheet(
  bookletDoc: PDFDocument,
  pagesDoc: PDFDocument,
  leftIndex: number,
  rightIndex: number,
  paperSize: 'A4' | 'A3',
  showGuides: boolean
): Promise<void> {
  const [leftPage] = await bookletDoc.copyPages(pagesDoc, [leftIndex]);
  const [rightPage] = await bookletDoc.copyPages(pagesDoc, [rightIndex]);

  const paperPageSize = PageSizes[paperSize] || PageSizes.A4;
  const sheetWidth = paperPageSize[1];
  const sheetHeight = paperPageSize[0];
  const sheet = bookletDoc.addPage([sheetWidth, sheetHeight]);

  const embedL = await bookletDoc.embedPage(leftPage);
  const embedR = await bookletDoc.embedPage(rightPage);

  const halfWidth = sheetWidth / 2;
  const MARGIN_PT = 2.83465; // 1mm en puntos PDF

  const scaleL = Math.min((halfWidth - MARGIN_PT * 2) / embedL.width, (sheetHeight - MARGIN_PT * 2) / embedL.height);
  const scaledWidthL = embedL.width * scaleL;
  const scaledHeightL = embedL.height * scaleL;

  const scaleR = Math.min((halfWidth - MARGIN_PT * 2) / embedR.width, (sheetHeight - MARGIN_PT * 2) / embedR.height);
  const scaledWidthR = embedR.width * scaleR;
  const scaledHeightR = embedR.height * scaleR;

  sheet.drawPage(embedL, {
    x: (halfWidth - scaledWidthL) / 2,
    y: (sheetHeight - scaledHeightL) / 2,
    width: scaledWidthL,
    height: scaledHeightL,
  });

  sheet.drawPage(embedR, {
    x: halfWidth + (halfWidth - scaledWidthR) / 2,
    y: (sheetHeight - scaledHeightR) / 2,
    width: scaledWidthR,
    height: scaledHeightR,
  });

  // Guías de armado (solo si el usuario las activa): línea de doblez al
  // centro, margen de seguridad (~5 mm) y marcas de corte por página.
  if (showGuides) {
    const guideColor = rgb(0.85, 0.1, 0.1);
    const clampX = (x: number) => Math.max(0, Math.min(sheetWidth, x));
    const clampY = (y: number) => Math.max(0, Math.min(sheetHeight, y));

    sheet.drawLine({
      start: { x: clampX(halfWidth), y: 0 },
      end: { x: clampX(halfWidth), y: sheetHeight },
      thickness: 0.5,
      color: guideColor,
      dashArray: [6, 4],
    });

    const safetyPt = 5 * 2.83465; // 5 mm en puntos PDF
    const pageRects = [
      { x: (halfWidth - scaledWidthL) / 2, y: (sheetHeight - scaledHeightL) / 2, w: scaledWidthL, h: scaledHeightL },
      { x: halfWidth + (halfWidth - scaledWidthR) / 2, y: (sheetHeight - scaledHeightR) / 2, w: scaledWidthR, h: scaledHeightR },
    ];

    for (const rect of pageRects) {
      sheet.drawRectangle({
        x: rect.x + safetyPt,
        y: rect.y + safetyPt,
        width: Math.max(0, rect.w - safetyPt * 2),
        height: Math.max(0, rect.h - safetyPt * 2),
        borderColor: guideColor,
        borderWidth: 0.5,
        borderDashArray: [2, 2],
      });

      const tick = 12;
      const corners = [
        { x: rect.x, y: rect.y + rect.h },
        { x: rect.x + rect.w, y: rect.y + rect.h },
        { x: rect.x, y: rect.y },
        { x: rect.x + rect.w, y: rect.y },
      ];
      for (const corner of corners) {
        sheet.drawLine({
          start: { x: clampX(corner.x - tick), y: corner.y },
          end: { x: clampX(corner.x + tick), y: corner.y },
          thickness: 0.5,
          color: guideColor,
        });
        sheet.drawLine({
          start: { x: corner.x, y: clampY(corner.y - tick) },
          end: { x: corner.x, y: clampY(corner.y + tick) },
          thickness: 0.5,
          color: guideColor,
        });
      }
    }
  }
}

async function procesarComoImagenes(
  file: File | ArrayBuffer,
  mode: 'normal' | 'fotocopia' = 'normal',
  options: BookImpositionOptions = DEFAULT_BOOK_IMPOSITION_OPTIONS,
  onProgress?: (message: string, percent: number) => void
): Promise<PDFDocument> {
  const {
    exportMode = 'vector',
    destination = 'A',
    hasCover = false,
    coverSide = 'derecha',
    refPdfPage = 0,
    refBookPage = 0,
    refPageSide = 'derecha',
    pageRotations = {},
    pageSplitOffsets = {},
    customCover = null,
    paperSize = 'A4',
    deletedPages = [],
    pageOrder = [],
    blankBehindCover = true,
  } = options;

  const arrayBuffer = file instanceof File ? await file.arrayBuffer() : file;
  const coverCanvasSize = getCoverCanvasSize(paperSize);

  // Camino vectorial: se copia la página tal cual con copyPages, sin renderizar.
  // Solo aplica a modo normal sin rotaciones ni cortes (los recortes requieren canvas).
  const hasSplitIds =
    mode === 'fotocopia' &&
    pageOrder &&
    pageOrder.length > 0 &&
    String(pageOrder[0]).includes('_');
  const hasUserRotations = pageRotations && Object.keys(pageRotations).length > 0;
  const useVectorPath = exportMode === 'vector' && mode === 'normal' && !hasSplitIds && !hasUserRotations;

  if (useVectorPath) {
    const newPdf = await PDFDocument.create();
    const sourcePdf = await PDFDocument.load(arrayBuffer);

    // Valida que haya páginas reales; si está vacío, falls back a rasterizar.
    const totalSourcePages = sourcePdf.getPageCount();
    if (totalSourcePages === 0) {
      throw new Error('El PDF está vacío o no se pudo leer.');
    }

    let effectiveRefPdfPage = refPdfPage;
    const embedCustomCoverInDoc = destination === 'A';
    if (embedCustomCoverInDoc && !hasCover && customCover && (customCover.type === 'upload' || customCover.type === 'template')) {
      const coverCanvas = await crearCanvasTapaCustom(customCover, coverCanvasSize, 1, options.assetResolver);
      if (coverCanvas) {
        const coverImg = await newPdf.embedJpg(coverCanvas.toDataURL('image/jpeg', 0.92));
        const pageC = newPdf.addPage([coverCanvas.width, coverCanvas.height]);
        pageC.drawImage(coverImg, { x: 0, y: 0, width: coverCanvas.width, height: coverCanvas.height });
        if (effectiveRefPdfPage > 0) effectiveRefPdfPage += 1;

        const blanksNeeded = countBlanksBehindCover(blankBehindCover, effectiveRefPdfPage, refBookPage, refPageSide);
        for (let i = 0; i < blanksNeeded; i++) {
          const blankPage = newPdf.addPage([coverCanvas.width, coverCanvas.height]);
          blankPage.drawRectangle({ x: 0, y: 0, width: 0, height: 0 });
        }
        coverCanvas.width = 0;
        coverCanvas.height = 0;
      }
    }

    const blanksBehindSourceCover = hasCover
      ? countBlanksBehindCover(blankBehindCover, effectiveRefPdfPage, refBookPage, refPageSide)
      : 0;

    const effectivePageOrder =
      pageOrder && pageOrder.length > 0
        ? pageOrder.map((x) => Number(String(x).split('_')[0])).filter((n) => !isNaN(n))
        : Array.from({ length: totalSourcePages }, (_, i) => i + 1);

    for (let idx = 0; idx < effectivePageOrder.length; idx++) {
      const pageNum = effectivePageOrder[idx];
      if (deletedPages && deletedPages.includes(pageNum)) continue;

      if (onProgress) {
        const avance = 10 + Math.floor(((idx + 1) / effectivePageOrder.length) * 45);
        onProgress(`Copiando página ${idx + 1} de ${effectivePageOrder.length}...`, avance);
      }

      const [copiedPage] = await newPdf.copyPages(sourcePdf, [pageNum - 1]);
      newPdf.addPage(copiedPage);

      if (pageNum === 1 && hasCover) {
        const blanks = blanksBehindSourceCover;
        for (let i = 0; i < blanks; i++) {
          const blankPage = newPdf.addPage([copiedPage.getWidth(), copiedPage.getHeight()]);
          blankPage.drawRectangle({ x: 0, y: 0, width: 0, height: 0 });
        }
      }
    }

    return newPdf;
  }
  const newPdf = await PDFDocument.create();

  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/cmaps/',
    cMapPacked: true,
  }).promise;

  const totalSourcePages = pdf.numPages;
  const renderDPI = totalSourcePages > 600 ? 150 : totalSourcePages > 300 ? 200 : 300;
  const renderScale = renderDPI / 72;
  const jpegQuality = totalSourcePages > 300 ? 0.85 : 0.92;

  let isFirstProcessedSheet = true;

  const insertarBlancosDetrasDeTapa = (count: number, width: number, height: number) => {
    for (let i = 0; i < count; i++) {
      const blankPage = newPdf.addPage([width, height]);
      blankPage.drawRectangle({ x: 0, y: 0, width: 0, height: 0 });
    }
  };

  let effectiveRefPdfPage = refPdfPage;
  const embedCustomCoverInDoc = destination === 'A';
  if (embedCustomCoverInDoc && !hasCover && customCover && (customCover.type === 'upload' || customCover.type === 'template')) {
    const coverCanvas = await crearCanvasTapaCustom(customCover, coverCanvasSize, 1, options.assetResolver);
    if (coverCanvas) {
      const coverImg = await newPdf.embedJpg(coverCanvas.toDataURL('image/jpeg', 0.92));
      const pageC = newPdf.addPage([coverCanvas.width, coverCanvas.height]);
      pageC.drawImage(coverImg, { x: 0, y: 0, width: coverCanvas.width, height: coverCanvas.height });

      if (effectiveRefPdfPage > 0) {
        effectiveRefPdfPage += 1;
      }

      const blanksNeeded = countBlanksBehindCover(blankBehindCover, effectiveRefPdfPage, refBookPage, refPageSide);
      insertarBlancosDetrasDeTapa(blanksNeeded, coverCanvas.width, coverCanvas.height);

      coverCanvas.width = 0;
      coverCanvas.height = 0;
    }
  }

  const blanksBehindSourceCover = hasCover
    ? countBlanksBehindCover(blankBehindCover, effectiveRefPdfPage, refBookPage, refPageSide)
    : 0;

  if (hasSplitIds) {
    const cachedSheetCanvases: Record<number, HTMLCanvasElement> = {};

    for (let idx = 0; idx < pageOrder.length; idx++) {
      const itemId = String(pageOrder[idx]);
      const parts = itemId.split('_');
      const sheetNum = parseInt(parts[0], 10);
      const side = parts[1];

      if (deletedPages && (deletedPages.includes(sheetNum) || deletedPages.includes(itemId))) continue;

      if (onProgress) {
        const avance = 10 + Math.floor(((idx + 1) / pageOrder.length) * 45);
        onProgress(`Procesando página individual ${idx + 1} de ${pageOrder.length}...`, avance);
      }

      let finalCanvas = cachedSheetCanvases[sheetNum];
      if (!finalCanvas) {
        const page = await pdf.getPage(sheetNum);
        const userRotation = pageRotations[sheetNum] || 0;
        const viewport = page.getViewport({ scale: renderScale, rotation: userRotation });

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = viewport.width;
        tempCanvas.height = viewport.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.fillStyle = '#ffffff';
          tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
          await page.render({ canvasContext: tempCtx, viewport }).promise;
        }

        finalCanvas = tempCanvas;
        const isVertical = tempCanvas.height > tempCanvas.width;
        if (isVertical) {
          finalCanvas = document.createElement('canvas');
          finalCanvas.width = tempCanvas.height;
          finalCanvas.height = tempCanvas.width;
          const finalCtx = finalCanvas.getContext('2d');
          if (finalCtx) {
            finalCtx.translate(finalCanvas.width / 2, finalCanvas.height / 2);
            finalCtx.rotate(Math.PI / 2);
            finalCtx.drawImage(tempCanvas, -tempCanvas.width / 2, -tempCanvas.height / 2);
          }
          tempCanvas.width = 0;
          tempCanvas.height = 0;
        }
        cachedSheetCanvases[sheetNum] = finalCanvas;
        page.cleanup();
      }

      const splitPct = ((pageSplitOffsets[sheetNum] !== undefined ? pageSplitOffsets[sheetNum] : 50) as number) / 100;
      const fullW = finalCanvas.width;
      const fullH = finalCanvas.height;
      const splitX = Math.round(fullW * splitPct);
      const leftW = splitX;
      const rightW = fullW - splitX;

      if (side === 'L') {
        const leftCanvas = document.createElement('canvas');
        leftCanvas.width = leftW;
        leftCanvas.height = fullH;
        const ctxL = leftCanvas.getContext('2d');
        if (ctxL) ctxL.drawImage(finalCanvas, 0, 0, leftW, fullH, 0, 0, leftW, fullH);
        const leftImg = await newPdf.embedJpg(leftCanvas.toDataURL('image/jpeg', jpegQuality));
        const pageL = newPdf.addPage([leftW, fullH]);
        pageL.drawImage(leftImg, { x: 0, y: 0, width: leftW, height: fullH });
        leftCanvas.width = 0;
        leftCanvas.height = 0;
      } else {
        const rightCanvas = document.createElement('canvas');
        rightCanvas.width = rightW;
        rightCanvas.height = fullH;
        const ctxR = rightCanvas.getContext('2d');
        if (ctxR) ctxR.drawImage(finalCanvas, splitX, 0, rightW, fullH, 0, 0, rightW, fullH);
        const rightImg = await newPdf.embedJpg(rightCanvas.toDataURL('image/jpeg', jpegQuality));
        const pageR = newPdf.addPage([rightW, fullH]);
        pageR.drawImage(rightImg, { x: 0, y: 0, width: rightW, height: fullH });
        rightCanvas.width = 0;
        rightCanvas.height = 0;
      }
    }

    Object.values(cachedSheetCanvases).forEach((c) => {
      if (c) {
        c.width = 0;
        c.height = 0;
      }
    });
    return newPdf;
  }

  const effectivePageOrder =
    pageOrder && pageOrder.length > 0
      ? pageOrder.map((x) => Number(String(x).split('_')[0])).filter((n) => !isNaN(n))
      : Array.from({ length: pdf.numPages }, (_, i) => i + 1);

  for (let idx = 0; idx < effectivePageOrder.length; idx++) {
    const pageNum = effectivePageOrder[idx];

    if (deletedPages && deletedPages.includes(pageNum)) {
      continue;
    }
    if (onProgress) {
      const avance = 10 + Math.floor(((idx + 1) / effectivePageOrder.length) * 45);
      onProgress(`Procesando página ${idx + 1} de ${effectivePageOrder.length}...`, avance);
    }

    const page = await pdf.getPage(pageNum);
    const userRotation = pageRotations[pageNum] || 0;
    const viewport = page.getViewport({ scale: renderScale, rotation: userRotation });

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = viewport.width;
    tempCanvas.height = viewport.height;
    const tempCtx = tempCanvas.getContext('2d');

    if (tempCtx) {
      tempCtx.fillStyle = '#ffffff';
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      await page.render({ canvasContext: tempCtx, viewport }).promise;
    }

    const isFotocopia = mode === 'fotocopia';

    if (isFotocopia) {
      let finalCanvas = tempCanvas;
      const isVertical = tempCanvas.height > tempCanvas.width;

      if (isVertical) {
        finalCanvas = document.createElement('canvas');
        finalCanvas.width = tempCanvas.height;
        finalCanvas.height = tempCanvas.width;
        const finalCtx = finalCanvas.getContext('2d');

        if (finalCtx) {
          finalCtx.translate(finalCanvas.width / 2, finalCanvas.height / 2);
          finalCtx.rotate(Math.PI / 2);
          finalCtx.drawImage(tempCanvas, -tempCanvas.width / 2, -tempCanvas.height / 2);
        }
      }

      const splitPct = ((pageSplitOffsets[pageNum] !== undefined ? pageSplitOffsets[pageNum] : 50) as number) / 100;
      const fullW = finalCanvas.width;
      const fullH = finalCanvas.height;
      const splitX = Math.round(fullW * splitPct);
      const leftW = splitX;
      const rightW = fullW - splitX;

      if (isFirstProcessedSheet && hasCover && coverSide === 'derecha') {
        const rightCanvas = document.createElement('canvas');
        rightCanvas.width = rightW;
        rightCanvas.height = fullH;
        const ctxR = rightCanvas.getContext('2d');
        if (ctxR) ctxR.drawImage(finalCanvas, splitX, 0, rightW, fullH, 0, 0, rightW, fullH);

        const rightImg = await newPdf.embedJpg(rightCanvas.toDataURL('image/jpeg', jpegQuality));
        const pageR = newPdf.addPage([rightW, fullH]);
        pageR.drawImage(rightImg, { x: 0, y: 0, width: rightW, height: fullH });

        rightCanvas.width = 0;
        rightCanvas.height = 0;

        insertarBlancosDetrasDeTapa(blanksBehindSourceCover, rightW, fullH);
      } else {
        const leftCanvas = document.createElement('canvas');
        leftCanvas.width = leftW;
        leftCanvas.height = fullH;
        const ctxL = leftCanvas.getContext('2d');
        if (ctxL) ctxL.drawImage(finalCanvas, 0, 0, leftW, fullH, 0, 0, leftW, fullH);

        const rightCanvas = document.createElement('canvas');
        rightCanvas.width = rightW;
        rightCanvas.height = fullH;
        const ctxR = rightCanvas.getContext('2d');
        if (ctxR) ctxR.drawImage(finalCanvas, splitX, 0, rightW, fullH, 0, 0, rightW, fullH);

        const leftImg = await newPdf.embedJpg(leftCanvas.toDataURL('image/jpeg', jpegQuality));
        const rightImg = await newPdf.embedJpg(rightCanvas.toDataURL('image/jpeg', jpegQuality));

        const pageL = newPdf.addPage([leftW, fullH]);
        pageL.drawImage(leftImg, { x: 0, y: 0, width: leftW, height: fullH });

        const pageR = newPdf.addPage([rightW, fullH]);
        pageR.drawImage(rightImg, { x: 0, y: 0, width: rightW, height: fullH });

        leftCanvas.width = 0;
        leftCanvas.height = 0;
        rightCanvas.width = 0;
        rightCanvas.height = 0;

        if (isFirstProcessedSheet && hasCover) {
          insertarBlancosDetrasDeTapa(blanksBehindSourceCover, rightW, fullH);
        }
      }

      if (finalCanvas !== tempCanvas) {
        finalCanvas.width = 0;
        finalCanvas.height = 0;
      }
      isFirstProcessedSheet = false;
    } else {
      const imgData = tempCanvas.toDataURL('image/jpeg', jpegQuality);
      const jpgImage = await newPdf.embedJpg(imgData);
      const newPage = newPdf.addPage([tempCanvas.width, tempCanvas.height]);
      newPage.drawImage(jpgImage, { x: 0, y: 0, width: tempCanvas.width, height: tempCanvas.height });

      if (pageNum === 1 && hasCover) {
        insertarBlancosDetrasDeTapa(blanksBehindSourceCover, tempCanvas.width, tempCanvas.height);
      }
    }

    tempCanvas.width = 0;
    tempCanvas.height = 0;
    page.cleanup();

    if (pageNum % 2 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 15));
    }
  }

  try {
    pdf.destroy();
  } catch {
    // ignore
  }

  return newPdf;
}

export async function processBookImposition(
  file: File | ArrayBuffer,
  options: BookImpositionOptions = DEFAULT_BOOK_IMPOSITION_OPTIONS,
): Promise<Uint8Array> {
  const {
    mode = 'normal',
    paperSize = 'A4',
    hasBackCover = false,
    customCover = null,
    customBackCover = null,
    blankInFrontBackCover = true,
    exportMode = 'vector',
    destination = 'A',
    paperThicknessMm = 0,
    applyCreep = true,
    coverStyle,
    showGuides = false,
    zipByBooklet = false,
    onProgress,
  } = options;

  // Propagar el estilo de cubierta elegido en la UI a las configs si no lo traen.
  const effectiveOptions: BookImpositionOptions = {
    ...options,
    customCover: options.customCover
      ? { ...options.customCover, coverStyle: options.customCover.coverStyle || coverStyle }
      : options.customCover,
    customBackCover: options.customBackCover
      ? { ...options.customBackCover, coverStyle: options.customBackCover.coverStyle || coverStyle }
      : options.customBackCover,
  };

  if (onProgress) onProgress('Procesando páginas del PDF...', 5);

  const pagesDoc = await procesarComoImagenes(file, mode, effectiveOptions, onProgress);
  const coverCanvasSize = getCoverCanvasSize(paperSize);

  // Información de armado editorial (lomo y creep) para la UI.
  const finalPageCount = pagesDoc.getPageCount();
  const spineWidthMm = calculateSpineWidth(finalPageCount, { paperThicknessMm });
  const sheetsInSignature = Math.max(1, Math.floor(finalPageCount / 4));
  const creepMaxMm = applyCreep
    ? calculateCreepOffset(0, sheetsInSignature, paperThicknessMm)
    : 0;
  if (onProgress) {
    onProgress(
      `Armado: ${destination === 'A' ? 'cubierta en el mismo archivo' : destination === 'B' ? 'cubierta aparte' : 'cubierta envolvente'} • lomo ${spineWidthMm.toFixed(1)} mm • creep ${creepMaxMm.toFixed(1)} mm • modo ${exportMode === 'vector' ? 'máxima calidad' : 'JPEG'}`,
      8
    );
  }

  let backCoverCanvas: HTMLCanvasElement | null = null;

  // Destinos de cubierta:
  //  - 'A' (mismo papel que el documento): la cubierta viaja dentro del flujo de páginas.
  //  - 'B' (archivo de cubierta separado) y 'C' (cubierta envolvente contratapa|lomo|tapa):
  //    la cubierta NO entra en el interior; se arma aparte con buildWrapCoverCanvas.
  // Si no hay cubierta personalizada (las tapas vienen del PDF original),
  // no hay nada que separar: se conserva el comportamiento del destino 'A'.
  const hasAnyCustomCover = Boolean(
    (customCover && (customCover.type === 'upload' || customCover.type === 'template')) ||
    (customBackCover && (customBackCover.type === 'upload' || customBackCover.type === 'template'))
  );
  const separateCover = destination !== 'A' && hasAnyCustomCover;
  if (destination !== 'A' && !hasAnyCustomCover && onProgress) {
    onProgress('Sin cubierta personalizada: la cubierta viaja dentro del archivo, como en destino A.', 9);
  }

  if (!separateCover && !hasBackCover && customBackCover && (customBackCover.type === 'upload' || customBackCover.type === 'template')) {
    backCoverCanvas = await crearCanvasContratapaCustom(customBackCover, coverCanvasSize, 1, options.assetResolver);
  }

  if (separateCover) {
    // El interior no lleva cubiertas: solo rellenar hasta múltiplo de 4.
    const currentCount = pagesDoc.getPageCount();
    const remainder = (4 - (currentCount % 4)) % 4;
    for (let i = 0; i < remainder; i++) {
      const blank = pagesDoc.addPage([coverCanvasSize.width, coverCanvasSize.height]);
      blank.drawRectangle({ x: 0, y: 0, width: 0, height: 0 });
    }
  } else if (hasBackCover && pagesDoc.getPageCount() > 1) {
    const lastIdx = pagesDoc.getPageCount() - 1;
    const tempBCDoc = await PDFDocument.create();
    const [extractedBC] = await tempBCDoc.copyPages(pagesDoc, [lastIdx]);
    tempBCDoc.addPage(extractedBC);
    pagesDoc.removePage(lastIdx);

    if (blankInFrontBackCover) {
      const blankInFront = pagesDoc.addPage([coverCanvasSize.width, coverCanvasSize.height]);
      blankInFront.drawRectangle({ x: 0, y: 0, width: 0, height: 0 });
    }

    const totalWithBC = pagesDoc.getPageCount() + 1;
    const remainder = (4 - (totalWithBC % 4)) % 4;
    for (let i = 0; i < remainder; i++) {
      const blank = pagesDoc.addPage([coverCanvasSize.width, coverCanvasSize.height]);
      blank.drawRectangle({ x: 0, y: 0, width: 0, height: 0 });
    }

    const [bcBack] = await pagesDoc.copyPages(tempBCDoc, [0]);
    pagesDoc.addPage(bcBack);
  } else {
    if (blankInFrontBackCover) {
      const blankInFront = pagesDoc.addPage([coverCanvasSize.width, coverCanvasSize.height]);
      blankInFront.drawRectangle({ x: 0, y: 0, width: 0, height: 0 });
    }

    const currentCount = pagesDoc.getPageCount();
    const targetCount = backCoverCanvas ? currentCount + 1 : currentCount;
    const remainder = (4 - (targetCount % 4)) % 4;

    for (let i = 0; i < remainder; i++) {
      const blank = pagesDoc.addPage([coverCanvasSize.width, coverCanvasSize.height]);
      blank.drawRectangle({ x: 0, y: 0, width: 0, height: 0 });
    }

    if (backCoverCanvas) {
      const backCoverImg = await pagesDoc.embedJpg(backCoverCanvas.toDataURL('image/jpeg', 0.92));
      const pageBC = pagesDoc.addPage([backCoverCanvas.width, backCoverCanvas.height]);
      pageBC.drawImage(backCoverImg, { x: 0, y: 0, width: backCoverCanvas.width, height: backCoverCanvas.height });
      backCoverCanvas.width = 0;
      backCoverCanvas.height = 0;
    }
  }

  // ============================================================
  // Salida: un solo PDF, un PDF por cuadernillo (ZIP) o cubierta aparte.
  // ============================================================
  const totalPages = pagesDoc.getPageCount();

  // Modo ZIP por cuadernillo: solo modo normal con destino A y más de un cuadernillo.
  const signaturePlan =
    destination === 'A' && zipByBooklet && mode === 'normal'
      ? planBookletSignatures(totalPages, 'multi-balanced', 4)
      : null;
  const multiBooklet = Boolean(signaturePlan && signaturePlan.signatures.length > 1);

  const bookletDoc = await PDFDocument.create();
  let output: Uint8Array;
  let outputIsZip = false;

  if (multiBooklet && signaturePlan) {
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    let offset = 0;
    let sigNumber = 0;
    for (const sigLength of signaturePlan.signatures) {
      sigNumber += 1;
      if (onProgress) {
        onProgress(`Armando cuadernillo ${sigNumber} de ${signaturePlan.signatures.length}...`, 60 + Math.round((sigNumber / signaturePlan.signatures.length) * 35));
      }
      const sigDoc = await PDFDocument.create();
      for (const [leftIndex, rightIndex] of getSignatureSheetPairs(sigLength, offset)) {
        await drawBookletSheet(sigDoc, pagesDoc, leftIndex, rightIndex, paperSize, showGuides);
      }
      zip.file(`cuadernillo_${sigNumber}.pdf`, await sigDoc.save());
      offset += sigLength;
    }
    output = await zip.generateAsync({ type: 'uint8array' });
    outputIsZip = true;
  } else {
    const pairs = getSignatureSheetPairs(totalPages, 0);
    for (const [i, [leftIndex, rightIndex]] of pairs.entries()) {
      if (onProgress) {
        const avance = 60 + Math.floor((i / pairs.length) * 35);
        onProgress(`Armando la hoja ${i + 1} de ${pairs.length}...`, avance);
      }
      if (i % 5 === 0) await new Promise((r) => setTimeout(r, 15));

      await drawBookletSheet(bookletDoc, pagesDoc, leftIndex, rightIndex, paperSize, showGuides);
    }
    output = await bookletDoc.save();
  }

  // ============================================================
  // Cubierta envolvente (destinos B y C)
  // ============================================================
  let finalBytes: Uint8Array = output;
  if (separateCover) {
    if (onProgress) onProgress('Armando la cubierta envolvente (contratapa | lomo | tapa)...', 95);
    const wrapCanvas = await buildWrapCoverCanvas(customCover, customBackCover, coverCanvasSize, spineWidthMm, paperSize, coverStyle, options.assetResolver);
    const coverDoc = await PDFDocument.create();
    const coverImg = await coverDoc.embedJpg(wrapCanvas.toDataURL('image/jpeg', 0.92));
    const coverPage = coverDoc.addPage([wrapCanvas.width, wrapCanvas.height]);
    coverPage.drawImage(coverImg, { x: 0, y: 0, width: wrapCanvas.width, height: wrapCanvas.height });
    const coverBytes = await coverDoc.save();
    wrapCanvas.width = 0;
    wrapCanvas.height = 0;

    if (destination === 'C') {
      // La hoja envolvente cierra el mismo PDF (contratapa | lomo | tapa).
      const [wrapPage] = await bookletDoc.copyPages(coverDoc, [0]);
      bookletDoc.addPage(wrapPage);
      finalBytes = await bookletDoc.save();
    } else {
      // Destino 'B': ZIP con el interior y la cubierta como archivo aparte.
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      zip.file('libro_interior.pdf', output);
      zip.file('cubierta_envolvente.pdf', coverBytes);
      finalBytes = await zip.generateAsync({ type: 'uint8array' });
      outputIsZip = true;
    }
  }

  if (onProgress) onProgress('Finalizando documento...', 98);
  if (onProgress) onProgress(outputIsZip ? '¡Completado! (archivo ZIP)' : '¡Completado!', 100);
  return finalBytes;
}
