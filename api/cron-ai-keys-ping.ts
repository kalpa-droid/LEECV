import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AI_PROVIDERS, AI_PROVIDER_FALLBACK_ORDER } from './_lib/aiProviders/registry.js';
import { clearExpiredCooldowns } from './_lib/aiProviders/keyRotation.js';
import { errorResponse, successResponse } from './_lib/apiResponse.js';
import { captureBackendException } from './_lib/sentryBackend.js';

/**
 * Cron de salud de las API keys de IA (V2.9.0).
 *
 * Diario (0 6 * * *) — el plan Hobby de Vercel solo permite un cron al día:
 * 1. Borra de `ai_key_cooldowns` las filas cuyo paused_until ya expiró.
 * 2. Hace ping real a cada proveedor de IA configurado (AI_PROVIDERS) y reporta
 *    su estado. Si algún proveedor no está `active`, lo envía a Sentry para que
 *    te enteres antes de que el pipeline de importación empiece a fallar.
 *
 * Auth: Authorization: Bearer {CRON_SECRET} (mismo patrón que cron-downgrade).
 * Los cooldowns y los pings NUNCA incluyen el valor de las keys.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return errorResponse(res, 405, 'Método no permitido');
  }

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers['authorization'];

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return errorResponse(res, 401, 'No autorizado para ejecutar cron');
  }

  try {
    const cleaned = await clearExpiredCooldowns();

    const providerStatuses: Array<{
      provider: string;
      status: string;
      label: string;
      model: string;
    }> = [];

    const degraded: string[] = [];

    for (const providerId of AI_PROVIDER_FALLBACK_ORDER) {
      const provider = AI_PROVIDERS[providerId];
      if (!provider) continue;

      try {
        const ping = await provider.ping();
        providerStatuses.push({ provider: providerId, status: ping.status, label: ping.label, model: ping.model });
        if (ping.status !== 'active') {
          degraded.push(`${providerId}: ${ping.status} — ${ping.label}`);
        }
      } catch (err: any) {
        providerStatuses.push({
          provider: providerId,
          status: 'error',
          label: `Excepción al pinguear ${providerId}: ${err?.message || String(err)}`,
          model: provider.defaultModel,
        });
        degraded.push(`${providerId}: error — ${err?.message || String(err)}`);
      }
    }

    if (degraded.length > 0) {
      await captureBackendException(
        new Error(`AI keys ping cron detectó degradación: ${degraded.join(' | ')}`),
        'cron-ai-keys-ping'
      );
    }

    return successResponse(res, {
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        expiredCooldownsCleared: cleaned,
        degradedProviders: degraded.length,
        providers: providerStatuses,
      },
    });
  } catch (err: any) {
    console.error('Excepción en cron-ai-keys-ping:', err);
    await captureBackendException(err, 'cron-ai-keys-ping');
    return errorResponse(res, 500, err?.message || 'Error ejecutando ping de keys de IA');
  }
}
