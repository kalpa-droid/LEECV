-- Migration: Fix Guest Checkout Tokens RLS
-- Restricts INSERT to only unpaid/unconsumed tokens and replaces SELECT with an RPC to prevent table scans.

-- 1. Drop existing policies
DROP POLICY IF EXISTS "Anyone can create a token" ON public.pdf_export_tokens;
DROP POLICY IF EXISTS "Anyone can read their token by UUID" ON public.pdf_export_tokens;
DROP POLICY IF EXISTS "No updates from client" ON public.pdf_export_tokens;

-- 2. Re-create INSERT policy with security checks
CREATE POLICY "Anyone can create a token"
ON public.pdf_export_tokens FOR INSERT
TO public
WITH CHECK (paid = false AND consumed = false);

-- 3. We do NOT re-create the SELECT policy. 
-- Instead, we provide an RPC to safely check a token by UUID without exposing the whole table.

CREATE OR REPLACE FUNCTION public.check_export_token_status(p_token UUID)
RETURNS TABLE (paid BOOLEAN, consumed BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER -- run with admin privileges
AS $$
BEGIN
  RETURN QUERY
  SELECT t.paid, t.consumed 
  FROM public.pdf_export_tokens t
  WHERE t.token = p_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_export_token_status(UUID) TO anon, authenticated;

-- 4. Re-create the UPDATE policy just in case (still denying all)
CREATE POLICY "No updates from client"
ON public.pdf_export_tokens FOR UPDATE
TO public
USING (false);
