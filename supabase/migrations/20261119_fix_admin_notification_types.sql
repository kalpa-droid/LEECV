-- ============================================================================
-- Fix: agregar 'manual_payment_claim' al CHECK constraint de admin_notifications
--
-- El cliente (paymentService.ts → enviarComprobanteManual) inserta notificaciones
-- con type = 'manual_payment_claim', pero ese valor no está en el CHECK constraint
-- actual. El insert falla silenciosamente (Supabase JS v2 devuelve { error } sin
-- throw) y el admin nunca se entera del comprobante manual.
--
-- Idempotente: DROP IF EXISTS + ADD.
-- ============================================================================

do $$
begin
  -- Eliminar constraint existente si tiene el nombre conocido
  if exists (
    select 1 from pg_constraint
    where conname = 'admin_notifications_type_check'
      and conrelid = 'public.admin_notifications'::regclass
  ) then
    alter table public.admin_notifications
      drop constraint admin_notifications_type_check;
  end if;

  -- También eliminar el nombre alternativo de migraciones anteriores
  if exists (
    select 1 from pg_constraint
    where conname = 'chk_type_allowed'
      and conrelid = 'public.admin_notifications'::regclass
  ) then
    alter table public.admin_notifications
      drop constraint chk_type_allowed;
  end if;

  -- Recrear con TODOS los types usados en el código
  alter table public.admin_notifications
    add constraint admin_notifications_type_check
    check (type in (
      'payment_received',
      'payment_pending',
      'payment_pending_review',
      'payment_mismatch',
      'pending_grant',
      'plan_expiring',
      'plan_downgraded',
      'retention_offer_sent',
      'unclaimed_credits_expired',
      'manual_payment_claim'
    ));
end;
$$;