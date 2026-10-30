-- ============================================================================
-- Migración: 20261030_email_credit_claim_and_admin_error_logs.sql
-- Etapa 1 del plan `.opencode/plans/plan-pagos-admin-magic-link.md`
--
-- Objetivo:
--   1. `unclaimed_email_credits`: bolsillo de créditos comprados con un email que
--      todavía no tiene cuenta. El email (verificado por Supabase Auth) es la
--      identidad de cobro.
--   2. `claim_credits_on_auth()`: RPC idempotente y transaccional que, al iniciar
--      sesión (OTP / magic link), traslada esos créditos al saldo real del
--      usuario y vincula los tokens individuales comprados como invitado.
--   3. `admin_error_logs`: registro nativo de errores (frontend, webhooks, API,
--      PDF, auth) para la pestaña "Auditoría y Errores" del panel admin.
--   4. Cierre de dos huecos de RLS que rompen el circuito de créditos:
--      - no existía política SELECT sobre `pdf_export_tokens` para el dueño, así
--        que el contador de créditos de la app siempre leía 0;
--      - faltaban índices parciales para el saldo disponible.
--
-- Modelo de créditos (canónico, verificado en el repo):
--   Un crédito de exportación = UNA fila en `public.pdf_export_tokens` con
--   `user_id = <usuario>`, `paid = true`, `consumed = false`.
--   `public.pdf_export_credits` es legado y NO lo consume
--   `check_and_consume_export_entitlement()`; esta migración no lo escribe.
--
-- Clave de idempotencia canónica: `payment_id = '<proveedor>:<external_id>'`
-- (ej. `mercadopago:123456`), la misma que ya usa `applyPayment.ts`
-- (`grantPaymentId`) y la tabla `pdf_export_token_grants`. El webhook DEBE
-- guardar ese valor en `unclaimed_email_credits.payment_id` para que un reintento
-- del pago no duplique saldo, sin importar si el reclamo ocurre antes o después.
--
-- Esta migración es idempotente: puede aplicarse sobre una base que ya tenga
-- cualquiera de las piezas, y no borra ni reescribe datos existentes.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Créditos comprados con un email que todavía no tiene cuenta
-- ----------------------------------------------------------------------------
create table if not exists public.unclaimed_email_credits (
  id uuid primary key default gen_random_uuid(),
  -- Email tal como lo informó la pasarela. Se compara normalizado
  -- (lower + btrim) contra el email verificado de auth.users.
  email text not null,
  -- Cantidad de exportaciones compradas en ese pago (1 crédito = 1 token).
  credits integer not null,
  -- Clave canónica '<proveedor>:<external_id>'. Obligatoria para poder deduplicar.
  payment_id text,
  -- Metadatos de la venta, sólo para el panel admin.
  provider text,
  plan text,
  amount numeric,
  currency text,
  -- Sello de reclamo: una fila reclamada nunca se vuelve a procesar.
  claimed_at timestamptz,
  claimed_by uuid references auth.users(id) on delete set null,
  claim_payment_id text,
  created_at timestamptz not null default now(),

  constraint unclaimed_email_credits_email_not_blank
    check (pg_catalog.char_length(pg_catalog.btrim(email)) between 3 and 320),
  constraint unclaimed_email_credits_credits_range
    check (credits > 0 and credits <= 100),
  -- Un reclamo siempre deja rastro del usuario que lo ejecutó.
  constraint unclaimed_email_credits_claim_consistency
    check (claimed_at is not null or claimed_by is null)
);

comment on table public.unclaimed_email_credits is
  'Créditos de exportación pagados con un email que todavía no tiene cuenta. Se trasladan al usuario en su primer ingreso vía claim_credits_on_auth().';
comment on column public.unclaimed_email_credits.payment_id is
  'Clave canónica <proveedor>:<external_id>. Es la misma clave de idempotencia de pdf_export_token_grants; sin ella no se puede evitar duplicar saldo.';

-- Búsqueda del bolsillo por email normalizado (la que usa el RPC al ingresar).
create index if not exists idx_unclaimed_email_credits_pending_email
  on public.unclaimed_email_credits (pg_catalog.lower(pg_catalog.btrim(email)), created_at)
  where claimed_at is null;

-- Un pago = una fila pendiente. Un reintento del webhook no crea otra.
create unique index if not exists unq_unclaimed_email_credits_payment_id
  on public.unclaimed_email_credits (payment_id)
  where payment_id is not null;

