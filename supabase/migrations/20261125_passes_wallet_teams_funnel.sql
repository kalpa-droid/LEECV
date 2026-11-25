-- ============================================================================
-- LEECV V3.10.0 — Pases por app, Pase 30 días, Billetera canjeable y Funnel
-- Fecha: 2026-11-25
-- ============================================================================

-- 1. Pases por aplicación (permanentes o temporales como Equipo EditorLee 30d)
CREATE TABLE IF NOT EXISTS public.user_app_passes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pass_id text NOT NULL CHECK (pass_id IN ('pass_editorlee', 'pass_facturlee', 'pass_editorial_team_30d')),
  doc_type text NOT NULL CHECK (doc_type IN ('editorial', 'invoice')),
  is_permanent boolean NOT NULL DEFAULT true,
  expires_at timestamptz NULL,
  source text NOT NULL DEFAULT 'purchase',
  payment_id text NULL,
  revoked_at timestamptz NULL,
  revoke_reason text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, pass_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_app_passes_payment_id
  ON public.user_app_passes (payment_id)
  WHERE payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_app_passes_user_active
  ON public.user_app_passes (user_id, doc_type)
  WHERE revoked_at IS NULL;

ALTER TABLE public.user_app_passes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own app passes" ON public.user_app_passes;
CREATE POLICY "Users read own app passes"
  ON public.user_app_passes
  FOR SELECT
  USING (auth.uid() = user_id);

-- 2. Ampliar unclaimed_email_credits para compras guest de pases (credits = 0 + grant_payload)
ALTER TABLE public.unclaimed_email_credits
  ADD COLUMN IF NOT EXISTS grant_payload jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
DECLARE
  con_name text;
BEGIN
  SELECT c.conname INTO con_name
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON t.relnamespace = n.oid
  WHERE n.nspname = 'public'
    AND t.relname = 'unclaimed_email_credits'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%credits%';

  IF con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.unclaimed_email_credits DROP CONSTRAINT %I', con_name);
  END IF;

  ALTER TABLE public.unclaimed_email_credits
    ADD CONSTRAINT unclaimed_email_credits_credits_nonneg CHECK (credits >= 0);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- 3. RPC atómico e idempotente para otorgar pase por aplicación
