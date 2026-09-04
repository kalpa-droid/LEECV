-- ============================================================
-- LEECV — Tracking de Backups de CVs en Drive y Período de Gracia
-- ============================================================

-- 1. Columnas de seguimiento de respaldos por CV en Google Drive
ALTER TABLE public.cvs
  ADD COLUMN IF NOT EXISTS drive_file_id TEXT,
  ADD COLUMN IF NOT EXISTS drive_synced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_cvs_drive_file_id ON public.cvs(drive_file_id) WHERE drive_file_id IS NOT NULL;

-- 2. Fecha límite del período de gracia (10 días tras vencimiento)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMPTZ;
