# Estado del Proyecto & Hilo Conductor

## 1. Visión y Stack
- **Tipo**: Webapp moderna (React / Vite + Tailwind CSS)
- **Base de Datos y Auth**: Supabase
- **Control de Versiones**: GitHub (rama protegida `main`, CODEOWNER = Kalpa)
- **Despliegue y Hosting**: Vercel

## 2. Decisiones Arquitectónicas
- [2026-10-29] Auditoría @frontend-visual A–F ejecutada sobre app en local (`preview` en `:4173` sobre `dist`), 3 temas (default/day, dark/night, teal_ocean), móvil 360/390/412 px mediante iframe. Se corrigieron hallazgos P1/P2/P3 y se endurecieron los scripts de auditoría como reglas de prevención.
- [2026-10-29] PR #49 abierto contra `main`; `npm run check-all` pasa con 0 errores localmente y en pre-push (husky).
- [2026-10-30] **Modelo de créditos confirmado (Etapa 1, pagos/admin/magic-link):** 1 crédito de exportación = 1 fila en `public.pdf_export_tokens` con `user_id`, `paid = true`, `consumed = false`. `public.pdf_export_credits` es legado y NO lo consume `check_and_consume_export_entitlement()`. La clave de idempotencia de cualquier acreditación es `payment_id = '<proveedor>:<external_id>'` (la misma de `pdf_export_token_grants` y de `applyPayment.ts`).
- [2026-10-30] **Identidad de cobro = email verificado de `auth.users`.** `p_email` en `claim_credits_on_auth()` es sólo control cruzado; nunca decide a quién se acredita (evita que un usuario reclame créditos de otro email).

## 3. Registro de Tareas
- [x] Auditoría estática y visual A–F (tokens, contraste, móvil, checkout, textos, SEO semántico)
- [x] Corrección P1: z-index modal vs dock (UI-001), bloque IA invisible (UI-002), plan_vence en useExportEntitlement (UI-003), canonical por ruta (UI-004), landing prerenderizada (UI-005), button.base en modales de pago (UI-006)
- [x] Corrección P2: contraste PersonalInfoFields + VectorDocViewer (UI-007), sitemap 21/21 artículos (UI-008), máximo-scale + verification placeholder + H1 duplicado (UI-009), copy stale en pricing.ts (UI-013)
- [x] Corrección P3: interpolación de elevationSystem (UI-014), scripts de auditoría endurecidos (UI-015), gradientSystem huérfano detectado (UI-016)
- [x] check-ui-tokens (0 fugas), check-token-usage (warn 3 huérfanos), check-contrast (0 nuevas, 24 en baseline)
- [x] build, typecheck, verify:seo (40/40), verify:pricing-sync, PDF smoke, todos los verify:*
- [x] **Etapa 1 (DB/RPC)** del plan de pagos/admin/magic-link: migración `20261030_email_credit_claim_and_admin_error_logs.sql` creada (sin aplicar todavía)
- [ ] Aplicar la migración `20261030_*` en Supabase (`supabase db push`) — requiere autorización de Kalpa
- [x] `developer` (Etapa 1, código): `requestOtp` / `verifyOtp` en `authService.ts`, `claimCreditsOnAuth()` invocado tras OTP y al restaurar sesión, y `dal.pdfExportTokens.createUnpaidToken()` (RPC de invitado) usado por `PdfCheckoutModal` y `PricingModal`
- [x] `developer` (Etapa 2): `applyPayment.ts` integrado con `unclaimed_email_credits`; alertas WhatsApp no bloqueantes a +5493878342772 integradas; contratos `admin_notifications`/`payment_claims` sincronizados
- [x] `frontend-visual` (Etapa 3): Login Passwordless (`LoginPasswordlessModal.tsx` con `requestOtp`/`verifyOtp`), botón WhatsApp en checkout (`PdfCheckoutModal.tsx`), UsersTab con créditos rápidos + WA (`UsersTab.tsx`), pestaña Auditoría (`AuditAndErrorsTab.tsx`)

## 4. Bitácora de Traspaso de Agentes (Handoff Log)
### 2026-10-31 - Agente: @desarrollo-rapido (Plan Mejora IA + Show Password) — V2.4.0
- **Acción realizada**: Plan `plan-mejora-ia-extraccion-y-show-password.md` ejecutado. Rama `feat/mejora-ia-show-password`. Eje 2 (show password) completo (`LoginModal.tsx`). Eje 1 (bugs IA críticos): `supportsImages` en providers, filtro por imagen, `requiresAuth: false`, retry JSON, `auxiliaryText`. Eje 3 (mejoras): prompt estricto, `maxTokens` 4000, `responseSchema` completo. Eje 4: 4 tests nuevos. Eje 5: `version.ts` V2.4.0.
- **Archivos afectados**: `LoginModal.tsx`, `api/_lib/aiProviders/types.ts`, `gemini.ts`, `groq.ts`, `registry.ts`, `api/cv-import-api.ts`, `ImportCvAiModal.tsx`, `tests/*.test.ts`, `version.ts`.
- **Estado**: Rama creada; cambios locales hechos; push a `origin/feat/mejora-ia-show-password` confirmado (`b0f8419`). `npm run typecheck` = 0 errores; `npm test` = 278 passed / 2 skipped (4 nuevos); `check-contrast` = 0 nuevas; `check-module-boundaries` = 0 violations; `check-plain-language` = 0. Pre-commit (husky) pasó. Pendiente: abrir PR contra `main`, esperar `check-all` verde en GitHub Actions, y aprobación CODEOWNER (Kalpa) para merge.
- **Instrucción para siguiente agente**: Confirmar `npm run check-all` = 0 errores, hacer commit semántico (`feat: mejora IA extracción + show password V2.4.0`), push a `feat/mejora-ia-show-password`, abrir PR contra `main`, esperar check-all verde y aprobación CODEOWNER de Kalpa.

