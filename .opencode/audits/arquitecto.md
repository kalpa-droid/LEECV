# Auditoría de @arquitecto — base de datos, seguridad y lógica pesada

Seguí `_formato-informe.md`. Prefijo de IDs: `ARQ`. Solo lectura.
Empezá leyendo `_linea-base.md` y `supabase/migrations/` en orden de nombre.

## A. Base de datos y RLS
1. Listá **todas** las tablas creadas en `supabase/migrations/`. Para cada una, confirmá que tiene `ENABLE ROW LEVEL SECURITY` en alguna migración posterior o igual. Reportá las que no.
2. Para cada política, revisá: ¿`USING (true)` o `WITH CHECK (true)` para `anon`? ¿Aísla por `auth.uid() = user_id`? ¿Usa `public.is_admin(...)` donde corresponde?
3. Revisá los `GRANT` a `anon` y `authenticated`: ¿hay permisos de más que la RLS tapa solo "de rebote"?
4. Funciones `SECURITY DEFINER`: ¿fijan `search_path`? ¿validan el parámetro que reciben? ¿Pueden ser llamadas por `anon` sin necesidad?
5. **Orden y choques entre migraciones**: buscá columnas que una migración borra y otra todavía usa (empezá por `expires_at` en `20261010_export_entitlement_rpc.sql`). Buscá funciones redefinidas dos veces con lógica distinta.
6. ¿Hay columnas o tablas que ya no usa ningún código? (`premium_vence`, `premium_activo`, `user_credits`, `pdf_export_credits`, `consume_ai_credit`…). Confirmá con búsquedas en `api/` y `src/`.

## B. Pagos y derecho a exportar
7. **Idempotencia**: recorré el camino `webhook → applyPayment → grant`. ¿Qué pasa si el mismo pago llega dos veces en paralelo? ¿Y si llega primero "pendiente" y después "aprobado"?
8. **Una sola fuente de verdad del vencimiento de Pro**: ¿cuántas columnas o lógicas distintas deciden si alguien es Pro (cron, admin, SQL, front)? Debe haber una.
9. **Validación de monto y moneda** contra `PRICING_CATALOG` en los tres proveedores (Mercado Pago, PayPal, Lemon Squeezy). ¿Hay tolerancia definida y escrita en un solo lugar?
10. ¿Se puede acreditar un plan que no está en el catálogo, o con referencia mal formada? Revisá `planReference.ts` y cada proveedor.
11. **Consumo de exportaciones**: las RPC de `consume_*` / `get_*` entitlement, ¿son atómicas? ¿Usan `FOR UPDATE SKIP LOCKED` o equivalente? ¿Respetan vencimiento del token de invitado y del token de cuenta?
12. ¿Pagos que se cobran y no se entregan (usuario sin perfil, email distinto) quedan en `pending_grants` y alguien se entera (admin, Sentry)?
13. **Webhooks**: validación de firma de cada proveedor, rate limit, y qué se loguea (que no se filtren datos personales ni secretos).
14. Variables de entorno de precios: ¿alguna permite cobrar distinto de lo que muestra el catálogo?

## C. Lógica algorítmica
15. `src/modules/book-studio/impositionEngine.ts`: probá mentalmente (o leyendo los tests) páginas que no son múltiplo de 4, 1 página, 0 páginas, cuadernillos de distinto tamaño, y que el orden de páginas del pliego sea correcto. ¿Hay división por cero o índices fuera de rango?
16. Máquinas de estado de pago (`approved`/`pending`/`rejected`/`refunded`): ¿están todos los estados cubiertos? ¿Qué pasa con un reembolso?

## D. Contratos de datos
17. Tipos de `src/types/` que describen la misma cosa de dos maneras (por ejemplo `roles` como texto y como objeto). ¿Hay migración suave para datos viejos guardados?
18. Los dos `pricingCatalog.ts` (frontend y API): ¿siguen idénticos? ¿Qué campos extra tiene uno y no el otro?

## Entregable
Informe `ARQ` con el formato común. Prioridad P0 para todo lo que pueda cobrar de más, regalar producto o exponer datos.
