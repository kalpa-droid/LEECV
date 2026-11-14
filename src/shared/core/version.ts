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
  minor: 12,
  patch: 0,
  label: 'V2.12.0',
  lastUpdated: '2026-11-14',
  lastAgent: '@opencode',
  stage: 'Bloques 2+3 del plan de IA/editor: tarea rewrite_record (Groq+Gemini+contexto con allowlist y guia de esquema inline), reescritura de registros con panel de revision Reemplazar/Agregar debajo/Descartar (nunca auto-append), dock con Opcion 2 (slots personalizada-N vacios ocultos; solo con titulo o registros aparecen), selector compartido PresetSectionPicker para alta y edicion de slot, findFreeCustomSlot ignora visibilidad para el alta.',
} as const;
