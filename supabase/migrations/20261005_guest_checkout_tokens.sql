-- Migration: Guest Checkout Tokens
-- Replaces user-bound credits with ephemeral single-use export tokens.

CREATE TABLE IF NOT EXISTS public.pdf_export_tokens (
    token UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_type TEXT NOT NULL,
    email TEXT,
    paid BOOLEAN NOT NULL DEFAULT false,
    consumed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (timezone('utc'::text, now()) + interval '7 days') NOT NULL,
    payment_id TEXT
);

-- RLS Policies
ALTER TABLE public.pdf_export_tokens ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to create tokens
CREATE POLICY "Anyone can create a token"
ON public.pdf_export_tokens FOR INSERT
TO public
WITH CHECK (true);

-- Allow anonymous users to read their own token if they have the UUID
CREATE POLICY "Anyone can read their token by UUID"
ON public.pdf_export_tokens FOR SELECT
TO public
USING (true);

-- Deny all updates from client directly (only webhooks/edge functions can update directly)
CREATE POLICY "No updates from client"
ON public.pdf_export_tokens FOR UPDATE
TO public
USING (false);

-- RPC to consume a paid token
CREATE OR REPLACE FUNCTION public.consume_export_token(p_token UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- run with admin privileges
AS $$
DECLARE
  v_paid BOOLEAN;
  v_consumed BOOLEAN;
BEGIN
  SELECT paid, consumed INTO v_paid, v_consumed 
  FROM public.pdf_export_tokens 
  WHERE token = p_token;

  IF v_paid = true AND v_consumed = false THEN
    UPDATE public.pdf_export_tokens SET consumed = true WHERE token = p_token;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Grant permissions
GRANT SELECT, INSERT ON public.pdf_export_tokens TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_export_token(UUID) TO anon, authenticated;
