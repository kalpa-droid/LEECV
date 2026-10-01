-- Migration: Account Export Tokens (Fase F & G)
-- Adds user_id to pdf_export_tokens and creates grant_export_tokens RPC.

ALTER TABLE public.pdf_export_tokens 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
ALTER COLUMN doc_type DROP NOT NULL;

-- Index for querying a user's tokens
CREATE INDEX IF NOT EXISTS idx_pdf_export_tokens_user_id ON public.pdf_export_tokens(user_id);

-- RPC to grant multiple tokens idempotently
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
DECLARE
  v_exists BOOLEAN;
BEGIN
  -- Prevent duplicates based on payment_id (Idempotency)
  IF p_payment_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.pdf_export_tokens WHERE payment_id = p_payment_id
    ) INTO v_exists;
    
    IF v_exists THEN
      -- Already granted for this payment
      RETURN true;
    END IF;
  END IF;

  -- Insert N tokens
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

-- Grant execute
GRANT EXECUTE ON FUNCTION public.grant_export_tokens(TEXT, UUID, INT, TEXT) TO service_role;
