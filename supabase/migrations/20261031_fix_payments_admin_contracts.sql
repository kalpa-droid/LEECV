-- ============================================================================
-- Migración: 20261030_fix_payments_admin_contracts.sql
-- Corrección de contratos detectados en Etapa 2 del plan
-- .opencode/plans/plan-pagos-admin-magic-link.md
--
-- Objetivos:
--   1. Ampliar CHECK `admin_notifications.type` con los tipos que emite
--      `applyPayment.ts` pero que NO estaban en la migración original
--      (20260822_admin_notifications_and_retention.sql):
--        - 'payment_pending'       (webhook pasarela_status pending)
--        - 'payment_mismatch'      (amount/currency incoherente → retención)
--        - 'pending_grant'         (pack sin perfil → invitado/bolsita)
--      El CHECK original sólo admitía:
--        ('payment_received' | 'payment_pending_review' | 'plan_expiring'
--         | 'plan_downgraded' | 'retention_offer_sent').
--   2. Garantizar columna `payment_claims.updated_at` (el código
--      `serverDal.manualClaims.updateStatus` la escribe, pero ninguna migración
--      la creó) y registrar `updated_by` en auditoría.
--   3. Asegurar que la inserción de notificaciones use la columna real
--      `detail` (no `message`).
-- ============================================================================

-- 1. Ampliar el CHECK de tipos de admin_notifications
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'admin_notifications_type_check'
      and conrelid = 'public.admin_notifications'::regclass
  ) then
    alter table public.admin_notifications
      drop constraint admin_notifications_type_check;
  end if;

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
      'retention_offer_sent'
    ));
end;
$$;

-- 2. Garantizar columnas de auditoría en payment_claims
alter table public.payment_claims
  add column if not exists updated_at timestamptz;

alter table public.payment_claims
  add column if not exists updated_by uuid references auth.users(id);

-- 3. Garantizar columnas de auditoría en admin_notifications (created_at ya existía)
alter table public.admin_notifications
  add column if not exists created_at timestamptz not null default now();

-- PostgREST cachea el esquema: recargar sin reiniciar
notify pgrst, 'reload schema';
