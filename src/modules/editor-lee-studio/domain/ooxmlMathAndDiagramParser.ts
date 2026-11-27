/**
 * Parser nativo de Ecuaciones OMML (`<m:oMath>`), Diagramas SmartArt (`word/diagrams/*`)
 * y Metafiles embebidos (`.emf` / `.wmf`) para desarme OOXML 100% en navegador.
 * Módulo puro respecto a React (testeable en Node.js y navegador).
 */

import { encodeUint8ArrayToBase64 } from '../../../shared/core/utils/imageCompressor';

function getLocalChildren(el: Element, localName: string): Element[] {
  const out: Element[] = [];
  for (let i = 0; i < el.children.length; i++) {
    if (el.children[i].localName === localName) out.push(el.children[i]);
  }
  return out;
}

function getAllByLocal(el: Document | Element, localName: string): Element[] {
  const all = el.getElementsByTagName('*');
  const out: Element[] = [];
  for (let i = 0; i < all.length; i++) {
    if (all[i].localName === localName) out.push(all[i]);
  }
  return out;
}

function getAttr(el: Element | undefined, names: string[]): string {
  if (!el) return '';
  for (const name of names) {
    const val = el.getAttribute(name);
    if (val !== null) return val;
  }
  return '';
}

function collectOmmlInner(node: Element): string {
  const local = node.localName;

  if (local === 't') {
    return node.textContent || '';
  }

  if (local === 'r') {
    return Array.from(node.children).map(collectOmmlInner).join('');
  }

  // Fracción <m:f><m:num>...</m:num><m:den>...</m:den></m:f>
  if (local === 'f') {
    const numEl = getLocalChildren(node, 'num')[0];
    const denEl = getLocalChildren(node, 'den')[0];
    const num = numEl ? collectOmmlChildren(numEl).trim() : '';
    const den = denEl ? collectOmmlChildren(denEl).trim() : '';
    const wrappedNum = /[\s+\-]/.test(num) && !num.startsWith('(') ? `(${num})` : num;
    const wrappedDen = /[\s+\-]/.test(den) && !den.startsWith('(') ? `(${den})` : den;
    return `${wrappedNum}/${wrappedDen}`;
  }

  // Superíndice <m:sSup><m:e>...</m:e><m:sup>...</m:sup></m:sSup>
  if (local === 'sSup') {
    const base = collectOmmlChildren(getLocalChildren(node, 'e')[0]).trim();
    const sup = collectOmmlChildren(getLocalChildren(node, 'sup')[0]).trim();
    const supExpr = sup.length > 1 ? `(${sup})` : sup;
    return `${base}^${supExpr}`;
  }

  // Subíndice <m:sSub><m:e>...</m:e><m:sub>...</m:sub></m:sSub>
  if (local === 'sSub') {
    const base = collectOmmlChildren(getLocalChildren(node, 'e')[0]).trim();
    const sub = collectOmmlChildren(getLocalChildren(node, 'sub')[0]).trim();
    const subExpr = sub.length > 1 ? `(${sub})` : sub;
    return `${base}_${subExpr}`;
  }

  // Sub-y-superíndice <m:sSubSup>
  if (local === 'sSubSup') {
    const base = collectOmmlChildren(getLocalChildren(node, 'e')[0]).trim();
    const sub = collectOmmlChildren(getLocalChildren(node, 'sub')[0]).trim();
    const sup = collectOmmlChildren(getLocalChildren(node, 'sup')[0]).trim();
    return `${base}_${sub.length > 1 ? `(${sub})` : sub}^${sup.length > 1 ? `(${sup})` : sup}`;
  }

  // Raíz <m:rad><m:deg>...</m:deg><m:e>...</m:e></m:rad>
  if (local === 'rad') {
    const deg = collectOmmlChildren(getLocalChildren(node, 'deg')[0]).trim();
    const body = collectOmmlChildren(getLocalChildren(node, 'e')[0]).trim();
    return deg && deg !== '2' ? `root(${deg}, ${body})` : `√(${body})`;
  }

  // Operador n-ario (sumatoria, integral, productoria) <m:nary>
  if (local === 'nary') {
    const pr = getLocalChildren(node, 'naryPr')[0];
    const chrEl = pr ? getLocalChildren(pr, 'chr')[0] : undefined;
    const op = getAttr(chrEl, ['m:val', 'val']) || '∑';
    const sub = collectOmmlChildren(getLocalChildren(node, 'sub')[0]).trim();
    const sup = collectOmmlChildren(getLocalChildren(node, 'sup')[0]).trim();
    const expr = collectOmmlChildren(getLocalChildren(node, 'e')[0]).trim();
    const limits = [sub ? `_${sub}` : '', sup ? `^${sup}` : ''].join('');
    return `${op}${limits} ${expr}`.trim();
  }

  // Delimitadores () [] {} <m:d>
  if (local === 'd') {
    const pr = getLocalChildren(node, 'dPr')[0];
    const beg = getAttr(pr ? getLocalChildren(pr, 'begChr')[0] : undefined, ['m:val', 'val']) || '(';
    const end = getAttr(pr ? getLocalChildren(pr, 'endChr')[0] : undefined, ['m:val', 'val']) || ')';
    const parts = getLocalChildren(node, 'e').map((e) => collectOmmlChildren(e).trim());
    return `${beg}${parts.join(', ')}${end}`;
  }

  // Matriz <m:m>
  if (local === 'm') {
    const rows = getLocalChildren(node, 'mr').map((mr) =>
      getLocalChildren(mr, 'e')
        .map((cell) => collectOmmlChildren(cell).trim())
        .join('  '),
    );
    return `[ ${rows.join(' ; ')} ]`;
  }

  // Arreglo de ecuaciones <m:eqArr>
  if (local === 'eqArr') {
    return getLocalChildren(node, 'e')
      .map((e) => collectOmmlChildren(e).trim())
      .filter(Boolean)
      .join('\n');
  }

  // Acento / barra superior <m:acc> / <m:bar>
  if (local === 'acc' || local === 'bar') {
    return collectOmmlChildren(getLocalChildren(node, 'e')[0]);
  }

  return collectOmmlChildren(node);
}