### 2026-10-31 - Agente: @desarrollo-rapido (Auth & IA Import) — V2.3.2
- **Acción realizada**: Incorporado botón de "Iniciar sesión" en la Landing Page (header y hero). Resuelta la persistencia de sesión al registrarse o iniciar sesión (actualización síncrona de React en `AuthContext`, soporte dual para código OTP de 6 dígitos sin contraseñas y login por contraseña con feedback claro si requiere confirmación de email). Eliminado el bloqueo innecesario que impedía importar PDF con IA a usuarios invitados.
- **Archivos afectados**: `src/modules/landing/LandingPage.tsx`, `src/app/App.tsx`, `src/app/AppModals.tsx`, `src/modules/auth/components/LoginModal.tsx`, `src/modules/cv-builder/components/modals/ImportCvAiModal.tsx`, `src/modules/payments/components/CreditsModal.tsx`, `src/shared/core/auth/AuthContext.tsx`, `src/shared/core/auth/authService.ts`, `src/shared/core/version.ts`.
- **Estado del código**: Estable. `npm run typecheck` = 0 errores. Vitest: 273 pasadas. `npm run check-contrast` = 0 nuevas violaciones. `check-plain-language` = 0 violaciones.
- **Instrucción para el siguiente agente**: Todo listo para mergear a main vía PR según reglas de gobernanza.

### 2026-10-29 - Agente: Antigravity (IA ejecutor)
- **Acción realizada**: Ejecutó auditoría completa A–F e implementó todas las correcciones P1/P2 y la mayoría P3 en rama `feat/auditoria-ui-corregir-hallazgos`. Abrió PR #49 contra `main`.
- **Archivos afectados**: 21 archivos (ver commit cb9e7af), entre ellos `src/shared/core/ui/Modal.tsx`, `useExportEntitlement.ts`, `scripts/audit-ui-tokens.js`, `scripts/check-contrast.js`, `scripts/check-token-usage.js`, `scripts/prerender.mjs`, `scripts/prerenderMeta.mjs`, `public/sitemap.xml`, `index.html`, `src/modules/payments/components/CreditsModal.tsx`, `PdfCheckoutModal.tsx`.
- **Estado del código**: Estable. `npm run check-all` = 0 errores. Pre-commit y pre-push (husky) pasaron todos los checks. `tsconfig.tsbuildinfo` incluido en commit (archivo generado, inofensivo).
- **Instrucción para el siguiente agente**: Kalpa (dueño/CODEOWNER) debe revisar y aprobar PR #49 (toca `src/shared/core/`). Una vez mergeado, ejecutar `git fetch origin && git log origin/main -1 --format="%H %s"`, confirmar que el hash coincide con el merge, y registrar la intervención en `SESSION_LOG.md`.

### 2026-10-30 - Agente: @arquitecto (DB/Supabase) — Etapa 1
- **Acción realizada**: Creó la migración `supabase/migrations/20261030_email_credit_claim_and_admin_error_logs.sql` con el bolsillo de créditos por email (`unclaimed_email_credits`), el RPC de auto-acreditación (`claim_credits_on_auth`), el registro de errores del panel (`admin_error_logs`), el cierre del hueco de RLS de lectura de `pdf_export_tokens` y un RPC para crear tokens de invitado sin abrir la tabla. **No se aplicó en la base** (pendiente de autorización).
- **Archivos afectados**: `supabase/migrations/20261030_email_credit_claim_and_admin_error_logs.sql` (nuevo, 400 líneas), `.opencode/CONTEXT.md`.
- **Estado del código**: SQL escrito y revisado a mano; no hay Docker/psql en la máquina, así que no se pudo ejecutar un dry-run local. Verificado contra la base real vía PostgREST: `unclaimed_email_credits` y `admin_error_logs` NO existen todavía (no hay conflicto de esquema) y `anon` no ve filas de `pdf_export_tokens` (la política permisiva vieja no está activa).
- **Instrucción para el siguiente agente**: `developer` implementa `requestOtp`/`verifyOtp` en `authService.ts` y llama `claim_credits_on_auth` después de cada login (ver contrato abajo). Kalpa autoriza `supabase db push` antes de probar el flujo real.

#### Contrato de la Etapa 1 para `developer`
1. **Tablas nuevas**
   - `public.unclaimed_email_credits(id, email, credits, payment_id, provider, plan, amount, currency, claimed_at, claimed_by, claim_payment_id, created_at)`. RLS ON. SELECT/UPDATE/DELETE sólo admin (`public.is_admin(auth.uid())`). **Sin política de INSERT**: sólo `service_role` (webhooks) escribe.
   - `public.admin_error_logs(id, level, source, message, context, user_id, user_email, request_path, provider, external_id, fingerprint, resolved_at, resolved_by, created_at)`. RLS ON. SELECT/UPDATE/DELETE sólo admin; INSERT permitido a `anon` y `authenticated` con `source = 'frontend'` y `user_id is null or user_id = auth.uid()`.
