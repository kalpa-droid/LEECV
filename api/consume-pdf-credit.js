import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'Falta userId' });

  try {
    const { data: allowed, error } = await supabaseAdmin.rpc('consume_pdf_credit', {
      p_user_id: userId
    });

    if (error) throw error;
    return res.status(200).json({ success: Boolean(allowed) });
  } catch (err) {
    console.error('Error consumiendo crédito PDF:', err);
    return res.status(500).json({ error: 'Error al verificar créditos' });
  }
}