function collectOmmlChildren(node: Element | undefined): string {
  if (!node) return '';
  let out = '';
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (child.localName.endsWith('Pr')) continue;
    out += collectOmmlInner(child);
  }
  if (!out && node.children.length === 0) {
    out = node.textContent || '';
  }
  return out;
}

/**
 * Convierte un nodo `<m:oMath>` o `<m:oMathPara>` en texto matemático legible sin perder
 * fracciones, potencias, subíndices, raíces ni matrices.
 */
export function serializeOmmlNodeToText(mathEl: Element): string {
  if (!mathEl) return '';
  if (mathEl.localName === 'oMathPara') {
    const eqs = getLocalChildren(mathEl, 'oMath')
      .map((m) => serializeOmmlNodeToText(m))
      .filter(Boolean);
    return eqs.join('\n');
  }
  return collectOmmlChildren(mathEl).replace(/[ \t]+/g, ' ').trim();
}

export interface SmartArtDiagramResult {
  imageDataUrl: string | null;
  summaryText: string;
  items: string[];
}

interface SmartArtShapeBox {
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

function renderSmartArtBoxesToPngDataUrl(boxes: SmartArtShapeBox[], fallbackItems: string[]): string | null {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const PALETTE = [
    'rgb(15, 118, 110)',
    'rgb(29, 78, 216)',
    'rgb(124, 58, 237)',
    'rgb(180, 83, 9)',
    'rgb(3, 105, 161)',
    'rgb(5, 150, 105)',
  ];

  if (boxes.length >= 2) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const b of boxes) {
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.w);
      maxY = Math.max(maxY, b.y + b.h);
    }
    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);
    const pad = 48;
    const drawW = canvas.width - pad * 2;
    const aspect = Math.min(1.1, Math.max(0.38, spanY / spanX));
    canvas.height = Math.round(drawW * aspect + pad * 2);

    ctx.fillStyle = 'rgb(255, 255, 255)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const scaleX = drawW / spanX;
    const scaleY = (canvas.height - pad * 2) / spanY;

    boxes.forEach((box, idx) => {
      const rx = pad + (box.x - minX) * scaleX;
      const ry = pad + (box.y - minY) * scaleY;
      const rw = Math.max(90, box.w * scaleX);
      const rh = Math.max(44, box.h * scaleY);
      const accent = PALETTE[idx % PALETTE.length];

      ctx.fillStyle = 'rgb(248, 250, 252)';
      ctx.strokeStyle = accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(rx, ry, rw, rh, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'rgb(15, 23, 42)';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const words = box.text.split(/\s+/);
      const lines: string[] = [];
      let line = '';
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > rw - 18 && line) {
          lines.push(line);
          line = word;
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);
      const visibleLines = lines.slice(0, 3);
      const lineH = 22;
      const startY = ry + rh / 2 - ((visibleLines.length - 1) * lineH) / 2;
      visibleLines.forEach((ln, li) => {
        ctx.fillText(ln, rx + rw / 2, startY + li * lineH);
      });
    });

    return canvas.toDataURL('image/png');
  }

  if (fallbackItems.length === 0) return null;
  const cols = Math.min(3, fallbackItems.length);
  const rows = Math.ceil(fallbackItems.length / cols);
  canvas.height = Math.max(240, rows * 110 + 60);
  ctx.fillStyle = 'rgb(255, 255, 255)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const gap = 24;
  const boxW = (canvas.width - 80 - gap * (cols - 1)) / cols;
  const boxH = 82;

  fallbackItems.forEach((item, idx) => {
    const c = idx % cols;
    const r = Math.floor(idx / cols);
    const rx = 40 + c * (boxW + gap);
    const ry = 30 + r * (boxH + 22);
    ctx.fillStyle = 'rgb(248, 250, 252)';
    ctx.strokeStyle = PALETTE[idx % PALETTE.length];
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(rx, ry, boxW, boxH, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgb(15, 23, 42)';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.slice(0, 42), rx + boxW / 2, ry + boxH / 2);
  });

  return canvas.toDataURL('image/png');
}

