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
  minor: 10,
  patch: 0,
  label: 'V2.10.0',
  lastUpdated: '2026-11-13',
  lastAgent: '@antigravity',
  stage: 'Pipeline OCR integral: motor espacial PDF (3 modos text/hybrid/image), render 1920px con fondo blanco, WebP/PNG para páginas digitales, contraste suave para fotos, protocolo de lectura estructural + contexto rodante + Completeness Gate en la nube, mediaResolution HIGH en Gemini',
} as const;
