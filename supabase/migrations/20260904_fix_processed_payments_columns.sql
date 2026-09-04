-- ============================================================
-- LEECV — Fix P0: Add missing columns and indexes to processed_payments
-- ============================================================

ALTER TABLE public.processed_payments
  ADD COLUMN IF NOT EXISTS amount numeric,
  ADD COLUMN IF NOT EXISTS user_email text,
  ADD COLUMN IF NOT EXISTS payment_id text,
  ADD COLUMN IF NOT EXISTS details jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_processed_payments_created_at ON public.processed_payments (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_processed_payments_provider ON public.processed_payments (provider);
