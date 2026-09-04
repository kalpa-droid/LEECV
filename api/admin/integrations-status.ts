import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from '../_lib/authMiddleware.js';
import { requireRateLimit } from '../_lib/rateLimiter.js';
import { errorResponse, successResponse } from '../_lib/apiResponse.js';

interface ProviderStatus {
  status: 'active' | 'missing_vars' | 'invalid_credentials' | 'webhook_not_found' | 'error';
  label: string;
  missingVars: string[];
}

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

  // 1. Chequeo de variables de entorno
  const mpMissing: string[] = [];
  if (!process.env.MP_ACCESS_TOKEN) mpMissing.push('MP_ACCESS_TOKEN');
  if (!process.env.MP_WEBHOOK_SECRET) mpMissing.push('MP_WEBHOOK_SECRET');

  const paypalMissing: string[] = [];
  if (!process.env.PAYPAL_CLIENT_ID) paypalMissing.push('PAYPAL_CLIENT_ID');
  if (!process.env.PAYPAL_CLIENT_SECRET) paypalMissing.push('PAYPAL_CLIENT_SECRET');
  if (!process.env.PAYPAL_WEBHOOK_ID) paypalMissing.push('PAYPAL_WEBHOOK_ID');

  const lsMissing: string[] = [];
  if (!process.env.LEMONSQUEEZY_API_KEY) lsMissing.push('LEMONSQUEEZY_API_KEY');
  if (!process.env.LEMONSQUEEZY_WEBHOOK_SECRET) lsMissing.push('LEMONSQUEEZY_WEBHOOK_SECRET');

  // Pings paralelos con Promise.allSettled
  const [mpRes, paypalRes, lsRes] = await Promise.allSettled([
    mpMissing.length === 0 ? pingMercadoPago() : Promise.resolve<ProviderStatus>({
      status: 'missing_vars',
      label: `Faltan variables: ${mpMissing.join(', ')}`,
      missingVars: mpMissing,
    }),
    paypalMissing.length === 0 ? pingPayPal() : Promise.resolve<ProviderStatus>({
      status: 'missing_vars',
      label: `Faltan variables: ${paypalMissing.join(', ')}`,
      missingVars: paypalMissing,
    }),
    lsMissing.length === 0 ? pingLemonSqueezy() : Promise.resolve<ProviderStatus>({
      status: 'missing_vars',
      label: `Faltan variables: ${lsMissing.join(', ')}`,
      missingVars: lsMissing,
    }),
  ]);

  const mpStatus = mpRes.status === 'fulfilled' ? mpRes.value : { status: 'error' as const, label: 'Error de conexión con Mercado Pago', missingVars: [] };
  const paypalStatus = paypalRes.status === 'fulfilled' ? paypalRes.value : { status: 'error' as const, label: 'Error de conexión con PayPal', missingVars: [] };
  const lsStatus = lsRes.status === 'fulfilled' ? lsRes.value : { status: 'error' as const, label: 'Error de conexión con Lemon Squeezy', missingVars: [] };

  const resultData = {
    mercadopago: mpStatus,
    paypal: paypalStatus,
    lemonsqueezy: lsStatus,
  };

  cachedStatus = { data: resultData, timestamp: now };

  return successResponse(res, {
    ...resultData,
    lastCheckedAt: new Date(now).toISOString(),
    cached: false,
  });
}

async function pingMercadoPago(): Promise<ProviderStatus> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch('https://api.mercadopago.com/users/me', {
      headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      return { status: 'active', label: 'Token verificado (OAuth me OK)', missingVars: [] };
    }
    if (response.status === 401 || response.status === 403) {
      return { status: 'invalid_credentials', label: 'Token MP inválido o revocado (401/403)', missingVars: [] };
    }
    return { status: 'error', label: `Respuesta inesperada de MP (${response.status})`, missingVars: [] };
  } catch (err: any) {
    clearTimeout(timeoutId);
    return { status: 'error', label: err.name === 'AbortError' ? 'Timeout conectando a Mercado Pago (5s)' : 'Error de red con Mercado Pago', missingVars: [] };
  }
}

async function pingPayPal(): Promise<ProviderStatus> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const isLive = (process.env.PAYPAL_ENV || 'live').toLowerCase() === 'live';
    const baseUrl = isLive ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
    const authHeader = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');

    const oauthRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-request-body',
      },
      body: 'grant_type=client_credentials',
      signal: controller.signal,
    });

    if (!oauthRes.ok) {
      clearTimeout(timeoutId);
      return { status: 'invalid_credentials', label: 'Credenciales ClientID/Secret de PayPal inválidas', missingVars: [] };
    }

    const oauthData: any = await oauthRes.json();
    const accessToken = oauthData.access_token;
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;

    if (!webhookId) {
      clearTimeout(timeoutId);
      return { status: 'missing_vars', label: 'Falta PAYPAL_WEBHOOK_ID', missingVars: ['PAYPAL_WEBHOOK_ID'] };
    }

    const webhookRes = await fetch(`${baseUrl}/v1/notifications/webhooks/${webhookId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (webhookRes.ok) {
      return { status: 'active', label: 'Credenciales & Webhook ID verificados', missingVars: [] };
    }
    if (webhookRes.status === 404) {
      return { status: 'webhook_not_found', label: 'Webhook ID no existe en la app PayPal (404)', missingVars: [] };
    }
    return { status: 'error', label: `Webhook PayPal no verificado (${webhookRes.status})`, missingVars: [] };
  } catch (err: any) {
    clearTimeout(timeoutId);
    return { status: 'error', label: err.name === 'AbortError' ? 'Timeout conectando a PayPal (5s)' : 'Error de red con PayPal', missingVars: [] };
  }
}

async function pingLemonSqueezy(): Promise<ProviderStatus> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch('https://api.lemonsqueezy.com/v1/stores', {
      headers: { Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}` },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      return { status: 'active', label: 'API Key Lemon Squeezy verificada', missingVars: [] };
    }
    if (response.status === 401 || response.status === 403) {
      return { status: 'invalid_credentials', label: 'API Key de Lemon Squeezy inválida (401)', missingVars: [] };
    }
    return { status: 'error', label: `Respuesta inesperada de Lemon Squeezy (${response.status})`, missingVars: [] };
  } catch (err: any) {
    clearTimeout(timeoutId);
    return { status: 'error', label: err.name === 'AbortError' ? 'Timeout conectando a Lemon Squeezy (5s)' : 'Error de red con Lemon Squeezy', missingVars: [] };
  }
}
