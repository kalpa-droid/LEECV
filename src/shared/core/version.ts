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
  patch: 1,
  label: 'V2.19.1',
  lastUpdated: '2026-11-17',
  lastAgent: '@opencode',
  stage: 'Bug report Book Studio cerrado (V2.19.1): PR 130 (carga de PDF en /crear-libro: picker nativo y respaldo input dentro del gesto del clic, sin doble disparo, ArrayBuffer intacto para pdf-lib, helper canonico loadPdfDocumentWithCmaps cMaps locales->CDN->sin cmaps, PDF normal ya no se clasifica como protegido, buffer .slice(0) para pdf-lib), PR 131 (/crear-libro monta <AppModals/>: "Mis Libros Guardados" lista y abre LIBROS por docType book, hidratacion al cambiar de pestaña con opciones guardadas ganando sobre DEFAULT, pdfPageCount exacto, titulo del libro, PDF reabierto sin duplicar via handle FileSystemFileHandle por bookId con fallback a la clave global legada). Regla nueva desde esta version: TODA PR de trabajo incluye el bump de version.ts EN EL MISMO COMMIT que aplica el cambio (fix->PATCH, funcionalidad->MINOR, arquitectura->MAJOR); la exige scripts/check-version-bump.js en check-all y en CI (fetch-depth: 0).',
} as const;