CREATE OR REPLACE FUNCTION public.grant_app_pass(
  p_payment_id text,
  p_user_id uuid,
  p_pass_id text,
  p_days integer DEFAULT NULL,
  p_source text DEFAULT 'purchase'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc_type text;
  v_is_permanent boolean;
  v_now timestamptz := now();
  v_existing_exp timestamptz;
  v_new_exp timestamptz;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id es obligatorio en grant_app_pass';
  END IF;

  IF p_pass_id NOT IN ('pass_editorlee', 'pass_facturlee', 'pass_editorial_team_30d') THEN
    RAISE EXCEPTION 'pass_id inválido: %', p_pass_id;
  END IF;

  IF p_payment_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_app_passes WHERE payment_id = p_payment_id AND revoked_at IS NULL
  ) THEN
    RETURN;
  END IF;

  v_doc_type := CASE WHEN p_pass_id = 'pass_facturlee' THEN 'invoice' ELSE 'editorial' END;
  v_is_permanent := (p_pass_id IN ('pass_editorlee', 'pass_facturlee')) AND p_days IS NULL;

  IF p_days IS NOT NULL AND p_days > 0 THEN
    SELECT expires_at INTO v_existing_exp
    FROM public.user_app_passes
    WHERE user_id = p_user_id AND pass_id = p_pass_id AND revoked_at IS NULL;

    v_new_exp := GREATEST(COALESCE(v_existing_exp, v_now), v_now) + make_interval(days => p_days);
  ELSIF p_pass_id = 'pass_editorial_team_30d' THEN
    SELECT expires_at INTO v_existing_exp
    FROM public.user_app_passes
    WHERE user_id = p_user_id AND pass_id = p_pass_id AND revoked_at IS NULL;

    v_is_permanent := false;
    v_new_exp := GREATEST(COALESCE(v_existing_exp, v_now), v_now) + interval '30 days';
  ELSE
    v_new_exp := NULL;
  END IF;

  INSERT INTO public.user_app_passes (
    user_id, pass_id, doc_type, is_permanent, expires_at, source, payment_id, revoked_at, revoke_reason, updated_at
  )
  VALUES (
    p_user_id, p_pass_id, v_doc_type, v_is_permanent, v_new_exp, COALESCE(p_source, 'purchase'), p_payment_id, NULL, NULL, v_now
  )
  ON CONFLICT (user_id, pass_id) DO UPDATE SET
    doc_type = EXCLUDED.doc_type,
    is_permanent = EXCLUDED.is_permanent,
    expires_at = EXCLUDED.expires_at,
    source = EXCLUDED.source,
    payment_id = COALESCE(EXCLUDED.payment_id, public.user_app_passes.payment_id),
    revoked_at = NULL,
    revoke_reason = NULL,
    updated_at = v_now;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_app_pass(text, uuid, text, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_app_pass(text, uuid, text, integer, text) TO service_role;

-- 4. RPC para revocar pase (uso exclusivo Admin / service_role)
CREATE OR REPLACE FUNCTION public.revoke_app_pass(
  p_user_id uuid,
  p_pass_id text,
  p_reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated integer;
BEGIN
  UPDATE public.user_app_passes
  SET
    revoked_at = now(),
    revoke_reason = COALESCE(NULLIF(trim(p_reason), ''), 'Revocado manualmente por administrador'),
    updated_at = now()
  WHERE user_id = p_user_id
    AND pass_id = p_pass_id
    AND revoked_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_app_pass(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_app_pass(uuid, text, text) TO service_role;

-- 5. RPC para canjear créditos de la billetera por un Pase (atómico con SKIP LOCKED)
CREATE OR REPLACE FUNCTION public.redeem_credits_for_pass(
  p_user_id uuid,
  p_target_pass text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_uid uuid := auth.uid();
  v_caller_role text := current_setting('role', true);
  v_email text;
  v_cost integer;
  v_token_ids uuid[];
  v_now timestamptz := now();
  v_has_editorlee_pass boolean := false;
  v_current_vence timestamptz;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'USER_ID_REQUIRED';
  END IF;

  IF v_caller_role IS DISTINCT FROM 'service_role' AND v_caller_uid IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF p_target_pass NOT IN ('pass_30d', 'pass_editorlee', 'pass_facturlee', 'pass_editorial_team_30d') THEN
    RAISE EXCEPTION 'INVALID_PASS_ID';
  END IF;

  IF p_target_pass = 'pass_30d' THEN
    v_cost := 5;
  ELSIF p_target_pass IN ('pass_editorlee', 'pass_facturlee') THEN
    v_cost := 10;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM public.user_app_passes
      WHERE user_id = p_user_id
        AND pass_id = 'pass_editorlee'
        AND revoked_at IS NULL
        AND (is_permanent = true OR expires_at IS NULL OR expires_at > v_now)
    ) INTO v_has_editorlee_pass;

    v_cost := CASE WHEN v_has_editorlee_pass THEN 5 ELSE 10 END;
  END IF;

  SELECT email INTO v_email FROM public.profiles WHERE id = p_user_id;

  SELECT array_agg(sub.id) INTO v_token_ids
  FROM (
    SELECT t.id
    FROM public.pdf_export_tokens t
    WHERE (
      t.user_id = p_user_id
      OR (v_email IS NOT NULL AND t.user_id IS NULL AND lower(trim(t.email)) = lower(trim(v_email)))
    )
      AND t.paid = true
      AND t.consumed = false
    ORDER BY t.created_at ASC
    LIMIT v_cost
    FOR UPDATE SKIP LOCKED
  ) sub;

  IF v_token_ids IS NULL OR cardinality(v_token_ids) < v_cost THEN
    RAISE EXCEPTION 'INSUFFICIENT_CREDITS';
  END IF;

  UPDATE public.pdf_export_tokens
  SET
    consumed = true,
    consumed_at = v_now,
    user_id = COALESCE(user_id, p_user_id),
    doc_type = COALESCE(doc_type, 'pass_redeem:' || p_target_pass)
  WHERE id = ANY(v_token_ids);

  IF p_target_pass = 'pass_30d' THEN
    SELECT plan_vence INTO v_current_vence FROM public.profiles WHERE id = p_user_id;
    UPDATE public.profiles
    SET
      plan = 'pass_30d',
      plan_vence = GREATEST(COALESCE(v_current_vence, v_now), v_now) + interval '30 days'
    WHERE id = p_user_id;
  ELSE
    PERFORM public.grant_app_pass(
      'redeem:' || p_user_id::text || ':' || p_target_pass || ':' || extract(epoch FROM v_now)::text,
      p_user_id,
      p_target_pass,
      CASE WHEN p_target_pass = 'pass_editorial_team_30d' THEN 30 ELSE NULL END,
      'credit_redeem'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'pass_id', p_target_pass,
    'credits_spent', v_cost
  );
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_credits_for_pass(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_credits_for_pass(uuid, text) TO authenticated, service_role;

-- 6. Actualizar claim_credits_on_auth() para reclamar tanto créditos como pases guest en grant_payload
CREATE OR REPLACE FUNCTION public.claim_credits_on_auth()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
  v_row RECORD;
  v_claimed_rows integer := 0;
  v_total_credits integer := 0;
  v_passes_claimed integer := 0;
  i integer;
  v_now timestamptz := now();
  v_grant_type text;
  v_pass_id text;
  v_days integer;
  v_current_vence timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('claimed_credits', 0, 'claimed_passes', 0);
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
  IF v_email IS NULL OR trim(v_email) = '' THEN
    RETURN jsonb_build_object('claimed_credits', 0, 'claimed_passes', 0);
  END IF;

  FOR v_row IN
    SELECT id, credits, provider, payment_id, plan, grant_payload
    FROM public.unclaimed_email_credits
    WHERE lower(trim(email)) = lower(trim(v_email))
      AND claimed_at IS NULL
      AND expired_at IS NULL
    ORDER BY created_at ASC
    FOR UPDATE SKIP LOCKED
  LOOP
    v_claimed_rows := v_claimed_rows + 1;

    IF COALESCE(v_row.credits, 0) > 0 THEN
      FOR i IN 1..v_row.credits LOOP
        INSERT INTO public.pdf_export_tokens (user_id, email, paid, consumed, payment_id, doc_type)
        VALUES (
          v_user_id,
          lower(trim(v_email)),
          true,
          false,
          COALESCE(v_row.payment_id, v_row.provider || ':unclaimed') || '#claim-' || v_row.id::text || '-' || i::text,
          'claimed_pack'
        )
        ON CONFLICT DO NOTHING;
      END LOOP;
      v_total_credits := v_total_credits + v_row.credits;
    END IF;

    v_grant_type := v_row.grant_payload->>'grantType';
    IF v_grant_type = 'pass_30d' THEN
      v_days := GREATEST(COALESCE((v_row.grant_payload->>'days')::int, 30), 1);
      SELECT plan_vence INTO v_current_vence FROM public.profiles WHERE id = v_user_id;
      UPDATE public.profiles
      SET
        plan = 'pass_30d',
        plan_vence = GREATEST(COALESCE(v_current_vence, v_now), v_now) + make_interval(days => v_days)
      WHERE id = v_user_id;
      v_passes_claimed := v_passes_claimed + 1;
    ELSIF v_grant_type = 'app_pass' THEN
      v_pass_id := v_row.grant_payload->>'passId';
      v_days := NULLIF(v_row.grant_payload->>'days', '')::int;
      IF v_pass_id IN ('pass_editorlee', 'pass_facturlee', 'pass_editorial_team_30d') THEN
        PERFORM public.grant_app_pass(
          COALESCE(v_row.payment_id, v_row.provider || ':claim-' || v_row.id::text),
          v_user_id,
          v_pass_id,
          v_days,
          'unclaimed_claim'
        );
        v_passes_claimed := v_passes_claimed + 1;
      END IF;
    END IF;

    UPDATE public.unclaimed_email_credits
    SET claimed_at = v_now, claimed_by_user_id = v_user_id
    WHERE id = v_row.id;
  END LOOP;

  RETURN jsonb_build_object(
    'claimed_rows', v_claimed_rows,
    'claimed_credits', v_total_credits,
    'claimed_passes', v_passes_claimed
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_credits_on_auth() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_credits_on_auth() TO authenticated;

-- 7. Actualizar check_and_consume_export_entitlement preservando firma con DEFAULT NULL
CREATE OR REPLACE FUNCTION public.check_and_consume_export_entitlement(
  p_user_id uuid,
  p_doc_type text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_uid uuid := auth.uid();
  v_caller_role text := current_setting('role', true);
  v_plan text;
  v_plan_vence timestamptz;
  v_access_mode text;
  v_user_email text;
  v_token_id uuid;
  v_has_app_pass boolean := false;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  IF v_caller_role IS DISTINCT FROM 'service_role' AND v_caller_uid IS DISTINCT FROM p_user_id THEN
    RETURN false;
  END IF;

  SELECT plan, plan_vence, COALESCE(pdf_export_access_mode, 'automatic'), email
  INTO v_plan, v_plan_vence, v_access_mode, v_user_email
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_access_mode = 'disabled' THEN
    RETURN false;
  END IF;

  IF v_access_mode = 'enabled' THEN
    RETURN true;
  END IF;

  IF v_plan IN ('pro', 'pass_30d') AND (v_plan_vence IS NULL OR v_plan_vence > now()) THEN
    RETURN true;
  END IF;

  IF p_doc_type IS NOT NULL AND trim(p_doc_type) <> '' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_app_passes
      WHERE user_id = p_user_id
        AND doc_type = p_doc_type
        AND revoked_at IS NULL
        AND (is_permanent = true OR expires_at IS NULL OR expires_at > now())
    ) INTO v_has_app_pass;

    IF v_has_app_pass THEN
      RETURN true;
    END IF;
  END IF;

  SELECT t.id INTO v_token_id
  FROM public.pdf_export_tokens t
  WHERE (
    t.user_id = p_user_id
    OR (v_user_email IS NOT NULL AND t.user_id IS NULL AND lower(trim(t.email)) = lower(trim(v_user_email)))
  )
    AND t.paid = true
    AND t.consumed = false
  ORDER BY t.created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_token_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.pdf_export_tokens
  SET
    consumed = true,
    consumed_at = now(),
    user_id = COALESCE(user_id, p_user_id),
    doc_type = COALESCE(p_doc_type, doc_type)
  WHERE id = v_token_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.check_and_consume_export_entitlement(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_and_consume_export_entitlement(uuid, text) TO authenticated, service_role;

-- 8. Métricas anónimas de embudo (sin PII ni datos sensibles)
CREATE TABLE IF NOT EXISTS public.funnel_daily_counters (
  day date NOT NULL DEFAULT CURRENT_DATE,
  event_key text NOT NULL,
  doc_type text NOT NULL DEFAULT 'all',
  count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (day, event_key, doc_type)
);

ALTER TABLE public.funnel_daily_counters ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.increment_funnel_counter(
  p_event_key text,
  p_doc_type text DEFAULT 'all'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_event_key IS NULL OR trim(p_event_key) = '' THEN
    RETURN;
  END IF;

  INSERT INTO public.funnel_daily_counters (day, event_key, doc_type, count, updated_at)
  VALUES (CURRENT_DATE, trim(p_event_key), COALESCE(NULLIF(trim(p_doc_type), ''), 'all'), 1, now())
  ON CONFLICT (day, event_key, doc_type) DO UPDATE SET
    count = public.funnel_daily_counters.count + 1,
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.increment_funnel_counter(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_funnel_counter(text, text) TO anon, authenticated, service_role;
