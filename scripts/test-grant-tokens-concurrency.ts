import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Falta configuración de Supabase en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function runConcurrencyTest() {
  console.log('🧪 Iniciando test concurrente de grant_export_tokens...');

  const mockPaymentId = `test_payment_${crypto.randomUUID()}`;
  const mockUserId = '11111111-1111-1111-1111-111111111111'; // Debemos usar un UUID real o no validar FK (en local a veces no hay FK). 
  // Mejor usamos un UUID real de la DB para evitar error de foreign key.
  
  const { data: users, error: userError } = await supabase.auth.admin.listUsers();
  if (userError || !users?.users?.length) {
    console.error('No se encontró ningún usuario para probar. Por favor crea un usuario.');
    process.exit(1);
  }
  const realUserId = users.users[0].id;
  const mockEmail = users.users[0].email || 'test@example.com';
  const amountToGrant = 5;

  console.log(`Usando userId: ${realUserId} y payment_id: ${mockPaymentId}`);

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
  
  const errors = results.filter(r => r.error);
  if (errors.length > 0) {
    console.error('❌ Hubo errores en algunas promesas:', errors);
  }

  // Verificar cuántos tokens se crearon realmente
  const { data: tokens, error: tokenError } = await supabase
    .from('pdf_export_tokens')
    .select('*')
    .eq('payment_id', mockPaymentId);

  if (tokenError) {
    console.error('❌ Error al consultar tokens creados:', tokenError);
    process.exit(1);
  }

  if (tokens.length === amountToGrant) {
    console.log(`✅ ¡ÉXITO! Se crearon exactamente ${amountToGrant} tokens a pesar de las llamadas concurrentes.`);
  } else {
    console.error(`❌ FALLO: Se crearon ${tokens.length} tokens, se esperaban ${amountToGrant}.`);
    process.exit(1);
  }
}

runConcurrencyTest().catch(err => {
  console.error(err);
  process.exit(1);
});
