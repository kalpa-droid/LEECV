-- ============================================================
-- LEECV — Fix: Add currency column to processed_payments
-- ============================================================

ALTER TABLE public.processed_payments
  ADD COLUMN IF NOT EXISTS currency text;
