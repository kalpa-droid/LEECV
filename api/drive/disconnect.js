// api/drive/disconnect.js
//
// Revoca el token en Google (buena práctica, no solo lo borramos localmente)
// y limpia el estado. Lo puede llamar el propio usuario, o un admin pasando
// targetUserId (ej. desde el panel, si alguien pide desconectar su cuenta).

import { createClient } from '@supabase/supabase-js';

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

    let targetUserId = user.id;
    const { targetUserId: requestedTarget } = req.body || {};

    if (requestedTarget && requestedTarget !== user.id) {
      const { data: adminProfile } = await supabaseAdmin
        .from('profiles').select('role').eq('id', user.id).single();
      if (adminProfile?.role !== 'admin') {
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
      // Best-effort: revocar del lado de Google. Si falla, igual limpiamos nuestro lado.
      await fetch(`https://oauth2.googleapis.com/revoke?token=${tokenRow.refresh_token}`, { method: 'POST' })
        .catch(err => console.warn('No se pudo revocar el token en Google:', err));
    }

    await supabaseAdmin.from('google_drive_tokens').delete().eq('user_id', targetUserId);
    await supabaseAdmin.from('profiles').update({
      drive_connected: false,
      drive_quota_percent: null,
    }).eq('id', targetUserId);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error desconectando Drive:', err);
    return res.status(500).json({ error: 'No se pudo desconectar Drive' });
  }
}