2. **RPC `claim_credits_on_auth(p_user_id uuid default null, p_email text default null)`** → devuelve **una fila** `{ credits_claimed, rows_claimed, guest_tokens_linked, matched_email }`.
   - Llamar SIEMPRE después de `verifyOtp` / de restaurar sesión:
     ```ts
     const { data, error } = await supabase.rpc('claim_credits_on_auth', {
       p_user_id: user.id,
       p_email: user.email,
     }).maybeSingle();
     ```
   - Es idempotente: llamarlo en cada login no duplica créditos. No hace falta chequear nada antes.
   - Errores esperables: `42501` (email no coincide con la sesión / intento de reclamar para otro usuario), `P0002` (usuario sin email).
3. **RPC `create_guest_export_token(p_email text, p_doc_type text default null)` → uuid**
   - Reemplaza a `dal.pdfExportTokens.insert(...)` en el checkout de invitado (`PdfCheckoutModal`, `PricingModal`). Motivo: `insert().select('token')` con RLS y sin política SELECT para `anon` no devuelve la fila insertada.
4. **Lo que NO hay que hacer**
   - No escribir en `unclaimed_email_credits` desde el frontend (no hay política de INSERT).
   - No usar `pdf_export_credits` (legado).
   - No acreditar packs por email desde `applyPayment` con `grant_export_tokens` si no hay perfil: va a `unclaimed_email_credits` con `payment_id = '<proveedor>:<external_id>'`.
5. **Tipos TS** (el repo NO usa tipos generados de Supabase; `supabaseClient` es untyped, así que no se generó `database.types.ts` para no dejar un archivo muerto). Si hacen falta, usar estos shapes:
   ```ts
   type UnclaimedEmailCredit = {
     id: string; email: string; credits: number; payment_id: string | null;
     provider: string | null; plan: string | null; amount: number | null; currency: string | null;
     claimed_at: string | null; claimed_by: string | null; claim_payment_id: string | null; created_at: string;
   };
   type AdminErrorLog = {
     id: string; level: 'debug' | 'info' | 'warning' | 'error' | 'critical';
     source: 'frontend' | 'webhook' | 'api' | 'database' | 'pdf' | 'auth' | 'other';
     message: string; context: Record<string, unknown>;
     user_id: string | null; user_email: string | null; request_path: string | null;
     provider: string | null; external_id: string | null; fingerprint: string | null;
     resolved_at: string | null; resolved_by: string | null; created_at: string;
   };
   type ClaimCreditsResult = {
     credits_claimed: number; rows_claimed: number; guest_tokens_linked: number; matched_email: string;
   };
   ```

#### Defectos detectados que bloquean Etapas 2 y 3 (no se tocaron en esta migración)
1. `admin_notifications.type` tiene un CHECK que sólo admite `payment_received | payment_pending_review | plan_expiring | plan_downgraded | retention_offer_sent`, pero `applyPayment.ts` inserta `payment_pending`, `payment_mismatch` y `pending_grant` → **toda notificación de retención falla** (el error se traga en `serverDal.adminNotifications.create`, que sólo hace `console.error`).
2. `serverDal.adminNotifications.create` manda la columna `message`, pero la tabla tiene `detail` → falla por columna inexistente. Arreglar en código (`detail: message`), no duplicando columnas.
3. `serverDal.manualClaims.updateStatus` escribe `payment_claims.updated_at`, columna que no existe en ninguna migración → aprobar un comprobante manual falla.
4. `admin_error_logs` no tiene todavía consumidor en el frontend; la pestaña `AuditAndErrorsTab.tsx` es Etapa 3.

### 2026-10-30 - Agente: @desarrollo-rapido (developer) — Etapa 1, código de auth OTP + claim
- **Acción realizada**: Implementó el código de la Etapa 1 del plan de pagos/admin/magic-link.
  - `src/shared/core/auth/authService.ts`: nuevos `requestOtp(email)` (`signInWithOtp` con `shouldCreateUser: true`) y `verifyOtp(email, token)` (`verifyOtp` type `email`, devuelve `{ user, session }`). Nuevo `claimCreditsOnAuth(user)` que llama `supabase.rpc('claim_credits_on_auth', { p_user_id, p_email }).maybeSingle()`; se invoca (a) tras `verifyOtp` y (b) dentro de `getCurrentProfile()` (cubre restauración de sesión y el `onAuthStateChange` de `AuthContext`). `claimCreditsOnAuth` **nunca lanza**: si el RPC no existe todavía o falla, hace `console.warn` y sigue, para no romper el login.
  - `src/shared/core/auth/AuthContext.tsx`: expone `requestOtp` y `verifyOtp` en el contexto (con `useCallback`) y actualiza `user`/`profile` al confirmar el código, sin esperar el evento de Supabase. `login`/`signup` con contraseña siguen intactos (sólo admin).
  - `src/shared/core/storage/dataAccessLayer.ts`: `dal.pdfExportTokens.insert()` fue reemplazado por `createUnpaidToken({ email, doc_type?, user_id? })`. Con `user_id` (sesión iniciada) inserta atado al usuario; sin sesión (invitado) usa el RPC `create_guest_export_token(p_email, p_doc_type)` que devuelve el uuid suelto. También sirve de respaldo si el insert no devuelve fila.
  - `src/modules/cv-builder/components/modals/PdfCheckoutModal.tsx` y `src/modules/payments/components/PricingModal.tsx`: usan `createUnpaidToken(...)`.
