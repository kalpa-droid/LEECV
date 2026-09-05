-- ============================================================
-- LEECV — Enforcement real del tope de 50GB en LEECV Cloud
-- (bucket 'certificates'). Hasta ahora era solo un número
-- mostrado en el dashboard, sin nada que lo hiciera cumplir.
-- ============================================================

CREATE OR REPLACE FUNCTION public.enforce_leecv_cloud_quota()
RETURNS TRIGGER AS $$
DECLARE
  v_owner text;
  v_new_size bigint;
  v_used_bytes bigint;
  v_quota_bytes bigint := 50 * 1024 * 1024 * 1024; -- 50GB. Único lugar donde vive este número a nivel DB.
BEGIN
  IF NEW.bucket_id <> 'certificates' THEN
    RETURN NEW;
  END IF;

  v_owner := (storage.foldername(NEW.name))[1];
  v_new_size := COALESCE((NEW.metadata->>'size')::bigint, 0);

  SELECT COALESCE(SUM((metadata->>'size')::bigint), 0)
    INTO v_used_bytes
    FROM storage.objects
    WHERE bucket_id = 'certificates'
      AND (storage.foldername(name))[1] = v_owner
      AND name <> NEW.name;

  IF (v_used_bytes + v_new_size) > v_quota_bytes THEN
    RAISE EXCEPTION 'Cuota de LEECV Cloud excedida (50GB). Usado: % GB, este archivo: % GB',
      round(v_used_bytes / 1073741824.0, 2),
      round(v_new_size / 1073741824.0, 2)
      USING ERRCODE = '23514'; -- check_violation, para poder distinguirlo en el catch del frontend
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enforce_leecv_cloud_quota ON storage.objects;
CREATE TRIGGER trg_enforce_leecv_cloud_quota
  BEFORE INSERT OR UPDATE ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_leecv_cloud_quota();

-- Sin este índice, cada subida hace un SUM() escaneando todo storage.objects.
CREATE INDEX IF NOT EXISTS idx_storage_objects_certificates_owner
  ON storage.objects (bucket_id, name)
  WHERE bucket_id = 'certificates';
