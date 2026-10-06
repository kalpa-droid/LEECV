import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

describe('grant_export_tokens concurrency', () => {
  it('should only grant tokens once for the same payment_id, despite concurrent calls', async () => {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.warn('Skipping test: Missing Supabase config in .env.local');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const mockPaymentId = `test_payment_${crypto.randomUUID()}`;
    const amountToGrant = 5;

    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError || !users?.users?.length) {
      console.warn('Skipping test: No users found to test against');
      return;
    }

    const realUserId = users.users[0].id;
    const mockEmail = users.users[0].email || 'test@example.com';

    // Disparar 5 peticiones concurrentes idénticas
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        supabase.rpc('grant_export_tokens', {
          p_payment_id: mockPaymentId,
          p_user_id: realUserId,
          p_amount: amountToGrant,
          p_email: mockEmail
        })
      );
    }

    const results = await Promise.all(promises);

    // Verificar cuántos tokens se crearon realmente
    const { data: tokens, error: tokenError } = await supabase
      .from('pdf_export_tokens')
      .select('*')
      .eq('payment_id', mockPaymentId);

    expect(tokenError).toBeNull();
    expect(tokens).toHaveLength(amountToGrant); // Solo 1 vez 5 tokens, a pesar de 5 llamadas
  });
});
