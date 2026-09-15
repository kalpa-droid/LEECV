import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from './_lib/authMiddleware.js';
import { requireRateLimit } from './_lib/rateLimiter.js';
import { successResponse, errorResponse } from './_lib/apiResponse.js';
import { serverDal } from './_lib/serverDal.js';
import { AI_PROVIDERS, AI_PROVIDER_FALLBACK_ORDER } from './_lib/aiProviders/registry.js';
import { getNextAvailableKey, markKeyRateLimited } from './_lib/aiProviders/keyRotation.js';
import type { AiCompletionRequest } from './_lib/aiProviders/types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return errorResponse(res, 405, 'Método no permitido');
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const rateLimitOk = await requireRateLimit(req, res, 'ai_generate', { maxRequests: 30, windowSeconds: 60 });
  if (!rateLimitOk) return;

  const { systemPrompt, userPrompt, maxTokens, temperature } = req.body || {};

  if (!systemPrompt || !userPrompt) {
    return errorResponse(res, 400, 'Los campos systemPrompt y userPrompt son obligatorios');
  }

  const userId = auth.user.id;
  const userCredits = await serverDal.aiCredits.getByUserId(userId);

  if (userCredits.credits <= 0) {
    return errorResponse(res, 402, 'Sin créditos de IA disponibles. Adquiere más créditos para continuar.');
  }

  const completionReq: AiCompletionRequest = {
    systemPrompt: String(systemPrompt),
    userPrompt: String(userPrompt),
    maxTokens: Number(maxTokens) || 1200,
    temperature: Number(temperature) ?? 0.7
  };

  let completionText: string | null = null;
  let successfulProviderId: string | null = null;
  let lastError: Error | null = null;

  for (const providerId of AI_PROVIDER_FALLBACK_ORDER) {
    const provider = AI_PROVIDERS[providerId];
    if (!provider) continue;

    const apiKey = getNextAvailableKey(providerId);
    if (!apiKey) continue;

    try {
      completionText = await provider.complete(completionReq, apiKey);
      successfulProviderId = providerId;
      break;
    } catch (err: any) {
      lastError = err;
      if (err.status === 429) {
        markKeyRateLimited(providerId, apiKey, 60);
      }
    }
  }

  if (!completionText || !successfulProviderId) {
    console.error('[ai-generate] Error al generar completitud:', lastError);
    return errorResponse(
      res,
      502,
      `No se pudo generar el texto con los proveedores de IA disponibles: ${lastError?.message || 'Servicios no disponibles'}`
    );
  }

  const consumeResult = await serverDal.aiCredits.consumeCredit(userId, 1);

  return successResponse(res, {
    text: completionText,
    providerUsed: successfulProviderId,
    remainingCredits: consumeResult.remaining
  });
}
