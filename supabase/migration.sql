-- ============================================================
-- LEECV — Migración: cuentas de usuario, roles y estado premium
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Tabla de perfiles (1 fila por usuario de Supabase Auth)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
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

-- 3. Trigger para creación automática de perfiles
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

-- 4. Seguridad a nivel de fila (RLS) anti-recursiva
alter table public.profiles enable row level security;

drop policy if exists "usuario lee su propio perfil" on public.profiles;
create policy "usuario lee su propio perfil"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists "usuario actualiza su propio perfil" on public.profiles;
create policy "usuario actualiza su propio perfil"
  on public.profiles for update
  using (auth.uid() = id or public.is_admin(auth.uid()));

-- ============================================================
-- IMPORTANTE: convertir tu propio usuario en admin
-- update public.profiles set role = 'admin' where email = 'admin@leecv.app';
-- ============================================================
