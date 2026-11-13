-- Migration: Shared AI Key Cooldowns (V2.9.0)
-- Store compartido de cooldowns de API keys de IA (Groq / Gemini).
-- Antes los cooldowns vivían en un Map en memoria del proceso: cada lambda de
-- Vercel tenía su propia copia, no se compartía entre instancias y se perdía en
-- cold starts. Esta tabla es la fuente de verdad compartida; el código aplica
-- leases híbridos (DB + memoria local como fallback si la DB falla).
--
-- Seguridad:
-- - Se guarda ÚNICAMENTE el SHA-256 de la API key, nunca la key en texto plano.
-- - RLS habilitado SIN policies: anon/authenticated no pueden leer ni escribir.
--   Acceso exclusivo vía service role (supabaseAdmin en api/_lib/supabaseAdmin.ts).

CREATE TABLE IF NOT EXISTS public.ai_key_cooldowns (
    provider TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    paused_until TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (provider, key_hash)
);

-- Índice para el filtro de lecturas (WHERE paused_until > now())
CREATE INDEX IF NOT EXISTS ai_key_cooldowns_paused_until_idx
    ON public.ai_key_cooldowns (paused_until);

ALTER TABLE public.ai_key_cooldowns ENABLE ROW LEVEL SECURITY;
-- Sin policies: ningún rol de cliente (anon/authenticated) tiene acceso.
-- service_role bypassa RLS por definición de Supabase.

-- updated_at automático en upserts
CREATE OR REPLACE FUNCTION public.ai_key_cooldowns_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ai_key_cooldowns_touch_updated_at ON public.ai_key_cooldowns;
CREATE TRIGGER ai_key_cooldowns_touch_updated_at
BEFORE UPDATE ON public.ai_key_cooldowns
FOR EACH ROW
EXECUTE FUNCTION public.ai_key_cooldowns_touch_updated_at();
