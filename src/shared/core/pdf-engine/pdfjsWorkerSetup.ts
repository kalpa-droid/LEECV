import * as pdfjsLib from 'pdfjs-dist';
// Vite resuelve esto al build a un archivo propio ya empaquetado en el
// dominio de la app (dist/assets/pdf.worker.min-*.mjs) — nunca a un CDN
// externo. Antes de este archivo, 3 lugares distintos (PdfPreviewStrip.tsx,
// BookSourceTypeStep.tsx, impositionEngine.ts) apuntaban cada uno por su
// cuenta a `cdnjs.cloudflare.com/.../pdf.worker.min.mjs`, dependiendo de que
// ese CDN externo tuviera EXACTAMENTE la misma versión que pdfjs-dist
// instalado localmente (pdf.js rechaza el worker si la versión no matchea
// byte a byte) y de que no hubiera ningún bloqueo de red/CORS al pedirlo.
// Esa era la causa real de que las miniaturas de página quedaran girando
// para siempre sin cargar nunca.
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

let configured = false;

/**
 * Configura el worker de pdf.js una sola vez, con el archivo local
 * empaquetado por Vite. Llamar antes de cualquier pdfjsLib.getDocument(...)
 * en toda la app — no volver a escribir esta línea a mano en un componente
 * nuevo, importar esta función.
 */
export function ensurePdfjsWorkerConfigured(): typeof pdfjsLib {
  if (!configured) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;
    configured = true;
  }
  return pdfjsLib;
}
