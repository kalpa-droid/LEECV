-- ============================================================
-- LEECV — Multi-User Enterprise Organizations & Shared Candidates
-- ============================================================

-- 1. Organizations table
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  max_members integer not null default 10,
  storage_limit_mb integer not null default 50000,
  created_at timestamptz not null default now()
);

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

-- 2. Organization Members & Invitations table
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

drop policy if exists "dueño o admin invita miembros" on public.org_members;
create policy "dueño o admin invita miembros"
  on public.org_members for insert
  with check (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.organizations o
      where o.id = org_id and o.owner_id = auth.uid()
    )
  );

drop policy if exists "dueño administra miembros" on public.org_members;
create policy "dueño administra miembros"
  on public.org_members for update
  using (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.organizations o
      where o.id = org_id and o.owner_id = auth.uid()
    )
  );

-- 3. Org Candidates (candidatos propios de una organización Enterprise —
--    NO confundir con `candidate_profiles`, que ya existe desde migration.sql
--    con otro esquema (cv_id como PK) para el caso de uso de Nivel 2/Agencia Pro.
--    Usar el mismo nombre para ambos generaba un choque de esquemas: la segunda
--    creación quedaba como no-op por el `if not exists` y organizationService.js
--    fallaba en producción al pedir columnas (org_id, full_name, cv_data) que
--    nunca se llegaban a crear.
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

drop policy if exists "usuario u organizacion crea candidatos" on public.org_candidates;
create policy "usuario u organizacion crea candidatos"
  on public.org_candidates for insert
  with check (auth.uid() = owner_id);

drop policy if exists "usuario u organizacion actualiza candidatos" on public.org_candidates;
create policy "usuario u organizacion actualiza candidatos"
  on public.org_candidates for update
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
