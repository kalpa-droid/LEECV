import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { User } from '@supabase/supabase-js';
import { supabaseAdmin } from './supabaseAdmin.js';
import { errorResponse } from './apiResponse.js';

export interface AuthResult {
  user: User;
}

/**
 * Verifica el token Bearer contra Supabase Auth. Si falla, YA respondió
 * 401 y devuelve null — el handler debe cortar ahí mismo:
 *
 *   const auth = await requireAuth(req, res);
 *   if (!auth) return;
 *
 * No crea su propio cliente de Supabase — usa el singleton de
 * supabaseAdmin.ts, así que tampoco duplica esa parte.
 */
export async function requireAuth(req: VercelRequest, res: VercelResponse): Promise<AuthResult | null> {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    errorResponse(res, 401, 'No autenticado');
    return null;
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    errorResponse(res, 401, 'No autenticado');
    return null;
  }

  return { user };
}

/**
 * Igual que requireAuth, pero además exige rol 'admin' en profiles. Si no
 * cumple, responde 403 y devuelve null. Uso idéntico a requireAuth.
 */
export async function requireAdmin(req: VercelRequest, res: VercelResponse): Promise<AuthResult | null> {
  const auth = await requireAuth(req, res);
  if (!auth) return null;

  const adminOk = await isAdmin(auth.user.id);
  if (!adminOk) {
    errorResponse(res, 403, 'Requiere permisos de administrador');
    return null;
  }

  return auth;
}

/**
 * Chequeo "blando" de rol admin — NO responde nada, solo devuelve
 * true/false. Existe para casos como drive/disconnect.ts, donde un usuario
 * común puede desconectar SU PROPIA cuenta sin ser admin, pero desconectar
 * la cuenta de otro sí requiere admin. Ahí no sirve un gate todo-o-nada
 * como requireAdmin — hace falta esta función suelta para decidir en el
 * medio de la lógica del endpoint.
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
  return data?.role === 'admin';
}
