import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_lib/supabaseAdmin.js';
import { requireAuth, isAdmin } from '../_lib/authMiddleware.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const auth = await requireAuth(req, res);
  if (!auth) return;

  try {
    let targetUserId = auth.user.id;
    const { targetUserId: requestedTarget } = req.body || {};

    if (requestedTarget && requestedTarget !== auth.user.id) {
      const requesterIsAdmin = await isAdmin(auth.user.id);
      if (!requesterIsAdmin) {
        return res.status(403).json({ error: 'Solo un administrador puede desconectar la cuenta de otro usuario' });
      }
      targetUserId = requestedTarget;
    }

    const { data: tokenRow } = await supabaseAdmin
      .from('google_drive_tokens')
      .select('refresh_token')
      .eq('user_id', targetUserId)
      .single();

    if (tokenRow?.refresh_token) {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${tokenRow.refresh_token}`, { method: 'POST' })
        .catch(err => console.warn('No se pudo revocar el token en Google:', err));
    }

    await supabaseAdmin.from('google_drive_tokens').delete().eq('user_id', targetUserId);
    await supabaseAdmin.from('profiles').update({
      drive_connected: false,
      drive_quota_percent: null,
    }).eq('id', targetUserId);

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('Error desconectando Drive:', err);
    return res.status(500).json({ error: 'No se pudo desconectar Drive' });
  }
}
