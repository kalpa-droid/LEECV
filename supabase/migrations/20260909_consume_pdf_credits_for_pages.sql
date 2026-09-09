-- ============================================================
-- LEECV — Security Migration: RPC consume_pdf_credits_for_pages
-- Calculates and consumes credits based on total pages (1 credit per 10 pages)
-- ============================================================

CREATE OR REPLACE FUNCTION public.consume_pdf_credits_for_pages(p_user_id uuid, p_page_count int)
RETURNS int AS $$
DECLARE
  v_credits_needed int := ceil(p_page_count::numeric / 10);
  v_remaining int;
BEGIN
  IF auth.uid() IS NOT NULL
     AND auth.uid() IS DISTINCT FROM p_user_id
     AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'No autorizado para consumir créditos de otro usuario';
  END IF;

  UPDATE public.pdf_export_credits
    SET credits = credits - v_credits_needed, updated_at = now()
    WHERE user_id = p_user_id AND credits >= v_credits_needed
    RETURNING credits INTO v_remaining;

  RETURN v_remaining; -- returns null if credits are insufficient or record missing
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
