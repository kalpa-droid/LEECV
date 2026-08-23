import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabaseAdmin.js';
import { requireAuth } from './_lib/authMiddleware.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await requireAuth(req, res);
  if (!auth) return;

  try {
    const { data: allowed, error } = await supabaseAdmin.rpc('consume_pdf_credit', {
      p_user_id: auth.user.id
    });

    if (error) throw error;
    return res.status(200).json({ success: Boolean(allowed) });
  } catch (err: any) {
    console.error('Error consumiendo crédito PDF:', err);
    return res.status(500).json({ error: 'Error al verificar créditos' });
  }
}
