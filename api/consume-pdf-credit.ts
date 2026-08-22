import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'No autenticado o token de sesión inválido' });
    }

    const { data: allowed, error } = await supabaseAdmin.rpc('consume_pdf_credit', {
      p_user_id: user.id
    });

    if (error) throw error;
    return res.status(200).json({ success: Boolean(allowed) });
  } catch (err: any) {
    console.error('Error consumiendo crédito PDF:', err);
    return res.status(500).json({ error: 'Error al verificar créditos' });
  }
}
