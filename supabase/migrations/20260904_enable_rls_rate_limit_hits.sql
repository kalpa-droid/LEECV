-- ============================================================
-- LEECV — Security Migration: Enable RLS on rate_limit_hits
-- ============================================================

ALTER TABLE public.rate_limit_hits ENABLE ROW LEVEL SECURITY;
-- Nota: no se agregan políticas públicas para que la tabla sea inaccesible
-- directamente vía Supabase JS client y sólo pueda modificarse a través de la
-- función SECURITY DEFINER check_rate_limit.
