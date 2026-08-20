-- ============================================================
-- LEECV — Plan Privilege Escalation Protection & Payment Claims
-- ============================================================

-- 1. Protect plan & plan_vence against self-promotion
create or replace function public.protect_privileged_columns()
returns trigger as $$
begin
  if public.is_admin(auth.uid()) then
    return new;
  end if;

  if new.role is distinct from old.role
     or new.plan is distinct from old.plan
     or new.plan_vence is distinct from old.plan_vence
     or new.premium_activo is distinct from old.premium_activo
     or new.premium_vence is distinct from old.premium_vence
     or new.metodo_pago is distinct from old.metodo_pago then
    raise exception 'No autorizado para modificar campos de rol, plan o estado premium';
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- 2. Real Payment Claims Table with RLS & Audit Tracking
create table if not exists public.payment_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  method text not null default 'Transferencia CBU',
  amount text not null,
  proof_url text,
  proof_id text,
  status text not null default 'pendiente' check (status in ('pendiente', 'aprobado', 'rechazado')),
  created_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz
);

alter table public.payment_claims enable row level security;

-- Policies for payment_claims
drop policy if exists "usuario ve sus propios reclamos" on public.payment_claims;
create policy "usuario ve sus propios reclamos"
  on public.payment_claims for select
  using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "usuario crea sus propios reclamos" on public.payment_claims;
create policy "usuario crea sus propios reclamos"
  on public.payment_claims for insert
  with check (auth.uid() = user_id);

drop policy if exists "admin gestiona reclamos" on public.payment_claims;
create policy "admin gestiona reclamos"
  on public.payment_claims for update
  using (public.is_admin(auth.uid()));

-- 3. Admin Audit Log Table
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
