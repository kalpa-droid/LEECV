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
  minor: 24,
  patch: 0,
  label: 'V2.24.0',
  lastUpdated: '2026-11-18',
  lastAgent: '@opencode',
  stage: 'PR-E Metricas por producto + moderación de CVs publicados + salud IA: endpoint metrics-by-product (documentos por doc_type_id con head-counts exactos + bucket otro/sin tipo, exportaciones pagas por doc_type en pdf_export_tokens, ingresos confirmados por plan+moneda desde processed_payments completed, todo server-side en serverDal); server actions list-published-cvs (GET paginado, búsqueda por slug o email con join server-side a profiles, limit acotado a 50) y set-published-cv-active (POST, UUID + isActive booleano estrictos, reason opcional <=500, auditoría set_published_cv_active, NUNCA borra CV ni archivo de Drive); acción list-ai-cooldowns (GET) con solo provider + prefijo de 8 caracteres del hash SHA-256, nunca la key; panel admin: tarjetas Métricas por Producto en Resumen, nueva tab CVs Publicados con buscador + paginación + toggle activar/desactivar (reversible, auditado), AiTelemetryTab con desglose por proveedor y por endpoint (muestra de las últimas 100 llamadas cargadas; sin tasa de error/fallback porque ai_usage_telemetry no la registra) y bloque de claves en pausa; 18 tests nuevos (tests/admin/adminMetricsModeration.test.ts); bump MINOR V2.23.0 -> V2.24.0 (toca api/ y src/).',
} as const;
