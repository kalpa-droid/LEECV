-- ============================================================
-- LEECV — Migración Completa: Cuentas, Planes, RLS y Seguridad
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Tabla de perfiles (1 fila por usuario de Supabase Auth)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  plan text not null default 'free' check (plan in ('free', 'pro', 'enterprise')),
  plan_vence timestamptz,
  premium_activo boolean not null default false,
  premium_vence timestamptz,
  metodo_pago text,               -- 'mercadopago' | 'lemonsqueezy' | 'manual'
  created_at timestamptz not null default now()
);

-- 2. Función helper Security Definer para evitar recursión infinita en RLS
create or replace function public.is_admin(user_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = user_id and role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- 3. Trigger para creación automática de perfiles al registrarse
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 4. Protección de Columnas Privilegiadas (Bloquea autopromoción de rol/plan por usuarios no-admin)
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
    raise exception 'No autorizado para modificar campos de rol o estado de suscripción';
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_protect_privileged_columns on public.profiles;
create trigger trg_protect_privileged_columns
  before update on public.profiles
  for each row execute procedure public.protect_privileged_columns();

-- 5. Seguridad a nivel de fila (RLS) en `profiles`
alter table public.profiles enable row level security;

drop policy if exists "usuario lee su propio perfil" on public.profiles;
create policy "usuario lee su propio perfil"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists "usuario actualiza su propio perfil" on public.profiles;
create policy "usuario actualiza su propio perfil"
  on public.profiles for update
  using (auth.uid() = id or public.is_admin(auth.uid()));

-- 6. Tabla `cvs` con asignación de dueño `user_id` y RLS estricto
create table if not exists public.cvs (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  candidate_name text,
  dni text,
  cv_data jsonb not null,
  updated_at timestamptz not null default now()
);

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
