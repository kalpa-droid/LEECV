-- P4: IDs de Suscripción Recurrente (Fase G)
-- Se utilizan para poder cancelar las suscripciones activas de MP y PayPal desde el panel de usuario.
alter table public.profiles
  add column if not exists mp_preapproval_id text,
  add column if not exists paypal_subscription_id text;
