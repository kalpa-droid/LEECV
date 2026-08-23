-- Migración: Tabla y Función RPC atómica para Rate Limiting distribuido en Vercel Serverless
CREATE TABLE IF NOT EXISTS public.rate_limit_hits (
  key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para acelerar la búsqueda por clave y ventana de tiempo
CREATE INDEX IF NOT EXISTS idx_rate_limit_hits_key_created_at 
  ON public.rate_limit_hits (key, created_at);

-- Función RPC atómica para verificar e insertar un golpe de solicitud (hit)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key TEXT,
  p_max_requests INT,
  p_window_seconds INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT;
  v_cutoff TIMESTAMPTZ;
BEGIN
  v_cutoff := NOW() - (p_window_seconds || ' seconds')::INTERVAL;
  
  -- Limpieza probabilística periódica (5% de las llamadas) para remover hits viejos
  IF random() < 0.05 THEN
    DELETE FROM public.rate_limit_hits WHERE created_at < NOW() - INTERVAL '1 hour';
  END IF;

  -- Contar hits existentes en la ventana de tiempo activa
  SELECT COUNT(*) INTO v_count
  FROM public.rate_limit_hits
  WHERE key = p_key AND created_at >= v_cutoff;

  IF v_count >= p_max_requests THEN
    RETURN FALSE;
  END IF;

  -- Registrar la nueva solicitud
  INSERT INTO public.rate_limit_hits (key, created_at)
  VALUES (p_key, NOW());

  RETURN TRUE;
END;
$$;
