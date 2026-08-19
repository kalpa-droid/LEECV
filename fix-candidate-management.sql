-- ============================================================
-- LEECV — Parche 3: gestión de candidatos (Nivel 2 Agencia Pro / Nivel 3 Enterprise)
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- (después de los parches 1 y 2)
-- ============================================================

-- No duplica el CV: solo agrega la metadata que le importa a la agencia,
-- referenciando el CV que ya vive en `cvs` (creado por cv-builder).
create table if not exists public.candidate_profiles (
  cv_id text primary key references public.cvs(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'postulante'
    check (status in ('postulante', 'en_proceso', 'contratado', 'descartado')),
  source text,        -- de dónde salió el candidato: LinkedIn, referido, etc.
  notes text,
  updated_at timestamptz not null default now()
);

create index if not exists idx_candidate_profiles_owner on public.candidate_profiles(owner_id);

alter table public.candidate_profiles enable row level security;

drop policy if exists "agencia ve sus candidatos" on public.candidate_profiles;
create policy "agencia ve sus candidatos"
  on public.candidate_profiles for select
  using (auth.uid() = owner_id or public.is_admin(auth.uid()));

drop policy if exists "agencia crea sus candidatos" on public.candidate_profiles;
create policy "agencia crea sus candidatos"
  on public.candidate_profiles for insert
  with check (auth.uid() = owner_id);

drop policy if exists "agencia actualiza sus candidatos" on public.candidate_profiles;
create policy "agencia actualiza sus candidatos"
  on public.candidate_profiles for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "agencia borra sus candidatos" on public.candidate_profiles;
create policy "agencia borra sus candidatos"
  on public.candidate_profiles for delete
  using (auth.uid() = owner_id);

-- Defensa en profundidad: aunque alguien se salte el paywall del frontend,
-- la base de datos igual rechaza crear candidatos si el plan no es Pro/Enterprise.
create or replace function public.enforce_candidate_plan()
returns trigger as $$
declare
  user_plan text;
begin
  select plan into user_plan from public.profiles where id = new.owner_id;
  if user_plan not in ('pro', 'enterprise') then
    raise exception 'La gestión de candidatos requiere plan Pro o Enterprise';
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_enforce_candidate_plan on public.candidate_profiles;
create trigger trg_enforce_candidate_plan
  before insert on public.candidate_profiles
  for each row execute procedure public.enforce_candidate_plan();
