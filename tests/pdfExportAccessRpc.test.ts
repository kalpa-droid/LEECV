import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

// Salvaguarda P0: la prueba sólo puede ejecutarse contra un Supabase local
// descartable. Nunca contra *.supabase.co ni producción.
const ALLOWED_LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]', '::1', '0.0.0.0']);

function isLocalSupabaseUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    return ALLOWED_LOCAL_HOSTNAMES.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

const canRun =
  Boolean(supabaseUrl && serviceRoleKey && anonKey) &&
  isLocalSupabaseUrl(supabaseUrl);

describe.skipIf(!canRun)('pdf_export_access_mode: permisos manuales y auditoría', () => {
  it('enabled no consume tokens, disabled bloquea y automatic consume el saldo normal', async () => {
    const admin = createClient(supabaseUrl!, serviceRoleKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const userClient = createClient(supabaseUrl!, anonKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const runId = crypto.randomUUID();
    const email = `pdf_access_${runId}@disposable-test.local`;
    const password = `Test_${runId}`;

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError || !created?.user) {
      throw new Error(`[PRUEBA] No se pudo crear el usuario efímero: ${createError?.message}`);
    }

    const userId = created.user.id;

    async function availableTokens(): Promise<number> {
      const { count, error } = await admin
        .from('pdf_export_tokens')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('paid', true)
        .eq('consumed', false);
      expect(error).toBeNull();
      return count || 0;
    }

    async function setMode(mode: 'automatic' | 'enabled' | 'disabled') {
      const { error } = await admin
        .from('profiles')
        .update({ pdf_export_access_mode: mode })
        .eq('id', userId);
      expect(error).toBeNull();
    }

    try {
      const { error: signInError } = await userClient.auth.signInWithPassword({ email, password });
      if (signInError) throw new Error(`[PRUEBA] No se pudo iniciar sesión: ${signInError.message}`);

      const { error: grantError } = await admin.rpc('grant_export_tokens', {
        p_payment_id: `test:${runId}`,
        p_user_id: userId,
        p_amount: 2,
        p_email: email,
      });
      expect(grantError).toBeNull();
      expect(await availableTokens()).toBe(2);

      // 1. Permitido manualmente: exportaciones ilimitadas sin tocar el saldo.
      await setMode('enabled');
      for (let i = 0; i < 3; i++) {
        const { data, error } = await userClient.rpc('check_and_consume_export_entitlement', {
          p_user_id: userId,
        });
        expect(error).toBeNull();
        expect(data).toBe(true);
      }
      expect(await availableTokens()).toBe(2);

      // 2. Bloqueado manualmente: ni siquiera el saldo disponible habilita.
      await setMode('disabled');
      const { data: blocked, error: blockedError } = await userClient.rpc(
        'check_and_consume_export_entitlement',
        { p_user_id: userId }
      );
      expect(blockedError).toBeNull();
      expect(blocked).toBe(false);
      expect(await availableTokens()).toBe(2);

      // 3. Automático: consume exactamente los tokens disponibles.
      await setMode('automatic');
      const automaticResults: boolean[] = [];
      for (let i = 0; i < 3; i++) {
        const { data, error } = await userClient.rpc('check_and_consume_export_entitlement', {
          p_user_id: userId,
        });
        expect(error).toBeNull();
        automaticResults.push(Boolean(data));
      }
      expect(automaticResults).toEqual([true, true, false]);
      expect(await availableTokens()).toBe(0);

      // 4. El usuario no puede auto-habilitarse la columna privilegiada.
      const { error: selfEscalationError } = await userClient
        .from('profiles')
        .update({ pdf_export_access_mode: 'enabled' })
        .eq('id', userId);
      expect(selfEscalationError).not.toBeNull();
      expect(String(selfEscalationError?.message || '')).toContain('No autorizado');

      // 5. La RPC administrativa deja el cambio en la auditoría consultable.
      const { error: adminRoleError } = await admin
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', userId);
      expect(adminRoleError).toBeNull();

      const { error: setAccessError } = await admin.rpc('admin_set_pdf_export_access', {
        p_target_user_id: userId,
        p_access_mode: 'enabled',
        p_reason: 'Prueba automatizada de auditoría',
        p_admin_user_id: userId,
      });
      expect(setAccessError).toBeNull();

      const { data: logs, error: logsError } = await admin
        .from('pdf_status_logs')
        .select('user_id, admin_id, old_status, new_status, reason')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      expect(logsError).toBeNull();
      expect(logs).toHaveLength(1);
      expect(logs?.[0]).toMatchObject({
        user_id: userId,
        admin_id: userId,
        old_status: 'automatic',
        new_status: 'enabled',
        reason: 'Prueba automatizada de auditoría',
      });
    } finally {
      await admin.auth.admin.deleteUser(userId);
    }
  }, 60_000);
});
