/**
 * Parser de gráficos OOXML (`word/charts/chart*.xml`) y renderizador a PNG de alta
 * definición en Canvas (con fallback SVG data URL si corre fuera de DOM).
 * Puro respecto a React; vive en `domain/`.
 */

export type ParsedChartKind = 'bar' | 'line' | 'pie' | 'area';

export interface ParsedChartSeries {
  name: string;
  values: number[];
}

export interface ParsedWordChart {
  title: string;
  kind: ParsedChartKind;
  categories: string[];
  series: ParsedChartSeries[];
}

const CHART_COLORS = ['#0F766E', '#E11D48', '#2563EB', '#D97706', '#7C3AED', '#059669'];

function collectTexts(el: Element | null | undefined): string {
  if (!el) return '';
  return (el.textContent || '').replace(/\s+/g, ' ').trim();
}

function getElementsByLocalName(root: Document | Element, localName: string): Element[] {
  const all = root.getElementsByTagName('*');
  const out: Element[] = [];
  for (let i = 0; i < all.length; i++) {
    const node = all[i];
    if (node.localName === localName) out.push(node);
  }
  return out;
}

export function parseWordChartXml(xmlString: string): ParsedWordChart | null {
  if (!xmlString || typeof DOMParser === 'undefined') return null;

  const doc = new DOMParser().parseFromString(xmlString, 'application/xml');
  if (!doc) return null;

  const hasPie =
    getElementsByLocalName(doc, 'pieChart').length > 0 ||
    getElementsByLocalName(doc, 'doughnutChart').length > 0;
  const hasLine = getElementsByLocalName(doc, 'lineChart').length > 0;
  const hasArea = getElementsByLocalName(doc, 'areaChart').length > 0;
  const kind: ParsedChartKind = hasPie ? 'pie' : hasLine ? 'line' : hasArea ? 'area' : 'bar';

  const titleNode = getElementsByLocalName(doc, 'title')[0];
  const title = collectTexts(titleNode) || 'Gráfico importado de Word';

  const seriesNodes = getElementsByLocalName(doc, 'ser');
  if (seriesNodes.length === 0) return null;

  let categories: string[] = [];
  const series: ParsedChartSeries[] = [];

  seriesNodes.forEach((ser, sIdx) => {
    const txNode = getElementsByLocalName(ser, 'tx')[0];
    const name = collectTexts(txNode) || `Serie ${sIdx + 1}`;

    if (categories.length === 0) {
      const catNode = getElementsByLocalName(ser, 'cat')[0];
      if (catNode) {
        const pts = getElementsByLocalName(catNode, 'pt');
        categories = pts.map((pt, idx) => collectTexts(pt) || `Cat ${idx + 1}`);
      }
    }

    const valNode = getElementsByLocalName(ser, 'val')[0];
    const valPts = valNode ? getElementsByLocalName(valNode, 'pt') : [];
    const values = valPts.map((pt) => {
      const num = Number(collectTexts(pt).replace(',', '.'));
      return Number.isFinite(num) ? num : 0;
    });

    if (values.length > 0) {
      series.push({ name, values });
    }
  });

  if (series.length === 0) return null;
  if (categories.length === 0) {
    categories = series[0].values.map((_, i) => `Ítem ${i + 1}`);
  }

  return { title, kind, categories, series };
}

export function renderParsedWordChartToPngDataUrl(chart: ParsedWordChart): string | null {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 680;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Título
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(chart.title.slice(0, 70), canvas.width / 2, 52);

  if (chart.kind === 'pie') {
    const vals = chart.series[0]?.values || [];
    const total = vals.reduce((a, b) => a + Math.max(0, b), 0) || 1;
    const cx = 420;
    const cy = 360;
    const r = 210;
    let startAngle = -Math.PI / 2;

    vals.forEach((v, i) => {
      const slice = (Math.max(0, v) / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, startAngle + slice);
      ctx.closePath();
      ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length];
      ctx.fill();
      startAngle += slice;
    });

    // Leyenda derecha
    ctx.textAlign = 'left';
    ctx.font = '20px sans-serif';
    chart.categories.slice(0, 10).forEach((cat, i) => {
      const y = 160 + i * 40;
      ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length];
      ctx.fillRect(720, y - 16, 20, 20);
      ctx.fillStyle = '#1E293B';
      const pct = Math.round(((vals[i] || 0) / total) * 100);
      ctx.fillText(`${cat.slice(0, 24)} (${pct}%)`, 752, y);
    });
    return canvas.toDataURL('image/png');
  }

  // Barras / Líneas / Área
  const padLeft = 110;
  const padRight = 60;
  const padTop = 100;
  const padBottom = 140;
  const plotW = canvas.width - padLeft - padRight;
  const plotH = canvas.height - padTop - padBottom;

  const allVals = chart.series.flatMap((s) => s.values);
  const maxVal = Math.max(1, ...allVals);

  // Ejes
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padLeft, padTop);
  ctx.lineTo(padLeft, padTop + plotH);
  ctx.lineTo(padLeft + plotW, padTop + plotH);
  ctx.stroke();

  // Grilla horizontal
  ctx.font = '18px sans-serif';
  ctx.fillStyle = '#475569';
  ctx.textAlign = 'right';
  for (let g = 0; g <= 4; g++) {
    const val = (maxVal / 4) * g;
    const y = padTop + plotH - (plotH * g) / 4;
    ctx.strokeStyle = '#E2E8F0';
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(padLeft + plotW, y);
    ctx.stroke();
    ctx.fillText(Number.isInteger(val) ? String(val) : val.toFixed(1), padLeft - 12, y + 6);
  }

  const catCount = Math.max(1, chart.categories.length);
  const groupW = plotW / catCount;

  if (chart.kind === 'line' || chart.kind === 'area') {
    chart.series.forEach((ser, sIdx) => {
      const color = CHART_COLORS[sIdx % CHART_COLORS.length];
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ser.values.forEach((v, idx) => {
        const x = padLeft + groupW * idx + groupW / 2;
        const y = padTop + plotH - (Math.max(0, v) / maxVal) * plotH;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });
  } else {
    const sCount = Math.max(1, chart.series.length);
    const barW = Math.min(54, (groupW * 0.72) / sCount);
    chart.series.forEach((ser, sIdx) => {
      const color = CHART_COLORS[sIdx % CHART_COLORS.length];
      ser.values.forEach((v, idx) => {
        const h = (Math.max(0, v) / maxVal) * plotH;
        const groupStart = padLeft + groupW * idx + (groupW - barW * sCount) / 2;
        const x = groupStart + sIdx * barW;
        const y = padTop + plotH - h;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, barW - 4, h);
      });
    });
  }

  // Etiquetas de categorías
  ctx.fillStyle = '#334155';
  ctx.font = '18px sans-serif';
  ctx.textAlign = 'center';
  chart.categories.forEach((cat, idx) => {
    const x = padLeft + groupW * idx + groupW / 2;
    ctx.fillText(cat.slice(0, 14), x, padTop + plotH + 34);
  });

  // Leyenda inferior
  ctx.textAlign = 'left';
  chart.series.slice(0, 5).forEach((ser, idx) => {
    const lx = padLeft + idx * 210;
    const ly = canvas.height - 46;
    ctx.fillStyle = CHART_COLORS[idx % CHART_COLORS.length];
    ctx.fillRect(lx, ly - 14, 18, 18);
    ctx.fillStyle = '#0F172A';
    ctx.fillText(ser.name.slice(0, 18), lx + 26, ly);
  });

  return canvas.toDataURL('image/png');
}
