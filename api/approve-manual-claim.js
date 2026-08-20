// api/approve-manual-claim.js
//
// Para medios SIN webhook automático (Payoneer, transferencia bancaria,
// comprobante leído por el bot de WhatsApp/Telegram). El admin aprueba
// desde el panel, y esto llama al MISMO núcleo applyPayment que usan los
// webhooks automáticos — así "aprobar manual" y "pago automático" activan
// el plan exactamente igual, sin lógica separada que se pueda desincronizar.
import { createClient } from '@supabase/supabase-js';
import { applyPayment } from './_lib/applyPayment.js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'No autenticado' });

    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (adminProfile?.role !== 'admin') {
      return res.status(403).json({ error: 'Solo un administrador puede aprobar comprobantes' });
    }

    const { claimId, approve } = req.body || {};
    if (!claimId) return res.status(400).json({ error: 'Falta claimId' });

    const { data: claim, error: claimError } = await supabaseAdmin
      .from('payment_claims')
      .select('*')
      .eq('id', claimId)
      .single();
    if (claimError || !claim) return res.status(404).json({ error: 'Comprobante no encontrado' });
    if (claim.status !== 'pendiente') return res.status(400).json({ error: 'Este comprobante ya fue revisado' });

    if (approve) {
      await applyPayment(supabaseAdmin, {
        userId: claim.user_id,
        email: claim.user_email,
        plan: claim.plan,
        metodoPago: claim.method === 'payoneer' ? 'payoneer' : 'manual',
        externalId: claim.id,
        amount: claim.amount,
        currency: claim.currency,
      });
    }

    await supabaseAdmin
      .from('payment_claims')
      .update({
        status: approve ? 'aprobado' : 'rechazado',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', claimId);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error aprobando comprobante manual:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}
