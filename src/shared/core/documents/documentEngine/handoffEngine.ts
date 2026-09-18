/**
 * handoffEngine.ts
 * Reemplaza a pendingDocumentHandoff.ts de forma drop-in para mantener la misma firma.
 * Utilizado para pasar la intención de abrir un documento entre la navegación o vistas iniciales.
 */

const PENDING_DOC_KEY = 'cvpremium_pending_document_id';

export function setPendingDocumentToOpen(id: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PENDING_DOC_KEY, id);
}

export function getPendingDocumentToOpen(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(PENDING_DOC_KEY) || null;
}

export function clearPendingDocumentToOpen(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PENDING_DOC_KEY);
}
