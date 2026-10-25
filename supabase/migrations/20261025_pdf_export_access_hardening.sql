-- Migration: 20261025_pdf_export_access_hardening.sql
-- Objetivo:
--   1. Cerrar la escalada de privilegios sobre profiles.pdf_export_access_mode:
--      sin esto, cualquier usuario autenticado podía hacer
--      `update profiles set pdf_export_access_mode = 'enabled'` sobre su propia fila
--      y exportar PDFs sin consumir créditos.
--   2. Exponer la auditoría de cambios manuales como public.pdf_status_logs
--      (old_status / new_status / reason), sin duplicar el motor de auditoría
--      existente: los datos siguen viviendo en public.admin_audit_logs.
--   3. Reafirmar el RPC de consumo con los tres estados canónicos internos.
--   4. Completar la bandeja de pagos retenidos con motivo de retención y
--      token de exportación para poder resolver también ventas individuales.
--
-- Nombres canónicos internos (no se usan acentos en valores de base de datos):
--   automatic = automático        -> usa plan/créditos como siempre
--   enabled   = permitido_manual  -> exporta sin consumir créditos
--   disabled  = bloqueado_manual  -> no exporta aunque tenga saldo
--
-- Esta migración es idempotente y autosuficiente: puede aplicarse después de
-- 20261014_admin_pdf_export_access.sql o directamente sobre una base que aún
-- no la tenga.

-- ---------------------------------------------------------------------------
-- 1. Columna de estado y metadatos de retención
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists pdf_export_access_mode text not null default 'automatic';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_pdf_export_access_mode_check'
  ) then
    alter table public.profiles
      add constraint profiles_pdf_export_access_mode_check
      check (pdf_export_access_mode in ('automatic', 'enabled', 'disabled'));
  end if;
end;
$$;

comment on column public.profiles.pdf_export_access_mode is
  'automatic = usa plan/créditos; enabled = permitido manualmente sin consumir créditos; disabled = bloqueado manualmente.';

alter table public.pending_grants
  add column if not exists resolved_user_id uuid references auth.users(id),
  add column if not exists resolution_reason text,
  add column if not exists resolution_action text,
  add column if not exists hold_reason text,
  add column if not exists export_token text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.pending_grants'::regclass
      and conname = 'pending_grants_hold_reason_check'
  ) then
    alter table public.pending_grants
      add constraint pending_grants_hold_reason_check
      check (
        hold_reason is null
        or hold_reason in ('amount_mismatch', 'missing_profile', 'provider_pending')
      );
  end if;
end;
$$;

comment on column public.pending_grants.hold_reason is
  'amount_mismatch = importe/moneda no coinciden; missing_profile = pago sin cuenta asociada; provider_pending = la pasarela todavía no confirmó el cobro.';

comment on column public.pending_grants.export_token is
  'Token de exportación individual (single_pdf) necesario para acreditar la venta sin cuenta.';

create index if not exists idx_pending_grants_unresolved
  on public.pending_grants (created_at desc)
  where resolved_at is null;

-- ---------------------------------------------------------------------------
-- 2. Blindaje del trigger de columnas privilegiadas
-- ---------------------------------------------------------------------------
-- auth.uid() IS NULL se permite únicamente para service_role / consola SQL:
-- un usuario autenticado nunca puede dejar auth.uid() en NULL porque la policy
-- de UPDATE de profiles exige auth.uid() = id.
create or replace function public.protect_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
begin
  if auth.uid() is null or public.is_admin(auth.uid()) then
    return new;
  end if;

  if new.role is distinct from old.role
     or new.plan is distinct from old.plan
     or new.plan_vence is distinct from old.plan_vence
     or new.metodo_pago is distinct from old.metodo_pago
     or new.pdf_export_access_mode is distinct from old.pdf_export_access_mode then
    raise exception 'No autorizado para modificar campos de rol, plan o acceso a exportación';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_privileged_columns on public.profiles;
create trigger trg_protect_privileged_columns
  before update on public.profiles
  for each row execute procedure public.protect_privileged_columns();