alter table public.unclaimed_email_credits enable row level security;

-- Lectura: sólo administradores (el usuario final no necesita ver esta tabla,
-- ve el resultado ya convertido en tokens propios).
drop policy if exists "admin lee créditos sin reclamar" on public.unclaimed_email_credits;
create policy "admin lee créditos sin reclamar"
  on public.unclaimed_email_credits for select
  to authenticated
  using (public.is_admin(auth.uid()));

-- Resolución manual desde el panel (por ejemplo, corregir un email mal tipeado).
drop policy if exists "admin resuelve créditos sin reclamar" on public.unclaimed_email_credits;
create policy "admin resuelve créditos sin reclamar"
  on public.unclaimed_email_credits for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "admin elimina créditos sin reclamar" on public.unclaimed_email_credits;
create policy "admin elimina créditos sin reclamar"
  on public.unclaimed_email_credits for delete
  to authenticated
  using (public.is_admin(auth.uid()));

-- Sin política de INSERT a propósito: sólo escribe el backend de confianza
-- (service_role, que no pasa por RLS). Así nadie puede inventarse créditos.

-- Privilegios explícitos: no se depende de los privilegios por defecto del
-- esquema, que en este proyecto ya fallaron una vez (admin_audit_logs existía en
-- algunas bases y en otras no). La RLS sigue siendo la que decide qué filas se ven.
grant select, update, delete on public.unclaimed_email_credits to authenticated;

-- ----------------------------------------------------------------------------
-- 2. RPC de auto-acreditación al iniciar sesión
-- ----------------------------------------------------------------------------
-- Reglas de seguridad:
--   * El email canónico SIEMPRE se lee de auth.users (verificado por Supabase).
--     `p_email` es sólo un control cruzado: si no coincide, se aborta. Sin esto,
--     cualquier usuario autenticado podría reclamar los créditos de otro email.
--   * Un usuario autenticado sólo puede reclamar para sí mismo (auth.uid()).
--     auth.uid() IS NULL se acepta únicamente para service_role / consola SQL.
--   * Todo ocurre en una sola transacción: o se emiten todos los tokens y se
--     sellan las filas, o no cambia nada.
create or replace function public.claim_credits_on_auth(
  p_user_id uuid default null,
  p_email text default null
)
returns table (
  credits_claimed integer,
  rows_claimed integer,
  guest_tokens_linked integer,
  matched_email text
)
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_caller uuid := auth.uid();
  v_user_id uuid;
  v_auth_email text;
  v_row record;
  v_grant_inserted integer;
  v_total integer := 0;
  v_rows integer := 0;
  v_linked integer := 0;
