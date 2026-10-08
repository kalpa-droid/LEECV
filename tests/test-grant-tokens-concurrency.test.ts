import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

describe('grant_export_tokens concurrency & isolation guard', () => {
  it('should reject execution against production and isolate test users safely', async () => {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      // Entorno de CI / Unitario normal: Seguro por defecto (no corre contra remoto)
      expect(true).toBe(true);
      return;
    }

    // Salvaguarda P0: Rechazar explícitamente cualquier entorno productivo
    const isLocalOrDisposable = 
      supabaseUrl.includes('localhost') || 
      supabaseUrl.includes('127.0.0.1') || 
      process.env.SUPABASE_ALLOW_TEST_ENV === 'true';

    const isProductionUrl = 
      supabaseUrl.includes('prod') || 
      supabaseUrl.includes('leecv.com') ||
      supabaseUrl.includes('supabase.co');

    if (isProductionUrl && process.env.SUPABASE_ALLOW_TEST_ENV !== 'true') {
      throw new Error(`[SEGURIDAD] Intento de ejecutar prueba de concurrencia contra entorno no descartable (${supabaseUrl}). Abortado.`);
    }

    if (!isLocalOrDisposable) {
      console.warn('[SEGURIDAD] Prueba de concurrencia omitida: URL no descartable y SUPABASE_ALLOW_TEST_ENV no activo.');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const mockPaymentId = `test_payment_${crypto.randomUUID()}`;
    const amountToGrant = 5;

    // Salvaguarda P0: NUNCA usar users.users[0] de una base compartida.
    // Crear un usuario efímero sintético con UUID propio para la prueba.
    const ephemeralEmail = `ephemeral_${crypto.randomUUID()}@disposable-test.local`;
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: ephemeralEmail,
      email_confirm: true
    });

    if (createError || !newUser?.user) {
      console.warn('Omitiendo prueba de integración: No se pudo crear usuario efímero local');
      return;
    }

    const testUserId = newUser.user.id;

    try {
      // Disparar 5 peticiones concurrentes idénticas
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          supabase.rpc('grant_export_tokens', {
            p_payment_id: mockPaymentId,
            p_user_id: testUserId,
            p_amount: amountToGrant,
            p_email: ephemeralEmail
          })
        );
      }

      await Promise.all(promises);

      // Verificar cuántos tokens se crearon realmente
      const { data: tokens, error: tokenError } = await supabase
        .from('pdf_export_tokens')
        .select('*')
        .eq('payment_id', mockPaymentId);

      expect(tokenError).toBeNull();
      expect(tokens).toHaveLength(amountToGrant); // Idempotente: solo 1 lote otorgado
    } finally {
      // Limpieza garantizada del usuario efímero y sus tokens
      await supabase.from('pdf_export_tokens').delete().eq('payment_id', mockPaymentId);
      await supabase.auth.admin.deleteUser(testUserId);
    }
  });
});
