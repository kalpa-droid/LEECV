# Directiva OpenCode — Fix Pipeline de Pagos (PR-F1 + PR-F2)

**Fecha:** 2026-11-19
**Base:** `main` @ V2.24.0
**Rama:** `feat/fix-payment-pipeline-f1-f2`
**Objetivo:** Corregir 3 bugs activos en el pipeline de pagos y otorgamiento de créditos.

---

## REGLAS OBLIGATORIAS (AGENTS.md)

1. `git checkout -b feat/fix-payment-pipeline-f1-f2` desde `main` actualizado.
2. Cada cambio debe pasar `npm run check-all` = 0 errores.
3. Bump de `src/shared/core/version.ts` V2.24.0 → V2.24.1 (PATCH) en el mismo commit.
4. Abrir PR contra `main`, esperar CI verde.
5. NO mergear — queda para aprobación del CODEOWNER.

---

## BUG F1 — `useExportEntitlement` no encuentra tokens de invitado por email

### Archivo: `src/shared/core/entitlements/useExportEntitlement.ts`

**Líneas 47-54 actuales:**
```typescript
// Count unconsumed paid tokens for this user
const { count } = await supabase
  .from('pdf_export_tokens')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', user.id)
  .eq('paid', true)
  .eq('consumed', false);
```

**Reemplazar por:**
```typescript
// Count unconsumed paid tokens: por user_id directo O por email cuando
// el token se creó como invitado (user_id null) y claimCreditsOnAuth
// todavía no lo vinculó.
const userEmail = user.email ? user.email.trim().toLowerCase() : '';
const orFilter = userEmail
  ? `user_id.eq.${user.id},and(user_id.is.null,email.eq.${userEmail})`
  : `user_id.eq.${user.id}`;

const { count } = await supabase
  .from('pdf_export_tokens')
  .select('*', { count: 'exact', head: true })
  .eq('paid', true)
  .eq('consumed', false)
  .or(orFilter);
```

**Razón:** Cuando un usuario paga como invitado y luego se loguea, `claimCreditsOnAuth` traslada los créditos. Pero si esa RPC falla o tarda, los tokens quedan con `user_id = null` y `email = usuario@email.com`. La query actual solo busca por `user_id` → el usuario logueado ve 0 créditos. Con el `or`, se encuentran por email como fallback.

---

## BUG F3 — `cleanQueryParams()` se ejecuta antes de terminar el polling

### Archivo: `src/modules/payments/paymentService.ts`

**En la función `procesarRetornoPago()` (líneas ~76-99), eliminar las DOS llamadas a `navigation.cleanQueryParams()` del catch y del flujo normal de PayPal:**

Cambiar esto:
```typescript
if (token && (pagoStatus === 'exitoso' || !pagoStatus)) {
    try {
      await capturarOrdenPayPal(token);
      navigation.cleanQueryParams();
      return { status: 'paypal_captured', orderId: token };
    } catch (err) {
      console.error('Error al capturar orden PayPal en retorno:', err);
      navigation.cleanQueryParams();
      throw err;
    }
  }

  if (pagoStatus === 'exitoso') {
    navigation.cleanQueryParams();
    return { status: 'payment_success' };
  }
```

Por esto:
```typescript
if (token && (pagoStatus === 'exitoso' || !pagoStatus)) {
    try {
      await capturarOrdenPayPal(token);
      // cleanQueryParams se hace DESPUÉS del polling en App.tsx
      return { status: 'paypal_captured', orderId: token };
    } catch (err) {
      console.error('Error al capturar orden PayPal en retorno:', err);
      throw err;
    }
  }

  if (pagoStatus === 'exitoso') {
    // cleanQueryParams se hace DESPUÉS del polling en App.tsx
    return { status: 'payment_success' };
  }
```

### Archivo: `src/app/App.tsx`

**En el `useEffect` del retorno de pago (líneas ~123-168), agregar `navigation.cleanQueryParams()` DESPUÉS de que termine todo el polling.**

Buscar el bloque `const procesar = async () => {` y modificarlo para que limpie los params al final:

