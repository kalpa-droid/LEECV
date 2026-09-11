import { PDFDocument, PageSizes } from 'pdf-lib';
import { countBlanksBehindCover } from './impositionMath';
import { getCoverPresetById } from '../pdf-engine/layers/presets/coverPresetCatalog';
import { ensurePdfjsWorkerConfigured } from '../pdf-engine/pdfjsWorkerSetup';

const pdfjsLib = typeof window !== 'undefined' ? ensurePdfjsWorkerConfigured() : (null as any);

export interface CoverConfig {
  type: 'upload' | 'template' | 'none';
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
  deletedPages?: (number | string)[];
  pageOrder?: (number | string)[];
  blankBehindCover?: boolean;
  blankInFrontBackCover?: boolean;
  onProgress?: (message: string, percent: number) => void;
}

export function getCoverCanvasSize(paperSize: 'A4' | 'A3' = 'A4'): { width: number; height: number } {
  return paperSize === 'A3' ? { width: 2480, height: 3508 } : { width: 1748, height: 2480 };
}

export async function crearCanvasTapaCustom(
  coverConfig: CoverConfig | null,
  canvasSize = { width: 1748, height: 2480 }
): Promise<HTMLCanvasElement | null> {
  if (!coverConfig || coverConfig.type === 'none') return null;
  const width = canvasSize.width;
  const height = canvasSize.height;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  if (coverConfig.type === 'upload' && coverConfig.imageUri) {
    const img = new Image();
    img.src = coverConfig.imageUri;
    await new Promise<void>((res) => {
      img.onload = () => res();
      img.onerror = () => res();
    });

    const scaleX = width / (img.width || width);
    const scaleY = height / (img.height || height);

    if (coverConfig.imageFit === 'stretch') {
      ctx.drawImage(img, 0, 0, width, height);
    } else if (coverConfig.imageFit === 'fit') {
      const scale = Math.min(scaleX, scaleY);
      const w = (img.width || width) * scale;
      const h = (img.height || height) * scale;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
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
    const preset = coverStyle ? getCoverPresetById(coverStyle) : null;
    const resolvedBgColor = bgColor || preset?.badgeBg || '#1a1a2e';
    const resolvedTextColor = textColor || preset?.badgeTextColor || '#bafdc1';

    ctx.fillStyle = resolvedBgColor;
    ctx.fillRect(0, 0, width, height);

    if (bgImageUri) {
      const img = new Image();
      img.src = bgImageUri;
      await new Promise<void>((res) => {
        img.onload = () => res();
        img.onerror = () => res();
      });
      const scale = Math.max(width / (img.width || width), height / (img.height || height));
      const w = (img.width || width) * scale;
      const h = (img.height || height) * scale;
      ctx.globalAlpha = 0.35;
      ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
      ctx.globalAlpha = 1.0;
    }

    ctx.fillStyle = resolvedTextColor;
    ctx.textAlign = 'center';

    const sideMargin = Math.round(width * 0.135);
    const maxWidth = width - sideMargin * 2;

    let currentY = Math.round(height * 0.28);

    if (title) {
      ctx.font = `bold ${fontSize}px ${fontFamily}`;
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

      const lineStep = Math.round(fontSize * lineHeightMultiplier);
      titleLines.forEach((l) => {
        ctx.fillText(l, width / 2, currentY);
        currentY += lineStep;
      });
    }

    if (author) {
      const authorFontSize = Math.round(fontSize * 0.55);
      ctx.font = `500 ${authorFontSize}px ${fontFamily}`;
      const authorY = currentY + Math.round(fontSize * 0.4);
      ctx.fillText(author, width / 2, authorY);
    }

    if (publisher) {
      const publisherFontSize = Math.round(fontSize * 0.4);
      ctx.font = `400 ${publisherFontSize}px ${fontFamily}`;
      ctx.fillText(publisher.toUpperCase(), width / 2, height * 0.9);
    }
  }

  return canvas;
}

export async function crearCanvasContratapaCustom(
  backCoverConfig: BackCoverConfig | null,
  canvasSize = { width: 1748, height: 2480 }
): Promise<HTMLCanvasElement | null> {
  if (!backCoverConfig || backCoverConfig.type === 'none') return null;
  const width = canvasSize.width;
  const height = canvasSize.height;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  if (backCoverConfig.type === 'upload' && backCoverConfig.imageUri) {
    const img = new Image();
    img.src = backCoverConfig.imageUri;
    await new Promise<void>((res) => {
      img.onload = () => res();
      img.onerror = () => res();
    });

    const scaleX = width / (img.width || width);
    const scaleY = height / (img.height || height);

    if (backCoverConfig.imageFit === 'stretch') {
      ctx.drawImage(img, 0, 0, width, height);
    } else if (backCoverConfig.imageFit === 'fit') {
      const scale = Math.min(scaleX, scaleY);
      const w = (img.width || width) * scale;
      const h = (img.height || height) * scale;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
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
    const resolvedBgColor = bgColor || preset?.badgeBg || '#1a1a2e';
    const resolvedTextColor = textColor || preset?.badgeTextColor || '#bafdc1';

    ctx.fillStyle = resolvedBgColor;
    ctx.fillRect(0, 0, width, height);

    if (bgImageUri) {
      const img = new Image();
      img.src = bgImageUri;
      await new Promise<void>((res) => {
        img.onload = () => res();
        img.onerror = () => res();
      });
      const scale = Math.max(width / (img.width || width), height / (img.height || height));
      const w = (img.width || width) * scale;
      const h = (img.height || height) * scale;
      ctx.globalAlpha = 0.35;
      ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
      ctx.globalAlpha = 1.0;
    }

    ctx.fillStyle = resolvedTextColor;
    ctx.textAlign = 'center';

    const sideMargin = Math.round(width * 0.135);
    const maxWidth = width - sideMargin * 2;

    if (synopsis) {
      ctx.font = `500 ${fontSize}px ${fontFamily}`;
      const words = synopsis.split(' ');
      let line = '';
      let y = Math.round(height * 0.3);
      const lineStep = Math.round(fontSize * 1.4);

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
      ctx.fillRect(width / 2 - 200, height * 0.8 - 45, 400, 90);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 36px monospace';
      ctx.fillText(`ISBN ${isbn}`, width / 2, height * 0.8 + 10);
    }

    if (publisher) {
      ctx.fillStyle = textColor || '#bafdc1';
      ctx.font = `400 38px ${fontFamily}`;
      ctx.fillText(publisher.toUpperCase(), width / 2, height * 0.92);
    }
  }

  return canvas;
}

async function procesarComoImagenes(
  file: File | ArrayBuffer,
  mode: 'normal' | 'fotocopia' = 'normal',
  options: BookImpositionOptions = {},
  onProgress?: (message: string, percent: number) => void
): Promise<PDFDocument> {
  const {
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

  const coverCanvasSize = getCoverCanvasSize(paperSize);
  const newPdf = await PDFDocument.create();
  const arrayBuffer = file instanceof File ? await file.arrayBuffer() : file;

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
  if (!hasCover && customCover && (customCover.type === 'upload' || customCover.type === 'template')) {
    const coverCanvas = await crearCanvasTapaCustom(customCover, coverCanvasSize);
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

  const hasSplitIds = mode === 'fotocopia' && pageOrder && pageOrder.length > 0 && String(pageOrder[0]).includes('_');

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
  options: BookImpositionOptions = {}
): Promise<Uint8Array> {
  const {
    mode = 'normal',
    paperSize = 'A4',
    hasBackCover = false,
    customBackCover = null,
    blankInFrontBackCover = true,
    onProgress,
  } = options;

  if (onProgress) onProgress('Procesando páginas del PDF...', 5);

  const pagesDoc = await procesarComoImagenes(file, mode, options, onProgress);
  const coverCanvasSize = getCoverCanvasSize(paperSize);

  let backCoverCanvas: HTMLCanvasElement | null = null;
  if (!hasBackCover && customBackCover && (customBackCover.type === 'upload' || customBackCover.type === 'template')) {
    backCoverCanvas = await crearCanvasContratapaCustom(customBackCover, coverCanvasSize);
  }

  if (hasBackCover && pagesDoc.getPageCount() > 1) {
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

  const bookletDoc = await PDFDocument.create();
  const totalPages = pagesDoc.getPageCount();
  const totalHojasImpresas = totalPages / 2;

  for (let i = 0; i < totalHojasImpresas; i++) {
    if (onProgress) {
      const avance = 60 + Math.floor((i / totalHojasImpresas) * 35);
      onProgress(`Armando pliego de imposición ${i + 1} de ${totalHojasImpresas}...`, avance);
    }
    if (i % 5 === 0) await new Promise((r) => setTimeout(r, 15));

    const isFront = i % 2 === 0;
    const leftIndex = isFront ? totalPages - 1 - i : i;
    const rightIndex = isFront ? i : totalPages - 1 - i;

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
  }

  if (onProgress) onProgress('Finalizando documento...', 98);
  const pdfBytes = await bookletDoc.save();
  if (onProgress) onProgress('¡Completado!', 100);
  return pdfBytes;
}
