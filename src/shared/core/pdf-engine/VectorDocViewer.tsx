import React, { useEffect, useRef, useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import * as pdfjsLib from 'pdfjs-dist';
// Vite: importa el worker como URL de asset — funciona igual en build de producción.
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface VectorDocViewerProps {
  /** El documento de @react-pdf/renderer a renderizar, ej: <CvPdfDocument cvData={cvData} /> */
  document: React.ReactElement;
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
export function VectorDocViewer({ document }: VectorDocViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const renderTokenRef = useRef(0);

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
        container.innerHTML = '';

        // Ancho disponible real del contenedor, para que cada página se dibuje
        // nítida (sin escalar un canvas más chico hacia arriba) tanto en un
        // monitor grande como en la pantalla angosta de un celular.
        const containerWidth = container.clientWidth || 800;
        const devicePixelRatio = window.devicePixelRatio || 1;

        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
          if (cancelled || renderTokenRef.current !== myToken) return;
          const page = await pdfDoc.getPage(pageNum);

          const unscaledViewport = page.getViewport({ scale: 1 });
          const scale = containerWidth / unscaledViewport.width;
          const viewport = page.getViewport({ scale: scale * devicePixelRatio });

          const canvas = window.document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = '100%';
          canvas.style.height = 'auto';
          canvas.style.display = 'block';
          canvas.style.marginBottom = '16px';
          canvas.style.boxShadow = '0 4px 24px rgba(0,0,0,0.18)';
          canvas.style.borderRadius = '4px';

          const ctx = canvas.getContext('2d');
          if (!ctx) continue;

          container.appendChild(canvas);
          await page.render({ canvasContext: ctx, viewport }).promise;
        }

        if (!cancelled && renderTokenRef.current === myToken) setLoading(false);
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
  }, [document]);

  return (
    <div style={{ width: '100%', height: '100%', overflowY: 'auto', overflowX: 'hidden' }}>
      {loading && (
        <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 13, fontWeight: 700 }}>
          Generando vista vectorial…
        </div>
      )}
      {error && (
        <div style={{ padding: 24, textAlign: 'center', color: '#f87171', fontSize: 12, fontWeight: 600 }}>
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 6 }}>No se pudo generar la vista previa</div>
          <div style={{ opacity: 0.85, fontFamily: 'monospace', wordBreak: 'break-word' }}>{error}</div>
        </div>
      )}
      <div ref={containerRef} style={{ width: '100%' }} />
    </div>
  );
}