begin
  v_user_id := coalesce(p_user_id, v_caller);

  if v_user_id is null then
    raise exception 'Se requiere un usuario autenticado para reclamar créditos'
      using errcode = '42501';
  end if;

  if v_caller is not null and v_caller <> v_user_id then
    raise exception 'Acceso denegado: sólo el usuario autenticado puede reclamar sus propios créditos'
      using errcode = '42501';
  end if;

  -- Fuente de verdad del email: auth.users. `p_email` nunca decide a quién se acredita.
  select pg_catalog.lower(pg_catalog.btrim(u.email))
    into v_auth_email
  from auth.users as u
  where u.id = v_user_id;

  if v_auth_email is null or v_auth_email = '' then
    raise exception 'El usuario % no tiene un email asociado en auth.users', v_user_id
      using errcode = 'P0002';
  end if;

  if p_email is not null and pg_catalog.btrim(p_email) <> ''
     and pg_catalog.lower(pg_catalog.btrim(p_email)) <> v_auth_email then
    raise exception 'El email indicado no coincide con el email de la sesión'
      using errcode = '42501';
  end if;

  -- 2.1 Traslado de créditos pendientes del mismo email.
  for v_row in
    select c.id, c.credits, c.payment_id
    from public.unclaimed_email_credits as c
    where c.claimed_at is null
      and pg_catalog.lower(pg_catalog.btrim(c.email)) = v_auth_email
    order by c.created_at
    for update
  loop
    v_grant_inserted := 0;

    if v_row.payment_id is not null and pg_catalog.btrim(v_row.payment_id) <> '' then
      -- La clave de idempotencia es compartida con grant_export_tokens(): si el
      -- webhook ya acreditó este pago (porque el perfil apareció antes), no se
      -- emite saldo nuevo.
      insert into public.pdf_export_token_grants (payment_id, user_id, amount)
      values (v_row.payment_id, v_user_id, v_row.credits)
      on conflict (payment_id) do nothing;

      get diagnostics v_grant_inserted = row_count;

      if v_grant_inserted = 0 then
        -- Ya otorgado por otra vía: se cierra la fila sin duplicar créditos.
        update public.unclaimed_email_credits
        set claimed_at = pg_catalog.now(),
            claimed_by = v_user_id,
            claim_payment_id = v_row.payment_id
        where id = v_row.id;
        continue;
      end if;
    end if;

    -- 1 crédito = 1 token pago y sin consumir (el modelo que lee la app y el RPC
    -- de consumo de derechos).
    insert into public.pdf_export_tokens (user_id, email, paid, consumed, payment_id)
    select v_user_id, v_auth_email, true, false, v_row.payment_id
    from pg_catalog.generate_series(1, v_row.credits);

    update public.unclaimed_email_credits
    set claimed_at = pg_catalog.now(),
        claimed_by = v_user_id,
        claim_payment_id = v_row.payment_id
    where id = v_row.id;

    v_total := v_total + v_row.credits;
    v_rows := v_rows + 1;
  end loop;

  -- 2.2 Tokens individuales comprados como invitado con ese mismo email:
  -- se vinculan a la cuenta (no se consumen ni se duplican). Así una persona
  -- que compró "1 exportación" sin cuenta no pierde lo que pagó.
  update public.pdf_export_tokens as t
  set user_id = v_user_id
  where t.user_id is null
    and t.paid = true
    and t.consumed = false
    and pg_catalog.lower(pg_catalog.btrim(t.email)) = v_auth_email;

  get diagnostics v_linked = row_count;

  return query select v_total, v_rows, v_linked, v_auth_email;
end;
$$;

comment on function public.claim_credits_on_auth(uuid, text) is
  'Traslada los créditos pendientes del email verificado del usuario a su saldo (pdf_export_tokens) y vincula tokens de invitado. Idempotente y transaccional. Devuelve una sola fila.';

revoke all on function public.claim_credits_on_auth(uuid, text) from public, anon;
grant execute on function public.claim_credits_on_auth(uuid, text) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 3. Registro nativo de errores para el panel admin
-- ----------------------------------------------------------------------------
create table if not exists public.admin_error_logs (
  id uuid primary key default gen_random_uuid(),
  level text not null default 'error',
  source text not null default 'frontend',
  message text not null,
  context jsonb not null default '{}'::jsonb,
  -- Usuario que reportó (null = invitado o error de servidor).
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  request_path text,
  -- Metadatos de cobro cuando el error viene de un webhook.
  provider text,
  external_id text,
  -- Huella estable (ej. "pdf-render:TypeError:...") para agrupar repetidos.
  fingerprint text,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),

  constraint admin_error_logs_level_check
    check (level in ('debug', 'info', 'warning', 'error', 'critical')),
  constraint admin_error_logs_source_check
    check (source in ('frontend', 'webhook', 'api', 'database', 'pdf', 'auth', 'other')),
  -- Corta payloads gigantes (un error no debería ser un volcado de memoria).
  constraint admin_error_logs_message_length
    check (pg_catalog.char_length(message) between 1 and 4000)
);

comment on table public.admin_error_logs is
  'Errores del frontend, webhooks, API y motor PDF para la pestaña Auditoría y Errores del panel admin.';
comment on column public.admin_error_logs.fingerprint is
  'Huella estable para agrupar errores repetidos y contar ocurrencias sin duplicar filas de análisis.';

create index if not exists idx_admin_error_logs_created_at
  on public.admin_error_logs (created_at desc);

create index if not exists idx_admin_error_logs_unresolved
  on public.admin_error_logs (level, created_at desc)
  where resolved_at is null;

create index if not exists idx_admin_error_logs_fingerprint
  on public.admin_error_logs (fingerprint, created_at desc)
  where fingerprint is not null;

alter table public.admin_error_logs enable row level security;

-- Lectura: sólo administradores.
drop policy if exists "admin lee errores" on public.admin_error_logs;
create policy "admin lee errores"
  on public.admin_error_logs for select
  to authenticated
  using (public.is_admin(auth.uid()));

