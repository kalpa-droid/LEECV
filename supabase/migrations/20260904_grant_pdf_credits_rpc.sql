-- ============================================================
-- LEECV — Security Migration: Atomic PDF Credit Grant RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.grant_pdf_credits(p_user_id UUID, p_amount INT)
RETURNS INT AS $$
DECLARE
  new_total INT;
BEGIN
  INSERT INTO public.pdf_export_credits (user_id, credits, updated_at)
  VALUES (p_user_id, p_amount, NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET credits = public.pdf_export_credits.credits + p_amount,
      updated_at = NOW()
  RETURNING credits INTO new_total;

  RETURN new_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
