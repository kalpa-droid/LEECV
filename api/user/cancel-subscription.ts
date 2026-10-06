import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_lib/supabaseAdmin.js';
import { serverDal } from '../_lib/serverDal.js';
import { env } from '../_lib/config/env.js';

export default async function cancelSubscriptionHandler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('mp_preapproval_id, paypal_subscription_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const { mp_preapproval_id, paypal_subscription_id } = profile;

    if (!mp_preapproval_id && !paypal_subscription_id) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    if (mp_preapproval_id) {
      const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${mp_preapproval_id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${env.MP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'cancelled' })
      });
      
      if (!mpRes.ok) {
        const errorText = await mpRes.text();
        console.error('[cancelSubscription] Error MP:', errorText);
        return res.status(500).json({ error: 'Error cancelling MercadoPago subscription' });
      }
    }

    if (paypal_subscription_id) {
      const auth = Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString('base64');
      const tokenRes = await fetch(`${env.PAYPAL_ENV.toLowerCase() === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com'}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });
      const tokenData: any = await tokenRes.json();
      
      if (!tokenRes.ok) {
        return res.status(500).json({ error: 'Error authenticating with PayPal' });
      }

      const cancelRes = await fetch(`${env.PAYPAL_ENV.toLowerCase() === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com'}/v1/billing/subscriptions/${paypal_subscription_id}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: 'User requested cancellation' })
      });

      if (!cancelRes.ok && cancelRes.status !== 204) {
        const errorText = await cancelRes.text();
        console.error('[cancelSubscription] Error PayPal:', errorText);
        return res.status(500).json({ error: 'Error cancelling PayPal subscription' });
      }
    }

    await serverDal.profiles.downgradeSubscription({ id: user.id });

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('[cancelSubscription] Error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
