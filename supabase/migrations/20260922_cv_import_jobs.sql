-- ============================================================
-- LEECV — AI CV Import Jobs Tables & Credits RPC
-- ============================================================

CREATE TABLE public.cv_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_pages INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing', -- processing | done | failed | expired
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 minutes')
);

CREATE TABLE public.cv_import_job_pages (
  job_id UUID NOT NULL REFERENCES public.cv_import_jobs(id) ON DELETE CASCADE,
  page_index INT NOT NULL,
  fragment_json JSONB NOT NULL,
  PRIMARY KEY (job_id, page_index)
);

ALTER TABLE public.cv_import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cv_import_job_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven solo sus propios cv import jobs"
  ON public.cv_import_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden insertar sus propios cv import jobs"
  ON public.cv_import_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden actualizar sus propios cv import jobs"
  ON public.cv_import_jobs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuarios ven solo sus propios cv import job pages"
  ON public.cv_import_job_pages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.cv_import_jobs
    WHERE cv_import_jobs.id = cv_import_job_pages.job_id
    AND cv_import_jobs.user_id = auth.uid()
  ));

CREATE POLICY "Usuarios pueden insertar sus propios cv import job pages"
  ON public.cv_import_job_pages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cv_import_jobs
    WHERE cv_import_jobs.id = cv_import_job_pages.job_id
    AND cv_import_jobs.user_id = auth.uid()
  ));

CREATE OR REPLACE FUNCTION public.consume_ai_import_credits(p_user_id uuid, p_page_count int)
RETURNS int AS $$
DECLARE
  -- Cobramos 2 créditos por cada página (más costoso que texto puro, como sugería el plan)
  v_credits_needed int := p_page_count * 2;
  v_remaining int;
BEGIN
  IF auth.uid() IS NOT NULL
     AND auth.uid() IS DISTINCT FROM p_user_id
     AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'No autorizado para consumir créditos de IA de otro usuario';
  END IF;

  UPDATE public.user_credits
    SET ai_credits = ai_credits - v_credits_needed, updated_at = now()
    WHERE user_id = p_user_id AND ai_credits >= v_credits_needed
    RETURNING ai_credits INTO v_remaining;

  RETURN v_remaining; -- returns null if credits are insufficient or record missing
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
