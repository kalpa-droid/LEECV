-- Migración: Tabla para registrar punteros de CVs publicados en la web (/c/:slug)
CREATE TABLE IF NOT EXISTS public.published_cvs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cv_id TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  drive_file_id TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unq_published_cvs_cv_id UNIQUE (cv_id)
);

ALTER TABLE public.published_cvs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "El dueño ve y edita sus propios CVs publicados"
  ON public.published_cvs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Lectura pública para la vista /c/:slug (solo activos)"
  ON public.published_cvs FOR SELECT
  USING (is_active = true);