- **Archivos afectados**: los 4 anteriores + `.opencode/CONTEXT.md`.
- **Estado del código**: Estable. `npm run typecheck` = 0, `npm run typecheck:api` = 0, `npm run lint` = 0 errores (sólo warnings de baseline), `npm run test` = 258 passed / 2 skipped, `check-module-boundaries` = 0 violaciones, `check-plain-language` OK. No se corrió `check-all` completo (incluye build + SEO), pero los pasos que tocan estos archivos pasan.
- **Pendiente / notas para el siguiente agente**:
  1. **La migración `20261030_*` sigue sin aplicar.** Hasta que Kalpa autorice `supabase db push`, `claim_credits_on_auth` y `create_guest_export_token` no existen: el claim fallará en silencio (warn) y el checkout de invitado devolverá `null` → `PdfCheckoutModal` mostrará "Error al inicializar el checkout". Probar el flujo real sólo después del push.
  2. `create_guest_export_token` no acepta `user_id`. Por eso el checkout con sesión iniciada conserva el insert directo (funciona gracias a la política `usuario lee sus propios tokens` de la migración). Si `database` quiere unificar, puede agregar `p_user_id uuid default null` validando `p_user_id is null or p_user_id = auth.uid()`; entonces `createUnpaidToken` puede pasar a usar sólo el RPC.
  3. `developer` (siguiente etapa de UI): la pantalla de ingreso sin contraseña (pedir código → confirmar) debe usar `useAuth().requestOtp` / `useAuth().verifyOtp`; no hace falta volver a tocar `authService`.
  4. Los cambios están en el árbol de trabajo sobre `main` (sin commit). `devops` debe crear rama `feat/auth-otp-claim-credits`, commit y PR; toca `src/shared/core/` → requiere aprobación de Kalpa (CODEOWNERS).

### 2026-10-30 - Agente: @gestor (orquestación) — Etapa 1 cerrada, PR #52 abierto
- **Acción realizada**: Coordinó la Etapa 1 completa (DB/RPC con `database` + código de auth con `developer`). Creó la rama `feat/auth-otp-magic-link`, commiteó (`220c232`, 7 archivos, +617/−13) y abrió el PR **#52** contra `main`: https://github.com/kalpa-droid/LEECV/pull/52
- **Archivos afectados**: `src/shared/core/auth/authService.ts`, `src/shared/core/auth/AuthContext.tsx`, `src/shared/core/storage/dataAccessLayer.ts`, `src/modules/cv-builder/components/modals/PdfCheckoutModal.tsx`, `src/modules/payments/components/PricingModal.tsx`, `supabase/migrations/20261030_email_credit_claim_and_admin_error_logs.sql`, `.opencode/CONTEXT.md`.
- **Estado del código**: Estable. `npm run check-all` completo = 0 errores (258 tests, typecheck, lint, build, prerender 25 rutas, verify:* 60/60, SEO 40/40, PDF smoke 4/4, contraste/tokens, pricing-sync). Pre-commit y pre-push (husky) en verde.
- **Instrucción para el siguiente agente**:
  1. Kalpa autoriza y ejecuta `supabase db push` (proyecto `gzsdmsiefswgnyycrmsk`) — la migración NO está aplicada.
  2. Kalpa revisa y aprueba el PR #52 como CODEOWNER (toca `src/shared/core/`).
  3. Tras el merge: `git fetch origin && git log origin/main -1 --format="%H %s"`, confirmar hash y registrar en `SESSION_LOG.md`.
  4. Etapa 2 (pendiente): `applyPayment.ts` debe escribir en `unclaimed_email_credits` (no en `pending_grants`) cuando el pack se paga sin perfil; corregir los 3 defectos de contrato de `admin_notifications`/`manualClaims` documentados arriba.

### 2026-10-30 - Agente: @frontend-visual — Etapa 3 (UI / Login + Admin)
- **Acción realizada**: Implementó `LoginPasswordlessModal.tsx` (Paso 1 email + `requestOtp`, Paso 2 código + `verifyOtp`), botón WhatsApp (`+5493878342772`) en `PdfCheckoutModal.tsx`, créditos rápidos (+1/+5/+10) y botón WA en `UsersTab.tsx`, pestaña `AuditAndErrorsTab.tsx` con lectura de `admin_error_logs` y filtros por `level`.
- **Archivos afectados**: `src/modules/auth/components/LoginPasswordlessModal.tsx`, `src/modules/auth/components/LoginModal.tsx`, `src/modules/cv-builder/components/modals/PdfCheckoutModal.tsx`, `src/modules/admin/components/UsersTab.tsx`, `src/modules/admin/components/AuditAndErrorsTab.tsx`, `.opencode/CONTEXT.md`.
- **Estado del código**: Estable. `npm run typecheck` = 0 errores. No hay fugas de color dinámico en Tailwind (Regla 2 verificada). Componentes reutilizan `useAuth`, `Field`, `Modal`, `button` y `useToast` (Regla 1).
- **Instrucción para el siguiente agente**: `testing-qa` (Etapa 4) debe ejecutar `check-all` completo (`npm run check-all`) y validar visualmente el flujo OTP en local (`npm run preview`) y el panel admin (`AuditAndErrorsTab`). Requiere aprobación de Kalpa como CODEOWNER (toca `src/modules/`).
- **Nota**: La migración `20261031_fix_payments_admin_contracts.sql` fue creada pero NO está aplicada en la base remota (pendiente `supabase db push` por `database`/`devops`).

