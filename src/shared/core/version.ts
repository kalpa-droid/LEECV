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
  minor: 15,
  patch: 0,
  label: 'V2.15.0',
  lastUpdated: '2026-11-15',
  lastAgent: '@opencode',
  stage: 'Variantes de postulación (Parte 1 del plan integral): núcleo applicationVariant (buildApplicationVersionLabel "Puesto · Empresa", provisional "Nueva postulación", sourceCvTabId siempre al CV base original — nunca encadena, reset de carta / keepJobTarget), createApplicationVariant orquestador (saveAs + ensureDocumentTab siempre), flujo unico "Crear postulación" para los puntos de entrada (Vacante con mini-formulario, Carta bloqueada, banner Diseño, menú Nuevo, botón Carta en Guardados, Guardar copia), tira de identidad CV Base/Postulación en el panel con boton Volver al CV Base, auto-rename del label provisional al completar puesto/empresa, botón Editar vacante en la Carta, chips en Guardados.',
} as const;
