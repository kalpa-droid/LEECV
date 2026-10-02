-- Migration: Fix race condition in grant_export_tokens
-- Creates an idempotency table for token grants to capture unique_violation and avoid SELECT EXISTS

CREATE TABLE IF NOT EXISTS public.pdf_export_token_grants (
  payment_id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  amount INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pdf_export_token_grants ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.grant_export_tokens(
  p_payment_id TEXT,
  p_user_id UUID,
  p_amount INT,
  p_email TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Try to record the grant idempotently
  IF p_payment_id IS NOT NULL THEN
    BEGIN
      INSERT INTO public.pdf_export_token_grants (payment_id, user_id, amount)
      VALUES (p_payment_id, p_user_id, p_amount);
    EXCEPTION WHEN unique_violation THEN
      -- Already granted for this payment
      RETURN true;
    END;
  END IF;

  -- 2. Insert N tokens
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
