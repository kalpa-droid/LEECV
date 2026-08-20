-- ============================================================
-- LEECV — Conexión real a Google Drive del usuario (Nivel 1/2, Pro)
-- Enterprise NO usa esto: tiene sus 50GB propios en LEECV Cloud.
-- ============================================================

-- 1. Refresh token de Drive — candado: solo el service role lo toca.
--    No lleva policies a propósito: con RLS activado y cero policies,
--    ni siquiera el dueño de la fila puede leerlo desde el cliente.
create table if not exists public.google_drive_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  refresh_token text not null,
  scope text not null default 'https://www.googleapis.com/auth/drive.file',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_drive_tokens enable row level security;

-- 2. Estado visible (sin el token) — esto sí lo puede leer el dueño y el admin,
--    y es lo que alimenta tanto el aviso de cuota del usuario como el panel admin.
alter table public.profiles
  add column if not exists drive_connected boolean not null default false;

alter table public.profiles
  add column if not exists drive_quota_percent integer;

alter table public.profiles
  add column if not exists drive_last_checked_at timestamptz;

-- Nota: estas 3 columnas quedan fuera de protect_privileged_columns a propósito
-- (no son de rol/plan/pago) — el propio usuario las puede actualizar al chequear
-- su cuota, sin pasar por un endpoint de servidor para eso.
