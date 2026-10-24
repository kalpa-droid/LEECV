-- Migration: 20261024_template_presets_admin_policy.sql
-- Objetivo: Permitir a usuarios administradores autenticados gestionar plantillas en template_presets (insert/update/delete)
-- Complementa 20261013_template_presets.sql que define la lectura pública.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'template_presets' AND policyname = 'Admins can manage template presets'
  ) THEN
    CREATE POLICY "Admins can manage template presets" ON public.template_presets
      FOR ALL
      USING (public.is_admin(auth.uid()))
      WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END;
$$;
