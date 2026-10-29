# Línea base (punto de partida para las auditorías)

> Verificada leyendo `main` en el commit `3c81abd` (PR #46). **Es una pista, no una verdad.**
> Cada agente debe volver a comprobar lo que use. Si el código actual contradice esto, gana el código.

## Ya corregido (confirmado en `main`; no lo vuelvas a reportar salvo que haya regresión)
- El gate viejo `usePdfExportGate.ts` ya no existe; hay un `useExportEntitlement.ts` con su test.
- `api/_lib/paymentProviders/planReference.ts` existe y ya no se ve el valor por defecto `'pro'` en los webhooks de Mercado Pago y PayPal.
- `applyPayment.ts` maneja pagos pendientes (`pendingGrants`) y diferencias de monto.
- Existe la migración de derecho a exportar (`20261012_secure_sales_and_export_entitlements.sql`) y de endurecimiento (`20261025_pdf_export_access_hardening.sql`).
- `vercel.json` tiene el rewrite de `/api/admin/list-customers` hacia `admin-api`.
- El código muerto de Drive/organizaciones ya no aparece en `serverDal.ts`.
- Los planes viejos (`PLAN_*.md` de pagos) ya no están sueltos en la raíz de la misma forma.

## Pendiente conocido o sospechoso (reconfirmar)
- La migración `20261010_export_entitlement_rpc.sql` hace `DROP COLUMN expires_at`: comprobar que **ninguna** función SQL, política ni código de `api/` o `src/` siga leyendo `expires_at` (por ejemplo `consume_export_token`).
- Una sola fuente de vencimiento de Pro (`plan_vence`): comprobar que el cron, el admin y la base usen la misma columna.
- Los dos catálogos de precios (`src/shared/core/payments/pricingCatalog.ts` y `api/_lib/paymentProviders/pricingCatalog.ts`) deben seguir iguales (`verify:pricing-sync`).
- No existe `scripts/verify-api-routes.ts` (cada destino de `vercel.json` debe tener su archivo en `api/`, y cada llamada `apiClient` una ruta).
- Archivos sueltos en la raíz: `fix-privacy.ts`, `migrate-blog.mjs` (y revisar `tsconfig.tsbuildinfo`).
- Tests de integración que se saltan en silencio cuando faltan variables (por ejemplo, `tests/test-grant-tokens-concurrency.test.ts`): comprobar qué pasa en CI.
- El QR de "link público" de la tarjeta: ¿existe de verdad la vista pública a la que apunta?
- Textos de ventas de Pro: ¿prometen funciones que no existen?
- El importador de LinkedIn (`src/shared/core/importers/linkedinArchiveImporter.ts`) existe desde antes: ¿está conectado a alguna pantalla?
- `opencode.json` usa la clave `agents`; confirmar con la documentación de tu versión de OpenCode si debe ser `agent`.

## Reglas del repo que mandan sobre todo lo demás
`AGENTS.md`: Regla 0 (`check-all` en 0 errores), 1 (tabla "voy a hacer X → uso Y"), 2 (colores dinámicos en Tailwind), 3 (motores con poca adopción), 4 (antes de crear un motor nuevo), 6 (fin de sesión), 7 (plan antes de código), 8 (identidad canónica), 9 (roles multi-agente) y la regla de lenguaje sencillo.
