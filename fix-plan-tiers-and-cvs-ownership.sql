-- ============================================================
-- LEECV — Parche 2: modelo de 3 niveles + dueño de CVs + RLS en 'cvs'
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- (después de migration.sql y de fix-profiles-privilege-escalation.sql)
-- ============================================================

-- 1. Reemplazar el booleano premium_activo por un nivel real,
--    porque ahora hay 3 planes con distintas features, no solo on/off.
alter table public.profiles
  add column if not exists plan text not null default 'free'
  check (plan in ('free', 'pro', 'enterprise'));

alter table public.profiles
  add column if not exists plan_vence timestamptz;

-- (metodo_pago y premium_activo se mantienen por compatibilidad;
--  el código de admin/cv-builder se migra a leer `plan` en el próximo paso)

-- 2. La tabla `cvs` existe en tu código pero NO tiene RLS ni dueño —
--    hoy cualquiera con la anon key puede leer/escribir CVs de otros usuarios.
--    Esto es más urgente que la reorganización de carpetas.

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

-- Nota: los CVs de usuarios anónimos (Nivel 1 sin registrarse) NUNCA
-- llegan a esta tabla — se quedan en IndexedDB local. Solo se sincronizan
-- acá cuando el usuario se registra con Google y user_id queda asignado.
