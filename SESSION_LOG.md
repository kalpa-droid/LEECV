# Registro de Intervenciones de Agentes (SESSION_LOG)

Este archivo documenta los cambios realizados en el repositorio por agentes de IA, para mantener un rastro histórico de qué se hizo, por qué y en qué momento.

## [2026-10-31] - Etapas 2 y 3: Webhook Guest Credits, Alertas WhatsApp Admin (+5493878342772), Login OTP Passwordless y Panel Admin 360° (PR #54)

**Resumen:**
Se completaron las Etapas 2 y 3 del plan maestro (`.opencode/plans/plan-pagos-admin-magic-link.md`): backend de pagos adaptado para escribir créditos huérfanos a `unclaimed_email_credits`, alertas automáticas de WhatsApp al administrador ante eventos críticos, modal de login passwordless (OTP/Magic Link de 6 dígitos) en 2 pasos, botón de rescate por WhatsApp en checkout de PDF, y panel administrativo con búsqueda instantánea de clientes, acreditación rápida de créditos con motivo obligatorio y visor de auditoría de errores `admin_error_logs`.

**Acciones Tomadas:**
- **Backend de Pagos y Webhooks (Etapa 2 - PR #54)**:
  - `api/_lib/applyPayment.ts`: cuando un usuario invitado compra un pack (5 o 10 PDFs), los créditos se registran en `unclaimed_email_credits` con estado `held` en lugar de fallar o requerir sesión previa.
  - `api/_lib/whatsappAlert.ts`: módulo no bloqueante para despacho de alertas a WhatsApp admin (`+5493878342772`) ante pagos huérfanos, incidencias o compras de invitados.
  - `supabase/migrations/20261031_fix_payments_admin_contracts.sql`: corrección de contratos SQL: agregada columna `detail` y CHECK expandido en `admin_notifications` (incluye `'payment_held_guest'`), y columna `updated_at` en `payment_claims`.
- **Frontend y Panel Admin (Etapa 3 - PR #54)**:
  - `src/modules/auth/components/LoginPasswordlessModal.tsx`: interfaz passwordless en 2 pasos (ingreso de email con solicitud de OTP de 6 dígitos + ingreso de código con confirmación y auto-claim automático).
  - `src/modules/cv/components/modals/PdfCheckoutModal.tsx`: agregado botón directo de rescate y consulta por WhatsApp contextual antes de abonar.
  - `src/modules/admin/components/UsersTab.tsx`: buscador de usuarios por email, botones rápidos de acreditación manual (+1, +5, +10 créditos) con prompt de justificación obligatoria que invoca `grant_export_tokens`, y botón de contacto por WhatsApp.
  - `src/modules/admin/components/AuditAndErrorsTab.tsx`: visor filtrable de `admin_error_logs` por nivel (ERROR, WARN, INFO), origen y fingerprint para trazabilidad y diagnóstico en tiempo real.
- **Auditoría y Pruebas**:
  - Corrección de pruebas en `tests/applyPayment.test.ts` para validar inserción en `unclaimed_email_credits`.
  - Corrección de ratios de contraste WCAG AA en `AuditAndErrorsTab.tsx`, `LoginPasswordlessModal.tsx` y botón WhatsApp en `UsersTab.tsx`.

**Validación y publicación:**
- `npm run check-all`: 257 pruebas aprobadas, typecheck en verde, 0 violaciones de tokens y contraste (0 en modales), prerenderizado de 25 rutas completado.
- PR [#54](https://github.com/kalpa-droid/LEECV/pull/54) aprobada y fusionada con squash a `main`. Commit de merge: `fd20051cc94bb2aca889f66510667d7f747a7286`.

## [2026-10-30] - Etapa 1: Autenticación Passwordless (OTP/Magic Link), Auto-Acreditación por Email y Bolsillo de Créditos (PR #51 y #52)

**Resumen:**
Se incorporó el plan maestro integral en `.opencode/plans/plan-pagos-admin-magic-link.md` (PR #51) y se completó la Etapa 1 de la arquitectura (PR #52) reemplazando la dependencia de contraseñas por autenticación OTP/Magic Link, creando el bolsillo de créditos de invitado en `unclaimed_email_credits` y asegurando la auto-acreditación inmediata al iniciar sesión.

**Acciones Tomadas:**
- **Plan Maestro (PR #51)**: Documentación de los 6 ejes canónicos: coherencia de precios PayPal/Mercado Pago, auto-acreditación por email, autenticación passwordless (Magic Link / OTP 6 dígitos), alertas WhatsApp (+5493878342772), auditoría nativa de errores y panel admin 360°.
- **Autenticación Passwordless (PR #52)**:
  - `src/shared/core/auth/authService.ts`: implementación de `requestOtp(email)` y `verifyOtp(email, token)` sobre Supabase Auth; función `claimCreditsOnAuth(user)` no bloqueante e idempotente.
  - `src/shared/core/auth/AuthContext.tsx`: expone `requestOtp` y `verifyOtp` actualizando reactivamente la sesión y el perfil.
  - `src/shared/core/storage/dataAccessLayer.ts`: nuevo método `dal.createUnpaidToken()` con fallback seguro a RPC para checkout sin sesión previa.
  - Checkout de invitados en `PdfCheckoutModal.tsx` y `PricingModal.tsx` actualizado para usar la RPC de invitado.
- **Base de Datos (`supabase/migrations/20261030_email_credit_claim_and_admin_error_logs.sql`)**:
  - Tabla `unclaimed_email_credits` con índice único sobre `payment_id` (`<proveedor>:<external_id>`) y RLS estricto.
  - Función transaccional y `SECURITY DEFINER` `claim_credits_on_auth()` que traspasa los créditos al balance real en el primer login.
  - RPC `create_guest_export_token()` para emitir tokens pagables de invitado sin comprometer la tabla `pdf_export_tokens`.
  - Tabla `admin_error_logs` con RLS para registro nativo de excepciones de frontend, webhooks y APIs.
  - Políticas de RLS corregidas en `pdf_export_tokens` para permitir que el usuario consulte sus propios tokens válidos.

**Validación y publicación:**
- `npm run check-all`: 258 pruebas unitarias aprobadas, typecheck en verde, 0 violaciones de gobernanza, prerenderizado de 25 rutas completado.
- PR [#52](https://github.com/kalpa-droid/LEECV/pull/52) aprobada y fusionada con squash a `main`. Commit de merge: `8681abdcf7dda6b1c87ff105447618e78e1651b0`.

## [2026-10-29] - Corrección de hallazgos de auditoría frontend-visual A–F (UI-001 a UI-016)

**Resumen:**
Se implementaron las correcciones de la auditoría UI en modo local (servidor preview sobre `dist`, 3 temas nativos `day`, `night`, `teal_ocean` y simulación móvil 360/390/412 px). Se corrigieron problemas de capas (z-index), contraste WCAG, consistencia de planes de pago, prerenderizado y robustecimiento de scripts de gobernanza.

**Acciones Tomadas:**
- **P1 (Bloqueos de compra y consistencia):**
  - **UI-001** `Modal.tsx`: actualizado a `zIndex.modal` (9999) para evitar que el dock cubra los footers en pantallas de 360 px.
  - **UI-002** `CreditsModal.tsx`: migración de variables inexistentes `--color-accent-blue-*` a tokens semánticos oficiales; el bloque de IA ahora es visible en tema default.
  - **UI-003** `useExportEntitlement.ts`: chequeo de `plan_vence` antes de otorgar exportación ilimitada a planes vencidos.
  - **UI-004** `scripts/prerender.mjs`: canonical tag individualizado por ruta (ya no todas apuntan al home).
  - **UI-005** `scripts/prerenderMeta.mjs`: landing (`/`) incluida en prerenderizado estático con metadatos completos.
  - **UI-006** `CreditsModal.tsx` y `PdfCheckoutModal.tsx`: aplicación de `button.base` (padding, radio y tipografía del sistema de diseño).
  - **UI-007** `PersonalInfoFields.tsx` y `VectorDocViewer.tsx`: contraste corregido a ratios superiores a 4.5:1.
- **P2 (SEO e integridad de textos):**
  - **UI-008** `public/sitemap.xml`: agregados los 21 artículos del blog al sitemap canónico.
  - **UI-009** `index.html`: remoción de `maximum-scale=1.0` (WCAG 1.4.4) y placeholder de verificación de Google; prevención de H1 duplicado en páginas legales.
  - **UI-013** `pricing.ts`: corrección de paréntesis huérfano y traducción de términos técnicos a lenguaje sencillo.
- **P3 (Reglas de prevención y scripts):**
  - **UI-014**: Corrección de 8 interpolaciones rotas de `${elevationSystem.*}` con comillas simples a template literals reales.
  - **UI-015**: Endurecimiento de `audit-ui-tokens.js` (ejecuta `RAW_HEX_REGEX`), `check-token-usage.js` y `check-contrast.js` (detecta variables CSS indefinidas).
  - Creación de allowlist y baselines documentados (`scripts/ui-tokens-allowlist.json` y `scripts/contrast-baseline.json`).

**Validación y publicación:**
- `npm run check-all`: 0 errores en todas las suites.
- PR [#49](https://github.com/kalpa-droid/LEECV/pull/49) fusionada con squash a `main`. Commit de merge: `ad3b2c40531acc1fc5af8b73c9226d8c91101ee1`.

## [2026-10-29] - Suite de auditoría multiagente, SEO y fiscalización de núcleos

**Resumen:**
Se configuró el entorno OpenCode multiagente con delimitación estricta y checklists especializadas para LEECV (PR #46, #47, #48), estableciendo a `@gestor` como orquestador y asignando mandatos profundos de contraste, motores anti-parche, SEO técnico/semántico y pruebas de navegador.

**Acciones Tomadas:**
- Creación de `opencode.json` y `.opencode/agents/` (`gestor`, `arquitecto`, `desarrollo-rapido`, `frontend-visual`, `testing-qa`).
- Integración del comando `/auditar` y checklists en `.opencode/audits/` con registro en `docs/auditoria/registro.md`.
- Mandato a `@frontend-visual` para contraste en 3 temas, gradientes y SEO semántico / Google Search Console.
- Mandato a `@desarrollo-rapido` para fiscalización de motores oficiales según Regla 1 de `AGENTS.md` (DAL, apiClient, navegación, withErrorHandling, validaciones).
- Mandato a `@testing-qa` para auditoría no cosmética (validación de consecuencias de pagos en Supabase), DOM real y SEO técnico (prerender de 24 rutas, sitemap, robots).
- PR [#48](https://github.com/kalpa-droid/LEECV/pull/48) fusionada con squash a `main`. Commit de merge: `5bc7a14ec12b59628aa4ffeb627bc80fb48c48a7`.

## [2026-10-25] - Control manual de exportación PDF, bandeja de pagos retenidos y acreditación idempotente

**Resumen:**
Se incorporó un interruptor administrativo de tres estados para la exportación PDF (`automatic` / `enabled` / `disabled`, es decir automático / permitido manual / bloqueado manual), con auditoría obligatoria y motivo, más una bandeja de pagos retenidos para los cobros que Mercado Pago y PayPal informan como pendientes o en revisión.

**Acciones Tomadas:**
- **Migración `20261014_admin_pdf_export_access.sql`**: agrega `profiles.pdf_export_access_mode`, columnas de resolución en `pending_grants`, índice de retenidos sin resolver y la RPC `check_and_consume_export_entitlement` (permitido manual devuelve `true` sin consumir créditos; bloqueado devuelve `false`; automático respeta plan pro y tokens pagos).
- **Migración `20261025_pdf_export_access_hardening.sql`**: cierra un hueco crítico — `pdf_export_access_mode` no estaba protegido por `protect_privileged_columns`, por lo que cualquier usuario podía auto-habilitarse. Se agrega el trigger, las RPC `admin_set_pdf_export_access` y `admin_export_token_balances`, la vista de auditoría `pdf_status_logs` sobre `admin_audit_logs`, `hold_reason`/`export_token` en `pending_grants` y los checks de estado.
- **Pagos retenidos**: `applyPayment` ahora retiene los pagos con `providerStatus === 'pending'` (motivo `provider_pending`) sin acreditar nada, y guarda `export_token` para poder resolver ventas individuales. Se suman los motivos `amount_mismatch` y `missing_profile`. Mercado Pago interpreta `pending`/`in_process`/`authorized`/`in_mediation`; PayPal interpreta `PAYMENT.CAPTURE.PENDING`.
- **Acreditación idempotente**: el webhook de aprobación acredita el pago y luego resuelve automáticamente la retención previa (`resolveIfPending`), sin reabrir pagos ya completados. La limpieza fallida no tumba el webhook: se registra en Sentry y la fila queda resoluble a mano.
- **Panel admin**: selector de modo con motivo obligatorio (5–500 caracteres), badge de modo, saldo real de exportaciones vía `admin_export_token_balances`, historial de acreditación y bandeja de retenidos (`PaymentsAdminTab`, `PendingGrantsTab`) con resolución manual de packs y de ventas `single_pdf`.
- **Cliente**: `useExportEntitlement` lee el modo y llama a la RPC de consumo; `PdfCheckoutModal` decide el botón con `canExport` en lugar de `credits > 0` y muestra un mensaje específico cuando el acceso está bloqueado.
- **Pruebas**: retención de pagos pendientes, no reapertura de un pago completado, extracción de estados pendientes de ambos proveedores y un test de integración local de los tres estados (incluido el bloqueo de auto-escalada y el registro de auditoría).

**Validación y publicación:**
- `npm run check-all`: aprobado en local y en el hook de pre-push; 258 pruebas OK, 2 omitidas por requerir Supabase local; typecheck, lint, gobernanza, build y SEO en verde.
- `git diff --check`: sin errores de espacios.
- Rama `feat/admin-credit-account-controls`, PR [#44](https://github.com/kalpa-droid/LEECV/pull/44) abierta contra `main`. `check-all` en GitHub Actions ✅.
- PR #44 fusionada con squash el 2026-10-26. Commit de merge en `main`: `fd94f3b117e768cff70604628aaf7ce24b97c194`.

**Despliegue de base de datos:**
- Ambas migraciones quedaron aplicadas en el proyecto `gzsdmsiefswgnyycrmsk` (verificado con `supabase migration list`: `20261014` y `20261025` figuran en remoto).
- Hallazgo durante la aplicación: la base no tenía `public.admin_audit_logs` porque `20260820_protect_plan_columns_and_claims.sql` nunca se aplicó completa (sólo existía `payment_claims`). La `20261025` ahora crea la tabla de forma idempotente con su RLS y política de lectura para admin, así que la vista `pdf_status_logs` y el RPC funcionan sin depender de esa migración vieja.
- Prueba de humo ejecutada en una transacción revertida: `admin_set_pdf_export_access` devolvió `automatic -> enabled`, la vista registró el motivo y `admin_export_token_balances` respondió vacío. No quedaron cambios de datos.
- Durante la verificación se corrigió el consumidor que ya existía roto: `dal.adminAuditLogs` (`src/shared/core/storage/dataAccessLayer.ts`) escribía y buscaba `performed_by`/`action`, pero el esquema canónico usa `admin_id`/`action_type`. Ahora inserta y lista con las columnas correctas; la búsqueda por admin compara `admin_id` por igualdad y solo con un uuid completo (la columna es uuid, no admite ILIKE).
- Además, `admin_audit_logs` no tenía política de INSERT, así que el panel no podía registrar acciones aunque las columnas fueran correctas. Se agregó la política `admin inserta logs` para `authenticated` con `is_admin(auth.uid())` y `admin_id = auth.uid()`, y ya está aplicada en la base.

## [2026-10-10] - Integración del flujo de postulaciones, cartas e importación revisable

**Resumen:**
Se integró la preparación de postulaciones al editor de CV, manteniendo intacto el CV maestro y vinculando cada copia a su vacante y carta de presentación.

**Acciones Tomadas:**
- Se agregó la creación de una copia independiente para cada postulación, con captura compartida de información de la vacante.
- Se integró una pestaña de carta editable al CV, con borrador de IA revisable, visor y exportación separada. La carta reutiliza colores y tipografía de la versión del CV.
- Se centralizó la importación de copia de LinkedIn, archivos PDF/foto y texto pegado. Los datos extraídos pasan por una revisión explícita antes de combinarse; los datos existentes se conservan por defecto y las listas se revisan por registro.
- Se añadieron propuestas asistidas por IA para adaptar el objetivo, el resumen y las competencias con base en la información disponible, sin aplicarlas automáticamente.
- Se ajustaron estilos y se ejecutó la auditoría de contraste en los temas soportados.

**Validación y publicación:**
- `npm run check-all`: aprobado; 33 archivos de prueba y 236 pruebas pasaron.
- La PR [#32](https://github.com/kalpa-droid/LEECV/pull/32) se fusionó el 2026-10-10. Commit de merge: `4f2852686417b002bceba11219cd75d5abd6747e`.
- Verificación manual de navegación en escritorio y móvil, creación de postulación, vista de carta y apertura de la exportación separada.
- Durante la prueba local, Supabase respondió 404 para `template_presets`; se registró como incidencia ajena a la integración y pendiente de revisión del backend.

## [2026-09-27] - Remoción de Lógica Stateful de Pagos y Publicación Web

**Resumen:**
Migración a una arquitectura de facturación stateless ("guest-first") donde el estado del checkout depende únicamente de un `exportToken` emitido por Lemon Squeezy en lugar de una sesión de usuario.

**Acciones Tomadas:**
- **Eliminación de features deprecadas**: Se removieron por completo `AuthProvider`, `CloudStatusModal`, `AccountMenuButton`, e integraciones con `seoIndexingEngine` relacionadas con publicación web.
- **Refactorización de `applyPayment`**: Se actualizó `src/shared/core/payments/applyPayment.ts` para soportar pago sin autenticación, usando el `exportToken` (pasado en custom_data de Lemon Squeezy o webhook metadata) para activar el documento en la tabla `pdf_export_tokens`.
- **Mocking en Tests**: Se actualizaron las baterías de tests (`tests/applyPayment.test.ts` y `tests/paymentProviders/paymentWebhookIntegration.test.ts`) pasando un `fakeAdminClient` explícito para testear las llamadas de Supabase Admin (utilizando `from().update().eq()`).
- **Unificación de Componentes**:
  - `PdfCheckoutModal.tsx` fue actualizado para manejar el flujo sin Auth y despachar el `exportToken`.
  - Se creó/actualizó `usePageAwareCreditGate` y se incorporó exitosamente en el Navbar del CV, en el `TemplateMenu.tsx` y en el export de `App.tsx` para interceptar descargas de forma unificada en todo el proyecto.
- **Auditorías**: Se removieron chequeos de `canPublish` de `verify-document-engine-contract.cjs` ya que la función ya no existe.

**Estado Actual:**
- La base de código compila satisfactoriamente.
- `npm run check-all` debe pasar exitosamente.
