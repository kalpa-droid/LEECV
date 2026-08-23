import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_lib/supabaseAdmin.js';
import { requireAuth } from '../_lib/authMiddleware.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const auth = await requireAuth(req, res);
  if (!auth) return;

  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) return res.status(400).json({ error: 'Falta refreshToken' });

    const { error: tokenError } = await supabaseAdmin
      .from('google_drive_tokens')
      .upsert({
        user_id: auth.user.id,
        refresh_token: refreshToken,
        updated_at: new Date().toISOString(),
      });
    if (tokenError) throw tokenError;

    await supabaseAdmin
      .from('profiles')
      .update({ drive_connected: true })
      .eq('id', auth.user.id);

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('Error conectando Google Drive:', err);
    return res.status(500).json({ error: 'No se pudo guardar la conexión con Drive' });
  }
}
