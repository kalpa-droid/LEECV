/**
 * Ventana de Sesión de Exportación (15 minutos).
 *
 * Garantiza que 1 solo crédito descontado alcance para descargar el PDF,
 * exportar formatos complementarios (Word/Excel) del mismo documento y subirlo
 * a Google Drive dentro de los siguientes 15 minutos sin volver a cobrar.
 */

const SESSION_PREFIX = 'leecv_export_grant_v1:';
export const EXPORT_SESSION_WINDOW_MS = 15 * 60 * 1000;

const memoryGrants = new Map<string, number>();

function makeGrantKey(docType: string, docId: string = 'active'): string {
  const safeType = (docType || 'cv').trim();
  const safeId = (docId || 'active').trim();
  return `${SESSION_PREFIX}${safeType}:${safeId}`;
}

export function grantExportSessionWindow(docType: string, docId: string = 'active'): void {
  if (!docType) return;
  const key = makeGrantKey(docType, docId);
  const expiresAt = Date.now() + EXPORT_SESSION_WINDOW_MS;
  memoryGrants.set(key, expiresAt);

  if (typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.setItem(key, String(expiresAt));
    } catch {
      // Ignorar sessionStorage restringido
    }
  }
}

export function hasActiveExportSessionWindow(docType: string, docId: string = 'active'): boolean {
  if (!docType) return false;
  const key = makeGrantKey(docType, docId);
  const now = Date.now();

  let expiresAt = memoryGrants.get(key) ?? 0;
  if (typeof sessionStorage !== 'undefined') {
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) {
        expiresAt = Math.max(expiresAt, Number(raw) || 0);
      }
    } catch {
      // Ignorar sessionStorage restringido
    }
  }

  if (!Number.isFinite(expiresAt) || expiresAt <= now) {
    memoryGrants.delete(key);
    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.removeItem(key);
      } catch {
        // Ignorar
      }
    }
    return false;
  }
  return true;
}

export function clearExportSessionWindow(docType: string, docId: string = 'active'): void {
  if (!docType) return;
  const key = makeGrantKey(docType, docId);
  memoryGrants.delete(key);
  if (typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // Ignorar
    }
  }
}