/**
 * Extrae nodos jerárquicos y cajas visuales de un diagrama SmartArt de Word (`word/diagrams/data*.xml` + `drawing*.xml`).
 */
export async function extractSmartArtDiagram(params: {
  dataXml?: string;
  drawingXml?: string;
}): Promise<SmartArtDiagramResult | null> {
  if (typeof DOMParser === 'undefined') return null;
  const parser = new DOMParser();

  const items: string[] = [];
  if (params.dataXml) {
    const dDoc = parser.parseFromString(params.dataXml, 'application/xml');
    for (const pt of getAllByLocal(dDoc, 'pt')) {
      const ptType = getAttr(pt, ['type']);
      if (ptType === 'doc' || ptType === 'pres' || ptType === 'parTrans' || ptType === 'sibTrans') continue;
      const tNodes = getAllByLocal(pt, 't')
        .map((t) => (t.textContent || '').replace(/\s+/g, ' ').trim())
        .filter(Boolean);
      const joined = tNodes.join(' ').trim();
      if (joined && !items.includes(joined)) {
        items.push(joined);
      }
    }
  }

  const boxes: SmartArtShapeBox[] = [];
  if (params.drawingXml) {
    const drDoc = parser.parseFromString(params.drawingXml, 'application/xml');
    for (const sp of getAllByLocal(drDoc, 'sp')) {
      const xfrm = getAllByLocal(sp, 'xfrm')[0];
      const off = xfrm ? getLocalChildren(xfrm, 'off')[0] : undefined;
      const ext = xfrm ? getLocalChildren(xfrm, 'ext')[0] : undefined;
      const x = Number(getAttr(off, ['x'])) || 0;
      const y = Number(getAttr(off, ['y'])) || 0;
      const w = Number(getAttr(ext, ['cx'])) || 0;
      const h = Number(getAttr(ext, ['cy'])) || 0;
      const text = getAllByLocal(sp, 't')
        .map((t) => (t.textContent || '').trim())
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (text && w > 0 && h > 0) {
        boxes.push({ text, x, y, w, h });
        if (!items.includes(text)) items.push(text);
      }
    }
  }

  if (items.length === 0 && boxes.length === 0) return null;

  const imageDataUrl = renderSmartArtBoxesToPngDataUrl(boxes, items);
  const summaryText = `Diagrama: ${items.slice(0, 8).join(' → ')}`;

  return {
    imageDataUrl,
    summaryText,
    items,
  };
}

/**
 * Busca bitmaps reales (PNG, JPEG o DIB) embebidos dentro de un archivo `.emf` o `.wmf`.
 * Si encuentra un PNG o JPEG intacto lo devuelve directo; si encuentra un BITMAPINFOHEADER DIB,
 * construye una cabecera BMP válida de 14 bytes para que el navegador lo decodifique vía `<canvas>`.
 */
