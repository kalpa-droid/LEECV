import type { VercelRequest, VercelResponse } from '@vercel/node';

import { requireRateLimit } from './_lib/rateLimiter.js';
import { successResponse, errorResponse } from './_lib/apiResponse.js';
import { serverDal } from './_lib/serverDal.js';
import { AI_PROVIDERS, AI_PROVIDER_FALLBACK_ORDER } from './_lib/aiProviders/registry.js';
import { getNextAvailableKey, markKeyRateLimited } from './_lib/aiProviders/keyRotation.js';
import type { AiCompletionRequest } from './_lib/aiProviders/types.js';
import { calculateAiCost } from './_lib/costCalculator.js';
import { AI_TASKS_CATALOG } from './_lib/aiTasks/catalog.js';
import { buildCandidateContext } from './_lib/aiTasks/candidateContext.js';

// Number(undefined) es NaN y NaN ?? 0.7 sigue siendo NaN: se valida explícitamente.
// Rango acotado a 0–0.5 porque el CV no debe "crear" datos (ver plan: 0.1–0.3).
function resolveTemperature(raw: unknown): number {
  const n = Number(raw);
  if (raw === undefined || raw === null || !Number.isFinite(n)) return 0.3;
  return Math.min(Math.max(n, 0), 0.5);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return errorResponse(res, 405, 'Método no permitido');
  }

  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket?.remoteAddress || 'unknown-ip';

  const rateLimitOk = await requireRateLimit(req, res, `ai_ip_${clientIp}`, { maxRequests: 3, windowSeconds: 86400 });
  if (!rateLimitOk) return;

  const { taskId, payload, cvData, maxTokens, temperature } = req.body || {};

  if (!taskId) {
    return errorResponse(res, 400, 'El campo taskId es obligatorio');
  }

  const taskDef = AI_TASKS_CATALOG[taskId];
  if (!taskDef) {
    return errorResponse(res, 400, `Tarea no reconocida: ${taskId}`);
  }

  const cvContext = buildCandidateContext(cvData || {});
  const systemPrompt = taskDef.buildSystemPrompt(cvContext, payload);
  const userPrompt = taskDef.buildUserPrompt(payload);

  const completionReq: AiCompletionRequest = {
    systemPrompt: String(systemPrompt),
    userPrompt: String(userPrompt),
    maxTokens: Number(maxTokens) || 1200,
    temperature: resolveTemperature(temperature)
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
      const result = await provider.complete(completionReq, apiKey);
      completionText = result.content;
      
      if (result.usage) {
        const cost = calculateAiCost(providerId, provider.defaultModel, result.usage.promptTokens, result.usage.completionTokens);
        serverDal.aiTelemetry.logUsage({
          userId: '00000000-0000-0000-0000-000000000000', // Anonymous usage
          provider: providerId,
          model: provider.defaultModel,
          endpoint: 'ai-generate',
          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
          estimatedCostUsd: cost
        }).catch(err => console.error('[aiTelemetry] Error logging usage in ai-generate:', err));
      }

      successfulProviderId = providerId;
      break;
    } catch (err: any) {
      lastError = err;
      if (err.status === 429 || err.message?.includes('429')) {
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

  return successResponse(res, {
    text: completionText,
    providerUsed: successfulProviderId,
    remainingCredits: 3 // Mocked for UI compatibility
  });
}
