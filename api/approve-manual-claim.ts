import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabaseAdmin.js';
import { requireAdmin } from './_lib/authMiddleware.js';
import { applyPayment } from './_lib/applyPayment.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const auth = await requireAdmin(req, res);
  if (!auth) return;

  try {
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
        metodoPago: claim.method === 'payoneer' ? 'manual' : 'manual',
        externalId: claim.id,
        amount: claim.amount,
        currency: claim.currency,
      });
    }

    await supabaseAdmin
      .from('payment_claims')
      .update({
        status: approve ? 'aprobado' : 'rechazado',
        reviewed_by: auth.user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', claimId);

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('Error aprobando comprobante manual:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}
