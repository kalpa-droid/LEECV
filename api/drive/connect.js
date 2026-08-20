// api/drive/connect.js
//
// Se llama UNA vez, justo después de que el usuario inicia sesión con Google
// y Supabase devuelve session.provider_refresh_token (solo aparece la primera
// vez, o cuando se fuerza el consentimiento de nuevo — ver authService.js).
// Guarda ese refresh token del lado del servidor; el cliente nunca lo vuelve a ver.

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

    const { refreshToken } = req.body || {};
    if (!refreshToken) return res.status(400).json({ error: 'Falta refreshToken' });

    const { error: tokenError } = await supabaseAdmin
      .from('google_drive_tokens')
      .upsert({
        user_id: user.id,
        refresh_token: refreshToken,
        updated_at: new Date().toISOString(),
      });
    if (tokenError) throw tokenError;

    await supabaseAdmin
      .from('profiles')
      .update({ drive_connected: true })
      .eq('id', user.id);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error conectando Google Drive:', err);
    return res.status(500).json({ error: 'No se pudo guardar la conexión con Drive' });
  }
}
