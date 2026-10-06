import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config({ path: '.env.local' });

const PAYPAL_ENV = process.env.PAYPAL_ENV?.toLowerCase() || 'sandbox';
const CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;

const baseUrl = PAYPAL_ENV === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';

async function main() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('❌ Faltan PAYPAL_CLIENT_ID o PAYPAL_CLIENT_SECRET en .env.local');
    process.exit(1);
  }

  console.log(`🔑 Obteniendo token de acceso (Ambiente: ${PAYPAL_ENV})...`);
  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const tokenData = await tokenRes.json() as any;
  if (!tokenRes.ok) {
    console.error('❌ Error obteniendo token:', tokenData);
    process.exit(1);
  }

  const accessToken = tokenData.access_token;

  console.log('📦 Creando producto base...');
  const productRes = await fetch(`${baseUrl}/v1/catalogs/products`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      name: 'Suscripción LEECV Pro Mensual',
      description: 'Acceso ilimitado a generación de PDFs, diseños premium y almacenamiento en la nube.',
      type: 'DIGITAL',
      category: 'SOFTWARE'
    })
  });

  const productData = await productRes.json() as any;
  if (!productRes.ok) {
    console.error('❌ Error creando producto:', productData);
    process.exit(1);
  }

  const productId = productData.id;
  console.log(`✅ Producto creado: ${productId}`);

  console.log('💳 Creando plan de facturación mensual (27 USD)...');
  const planRes = await fetch(`${baseUrl}/v1/billing/plans`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      product_id: productId,
      name: 'LEECV Pro Mensual',
      description: 'Suscripción recurrente mensual (USD)',
      status: 'ACTIVE',
      billing_cycles: [
        {
          frequency: {
            interval_unit: 'MONTH',
            interval_count: 1
          },
          tenure_type: 'REGULAR',
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: {
              value: '27.00',
              currency_code: 'USD'
            }
          }
        }
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee: {
          value: '0',
          currency_code: 'USD'
        },
        setup_fee_failure_action: 'CONTINUE',
        payment_failure_threshold: 3
      }
    })
  });

  const planData = await planRes.json() as any;
  if (!planRes.ok) {
    console.error('❌ Error creando plan:', planData);
    process.exit(1);
  }

  console.log(`✅ Plan creado exitosamente: ${planData.id}`);
  console.log('\n==================================================');
  console.log('🎉 ¡Listo! Copiá y pegá lo siguiente en tu .env.local:');
  console.log(`PAYPAL_PRO_PLAN_ID="${planData.id}"`);
  console.log('==================================================\n');
}

main().catch(console.error);
