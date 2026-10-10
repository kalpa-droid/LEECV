import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

describe('grant_export_tokens concurrency & isolation guard', () => {
  it.skipIf(!supabaseUrl || !supabaseServiceRoleKey)(
    'should execute concurrency test strictly against local disposable supabase',
    async () => {
      // Salvaguarda P0: Allowlist ESTRICTA de endpoints locales descartables con new URL().hostname
      // NUNCA permitir ejecución contra URLs remotas (*.supabase.co, leecv.com, etc.),
      // sin excepciones por variables de entorno.
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(supabaseUrl!);
      } catch {
        throw new Error(`[SEGURIDAD] Supabase URL inválida: ${supabaseUrl}`);
      }

      const ALLOWED_LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]', '::1', '0.0.0.0']);
      if (!ALLOWED_LOCAL_HOSTNAMES.has(parsedUrl.hostname)) {
        throw new Error(
          `[SEGURIDAD] Intento bloqueado: la prueba de concurrencia solo puede ejecutarse contra endpoints locales estrictos (${Array.from(ALLOWED_LOCAL_HOSTNAMES).join(', ')}). Host recibido: ${parsedUrl.hostname}`
        );
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
      throw new Error(`[PRUEBA] Falló la creación del usuario efímero local: ${createError?.message}`);
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