-- Escritura desde la app: cualquier sesión (incluido invitado) puede reportar un
-- error propio, pero sólo como origen 'frontend' y sin firmar como otro usuario.
-- Los orígenes 'webhook' / 'api' / 'database' los escribe el backend con
-- service_role (que no pasa por RLS).
drop policy if exists "cualquiera reporta errores del frontend" on public.admin_error_logs;
create policy "cualquiera reporta errores del frontend"
  on public.admin_error_logs for insert
  to anon, authenticated
  with check (
    source = 'frontend'
    and (user_id is null or user_id = auth.uid())
  );

-- Resolución / limpieza: sólo administradores.
drop policy if exists "admin resuelve errores" on public.admin_error_logs;
create policy "admin resuelve errores"
  on public.admin_error_logs for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "admin elimina errores" on public.admin_error_logs;
create policy "admin elimina errores"
  on public.admin_error_logs for delete
  to authenticated
  using (public.is_admin(auth.uid()));

-- Privilegios explícitos: el invitado sólo puede INSERTAR (reportar); leer,
-- resolver o borrar queda para administradores autenticados. La RLS decide filas.
grant insert on public.admin_error_logs to anon;
grant select, insert, update, delete on public.admin_error_logs to authenticated;

-- ----------------------------------------------------------------------------
-- 4. Huecos de RLS / índices del saldo de exportación
-- ----------------------------------------------------------------------------
-- 4.1 El dueño debe poder LEER sus propios tokens: la app cuenta el saldo con
-- `select count(*) from pdf_export_tokens where user_id = auth.uid()
--  and paid and not consumed`. Sin esta política, RLS devuelve 0 filas y el
-- usuario ve "0 créditos" aunque tenga saldo (el RPC de consumo sí funciona
-- porque es SECURITY DEFINER, así que el bug era invisible al exportar).
-- No se habilita lectura para `anon`: el invitado sigue usando el RPC
-- `check_export_token_status(uuid)` por token puntual.
drop policy if exists "usuario lee sus propios tokens" on public.pdf_export_tokens;
create policy "usuario lee sus propios tokens"
  on public.pdf_export_tokens for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()));

-- 4.2 Índices parciales: el saldo disponible se consulta en cada carga del
-- editor y en cada exportación, siempre con el mismo filtro.
create index if not exists idx_pdf_export_tokens_available
  on public.pdf_export_tokens (user_id)
  where paid and not consumed;

create index if not exists idx_pdf_export_tokens_email_available
  on public.pdf_export_tokens (pg_catalog.lower(pg_catalog.btrim(email)))
  where paid and not consumed;

-- ----------------------------------------------------------------------------
-- 5. Creación confiable del token de invitado (sin abrir la tabla)
-- ----------------------------------------------------------------------------
-- `dal.pdfExportTokens.insert()` hace `insert(...).select('token')`. Con RLS
-- activa y sin política SELECT para `anon`, PostgreSQL no devuelve la fila
-- recién insertada (RETURNING se evalúa con las políticas de SELECT), así que
-- el checkout de invitado depende de que exista una política de lectura
-- permisiva. Este RPC devuelve el UUID sin exponer la tabla.
create or replace function public.create_guest_export_token(
  p_email text,
  p_doc_type text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_email text;
  v_token uuid;
begin
  v_email := pg_catalog.lower(pg_catalog.btrim(coalesce(p_email, '')));

  if pg_catalog.char_length(v_email) < 3
     or pg_catalog.char_length(v_email) > 320
     or pg_catalog.strpos(v_email, '@') < 2 then
    raise exception 'Email inválido para crear el token de exportación'
      using errcode = '22023';
  end if;

  insert into public.pdf_export_tokens (email, doc_type, paid, consumed)
  values (v_email, p_doc_type, false, false)
  returning token into v_token;

  return v_token;
end;
$$;

comment on function public.create_guest_export_token(text, text) is
  'Crea un token de exportación impago para un invitado y devuelve su UUID sin exponer la tabla pdf_export_tokens.';

revoke all on function public.create_guest_export_token(text, text) from public;
grant execute on function public.create_guest_export_token(text, text) to anon, authenticated, service_role;

-- PostgREST cachea el esquema: sin esto, las tablas y RPC nuevas no aparecen en
-- la API hasta el próximo reciclado del servicio.
notify pgrst, 'reload schema';