-- ---------------------------------------------------------------------------
-- 3. Consumo de derechos de exportación
-- ---------------------------------------------------------------------------
create or replace function public.check_and_consume_export_entitlement(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_caller_id uuid;
  v_plan text;
  v_plan_vence timestamptz;
  v_access_mode text;
  v_token_id uuid;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null or v_caller_id <> p_user_id then
    raise exception 'Acceso denegado: solo el usuario autenticado puede consumir sus propios derechos'
      using errcode = '42501';
  end if;

  select plan, plan_vence, pdf_export_access_mode
    into v_plan, v_plan_vence, v_access_mode
  from public.profiles
  where id = p_user_id;

  -- Bloqueo manual: ni el plan Pro ni los tokens habilitan la exportación.
  if v_access_mode = 'disabled' then
    return false;
  end if;

  -- Permiso manual: exporta sin consumir tokens ni alterar el saldo.
  if v_access_mode = 'enabled' then
    return true;
  end if;

  -- Modo automático: plan Pro vigente o un token pago sin consumir.
  if v_plan = 'pro' and (v_plan_vence is null or v_plan_vence > pg_catalog.now()) then
    return true;
  end if;

  select token into v_token_id
  from public.pdf_export_tokens
  where user_id = p_user_id
    and paid = true
    and consumed = false
  limit 1
  for update skip locked;

  if v_token_id is not null then
    update public.pdf_export_tokens
    set consumed = true
    where token = v_token_id;
    return true;
  end if;

  return false;
end;
$$;

revoke all on function public.check_and_consume_export_entitlement(uuid) from public, anon;
grant execute on function public.check_and_consume_export_entitlement(uuid) to authenticated;

create or replace function public.admin_export_token_balances(p_user_ids uuid[])
returns table(user_id uuid, credits bigint)
language sql
stable
security definer
set search_path = pg_catalog, pg_temp
as $$
  select t.user_id, count(*)::bigint
  from public.pdf_export_tokens as t
  where t.user_id = any(coalesce(p_user_ids, array[]::uuid[]))
    and t.paid = true
    and t.consumed = false
  group by t.user_id;
$$;

revoke all on function public.admin_export_token_balances(uuid[]) from public, anon, authenticated;
grant execute on function public.admin_export_token_balances(uuid[]) to service_role;

create or replace function public.admin_set_pdf_export_access(
  p_target_user_id uuid,
  p_access_mode text,
  p_reason text,
  p_admin_user_id uuid
)
returns table(previous_mode text, current_mode text)
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_previous_mode text;
begin
  if p_access_mode not in ('automatic', 'enabled', 'disabled') then
    raise exception 'Modo de acceso PDF no válido' using errcode = '22023';
  end if;

  if p_reason is null or pg_catalog.char_length(pg_catalog.btrim(p_reason)) < 5 then
    raise exception 'El motivo debe tener al menos 5 caracteres' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = p_admin_user_id
      and role = 'admin'
  ) then
    raise exception 'Requiere permisos de administrador' using errcode = '42501';
  end if;

  select pdf_export_access_mode
    into v_previous_mode
  from public.profiles
  where id = p_target_user_id
  for update;

  if not found then
    raise exception 'Perfil de usuario no encontrado' using errcode = 'P0002';
  end if;

  update public.profiles
  set pdf_export_access_mode = p_access_mode
  where id = p_target_user_id;

  insert into public.admin_audit_logs (admin_id, action_type, target_user_id, details)
  values (
    p_admin_user_id,
    'set_pdf_export_access',
    p_target_user_id,
    pg_catalog.jsonb_build_object(
      'previous_mode', v_previous_mode,
      'current_mode', p_access_mode,
      'reason', pg_catalog.btrim(p_reason)
    )
  );

  return query select v_previous_mode, p_access_mode;
end;
$$;

revoke all on function public.admin_set_pdf_export_access(uuid, text, text, uuid) from public, anon, authenticated;
grant execute on function public.admin_set_pdf_export_access(uuid, text, text, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 4. Registro de auditoría
-- ---------------------------------------------------------------------------
-- 20260820_protect_plan_columns_and_claims.sql nunca llegó a aplicarse completa
-- en todas las bases: public.payment_claims existe, pero admin_audit_logs no.
-- Se crea de forma idempotente con el mismo esquema original para que el RPC y
-- la vista funcionen incluso en una base que salteó esa migración.
create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id) on delete cascade,
  action_type text not null,
  target_user_id uuid references auth.users(id),
  details jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_audit_logs enable row level security;

drop policy if exists "solo admin ve logs" on public.admin_audit_logs;
create policy "solo admin ve logs"
  on public.admin_audit_logs for select
  using (public.is_admin(auth.uid()));

-- La vista filtra por action_type; el índice evita escanear todo el historial.
create index if not exists idx_admin_audit_logs_action_type
  on public.admin_audit_logs (action_type, created_at desc);

-- ---------------------------------------------------------------------------
-- 5. Vista de auditoría normalizada
-- ---------------------------------------------------------------------------
-- No se crea una tabla paralela: admin_audit_logs sigue siendo el único
-- registro de escritura. La vista sólo proyecta los campos que consume el panel.
create or replace view public.pdf_status_logs
with (security_invoker = true)
as
select
  l.id,
  l.target_user_id as user_id,
  l.admin_id,
  l.details ->> 'previous_mode' as old_status,
  l.details ->> 'current_mode' as new_status,
  l.details ->> 'reason' as reason,
  l.created_at
from public.admin_audit_logs as l
where l.action_type = 'set_pdf_export_access'
  -- Defensa en profundidad: aunque security_invoker no estuviera disponible,
  -- un usuario autenticado que no sea admin nunca ve estas filas.
  and (public.is_admin(auth.uid()) or auth.uid() is null);

grant select on public.pdf_status_logs to authenticated, service_role;
