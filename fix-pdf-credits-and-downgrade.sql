-- ============================================================
-- LEECV — Parche 4: créditos de exportación PDF + downgrade automático
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Ledger de créditos de exportación (Nivel 1, pago por PDF).
--    Nunca se descuenta desde el frontend directamente — solo vía
--    la función RPC de abajo, para evitar condiciones de carrera
--    (dos pestañas exportando "al mismo tiempo" con el mismo crédito).
create table if not exists public.pdf_export_credits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  credits integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.pdf_export_credits enable row level security;

drop policy if exists "usuario ve sus créditos" on public.pdf_export_credits;
create policy "usuario ve sus créditos"
  on public.pdf_export_credits for select
  using (auth.uid() = user_id or public.is_admin(auth.uid()));
-- Nota: no hay policy de insert/update para usuarios normales a propósito.
-- Los créditos solo los toca el webhook de pago (con service role) y esta función:

create or replace function public.consume_pdf_credit(p_user_id uuid)
returns boolean as $$
declare
  remaining integer;
begin
  update public.pdf_export_credits
    set credits = credits - 1, updated_at = now()
    where user_id = p_user_id and credits > 0
    returning credits into remaining;

  return remaining is not null;
end;
$$ language plpgsql security definer;

-- 2. Downgrade automático cuando vence el plan.
--    Requiere activar la extensión pg_cron una vez:
--    Supabase Dashboard > Database > Extensions > pg_cron
create or replace function public.downgrade_expired_plans()
returns void as $$
begin
  update public.profiles
    set plan = 'free'
    where plan in ('pro', 'enterprise')
      and plan_vence is not null
      and plan_vence < now();
end;
$$ language plpgsql security definer;

select cron.schedule(
  'downgrade-expired-plans-diario',
  '0 6 * * *',  -- todos los días 06:00 UTC
  $$ select public.downgrade_expired_plans(); $$
);