### 2026-10-31 - Agente: @testing-qa — Etapa 4 (Batería E2E y Certificación Integral)
- **Acción realizada**: Creó la suite de tests de integración de extremo a extremo `tests/planPagosAdminMagicLink.integration.test.ts` cubriendo:
  1. Coherencia estricta de precios para los 3 niveles oficiales en Mercado Pago (ARS 3.200, 12.500, 21.000) y PayPal (USD 2.60, 10.00, 17.00).
  2. Idempotencia de webhooks (mismo payment_id repetido no otorga duplicados).
  3. Detección de discrepancias de monto (quarantine en pending_grants + alertas WhatsApp a +5493878342772).
  4. Flujo de compra como invitado (guardado en unclaimed_email_credits con estado held).
  5. Autenticación passwordless: requestOtp, verifyOtp y reclamo automático claimCreditsOnAuth.
  6. Despachador de alertas WhatsApp no bloqueante y tolerante a fallos.
- **Resultado de pruebas**: 15/15 tests passing en la suite, 273/275 tests passing globales en Vitest (2 tests saltados por requerir conexión remota viva).
- **Base de datos remota**: Confirmada la aplicación exitosa de ambas migraciones (`20261030` y `20261031`) en Supabase producción (`gzsdmsiefswgnyycrmsk`).

### 2026-10-31 - Agente: @gestor (orquestación) — Etapa 5 (Certificación y cierre del plan maestro)
- **Acción realizada**: Certificó el plan maestro completo. PRs #52, #54, #55 y #56 mergeados en `main`. Commits: `8681abd` (Etapa 1), `fd20051` (Etapas 2+3), `04c8f01` (docs), `1095196` (Etapa 4).
- **Estado del código**: `npm run check-all` = 0 errores. Tests: 273 passing / 2 skipped (requieren conexión remota viva). Base de datos remota: migraciones aplicadas y verificadas. Despliegue: Vercel productivo actualizado.
- **Instrucción para el siguiente agente**: El plan maestro está cerrado y certificado. Los únicos pasos restantes son la verificación manual contra la base de producción real (ver checklist en el último mensaje del usuario).

### 2026-10-31 - Agente: @frontend-visual — Regla de Versionado (Nueva Gobernanza)
- **Acción realizada**: Creó `src/shared/core/version.ts` con `LEECV_VERSION` canónico y actualizó los footers de `LandingPage.tsx` y `BlogModule.tsx` para mostrar la versión (`V2.3.0`) junto al copyright.
- **Regla de versionado para todos los agentes** (agregar a `AGENTS.md`):
  - **PATCH** (V2.x.y → V2.x.y+1): fixes, ajustes UI mínimos, correcciones de bug.
  - **MINOR** (V2.x.y → V2.(x+1).0): nueva funcionalidad, componente nuevo, integración backend.
  - **MAJOR** (V2.x.y → V3.0.0): cambio de arquitectura, nuevo esquema DB principal, nuevo eje del plan.
  - Actualizar `src/shared/core/version.ts` ANTES del commit que aplica el cambio.
- **Archivos afectados**: `src/shared/core/version.ts` (nuevo), `src/modules/landing/LandingPage.tsx`, `src/modules/blog/BlogModule.tsx`, `.opencode/CONTEXT.md`.

### 2026-10-31 - Agente: @desarrollo-rapido & @arquitecto — Resiliencia en AdminDashboard (V2.3.1)
- **Acción realizada**:
  1. `api/_lib/serverDal.ts`: desacopló la consulta de `user_credits` en `listCustomers` para no depender de la relación PostgREST con `profiles` (consultas independientes y tolerantes a errores para saldos y créditos de IA).
  2. `src/modules/admin/adminService.ts`: agregó fallback resiliente a Supabase DAL en `listCustomers` y respuestas por defecto seguras en `getIntegrationsStatus`, `listProcessedPayments` y `listPendingGrants`, permitiendo que el panel admin funcione tanto en `localhost` (sin Vercel Serverless activo) como en producción sin trabarse por alertas de red.
  3. `src/shared/core/version.ts`: bump PATCH a V2.3.1 conforme a gobernanza.

