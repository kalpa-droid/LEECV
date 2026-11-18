-- ============================================================================
-- Retención Opción B para `unclaimed_email_credits` (PR-D2)
--
-- Ciclo de vida de los créditos comprados con un email que todavía no tiene
-- cuenta:
--   * ~día 7 sin reclamar  → 1 único email recordatorio (`reminder_sent_at`).
--   * ~día 365 sin reclamar → expirado (`expired_at`) + email anonimizado
--     (se conserva payment_id/credits/amount/currency/provider/plan para
--     contabilidad; el claim_credits_on_auth() ya no los puede tomar).
--
-- Es idempotente: puede aplicarse sobre una base que ya tenga cualquiera de
-- las piezas, y no borra ni reescribe filas existentes.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Columnas de control de ciclo de vida
-- ----------------------------------------------------------------------------
alter table public.unclaimed_email_credits
  add column if not exists reminder_sent_at timestamptz,
  add column if not exists expired_at timestamptz;

comment on column public.unclaimed_email_credits.reminder_sent_at is
  'Sello del único email recordatorio enviado (~día 7 sin reclamar). NULL = todavía no se envió.';
comment on column public.unclaimed_email_credits.expired_at is
  'Sello de expiración (~día 365 sin reclamar). Las filas expiradas no son reclamables y su email queda anonimizado.';

-- Candidatos a recordatorio: pendientes, sin aviso y sin expirar.
create index if not exists idx_unclaimed_email_credits_reminder_pending
  on public.unclaimed_email_credits (created_at)
  where claimed_at is null and reminder_sent_at is null and expired_at is null;

-- Candidatos a expiración: pendientes y sin expirar.
create index if not exists idx_unclaimed_email_credits_expiry_pending
  on public.unclaimed_email_credits (created_at)
  where claimed_at is null and expired_at is null;

-- ----------------------------------------------------------------------------
-- 2. claim_credits_on_auth(): igual que 20261030, pero ignorando filas expiradas
-- ----------------------------------------------------------------------------
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

  -- 2.1 Traslado de créditos pendientes del mismo email (ignorando expirados).
  for v_row in
    select c.id, c.credits, c.payment_id
    from public.unclaimed_email_credits as c
    where c.claimed_at is null
      and c.expired_at is null
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
  'Traslada los créditos pendientes del email verificado del usuario a su saldo (pdf_export_tokens) y vincula tokens de invitado. Ignora filas expiradas (expired_at). Idempotente y transaccional. Devuelve una sola fila.';

revoke all on function public.claim_credits_on_auth(uuid, text) from public, anon;
grant execute on function public.claim_credits_on_auth(uuid, text) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 3. Ampliar CHECK `admin_notifications.type` con 'unclaimed_credits_expired'
--    (la retención emite un aviso agregado al admin cuando filas expiran sin
--    reclamar). Mismo patrón de la migración 20261031: drop + add guarded.
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'admin_notifications_type_check'
      and conrelid = 'public.admin_notifications'::regclass
  ) then
    alter table public.admin_notifications
      drop constraint admin_notifications_type_check;
  end if;

  alter table public.admin_notifications
    add constraint admin_notifications_type_check
    check (type in (
      'payment_received',
      'payment_pending',
      'payment_pending_review',
      'payment_mismatch',
      'pending_grant',
      'plan_expiring',
      'plan_downgraded',
      'retention_offer_sent',
      'unclaimed_credits_expired'
    ));
end;
$$;