export function extractBitmapFromMetafile(bytes: Uint8Array): { bytes: Uint8Array; mime: string } | null {
  if (!bytes || bytes.length < 24) return null;

  // 1. Buscar PNG embebido (89 50 4E 47 0D 0A 1A 0A ... IEND)
  for (let i = 0; i <= bytes.length - 24; i++) {
    if (
      bytes[i] === 0x89 &&
      bytes[i + 1] === 0x50 &&
      bytes[i + 2] === 0x4e &&
      bytes[i + 3] === 0x47 &&
      bytes[i + 4] === 0x0d &&
      bytes[i + 5] === 0x0a &&
      bytes[i + 6] === 0x1a &&
      bytes[i + 7] === 0x0a
    ) {
      for (let j = i + 8; j <= bytes.length - 8; j++) {
        if (
          bytes[j] === 0x49 &&
          bytes[j + 1] === 0x45 &&
          bytes[j + 2] === 0x4e &&
          bytes[j + 3] === 0x44
        ) {
          const end = Math.min(bytes.length, j + 8);
          return { bytes: bytes.subarray(i, end), mime: 'image/png' };
        }
      }
    }
  }

  // 2. Buscar JPEG embebido (FF D8 FF ... FF D9)
  for (let i = 0; i <= bytes.length - 16; i++) {
    if (bytes[i] === 0xff && bytes[i + 1] === 0xd8 && bytes[i + 2] === 0xff) {
      for (let j = bytes.length - 2; j > i + 12; j--) {
        if (bytes[j] === 0xff && bytes[j + 1] === 0xd9) {
          return { bytes: bytes.subarray(i, j + 2), mime: 'image/jpeg' };
        }
      }
    }
  }

  // 3. Buscar registros EMF EMR_STRETCHDIBITS (0x51 = 81) o EMR_BITBLT (0x4C = 76) con DIB
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length >= 88 && view.getUint32(0, true) === 1 && view.getUint32(40, true) === 0x464d4520) {
    let offset = view.getUint32(4, true);
    while (offset + 8 <= bytes.length) {
      const recType = view.getUint32(offset, true);
      const recSize = view.getUint32(offset + 4, true);
      if (recSize < 8 || offset + recSize > bytes.length) break;

      if ((recType === 81 || recType === 76) && recSize >= 80) {
        const offBmi = recType === 81 ? view.getUint32(offset + 48, true) : view.getUint32(offset + 84, true);
        const cbBmi = recType === 81 ? view.getUint32(offset + 52, true) : view.getUint32(offset + 88, true);
        const offBits = recType === 81 ? view.getUint32(offset + 56, true) : view.getUint32(offset + 92, true);
        const cbBits = recType === 81 ? view.getUint32(offset + 60, true) : view.getUint32(offset + 96, true);
        if (
          cbBmi >= 40 &&
          cbBits > 0 &&
          offBmi + cbBmi <= recSize &&
          offBits + cbBits <= recSize
        ) {
          const totalSize = 14 + cbBmi + cbBits;
          const bmp = new Uint8Array(totalSize);
          const bmpView = new DataView(bmp.buffer);
          bmp[0] = 0x42; // 'B'
          bmp[1] = 0x4d; // 'M'
          bmpView.setUint32(2, totalSize, true);
          bmpView.setUint32(10, 14 + cbBmi, true);
          bmp.set(bytes.subarray(offset + offBmi, offset + offBmi + cbBmi), 14);
          bmp.set(bytes.subarray(offset + offBits, offset + offBits + cbBits), 14 + cbBmi);
          return { bytes: bmp, mime: 'image/bmp' };
        }
      }

      if (recType === 14) break; // EMR_EOF
      offset += recSize;
    }
  }

  return null;
}

export function rasterizeSvgOrBmpDataUrl(rawBytes: Uint8Array, mime: string): Promise<string | null> {
  const isJsdom = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent || '');
  if (typeof document === 'undefined' || typeof Image === 'undefined' || isJsdom) {
    return Promise.resolve(null);
  }
  const dataUrl = `data:${mime};base64,${encodeUint8ArrayToBase64(rawBytes)}`;
  return new Promise((resolve) => {
    let settled = false;
    const finish = (val: string | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(val);
    };
    const timer = setTimeout(() => finish(null), 2500);
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || 800;
      const h = img.naturalHeight || 500;
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(1600, Math.max(64, w));
      canvas.height = Math.round((canvas.width * h) / Math.max(1, w));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        finish(null);
        return;
      }
      ctx.fillStyle = 'rgb(255, 255, 255)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      try {
        const out = canvas.toDataURL('image/png');
        canvas.width = 0;
        canvas.height = 0;
        finish(out);
      } catch {
        canvas.width = 0;
        canvas.height = 0;
        finish(null);
      }
    };
    img.onerror = () => finish(null);
    img.src = dataUrl;
  });
}
