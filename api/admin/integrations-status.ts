import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from '../_lib/authMiddleware.js';
import { requireRateLimit } from '../_lib/rateLimiter.js';
import { errorResponse, successResponse } from '../_lib/apiResponse.js';
import { diagnoseAllProviders } from '../_lib/paymentProviders/registry.js';
import type { ProviderStatus } from '../_lib/paymentProviders/types.js';

let cachedStatus: { data: Record<string, ProviderStatus>; timestamp: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos de caché

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return errorResponse(res, 405, 'Método HTTP no permitido');

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const rateOk = await requireRateLimit(req, res, `admin:${admin.user.id}:integrations-status`, {
    maxRequests: 20,
    windowSeconds: 60,
  });
  if (!rateOk) return;

  const forcePing = req.query.forcePing === 'true';
  const now = Date.now();

  if (!forcePing && cachedStatus && (now - cachedStatus.timestamp < CACHE_TTL_MS)) {
    return successResponse(res, {
      ...cachedStatus.data,
      lastCheckedAt: new Date(cachedStatus.timestamp).toISOString(),
      cached: true,
    });
  }

  const resultData = await diagnoseAllProviders(forcePing);
  cachedStatus = { data: resultData, timestamp: now };

  return successResponse(res, {
    ...resultData,
    lastCheckedAt: new Date(now).toISOString(),
    cached: false,
  });
}
