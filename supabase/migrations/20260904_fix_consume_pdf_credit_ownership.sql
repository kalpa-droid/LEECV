-- ============================================================
-- LEECV — Security Migration: Enforce Ownership on consume_pdf_credit
-- ============================================================

CREATE OR REPLACE FUNCTION public.consume_pdf_credit(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  remaining integer;
BEGIN
  -- Requerir que el solicitante sea el propio usuario o un administrador
  -- (Si auth.uid() es NULL, la llamada proviene de service_role/servidor backend verificado)
  IF auth.uid() IS NOT NULL
     AND auth.uid() IS DISTINCT FROM p_user_id
     AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'No autorizado para consumir créditos de otro usuario';
  END IF;

  UPDATE public.pdf_export_credits
    SET credits = credits - 1, updated_at = now()
    WHERE user_id = p_user_id AND credits > 0
    RETURNING credits INTO remaining;

  RETURN remaining IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
