-- ============================================================
-- Bandeja de avisos para el panel de Admin (pagos, comprobantes
-- manuales, alertas) + ofertas de retención al vencer un plan.
-- Una sola tabla sirve para Premium y Enterprise: el tipo de
-- plan es un dato más de la fila, no una tabla separada por plan.
-- ============================================================

create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('payment_received', 'payment_pending_review', 'plan_expiring', 'plan_downgraded', 'retention_offer_sent')),
  title text not null,
  detail text,
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  metadata jsonb default '{}'::jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_notifications_read on public.admin_notifications(read, created_at desc);

alter table public.admin_notifications enable row level security;

drop policy if exists "admin ve avisos" on public.admin_notifications;
create policy "admin ve avisos"
  on public.admin_notifications for select
  using (public.is_admin(auth.uid()));

drop policy if exists "admin actualiza avisos" on public.admin_notifications;
create policy "admin actualiza avisos"
  on public.admin_notifications for update
  using (public.is_admin(auth.uid()));

-- Comprobantes manuales (transferencia bancaria, Payoneer, cualquier medio
-- sin webhook automático) quedan "pendientes de revisión" acá hasta que
-- el admin los aprueba manualmente desde el panel.
create table if not exists public.payment_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  user_email text,
  method text not null,          -- 'transferencia', 'payoneer', 'otro'
  amount numeric,
  currency text default 'ARS',
  proof_url text,                -- comprobante subido (Storage) o texto/OCR
  plan text not null,            -- 'pro' | 'enterprise' | 'single_pdf' | 'credits_pack_5' | 'credits_pack_10'
  status text not null default 'pendiente' check (status in ('pendiente', 'aprobado', 'rechazado')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.payment_claims enable row level security;

drop policy if exists "usuario ve sus reclamos" on public.payment_claims;
create policy "usuario ve sus reclamos"
  on public.payment_claims for select
  using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "usuario crea su reclamo" on public.payment_claims;
create policy "usuario crea su reclamo"
  on public.payment_claims for insert
  with check (auth.uid() = user_id);

drop policy if exists "admin actualiza reclamos" on public.payment_claims;
create policy "admin actualiza reclamos"
  on public.payment_claims for update
  using (public.is_admin(auth.uid()));

-- Ofertas de retención: se registran para no ofrecer dos veces seguidas
-- al mismo usuario y para medir cuántas se aceptan.
create table if not exists public.retention_offers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_at_offer text not null,        -- plan que tenía cuando se le ofreció ('enterprise')
  discount_percent int not null,
  valid_until timestamptz not null,
  status text not null default 'pendiente' check (status in ('pendiente', 'aceptada', 'rechazada', 'expirada')),
  created_at timestamptz not null default now()
);

alter table public.retention_offers enable row level security;

drop policy if exists "usuario ve sus ofertas" on public.retention_offers;
create policy "usuario ve sus ofertas"
  on public.retention_offers for select
  using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "admin gestiona ofertas" on public.retention_offers;
create policy "admin gestiona ofertas"
  on public.retention_offers for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));