### 2026-11-12 - Agente: @antigravity — Fase 2 Resiliencia OCR Multimodal (V2.8.6)
- **Acción realizada**: Implementó la directiva `.opencode/plans/directiva-opencode-fase2-resiliencia-ocr.md` (Opción B de `mejoraocr.docx`) en la rama `feat/gemini-multimodal-resilience`:
  1. **Groq Multimodal (Visión) + Rotación Multi-Key**: `groq.ts` habilita `supportsImages: true`, usa `GROQ_VISION_MODEL` (default `llama-3.2-11b-vision-preview`) con fallback a `meta-llama/llama-4-scout-17b-16e-instruct`; payload OpenAI Vision (`image_url`); `response_format: { type: 'json_object' }` cuando hay `responseSchema`. En `cv-import-api.ts` acción `consolidate-ats` usa `getNextAvailableKey('groq')` rotando por todas las `GROQ_API_KEYS` y ante 429 hace `markKeyRateLimited('groq', key, 60)` en lugar de abortar.
  2. **Presupuesto Global 50s**: `gemini.ts` define `requestDeadline = Date.now() + 50_000` y por candidato `remainingMs < 4000 -> break`; `attemptTimeoutMs = Math.min(18000, remainingMs)` y `AbortSignal.timeout(attemptTimeoutMs)`. `cv-import-api.ts` aplica el mismo guard en los bucles de proveedores (consolidate-ats y extract-page).
  3. **Guardado Progresivo por Página**: en `ImportCvAiModal.tsx`, el bucle PDF llama `saveDraft(mergeFragments(fragments))` tras cada `fragments.push(fragment)`, resguardando páginas leídas en `localStorage` bajo `leecv_last_imported_draft` antes de conectar con el editor.
  4. **Reintento Selectivo en UI**: en estado `done` con `failedPages.length > 0` hay lista de páginas omitidas y botón "Reintentar páginas pendientes"; `retrySelectivePages` recarga el PDF, reprocesa solo los índices fallidos, fusiona por orden de página (`fragmentsByPageRef`) y actualiza consolidado y borrador.
  5. **Versión y Tests**: `version.ts` -> V2.8.6 (stage "Pipeline OCR completo"); `tests/aiProviderImageSupport.test.ts` actualizado para Groq visión.
- **Archivos afectados**: `api/_lib/aiProviders/gemini.ts`, `api/_lib/aiProviders/groq.ts`, `api/cv-import-api.ts`, `src/modules/cv-builder/components/modals/ImportCvAiModal.tsx`, `src/shared/core/version.ts`, `tests/aiProviderImageSupport.test.ts`, `.opencode/plans/directiva-opencode-fase2-resiliencia-ocr.md`.
- **Estado del código**: `npm run check-all` = 0 errores (tests 300 passed / 2 skipped, build y SEO OK, prerender 80 rutas). `tsconfig.tsbuildinfo` restaurado. `SESSION_LOG.md` no tocado.
- **PR #79** actualizado con el commit `6d07779`. Persiste `mejoraocr.docx` sin trackear localmente.
- **Instrucción para el siguiente agente**: Confirmar verde en GitHub Actions (`check-all`) del PR #79. NO mergear sin aprobación CODEOWNER de Kalpa. Tras merge, `git fetch origin && git log origin/main -1 --format="%H %s"`, confirmar hash y registrar en `SESSION_LOG.md`.

### 2026-11-13 - Agente: @antigravity — Fase 2 Remediación (V2.8.7)
- **Acción realizada**: Remediación de hallazgos sobre V2.8.6 (rama `fix/groq-live-models-retry`):
  1. **Groq con modelos vigentes (nov-2026)**: `groq.ts` — GROQ_TEXT_MODEL `llama-3.3-70b-versatile` (deprecado 2026-08-16, enterprise-only) → `openai/gpt-oss-120b`; GROQ_VISION_MODEL `llama-3.2-11b-vision-preview` (shutdown 2025-04-14) → `qwen/qwen3.8-27b` (único vision vigente, soporta JSON mode); GROQ_VISION_FALLBACK idem con override por env; displayName `Groq Cloud (GPT-OSS 120B + Qwen 3.8 Visión)`. Nota: el 4-scout (fallback anterior, shutdown 2026-07-17) también estaba muerto — las 3 referencias Groq de V2.8.6 estaban deprecadas para free/developer tier.
  2. **Reintento selectivo sin pérdida silenciosa**: `ImportCvAiModal.retrySelectivePages` acumula páginas que vuelven a fallar (`stillFailed`) y hace `setFailedPages(stillFailed)` — el aviso de páginas omitidas y el botón de reintento persisten hasta lograrlo.
  3. **Rotación multi-key y telemetría**: `extract-page` y `ai-generate` replican el loop de rotación de `consolidate-ats` (hasta 8 claves por proveedor, salto con 429 + `markKeyRateLimited`, guard de 4000ms restantes). `AiCompletionResponse` incluye `modelUsed?` (poblado en `gemini.ts`/`groq.ts`); telemetría (`extract-page`, `consolidate-ats`, `ai-generate`) loguea el modelo efectivo en vez de `defaultModel`, y consolidate-ats ahora loguea uso. Cooldowns siguen en memoria (limitación documentada en `keyRotation.ts`; store compartido + cron de ping queda como trabajo aparte con tabla Supabase + RLS).
  4. **Versión**: V2.8.7 en `version.ts`. Tests actualizados (`aiProviderImageSupport.test.ts`).
- **Estado del código**: `npm run check-all` pendiente de correr. `SESSION_LOG.md` y `mejoraocr.docx` no tocados.
- **Instrucción para el siguiente agente**: confirmar check-all verde local y en la PR; merge solo por orden explícita de Kalpa (la web de GitHub fallaba con "server unable to perform this operation"; funcionó merge por REST `PUT /repos/{repo}/pulls/{n}/merge` con squash).

