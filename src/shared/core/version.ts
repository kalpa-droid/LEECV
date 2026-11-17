/**
 * CANONICAL VERSION TRACKER — LEECV Master Plan
 * Regla de gobernanza para todos los agentes (AGENTS.md / Regla 8+):
 *
 * - Pequeños cambios (fixes, ajustes UI mínimos): incrementa PATCH (V2.1 → V2.2)
 * - Cambios medianos (nueva funcionalidad, componente, integración backend): incrementa MINOR (V2.2 → V2.3)
 * - Grandes cambios (cambio de arquitectura, nuevo esquema DB principal, nuevo eje del plan): incrementa MAJOR (V2.x → V3.0)
 *
 * El archivo debe ser actualizado ANTES del commit que aplica el cambio.
 */

export const LEECV_VERSION = {
  major: 2,
  minor: 19,
  patch: 2,
  label: 'V2.19.2',
  lastUpdated: '2026-11-17',
  lastAgent: '@opencode',
  stage: 'Fiabilidad del picker de PDF del Book Studio (V2.19.2): input <file> persistente en BookStudioContent (id book-source-pdf-input, siempre montado) con click sincrono dentro del gesto; BookSourceTypeStep detecta fallo del selector nativo en la sesion (bandera nativaPickerFailedSession) y pasa la tarjeta a <label htmlFor> nativo (un clic = un dialogo, sin JS); handleTriggerFileInput sin setTimeout y abre el panel lateral; aviso role=alert tambien en el panel principal cuando no hay PDF; Reabrir mi PDF con permiso denegado avisa y cae al selector nativo (label); aceptacion de application/pdf sin .pdf (isPdfLikeFile); pickerRef con deps [pickerRef, bookId, nativePickerFailed]; loadPdfDocumentWithCmaps corta sin reintentar cMaps ante PasswordException/InvalidPDFException (isFatalPdfLoadError); CACHE_NAME sw.js leecv-pwa-v4; tests tests/book-engine/pdfPickingFlow.test.ts.',
} as const;
