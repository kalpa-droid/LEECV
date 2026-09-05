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

-- 3. Columna faltante que cron-downgrade.ts ya intentaba escribir (causaba fallo
--    silencioso en cada inserción de oferta automática de retención, por violar
--    tanto el NOT NULL de plan_at_offer como una columna notes que no existía)
ALTER TABLE public.retention_offers
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 4. Bucket real de LEECV Cloud (Enterprise 50GB) — no existía en ninguna
--    migración versionada; leecvCloudBackend.ts ya asumía que 'certificates'
--    existía y devolvía datos de cuota hardcodeados en vez de consultarlo.
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificates', 'certificates', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Cada usuario gestiona sus propios archivos en LEECV Cloud" ON storage.objects;
CREATE POLICY "Cada usuario gestiona sus propios archivos en LEECV Cloud"
  ON storage.objects FOR ALL
  USING (bucket_id = 'certificates' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'certificates' AND (storage.foldername(name))[1] = auth.uid()::text);