### 2026-11-13 - Agente: @antigravity — Cooldown compartido de API keys (V2.9.0)
- **Acción realizada**: Cooldowns de API keys de IA extraídos de la memoria del proceso a Supabase (rama `feat/shared-key-cooldown`):
  1. Migración `supabase/migrations/20261113_ai_key_cooldowns.sql`: tabla `public.ai_key_cooldowns` (`provider`, `key_hash` SHA-256, `paused_until`, `updated_at` + trigger), PK `(provider, key_hash)`, RLS ON SIN policies (acceso solo service_role vía `supabaseAdmin`), índice en `paused_until`.
  2. `keyRotation.ts` reescrito a híbrido async: `getNextAvailableKey`/`markKeyRateLimited` ahora `async`; lectura de cooldowns con timeout 1500 ms y fallback fail-safe a memoria local si la DB falla; `markKeyRateLimited` upsert en DB + memoria; nueva export `clearExpiredCooldowns()` y `hashKey()` (SHA-256, nunca la key en texto).
  3. Call sites actualizados con `await`: `cv-import-api.ts` (×6, incl. `Promise.all` para diagnóstico `allKeysMissing/allRateLimited` y primer `keyAvailability`), `ai-generate.ts` (×2). `scripts/verify-ai-engine.ts` adaptado a async (top-level await, type: module).
  4. Nuevo cron `api/cron-ai-keys-ping.ts`: borra cooldowns expirados y pinguea ambos providers vía `AI_PROVIDERS` + `ping()`; si alguno no está `active`, `captureBackendException` (Sentry). Registrado en `vercel.json` **diario** (`0 6 * * *`) — el plan Hobby de Vercel solo permite un cron al día; inicialmente previsto cada 6 h pero Vercel lo rechazó. Protegido por `CRON_SECRET`.
  5. Versión V2.9.0; test nuevo `tests/keyRotation.test.ts` (supabaseAdmin mockeado: hashKey, lectura pausada en DB/memoria, fail-safe DB caída, upsert con hash, clearExpiredCooldowns).
- **Estado del código**: `npm run check-all` exit 0 (312 tests passed / 2 skipped, 0 violations, 0 errores TS/lint).
- **PENDIENTE — migración SQL NO aplicada**: la CLI de Supabase devolvió 401 `Invalid access token` (no hay MCP de Supabase en este entorno). La migración está commiteada pero el `CREATE TABLE` AÚN no corre en el proyecto remoto. Sin ella, el código funciona en modo fail-safe (memoria local) y loguea el error de la DB — no rompe el pipeline, pero NO comparte cooldowns entre instancias hasta aplicarla.
- **Instrucción para el siguiente agente**: (1) aplicar la migración con token válido (`supabase login` + `supabase db push`) o que Kalpa la corra en el SQL Editor; (2) merge de la PR solo por orden explícita de Kalpa.
- **POST-CIERRE V2.9.0 (2026-11-13T03:56Z)**: migración aplicada por Kalpa en el SQL Editor. PR #82 (`5705f8bf22bc73680108999332e7f8e2bba4aeca`) y PR #83 (`d676f49d5716d96ef68eefc32fb9907ce31ab766`) mergeadas por orden explícita (squash vía REST). `main` = `d676f49`. Deploy producción READY (`dpl_HQ8PWtUfoQSUhaXRkwzm19d14hJW`, aliases leecv.app / www.leecv.app). `/api/cron-ai-keys-ping` responde **401 sin Bearer** (verificado público sin secreto). Registro SESSION_LOG en PR #84 (checks verdes). **Pendiente de Kalpa**: merge de #84; `curl -H "Authorization: Bearer $CRON_SECRET" https://www.leecv.app/api/cron-ai-keys-ping` (esperado: 200 con groq/gemini active).
- **POST-CIERRE V2.10.0 (2026-11-13)**: PR #85 (`010e982`) mergeada por orden de Kalpa (squash REST) - workflow `.github/workflows/ping-ai-keys.yml` (ping a `/api/cron-ai-keys-ping` cada 6h vía GitHub Actions, sin Vercel Pro). **Incidente CRON_SECRET — CERRADO**: Kalpa duplicó el secret como repo secret de Actions; run `43475363785` (2026-11-13T17:41Z, `workflow_dispatch`) → completed success (HTTP 200, degradedProviders=0). Incidente previo: el secret estaba solo en Vercel production, por lo que GitHub Actions lo recibía vacío (guard del workflow) — GitHub no puede leer variables de Vercel.
- **Rama `feat/ocr-local-y-contexto-estructural` (pendiente de PR)**: motor espacial `pdfPageLayout.ts` (3 modos text/hybrid/image), render 1920px con fondo blanco + WebP/PNG para páginas digitales, contraste suave para fotos (EXIF), `cvContextSummary.ts` (contexto rodante entre páginas), `api/_lib/cvImportGate.ts` (Completeness Gate), prompt estructural + `mediaResolution` HIGH en Gemini + temperatura 0.1 en Groq con responseSchema, MIME real en el payload. Duplicado `mergePageFragments.ts` borrado (canónico: `mergeFragments.ts`). Versión V2.10.0. **Instrucción**: PR a `main`; merge solo con orden explícita de Kalpa.

