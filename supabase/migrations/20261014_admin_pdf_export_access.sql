ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pdf_export_access_mode text NOT NULL DEFAULT 'automatic'
  CHECK (pdf_export_access_mode IN ('automatic', 'enabled', 'disabled'));

ALTER TABLE public.pending_grants
  ADD COLUMN IF NOT EXISTS resolved_user_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS resolution_reason text,
  ADD COLUMN IF NOT EXISTS resolution_action text;

CREATE INDEX IF NOT EXISTS idx_pending_grants_unresolved
  ON public.pending_grants (created_at DESC)
  WHERE resolved_at IS NULL;

CREATE OR REPLACE FUNCTION public.check_and_consume_export_entitlement(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_plan TEXT;
  v_plan_vence TIMESTAMPTZ;
  v_access_mode TEXT;
  v_token_id UUID;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL OR v_caller_id <> p_user_id THEN
    RAISE EXCEPTION 'Acceso denegado: solo el usuario autenticado puede consumir sus propios derechos' USING ERRCODE = '42501';
  END IF;

  SELECT plan, plan_vence, pdf_export_access_mode
    INTO v_plan, v_plan_vence, v_access_mode
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_access_mode = 'disabled' THEN
    RETURN false;
  END IF;

  IF v_access_mode = 'enabled' THEN
    RETURN true;
  END IF;

  IF v_plan = 'pro' AND (v_plan_vence IS NULL OR v_plan_vence > pg_catalog.now()) THEN
    RETURN true;
  END IF;

  SELECT token INTO v_token_id
  FROM public.pdf_export_tokens
  WHERE user_id = p_user_id
    AND paid = true
    AND consumed = false
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_token_id IS NOT NULL THEN
    UPDATE public.pdf_export_tokens
    SET consumed = true
    WHERE token = v_token_id;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.check_and_consume_export_entitlement(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_and_consume_export_entitlement(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_export_token_balances(p_user_ids UUID[])
RETURNS TABLE(user_id UUID, credits BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT t.user_id, count(*)::BIGINT
  FROM public.pdf_export_tokens AS t
  WHERE t.user_id = ANY(COALESCE(p_user_ids, ARRAY[]::UUID[]))
    AND t.paid = true
    AND t.consumed = false
  GROUP BY t.user_id;
$$;

REVOKE ALL ON FUNCTION public.admin_export_token_balances(UUID[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_export_token_balances(UUID[]) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_set_pdf_export_access(
  p_target_user_id UUID,
  p_access_mode TEXT,
  p_reason TEXT,
  p_admin_user_id UUID
)
RETURNS TABLE(previous_mode TEXT, current_mode TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_previous_mode TEXT;
BEGIN
  IF p_access_mode NOT IN ('automatic', 'enabled', 'disabled') THEN
    RAISE EXCEPTION 'Modo de acceso PDF no válido' USING ERRCODE = '22023';
  END IF;

  IF p_reason IS NULL OR pg_catalog.char_length(pg_catalog.btrim(p_reason)) < 5 THEN
    RAISE EXCEPTION 'El motivo debe tener al menos 5 caracteres' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_admin_user_id
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Requiere permisos de administrador' USING ERRCODE = '42501';
  END IF;

  SELECT pdf_export_access_mode
    INTO v_previous_mode
  FROM public.profiles
  WHERE id = p_target_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil de usuario no encontrado' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.profiles
  SET pdf_export_access_mode = p_access_mode
  WHERE id = p_target_user_id;

  INSERT INTO public.admin_audit_logs (admin_id, action_type, target_user_id, details)
  VALUES (
    p_admin_user_id,
    'set_pdf_export_access',
    p_target_user_id,
    pg_catalog.jsonb_build_object(
      'previous_mode', v_previous_mode,
      'current_mode', p_access_mode,
      'reason', pg_catalog.btrim(p_reason)
    )
  );

  RETURN QUERY SELECT v_previous_mode, p_access_mode;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_pdf_export_access(UUID, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_pdf_export_access(UUID, TEXT, TEXT, UUID) TO service_role;
