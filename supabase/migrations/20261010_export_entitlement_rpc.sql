-- 1. Remove expiration from tokens (P2: Ninguno vence)
ALTER TABLE public.pdf_export_tokens
DROP COLUMN IF EXISTS expires_at;

-- 2. Create the unified entitlement RPC
CREATE OR REPLACE FUNCTION public.check_and_consume_export_entitlement(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan TEXT;
  v_plan_vence TIMESTAMPTZ;
  v_token_id UUID;
BEGIN
  -- Check user profile
  SELECT plan, plan_vence INTO v_plan, v_plan_vence
  FROM public.profiles
  WHERE id = p_user_id;

  -- 1. Pro plan check
  IF v_plan = 'pro' AND (v_plan_vence IS NULL OR v_plan_vence > now()) THEN
    RETURN true;
  END IF;

  -- 2. Token check (consume 1 if available)
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

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.check_and_consume_export_entitlement(UUID) TO authenticated;
