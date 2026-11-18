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
  minor: 21,
  patch: 0,
  label: 'V2.21.0',
  lastUpdated: '2026-11-17',
  lastAgent: '@opencode',
  stage: 'Fase 2 reestructuracion del Panel Admin (PR-B): pestaña nueva "Resumen y Operaciones" (primera del panel) que rescata el bloque muerto adminTab - notificaciones con filtro no leidas/todas + marcar todas, comprobantes manuales con contraste tokenizado (nuevo token --color-status-danger-on-base de contraste 4.88:1 sobre danger-base) y link al comprobante, diagnostico en vivo de pasarelas y de motores IA REAL server-side (nuevo GET /api/admin/ai-providers-status con ping de AI_PROVIDERS + resumen de pausas de claves de ai_key_cooldowns via getAiKeyCooldownSummary, SOLO conteos sin exponer keys/hashes; antes el panel leia VITE_GROQ_API_KEY en el navegador que nunca existe → falso missing_vars) + botón limpiar pausas de claves ya expiradas (POST /api/admin/clear-ai-cooldowns → clearExpiredCooldowns, nunca cancela una pausa activa de 429 real); pestaña "Auditoría y Errores" montada y extendida (filtro por nivel y por fuente, marcar como resuelto client-side con resolved_at/resolved_by via policy UPDATE de admin, visor del contexto JSON, columna de huella fingerprint, sub-vista de admin_audit_logs con acciones de administradores); pestaña "Plantillas de CV" montada (TemplateManagementTab estaba huerfana); renderGatewayCard movido con radio real via style (el patrón rounded-[${...}] no genera CSS); adminNotifications.markAllRead en el DAL; 2 rewrites nuevos en vercel.json; tests del endpoint nuevo; bump MINOR por funcionalidad nueva.',
} as const;
