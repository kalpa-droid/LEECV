-- ============================================================
-- LEECV — Master Security Hardening & Data Integrity Migration
-- ============================================================

-- 1. Prevent privilege escalation (self-promoting to admin/premium)
create or replace function public.protect_privileged_columns()
returns trigger as $$
begin
  if public.is_admin(auth.uid()) then
    return new;
  end if;

  if new.role is distinct from old.role
     or new.premium_activo is distinct from old.premium_activo
     or new.premium_vence is distinct from old.premium_vence
     or new.metodo_pago is distinct from old.metodo_pago then
    raise exception 'No autorizado para modificar campos de rol o estado premium';
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_protect_privileged_columns on public.profiles;
create trigger trg_protect_privileged_columns
  before update on public.profiles
  for each row execute procedure public.protect_privileged_columns();

-- 2. Enforce 3-tier plan models, user_id ownership, and RLS on `cvs`
alter table public.profiles
  add column if not exists plan text not null default 'free'
  check (plan in ('free', 'pro', 'enterprise'));

alter table public.profiles
  add column if not exists plan_vence timestamptz;

alter table public.cvs
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists idx_cvs_user_id on public.cvs(user_id);
alter table public.cvs enable row level security;

drop policy if exists "usuario ve sus propios CVs" on public.cvs;
create policy "usuario ve sus propios CVs"
  on public.cvs for select
  using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "usuario inserta sus propios CVs" on public.cvs;
create policy "usuario inserta sus propios CVs"
  on public.cvs for insert
  with check (auth.uid() = user_id);

drop policy if exists "usuario actualiza sus propios CVs" on public.cvs;
create policy "usuario actualiza sus propios CVs"
  on public.cvs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "usuario borra sus propios CVs" on public.cvs;
create policy "usuario borra sus propios CVs"
  on public.cvs for delete
  using (auth.uid() = user_id);

-- 3. PDF credits ledger & RPC consume function
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

-- 4. Automatic plan downgrade on expiration
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