### 2026-11-13 - Agente: Antigravity (IA ejecutor) - Iconos unicos canonicos + blindaje de contraste (PR #89)
- **Accion realizada**: plan aprobado por Kalpa (Regla 7) implementado en rama feat/unique-icons-contrast; un solo PR #89 contra main.
  - Fase 1 (nucleo): src/shared/core/ui/iconCatalog.ts (SECTION/PRODUCT/UI_ICON_IDS + resolveSectionIconId: sectionIconOverrides > customSections[].iconId > slot determinista personalizada-N > mapeo canonico > fallback; normaliza sufijo -cont). iconRegistry.ts: 58 trazados SVG unicos, cero duplicados. PDF (cvDataAdapter/recordTypes/TemplateRenderer) respeta overrides/iconId. NuevaSeccionSection persiste sectionIconOverrides por slot. Regla nueva en AGENTS.md (Regla 1).
  - Fase 2 (UI): Dock (CanvaIconDock desktop/movil), activeSectionsDockEngine, WizardModal, Navbar, NewDocumentMenu consumen el catalogo via DomSectionIcon. Swaps: Portada, Diseno, NuevaSeccion, CardBack, CardSize, LandingPage, RecordFormSection (emoji fuera).
  - Fase 3 (contraste): 25 tokens fantasma --color-primary-* corregidos a --color-accent-* reales en 10 archivos; 0 referencias restantes. scripts/check-icon-uniqueness.js (Check A trazados duplicados, Check B cobertura CANONICAL_SECTION_ORDER + personalizada-1..5 + card_* + social-*, Check C colisiones dentro de mapas y entre familias seccion/producto/UI) enganchado a check-all y .husky/pre-commit.
  - Fase 4 (tests): tests/iconUniqueness.test.ts (10 invariantes). npx tsc --noEmit limpio; npm run check-all = 0 errores local (build + 40 verificaciones SEO/anclaje); CI check-all verde (1m19s) + Vercel pass.
- **Archivos afectados**: 32 archivos (779 inserciones, 140 borrados). Detalle completo en PR #89.
- **Estado del codigo**: Estable. MERGEADA a main el 2026-11-13 (squash 8bee26e, hash confirmado via git fetch origin y git log origin/main -1); CI check-all 59s verde + Vercel verde; registro asentado en SESSION_LOG.md.
- **Instruccion para el siguiente agente**: Kalpa revisa y aprueba PR #89. Tras el merge: git fetch origin && git log origin/main -1 --format=%H %s, confirmar que el hash coincide con el merge, y registrar la intervencion en SESSION_LOG.md. Pendiente menor aparte: probar Editor -> Importar CV con IA con PDF de 2 columnas y escaneado.


### 2026-11-13/14 - Agente: Antigravity (IA ejecutor) - OCR: mapeo completo IA->PDF sin perdida (feat/ocr-full-pdf-mapping)
- **Accion realizada**: plan aprobado por Kalpa (Regla 7) implementado en rama `feat/ocr-full-pdf-mapping` (desde main post-PR#90). Un solo PR. Cierra los 6 cortes de contrato diagnosticados:
  1. Fase 1 (commit b0c1eaf): `cvImportReview.ts` - IMPORTABLE_SCALAR_FIELDS ampliado (titlePrefix, dni, cuit, birthDate, nacionalidad, estadoCivil, disponibilidad, licenciaConducir, frase); `normalizeImportedCvData` con derivacion fullName<->givenNames/surname, location->cityProvince, role->quote, linkedin/portfolio->redes+website, summary/objective/frase al raiz, languages nivel; `mergeFragments.ts` fusiona summary/objective/frase; `api/cv-import-api.ts` schema+prompt extract-page ampliados (givenNames/surname, campos personales extras, objective/frase/redes/hardSkills/informatics/profession/references/portfolio) y consolidate-ats alineado.
  2. Fase 2+3 (commit da7431d): `cvDataAdapter.ts` (website en contacto; proficiency/nivel en idiomas); `sharedFields.ts` CONTACT_FIELDS nuevos (website/nacionalidad/estadoCivil/disponibilidad/licenciaConducir); `TemplateRenderer.tsx` helper `resolveInitials` + 6 placeholders de iniciales + header cae a `resolveDisplayName` si solo hay fullName; `ImportDataSection.tsx` activa contacto/datos-personales si hay datos personales; `initialCVData.ts` alineado al id canonico `datos-personales` (clave entre comillas obligatoria - sin comillas TS1005); `ImportReviewDiffModal.tsx` labels nuevos + boton "Usar todo lo detectado" (scalars=replace, listas=add/replace sobre duplicado).
- **Tests**: nuevo `tests/importToPdfPipeline.test.ts` (11 tests contrato OCR->PDF end-to-end). Bugs propios encontrados y arreglados durante el test: (a) API devuelve `linkedin` minuscula; (b) summary/objective/frase leidos solo de personalInfo y no del raiz; (c) derivacion de nivel de idiomas corrida antes de que existiera normalized.languages (no-op); (d) el loop IMPORTABLE_LIST_FIELDS pisaba normalized.redes ya enriquecido -> bloque linkedin/portfolio movido DESPUES del loop; (e) normalizeImportedCvData crasheaba si raw no trae personalInfo (inicializado siempre a {}).
- **Estado del codigo**: `npx tsc --noEmit` exit 0; vitest 363 passed / 2 skipped; `npm run check-all` exit 0 (SEO 40/40). Pre-push (husky check-all completo) corriendo en background al cerrar esta nota.
- **MERGEADO (2026-11-14)**: PR #91 mergeada a `main` por orden explicita de Kalpa (squash). Hash confirmado en `origin/main`: `14aab1b3af06ba856e2ea555f4f2b7ffa3577172`. CI check-all 1m4s verde + Vercel deployment completed. Registro asentado en SESSION_LOG.md.
- **Pendiente menor aparte (Kalpa)**: probar web Editor -> Importar CV con IA con PDF de 2 columnas y escaneado.
