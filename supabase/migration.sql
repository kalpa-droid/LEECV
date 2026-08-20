-- ============================================================
-- LEECV — Migración Master Consolidada (Sin Dependencias de Orden)
-- ============================================================

-- 1. CREACIÓN DE TABLAS (Primero se crean todas las tablas para evitar errores de relación)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  plan text not null default 'free' check (plan in ('free', 'pro', 'enterprise')),
  plan_vence timestamptz,
  premium_activo boolean not null default false,
  premium_vence timestamptz,
  metodo_pago text,
  drive_connected boolean not null default false,
  drive_quota_percent integer,
  drive_last_checked_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists drive_connected boolean not null default false;
alter table public.profiles add column if not exists drive_quota_percent integer;
alter table public.profiles add column if not exists drive_last_checked_at timestamptz;

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

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  max_members integer not null default 10,
  storage_limit_mb integer not null default 50000,
  created_at timestamptz not null default now()
);

create table if not exists public.org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  invited_email text not null,
  role text not null default 'editor' check (role in ('owner', 'admin', 'editor')),
  status text not null default 'pending' check (status in ('pending', 'active', 'rejected')),
  invitation_token text not null default gen_random_uuid()::text,
  created_at timestamptz not null default now(),
  joined_at timestamptz
);

create table if not exists public.org_candidates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete cascade,
  full_name text not null,
  title text,
  vacant text,
  status text not null default 'Borrador',
  cv_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.google_drive_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  refresh_token text not null,
  scope text not null default 'https://www.googleapis.com/auth/drive.file',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. FUNCIONES Y TRIGGERS
create or replace function public.is_admin(user_id uuid)
returns boolean as $$
begin
  if user_id is null then
    return false;
  end if;
  return exists (
    select 1 from public.profiles
    where id = user_id and role = 'admin'
  );
end;
$$ language plpgsql security definer;

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

-- 3. HABILITACIÓN DE RLS Y POLÍTICAS DE SEGURIDAD
alter table public.profiles enable row level security;
drop policy if exists "usuario lee su propio perfil" on public.profiles;
create policy "usuario lee su propio perfil"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists "usuario actualiza su propio perfil" on public.profiles;
create policy "usuario actualiza su propio perfil"
  on public.profiles for update
  using (auth.uid() = id or public.is_admin(auth.uid()));

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

alter table public.organizations enable row level security;
drop policy if exists "dueño y miembros ven organizacion" on public.organizations;
create policy "dueño y miembros ven organizacion"
  on public.organizations for select
  using (
    auth.uid() = owner_id 
    or public.is_admin(auth.uid())
    or exists (
      select 1 from public.org_members
      where org_id = public.organizations.id
        and user_id = auth.uid()
        and status = 'active'
    )
  );

drop policy if exists "dueño actualiza su organizacion" on public.organizations;
create policy "dueño actualiza su organizacion"
  on public.organizations for update
  using (auth.uid() = owner_id or public.is_admin(auth.uid()));

alter table public.org_members enable row level security;
drop policy if exists "miembros ven lista de miembros" on public.org_members;
create policy "miembros ven lista de miembros"
  on public.org_members for select
  using (
    auth.uid() = user_id 
    or public.is_admin(auth.uid())
    or exists (
      select 1 from public.organizations o
      where o.id = public.org_members.org_id and o.owner_id = auth.uid()
    )
  );

alter table public.org_candidates enable row level security;
drop policy if exists "usuario u organizacion ve sus candidatos" on public.org_candidates;
create policy "usuario u organizacion ve sus candidatos"
  on public.org_candidates for select
  using (
    auth.uid() = owner_id
    or public.is_admin(auth.uid())
    or (
      org_id is not null and exists (
        select 1 from public.org_members
        where org_id = public.org_candidates.org_id
          and user_id = auth.uid()
          and status = 'active'
      )
    )
  );

alter table public.google_drive_tokens enable row level security;
