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
  patch: 0,
  label: 'V2.19.0',
  lastUpdated: '2026-11-17',
  lastAgent: '@opencode',
  stage: 'Plan Book Studio/Lidio completo (V2.19.0, 5 fases): PR 118 Fases 1+2 (carga de PDF con boton nativo y extensiones .pdf, persistencia de libros, cMaps locales pdf.js con fallback CDN, verificacion de tipo de documento), PR 119 Fase 3 (paridad tapa/contratapa: presets COVER_PRESETS, publisher, imageFit, fix retiro fantasma, conteo final de paginas reescrito y verificado contra el motor), PR 120 Fase 4 (flujo pasos 1-7 coherente con la secuencia real i18n y labels migrados a t.bookStudio.*), PR 121 Fase 5 (Lidio en Book Studio: prop docType cv|book, tips y destinos book_* validados contra BOOK_STEP_SEQUENCE, storage keys leecv.assistant.book, editorState estructural sin PII, app_guide_assistant con bloque Book Studio - responseSchema OpenAPI 3.0 intacto, 12 tests nuevos). UI zona app en lenguaje sencillo; nada de jerga en zona publica.',
} as const;
