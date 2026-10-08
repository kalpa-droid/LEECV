-- Migration: 20261012_secure_sales_and_export_entitlements.sql
-- Objetivo: Blindar la emisión y consumo de tokens de exportación frente a accesos cruzados y ejecución no autorizada,
-- así como garantizar la idempotencia y atomicidad en la extensión de suscripciones Pro.

-- 1. Asegurar tablas de idempotencia de grants y estado de derechos en pagos procesados
CREATE TABLE IF NOT EXISTS public.pdf_export_token_grants (
  payment_id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  amount INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pdf_export_token_grants ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.pro_subscription_grants (
  payment_id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  days_granted INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pro_subscription_grants ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.processed_payments
  ADD COLUMN IF NOT EXISTS entitlement_status text DEFAULT 'completed';


-- 2. Función grant_export_tokens blindada
-- Solo ejecutable por backend de confianza (service_role)
CREATE OR REPLACE FUNCTION public.grant_export_tokens(
  p_payment_id TEXT,
  p_user_id UUID,
  p_amount INT,
  p_email TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog, pg_temp
AS $$
BEGIN
  -- Validaciones estrictas de entrada
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id cannot be null' USING ERRCODE = '22004';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'p_amount must be a positive integer' USING ERRCODE = '22003';
  END IF;

  -- 1. Registrar el otorgamiento de forma idempotente si hay payment_id
  IF p_payment_id IS NOT NULL AND btrim(p_payment_id) <> '' THEN
    BEGIN
      INSERT INTO public.pdf_export_token_grants (payment_id, user_id, amount)
      VALUES (p_payment_id, p_user_id, p_amount);
    EXCEPTION WHEN unique_violation THEN
      -- Pago ya procesado y tokens ya acreditados para este payment_id
      RETURN true;
    END;
  END IF;

  -- 2. Emitir N tokens
  FOR i IN 1..p_amount LOOP
    INSERT INTO public.pdf_export_tokens (
      user_id,
      email,
      paid,
      consumed,
      payment_id
    ) VALUES (
      p_user_id,
      p_email,
      true,
      false,
      p_payment_id
    );
  END LOOP;

  RETURN true;
END;
$$;

-- Restringir permisos estrictamente a service_role
REVOKE ALL ON FUNCTION public.grant_export_tokens(TEXT, UUID, INT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_export_tokens(TEXT, UUID, INT, TEXT) TO service_role;


-- 3. Función check_and_consume_export_entitlement blindada
-- Verifica que auth.uid() coincida exactamente con p_user_id
CREATE OR REPLACE FUNCTION public.check_and_consume_export_entitlement(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_plan TEXT;
  v_plan_vence TIMESTAMPTZ;
  v_token_id UUID;
BEGIN
  -- Validar identidad del invocador frente al usuario objetivo
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL OR v_caller_id <> p_user_id THEN
    RAISE EXCEPTION 'Acceso denegado: solo el usuario autenticado puede consumir sus propios derechos' USING ERRCODE = '42501';
  END IF;

  -- 1. Verificar plan Pro en perfil
  SELECT plan, plan_vence INTO v_plan, v_plan_vence
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_plan = 'pro' AND (v_plan_vence IS NULL OR v_plan_vence > now()) THEN
    RETURN true;
  END IF;

  -- 2. Verificar y consumir 1 token disponible
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

-- Restringir permisos: denegado a público y anónimo, concedido solo a authenticated
REVOKE ALL ON FUNCTION public.check_and_consume_export_entitlement(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_and_consume_export_entitlement(UUID) TO authenticated;


-- 4. Función grant_pro_subscription blindada e idempotente
-- Solo ejecutable por backend de confianza (service_role)
CREATE OR REPLACE FUNCTION public.grant_pro_subscription(
  p_payment_id TEXT,
  p_user_id UUID,
  p_days INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog, pg_temp
AS $$
DECLARE
  v_current_vence TIMESTAMPTZ;
  v_base_date TIMESTAMPTZ;
  v_new_vence TIMESTAMPTZ;
BEGIN
  -- Validaciones estrictas de entrada
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id cannot be null' USING ERRCODE = '22004';
  END IF;

  IF p_days IS NULL OR p_days <= 0 THEN
    RAISE EXCEPTION 'p_days must be a positive integer' USING ERRCODE = '22003';
  END IF;

  -- 1. Idempotencia: Si ya se otorgó para este payment_id, no duplicar días
  IF p_payment_id IS NOT NULL AND btrim(p_payment_id) <> '' THEN
    BEGIN
      INSERT INTO public.pro_subscription_grants (payment_id, user_id, days_granted)
      VALUES (p_payment_id, p_user_id, p_days);
    EXCEPTION WHEN unique_violation THEN
      -- Pago ya procesado y suscripción ya extendida para este payment_id
      RETURN true;
    END;
  END IF;

  -- 2. Bloquear perfil bajo transacción para cálculo atómico de vigencia
  SELECT plan_vence INTO v_current_vence
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_current_vence IS NOT NULL AND v_current_vence > now() THEN
    v_base_date := v_current_vence;
  ELSE
    v_base_date := now();
  END IF;

  v_new_vence := v_base_date + (p_days || ' days')::interval;

  UPDATE public.profiles
  SET plan = 'pro',
      plan_vence = v_new_vence
  WHERE id = p_user_id;

  RETURN true;
END;
$$;

-- Restringir permisos estrictamente a service_role
REVOKE ALL ON FUNCTION public.grant_pro_subscription(TEXT, UUID, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_pro_subscription(TEXT, UUID, INT) TO service_role;
