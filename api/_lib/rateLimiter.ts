import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './supabaseAdmin.js';
import { errorResponse } from './apiResponse.js';

export interface RateLimitOptions {
  maxRequests: number;
  windowSeconds: number;
}

/**
 * Motor de Rate Limiting respaldado por la función RPC atómica check_rate_limit en Postgres.
 * Es totalmente seguro y distribuido entre todas las instancias serverless de Vercel.
 *
 *   const ok = await requireRateLimit(req, res, `user:${user.id}:consume`, { maxRequests: 5, windowSeconds: 60 });
 *   if (!ok) return;
 */
export async function requireRateLimit(
  req: VercelRequest,
  res: VercelResponse,
  key: string,
  options: RateLimitOptions
): Promise<boolean> {
  const { maxRequests, windowSeconds } = options;

  try {
    const { data: allowed, error } = await supabaseAdmin.rpc('check_rate_limit', {
      p_key: key,
      p_max_requests: maxRequests,
      p_window_seconds: windowSeconds,
    });

    if (error) {
      console.warn('⚠️ Error ejecutando RPC check_rate_limit, permitiendo solicitud por resiliencia:', error.message);
      return true;
    }

    if (allowed === false) {
      errorResponse(res, 429, 'Demasiadas solicitudes. Por favor, reintenta en unos instantes.');
      return false;
    }

    return true;
  } catch (err: any) {
    console.warn('⚠️ Excepción en rate limiter, permitiendo solicitud por resiliencia:', err?.message || err);
    return true;
  }
}
