import React, { useEffect, useRef, useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import * as pdfjsLib from 'pdfjs-dist';
import { colorSystem } from '../uiDesignSystem';
import { scrollToPdfAnchor } from './layers/anchors/pdfAnchorEngine';
import { ContentSection } from './layers/records/recordTypes';
import { Preset } from './layers/presets/presetSchema';
import { CvLayoutOverrides } from './layers/sectors/layoutResolutionEngine';
// Vite: importa el worker como URL de asset — funciona igual en build de producción.
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface VectorDocViewerProps {
  /** El documento de @react-pdf/renderer a renderizar, ej: <CvPdfDocument cvData={cvData} /> */
  document: React.ReactElement;
  /** Nivel de zoom actual (ej: 1.0, 1.25) para mantener nitidez cristalina en alta resolución */
  zoomLevel?: number;
  /** Pestaña / Sección activa de la UI para desplazamiento e interactividad */
  activeTab?: string;
  sections?: ContentSection[];
  preset?: Preset;
  layoutOverrides?: CvLayoutOverrides;
}

/**
 * Visor universal del motor vectorial.
 *
 * Por qué existe: <PDFViewer> de @react-pdf/renderer usa un <iframe> con el
 * plugin nativo de PDF del navegador — que los navegadores mobile (iOS Safari,
 * Chrome Android) NO tienen, así que ahí no se ve nada. Este componente evita
 * el iframe: genera el PDF real con @react-pdf/renderer (el mismo que se
 * descarga) y lo dibuja página por página en un <canvas> con pdf.js — eso sí
 * funciona igual en PC y en celular, porque no depende de ningún plugin del
 * navegador.
 *
 * Es la ÚNICA vista que debería quedar en la app: reemplaza tanto al
 * <PDFViewer> como a la vieja "Vista HTML Web" (que estimaba alturas por
 * conteo de caracteres y por eso se desbordaba). Lo que se ve acá es,
 * literalmente, el mismo PDF que el usuario termina descargando — cero
 * posibilidad de que preview y descarga difieran.
 */
export function VectorDocViewer({ document, zoomLevel = 1, activeTab, sections = [], preset, layoutOverrides }: VectorDocViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const renderTokenRef = useRef(0);
  const anchorMapRef = useRef<Record<string, { startPage: number; startYRatio: number; endPage: number; endYRatio: number }>>({});
  const pendingScrollTabRef = useRef<string | undefined>(activeTab);

  useEffect(() => {
    const myToken = ++renderTokenRef.current;
    let cancelled = false;

    async function renderPdf() {
      setLoading(true);
      setError(null);
      try {
        const blob = await pdf(document).toBlob();
        if (cancelled || renderTokenRef.current !== myToken) return;

        const arrayBuffer = await blob.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdfDoc = await loadingTask.promise;
        if (cancelled || renderTokenRef.current !== myToken) return;

        const container = containerRef.current;
        if (!container) return;

        // Renderizado offscreen en Fragment para evitar parpadeos blancos durante el renderizado
        const fragment = window.document.createDocumentFragment();
        const containerWidth = container.clientWidth || 800;
        const devicePixelRatio = window.devicePixelRatio || 1;
        const newAnchorMap: Record<string, { startPage: number; startYRatio: number; endPage: number; endYRatio: number }> = {};

        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
          if (cancelled || renderTokenRef.current !== myToken) return;
          const page = await pdfDoc.getPage(pageNum);

          const unscaledViewport = page.getViewport({ scale: 1 });
          const pageHeightPt = unscaledViewport.height;

          // Extraer marcadores de texto reales embedidos por @react-pdf/renderer
          try {
            const textContent = await page.getTextContent();
            for (const item of textContent.items as any[]) {
              if (typeof item.str === 'string' && item.str.includes('ANCHOR_')) {
                const str = item.str.trim();
                const yPdf = Array.isArray(item.transform) ? item.transform[5] : 0;
                const yFromTopPt = Math.max(0, pageHeightPt - yPdf);
                const ratio = Math.min(0.98, Math.max(0, yFromTopPt / pageHeightPt));

                if (str.startsWith('ANCHOR_START:')) {
                  const secId = str.replace('ANCHOR_START:', '').trim();
                  if (!newAnchorMap[secId]) {
                    newAnchorMap[secId] = { startPage: pageNum, startYRatio: ratio, endPage: pageNum, endYRatio: ratio };
                  } else {
                    newAnchorMap[secId].startPage = pageNum;
                    newAnchorMap[secId].startYRatio = ratio;
                  }
                } else if (str.startsWith('ANCHOR_END:')) {
                  const secId = str.replace('ANCHOR_END:', '').trim();
                  if (!newAnchorMap[secId]) {
                    newAnchorMap[secId] = { startPage: pageNum, startYRatio: ratio, endPage: pageNum, endYRatio: ratio };
                  } else {
                    newAnchorMap[secId].endPage = pageNum;
                    newAnchorMap[secId].endYRatio = ratio;
                  }
                }
              }
            }
          } catch (_e) {
            // Silencioso: si falla la extracción de texto, la función cae en el heurístico
          }

          const baseScale = containerWidth / unscaledViewport.width;
          const viewport = page.getViewport({ scale: baseScale * zoomLevel * devicePixelRatio });

          const canvas = window.document.createElement('canvas');
          canvas.setAttribute('data-page-number', String(pageNum));
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = '100%';
          canvas.style.height = 'auto';
          canvas.style.display = 'block';
          canvas.style.marginBottom = '16px';
          canvas.style.border = '1px solid var(--ui-page-border, rgba(255, 255, 255, 0.1))';
          canvas.style.boxShadow = 'var(--ui-page-shadow, 0 10px 30px -5px rgba(0, 0, 0, 0.3))';
          canvas.style.borderRadius = '8px';

          const ctx = canvas.getContext('2d');
          if (!ctx) continue;

          fragment.appendChild(canvas);
          await page.render({ canvasContext: ctx, viewport }).promise;
        }

        if (!cancelled && renderTokenRef.current === myToken) {
          container.innerHTML = '';
          container.appendChild(fragment);
          anchorMapRef.current = newAnchorMap;
          setLoading(false);
          const finalTarget = pendingScrollTabRef.current || activeTab;
          if (finalTarget) {
            requestAnimationFrame(() => {
              scrollToPdfAnchor(wrapperRef.current || containerRef.current, finalTarget, sections, preset!, layoutOverrides, anchorMapRef.current);
            });
          }
        }
      } catch (err) {
        console.error('Error renderizando el PDF vectorial:', err);
        const detail = err instanceof Error ? err.message : String(err);
        if (!cancelled && renderTokenRef.current === myToken) {
          setError(detail);
          setLoading(false);
        }
      }
    }

    renderPdf();
    return () => { cancelled = true; };
  }, [document, zoomLevel]);

  // Reacciona ante el cambio de activeTab ejecutando scroll suave en el contenedor
  useEffect(() => {
    pendingScrollTabRef.current = activeTab;
    if (!loading && activeTab && containerRef.current) {
      scrollToPdfAnchor(wrapperRef.current || containerRef.current, activeTab, sections, preset!, layoutOverrides, anchorMapRef.current);
    }
  }, [activeTab, loading, sections, preset, layoutOverrides]);

  // Escuchar eventos globales pdf-anchor-scroll (disparados al presionar botones de muelle/panel incluso si activeTab no varió)
  useEffect(() => {
    const handleAnchorEvent = (e: Event) => {
      const customEvt = e as CustomEvent;
      const targetTab = customEvt.detail?.tabId || activeTab;
      pendingScrollTabRef.current = targetTab;
      if (!loading && targetTab && (wrapperRef.current || containerRef.current)) {
        scrollToPdfAnchor(wrapperRef.current || containerRef.current, targetTab, sections, preset!, layoutOverrides, anchorMapRef.current);
      }
    };

    window.addEventListener('pdf-anchor-scroll', handleAnchorEvent);
    return () => window.removeEventListener('pdf-anchor-scroll', handleAnchorEvent);
  }, [loading, activeTab, sections, preset, layoutOverrides]);

  return (
    <div ref={wrapperRef} style={{ width: '100%', height: '100%', overflowY: 'auto', overflowX: 'hidden' }}>
      {loading && (
        <div style={{ padding: 32, textAlign: 'center', color: colorSystem.neutral.textMuted, fontSize: 13, fontWeight: 700 }}>
          Generando vista vectorial…
        </div>
      )}
      {error && (
        <div style={{ padding: 24, textAlign: 'center', color: colorSystem.status.danger.base, fontSize: 12, fontWeight: 600 }}>
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 6 }}>No se pudo generar la vista previa</div>
          <div style={{ opacity: 0.85, fontFamily: 'monospace', wordBreak: 'break-word' }}>{error}</div>
        </div>
      )}
      <div ref={containerRef} style={{ width: '100%' }} />
    </div>
  );
}
