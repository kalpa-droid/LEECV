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

-- 2. Cuando alguien se registra en Supabase Auth, se le crea el perfil solo
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

-- 3. Seguridad a nivel de fila (RLS)
alter table public.profiles enable row level security;

-- Cada usuario puede ver y editar SOLO su propia fila
create policy "usuario lee su propio perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "usuario actualiza su propio perfil"
  on public.profiles for update
  using (auth.uid() = id);

-- Los admin pueden leer y editar TODOS los perfiles
create policy "admin lee todos los perfiles"
  on public.profiles for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "admin actualiza todos los perfiles"
  on public.profiles for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ============================================================
-- IMPORTANTE: convertir tu propio usuario en admin
-- Después de registrarte una vez en la web con admin@leecv.app,
-- corré esto (una sola vez) reemplazando el email si hace falta:
-- ============================================================
-- update public.profiles set role = 'admin' where email = 'admin@leecv.app';
