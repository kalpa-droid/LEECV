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
  minor: 14,
  patch: 0,
  label: 'V2.14.0',
  lastUpdated: '2026-11-15',
  lastAgent: '@opencode',
  stage: 'Bloque 2 (tiradores continuos, reintentos IA, mojibake, defaults nuevo CV): tiradores continuos de tipografia/densidad reactivos en preview (motor de densidad continuo 0.50-1.35 + anclas enum), reintentos silenciosos de IA (3 intentos, backoff 500/1200 ms) con recuperacion de JSON en servidor y cliente, correccion de mojibake UTF-8 en presetCompositionInstances (18 lineas) con test de regresion, defaults de CV nuevo (pestana Importar datos + Hielo Nordico + tipografia compacta) y preservacion de typographyOverrides en sanitizeCvData.',
} as const;
