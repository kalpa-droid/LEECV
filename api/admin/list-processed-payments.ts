import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from '../_lib/authMiddleware.js';
import { requireRateLimit } from '../_lib/rateLimiter.js';
import { errorResponse, successResponse } from '../_lib/apiResponse.js';
import { supabaseAdmin } from '../_lib/supabaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return errorResponse(res, 405, 'Método HTTP no permitido');

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const rateOk = await requireRateLimit(req, res, `admin:${admin.user.id}:list-processed-payments`, {
    maxRequests: 30,
    windowSeconds: 60,
  });
  if (!rateOk) return;

  const page = Math.max(0, parseInt((req.query.page as string) || '0', 10));
  const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '50', 10)));
  const provider = ((req.query.provider as string) || 'all').trim();
  const q = ((req.query.q as string) || '').trim();

  try {
    let query = supabaseAdmin
      .from('processed_payments')
      .select('*', { count: 'exact' });

    if (provider && provider !== 'all') {
      query = query.eq('provider', provider);
    }

    if (q) {
      query = query.or(`user_email.ilike.%${q}%,external_id.ilike.%${q}%`);
    }

    const fromIndex = page * limit;
    const toIndex = fromIndex + limit - 1;

    const { data: payments, count, error } = await query
      .order('created_at', { ascending: false })
      .range(fromIndex, toIndex);

    if (error) throw error;

    return successResponse(res, {
      payments: payments || [],
      totalCount: count || 0,
      page,
      pageSize: limit,
    });
  } catch (err: any) {
    console.error('Error listando pagos procesados:', err);
    return errorResponse(res, 500, 'Error al consultar el historial de pagos');
  }
}