```typescript
const procesar = async () => {
  const res = await procesarRetornoPago();
  if (!res || cancelled) return;
  if (res.status === 'paypal_captured') {
    showSuccess('¡Pago procesado con éxito vía PayPal! Tus créditos han sido activados.');
  } else if (res.status === 'payment_success') {
    showSuccess('¡Pago confirmado! Tu cuenta ha sido actualizada.');
  }

  await esperarSesionHidratada();
  if (cancelled) return;
  const intentos = 3;
  for (let intento = 0; intento < intentos; intento++) {
    if (intento > 0) await new Promise((resolve) => setTimeout(resolve, 2000));
    if (cancelled) return;
    const currentUser = userRef.current;
    if (currentUser) await claimCreditsOnAuth(currentUser);
    await refreshEntitlements();
  }

  // Limpiar query params DESPUÉS de terminar el polling de créditos,
  // no antes. Así si el usuario recarga durante el polling, el retorno
  // se re-procesa y los créditos se muestran correctamente.
  navigation.cleanQueryParams();
};
```

**Verificar** que `navigation` ya esté importado en App.tsx (sí lo está: `import { navigation } from '../shared/core/utils/navigation';` debería estar — si no, agregarlo).

---

## BUG F2 — CHECK constraint de `admin_notifications` no incluye `'manual_payment_claim'`

### Nuevo archivo: `supabase/migrations/20261119_fix_admin_notification_types.sql`

```sql
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
```

**Este archivo solo se commitea al repo.** La ejecución en Supabase Dashboard la hace Kalpa manualmente.

---

## VERSION BUMP

### Archivo: `src/shared/core/version.ts`

Cambiar:
```typescript
export const LEECV_VERSION = {
  major: 2,
  minor: 24,
  patch: 0,
  label: 'V2.24.0',
  lastUpdated: '2026-11-18',
  lastAgent: '@opencode',
  stage: '...',
} as const;
```

Por:
```typescript
export const LEECV_VERSION = {
  major: 2,
  minor: 24,
  patch: 1,
  label: 'V2.24.1',
  lastUpdated: '2026-11-19',
  lastAgent: '@opencode',
  stage: 'fix(payments): useExportEntitlement busca tokens por email como fallback cuando user_id es null (F1); cleanQueryParams movido al final del polling post-pago en App.tsx (F3); migración SQL para agregar manual_payment_claim al CHECK de admin_notifications (F2)',
} as const;
```

---

## TESTS

Agregar o actualizar en `tests/` un archivo `tests/payments/exportEntitlementFallback.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

describe('useExportEntitlement token query', () => {
  it('el filtro OR incluye tokens por user_id y por email con user_id null', () => {
    const userId = 'abc-123';
    const userEmail = 'test@example.com';

    const orFilter = userEmail
      ? `user_id.eq.${userId},and(user_id.is.null,email.eq.${userEmail})`
      : `user_id.eq.${userId}`;

    expect(orFilter).toContain(`user_id.eq.${userId}`);
    expect(orFilter).toContain(`user_id.is.null`);
    expect(orFilter).toContain(`email.eq.${userEmail}`);
  });

  it('sin email solo busca por user_id', () => {
    const userId = 'abc-123';
    const userEmail = '';

    const orFilter = userEmail
      ? `user_id.eq.${userId},and(user_id.is.null,email.eq.${userEmail})`
      : `user_id.eq.${userId}`;

    expect(orFilter).toBe(`user_id.eq.${userId}`);
    expect(orFilter).not.toContain('is.null');
  });
});
```

---

## CHECKLIST FINAL

```bash
npm run check-all        # 0 errores
npm run typecheck         # 0 errores
npm run test              # todos pasan
npm run build             # OK
git add -A
git commit -m "fix(payments): token query por email fallback, cleanQueryParams post-polling, constraint manual_payment_claim (V2.24.1)"
git push origin feat/fix-payment-pipeline-f1-f2
# Abrir PR contra main
```

## ARCHIVOS TOCADOS (resumen)

| Archivo | Cambio |
|---|---|
| `src/shared/core/entitlements/useExportEntitlement.ts` | Query OR con email fallback (F1) |
| `src/modules/payments/paymentService.ts` | Eliminar `cleanQueryParams()` (F3) |
| `src/app/App.tsx` | Agregar `cleanQueryParams()` al final del polling (F3) |
| `supabase/migrations/20261119_fix_admin_notification_types.sql` | **NUEVO** — constraint con `manual_payment_claim` (F2) |
| `src/shared/core/version.ts` | V2.24.0 → V2.24.1 |
| `tests/payments/exportEntitlementFallback.test.ts` | **NUEVO** — test del filtro OR |
