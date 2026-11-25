-- ============================================================================
-- LEECV V3.10.0 — Etapa 5: Sala de Equipo en Vivo en EditorLee (hasta 10)
-- Fecha: 2026-11-26
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.editorial_team_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  preset_id text NOT NULL DEFAULT 'informe-proyecto',
  structural_norm text NOT NULL DEFAULT 'libre',
  bibliography_style text NOT NULL DEFAULT 'tradicional',
  max_members integer NOT NULL DEFAULT 10 CHECK (max_members BETWEEN 2 AND 10),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_editorial_team_projects_org
  ON public.editorial_team_projects (org_id);

ALTER TABLE public.editorial_team_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Team members read editorial projects" ON public.editorial_team_projects;
CREATE POLICY "Team members read editorial projects"
  ON public.editorial_team_projects
  FOR SELECT
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.org_members m
      WHERE m.org_id = editorial_team_projects.org_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Team owners manage editorial projects" ON public.editorial_team_projects;
CREATE POLICY "Team owners manage editorial projects"
  ON public.editorial_team_projects
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.editorial_team_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.editorial_team_projects(id) ON DELETE CASCADE,
  section_key text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  title text NOT NULL,
  section_meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  records_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  content_markdown text NOT NULL DEFAULT '',
  locked_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  locked_by_email text NULL,
  lock_expires_at timestamptz NULL,
  updated_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by_email text NULL,
  version integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, section_key)
);

CREATE INDEX IF NOT EXISTS idx_editorial_team_sections_project
  ON public.editorial_team_sections (project_id, sort_order);

ALTER TABLE public.editorial_team_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Team members read editorial sections" ON public.editorial_team_sections;
CREATE POLICY "Team members read editorial sections"
  ON public.editorial_team_sections
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.editorial_team_projects p
      WHERE p.id = editorial_team_sections.project_id
        AND (
          p.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.org_members m
            WHERE m.org_id = p.org_id
              AND m.user_id = auth.uid()
              AND m.status = 'active'
          )
        )
    )
  );

DROP POLICY IF EXISTS "Team active members update editorial sections" ON public.editorial_team_sections;
CREATE POLICY "Team active members update editorial sections"
  ON public.editorial_team_sections
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.editorial_team_projects p
      WHERE p.id = editorial_team_sections.project_id
        AND (
          p.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.org_members m
            WHERE m.org_id = p.org_id
              AND m.user_id = auth.uid()
              AND m.status = 'active'
          )
        )
    )
  );

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.editorial_team_sections;
EXCEPTION WHEN duplicate_object THEN
  NULL;
WHEN undefined_object THEN
  NULL;
END $$;
