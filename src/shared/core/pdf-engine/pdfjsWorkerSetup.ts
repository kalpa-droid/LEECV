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
import { isFatalPdfLoadError } from '../book-engine/pdfSourceClassifier';

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

/**
 * Abre un PDF con pdf.js igual que el motor de imposición: cMaps locales
 * primero (mismo dominio, /cmaps/), CDN como respaldo y sin cMaps de último
 * recurso. Recibe los bytes CRUDOS y hace su propia copia fresca por intento
 * (pdf.js transfiere el buffer al worker y lo invalida), así el ArrayBuffer
 * del llamador sigue válido para pdf-lib u otro consumidor después.
 * La contraseña (si el PDF origen estaba protegido) viaja solo en memoria.
 */
export async function loadPdfDocumentWithCmaps(
  data: ArrayBuffer | Uint8Array,
  password?: string
): Promise<any> {
  const pdfjsLib = ensurePdfjsWorkerConfigured();
  const attempts = [
    { label: 'cmaps locales', params: { cMapUrl: '/cmaps/', cMapPacked: true } as Record<string, unknown> },
    { label: 'cmaps CDN', params: { cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/cmaps/', cMapPacked: true } as Record<string, unknown> },
    { label: 'sin cmaps', params: {} as Record<string, unknown> },
  ];
  let lastError: unknown = null;
  for (const attempt of attempts) {
    try {
      return await pdfjsLib.getDocument({
        data: new Uint8Array(data).slice(),
        ...(password ? { password } : {}),
        ...attempt.params,
      }).promise;
    } catch (err) {
      if (isFatalPdfLoadError(err)) throw err; // corte: reintentar cMaps no cambia nada
      lastError = err;
      console.warn(`[pdf.js] No se pudo abrir el PDF con ${attempt.label}:`, err);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('No se pudo abrir el PDF.');
}
