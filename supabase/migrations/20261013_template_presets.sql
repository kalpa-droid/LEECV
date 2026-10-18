-- Migration: 20261013_template_presets.sql
-- Objetivo: Crear tabla de plantillas y presets de diseño con RLS para sincronización remota opcional.

CREATE TABLE IF NOT EXISTS public.template_presets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.template_presets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'template_presets' AND policyname = 'Public can read active presets'
  ) THEN
    CREATE POLICY "Public can read active presets" ON public.template_presets
      FOR SELECT USING (is_active = true);
  END IF;
END;
$$;
