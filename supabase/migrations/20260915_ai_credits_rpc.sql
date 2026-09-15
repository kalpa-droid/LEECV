-- ============================================================
-- LEECV — Security Migration: User AI Credits Table & Atomic RPCs
-- ============================================================

-- 1. Tabla de Créditos de IA (si no existe)
CREATE TABLE IF NOT EXISTS public.user_credits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ai_credits INT NOT NULL DEFAULT 3,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Habilitar RLS y Políticas de Seguridad
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_credits' AND policyname = 'usuarios ven solo sus propios créditos de IA'
  ) THEN
    CREATE POLICY "usuarios ven solo sus propios créditos de IA"
      ON public.user_credits FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- 3. Otorgar créditos de IA — atómico con ON CONFLICT
CREATE OR REPLACE FUNCTION public.grant_ai_credits(p_user_id UUID, p_amount INT)
RETURNS INT AS $$
DECLARE
  new_total INT;
BEGIN
  INSERT INTO public.user_credits (user_id, ai_credits, updated_at)
  VALUES (p_user_id, p_amount, NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET ai_credits = public.user_credits.ai_credits + p_amount,
      updated_at = NOW()
  RETURNING ai_credits INTO new_total;

  RETURN new_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Consumir créditos de IA — con verificación de ownership desde el día 1
CREATE OR REPLACE FUNCTION public.consume_ai_credit(p_user_id UUID, p_amount INT DEFAULT 1)
RETURNS INT AS $$
DECLARE
  remaining INT;
BEGIN
  IF auth.uid() IS NOT NULL
     AND auth.uid() IS DISTINCT FROM p_user_id
     AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'No autorizado para consumir créditos de IA de otro usuario';
  END IF;

  UPDATE public.user_credits
    SET ai_credits = ai_credits - p_amount, updated_at = NOW()
    WHERE user_id = p_user_id AND ai_credits >= p_amount
    RETURNING ai_credits INTO remaining;

  RETURN remaining;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
