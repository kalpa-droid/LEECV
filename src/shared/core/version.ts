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
  minor: 18,
  patch: 1,
  label: 'V2.18.1',
  lastUpdated: '2026-11-16',
  lastAgent: '@opencode',
  stage: 'Lidio, el asistente flotante del editor, rediseñado al estilo macOS minimal y contextual (V2.18.0): notificacion toast independiente (AssistantNotificationToast) que aparece sola por inactividad, ~9s auto-descarte (pausa en hover/focus), cola apuntando al boton flotante, acciones solo-icono (Ir/Silenciar/Cerrar), backdrop-blur, variables CSS del tema, prefers-reduced-motion y print:hidden. Panel rediseñado sin tagline: header limpio con mute Bell/BellOff, tabs solo-icono (Tips/Preguntar), toggle de todos los tips con badge de contador, chips de preguntas rapidas en el chat, puntos de "escribiendo". app_guide_assistant enriquecida con el conocimiento V2.17.0 (cascada de diseño, 6 formatos regionales, tiradores, portada, secciones a medida, importar CV, privacidad por campo, candados, flujo CV -> Vacante -> Postulacion -> Carta, ATS en vivo, Deshacer/Rehacer, temas), editorState estructural SIN datos personales (isBaseCV, formato activo, secciones visibles, vacante, puntaje ATS) y los ultimos 4 turnos del chat como datos escapados; responseSchema OpenAPI 3.0 sin cambios. Tips 100% locales (sin IA); nueva notificacion y panel usan solo tokens del design system. V2.18.1: pulido visual del panel - banda de tabs icon-only compacta (h-9, 36px fijos) y estado vacio de Tips convertido en mini-tarjeta con acciones visibles (Ver todos los tips / Preguntarle a Lidio).',
} as const;
