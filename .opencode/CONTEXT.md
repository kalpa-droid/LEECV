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

