-- ============================================================
-- LEECV — Webhook Payment Idempotency & Unique Transaction Log
-- ============================================================

create table if not exists public.processed_payments (
  id uuid primary key default gen_random_uuid(),
  provider text not null, -- 'mercadopago' | 'paypal' | 'lemonsqueezy' | 'manual'
  external_id text not null,
  user_id uuid references auth.users(id) on delete cascade,
  plan text not null,
  processed_at timestamptz not null default now(),
  constraint unq_provider_external_id unique (provider, external_id)
);

alter table public.processed_payments enable row level security;

drop policy if exists "admin ve pagos procesados" on public.processed_payments;
create policy "admin ve pagos procesados"
  on public.processed_payments for select
  using (public.is_admin(auth.uid()));
