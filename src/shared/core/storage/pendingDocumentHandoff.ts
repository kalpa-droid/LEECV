/**
 * pendingDocumentHandoff.ts
 * Gestor aislado de handoff en sessionStorage para abrir documentos pendientes
 * al navegar entre rutas de productos (/crear-cv, /crear-tarjeta, /crear-libro).
 */

const PENDING_DOC_KEY = 'leecv_pending_open_document';

export interface PendingDocument {
  id: string;
  docType: 'cv' | 'business_card' | 'book';
}

export function setPendingDocumentToOpen(id: string, docType: 'cv' | 'business_card' | 'book'): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: PendingDocument = { id, docType };
    sessionStorage.setItem(PENDING_DOC_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('Error al guardar documento pendiente en sessionStorage:', err);
  }
}

export function getPendingDocumentToOpen(): PendingDocument | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = sessionStorage.getItem(PENDING_DOC_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as PendingDocument;
  } catch (err) {
    console.warn('Error al leer documento pendiente de sessionStorage:', err);
    return null;
  }
}

export function clearPendingDocumentToOpen(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(PENDING_DOC_KEY);
  } catch (err) {
    console.warn('Error al limpiar documento pendiente de sessionStorage:', err);
  }
}
