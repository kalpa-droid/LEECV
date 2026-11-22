-- Fase 4: Estrategia Local-First — Preferencias de cuenta y Respaldo en Nube Opt-In
-- Idempotente: segura para ejecutarse múltiples veces.
-- Orden de despliegue (D16): aplicar esta migración ANTES de activar el replicador en producción.
--
-- Garantías a nivel de base de datos:
--   1. `document_backups.doc_type` restringido a tipos de texto estructurado permitidos
--      (imposible almacenar FacturLee, libros, agendas, EditorLee ni tipos purgados).
--   2. `pg_column_size(projection) <= 65536` (64 KB máx): imposible almacenar fotos, firmas o PDFs.
--   3. RLS estricto por `auth.uid() = user_id` en ambas tablas.

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  cloud_backup_enabled boolean not null default false,
  ui_theme text,
  locale text not null default 'es',
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_preferences' and policyname = 'user_preferences_owner_all'
  ) then
    create policy user_preferences_owner_all
      on public.user_preferences
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

create table if not exists public.document_backups (
  user_id uuid not null references auth.users (id) on delete cascade,
  doc_id text not null,
  doc_type text not null,
  schema_version integer not null default 1,
  revision integer not null default 1,
  title text not null default '',
  projection jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, doc_id),
  constraint document_backups_allowed_doc_type check (doc_type in ('cv', 'business_card', 'cover_letter')),
  constraint document_backups_projection_size check (pg_column_size(projection) <= 65536),
  constraint document_backups_positive_revision check (revision >= 1)
);

create index if not exists idx_document_backups_user_type_updated
  on public.document_backups (user_id, doc_type, updated_at desc);

alter table public.document_backups enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'document_backups' and policyname = 'document_backups_owner_all'
  ) then
    create policy document_backups_owner_all
      on public.document_backups
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;
