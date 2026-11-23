import type { VercelRequest, VercelResponse } from '@vercel/node';

import { requireRateLimit } from './_lib/rateLimiter.js';
import { successResponse, errorResponse } from './_lib/apiResponse.js';
import { serverDal } from './_lib/serverDal.js';
import { AI_PROVIDERS, AI_PROVIDER_FALLBACK_ORDER } from './_lib/aiProviders/registry.js';
import { getNextAvailableKey, markKeyRateLimited } from './_lib/aiProviders/keyRotation.js';
import { recoverJsonFromText } from './_lib/aiProviders/jsonRecovery.js';
import type { AiCompletionRequest } from './_lib/aiProviders/types.js';
import { calculateAiCost } from './_lib/costCalculator.js';
import { AI_TASKS_CATALOG } from './_lib/aiTasks/catalog.js';
import { buildCandidateContext } from './_lib/aiTasks/candidateContext.js';

export const maxDuration = 60;

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

  const rateLimitOk = await requireRateLimit(req, res, `ai_ip_${clientIp}`, { maxRequests: 100, windowSeconds: 86400 });
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
  
  let formatContext = "Formato estándar: Profesional, claro y orientado a impacto.";
  if (cvData?.activeFormatId) {
    if (cvData.activeFormatId.includes('ats')) {
      formatContext = "Formato ATS: Sé extremadamente claro, objetivo, sin florituras, orientado a sistemas automáticos. Evita palabras vacías o formato inusual.";
    } else if (cvData.activeFormatId.includes('latam')) {
      formatContext = "Formato Latam Clásico: Profesional, formal, balanceando logros con descripción clara de responsabilidades. Tono corporativo.";
    } else {
      formatContext = "Formato Moderno/Creativo: Directo, dinámico, enfocado en impacto y logros destacados de lectura rápida.";
    }
  }

  const systemPrompt = taskDef.buildSystemPrompt(cvContext, payload, formatContext);
  const userPrompt = taskDef.buildUserPrompt(payload);

  const validImages = Array.isArray(payload?.images)
    ? payload.images
        .filter(
          (img: any) =>
            img &&
            typeof img.base64 === 'string' &&
            img.base64.length > 0 &&
            img.base64.length <= 4_500_000 &&
            (img.mimeType === 'image/png' ||
              img.mimeType === 'image/jpeg' ||
              img.mimeType === 'image/webp'),
        )
        .slice(0, 4)
    : undefined;

  const parsedMaxTokens = Number(maxTokens);
  const clampedMaxTokens = Number.isFinite(parsedMaxTokens) && parsedMaxTokens > 0
    ? Math.min(Math.max(parsedMaxTokens, 256), 4000)
    : 1200;

  const completionReq: AiCompletionRequest = {
    systemPrompt: String(systemPrompt),
    userPrompt: String(userPrompt),
    maxTokens: clampedMaxTokens,
    temperature: resolveTemperature(temperature),
    ...(validImages && validImages.length > 0 ? { images: validImages } : {}),
    ...(taskDef.responseSchema && { responseSchema: taskDef.responseSchema }),
  };

  let completionText: string | null = null;
  let successfulProviderId: string | null = null;
  let lastError: Error | null = null;

  const hasVisionPayload = Boolean(validImages && validImages.length > 0);
  const providerOrder = hasVisionPayload
    ? ['gemini', 'groq', 'openrouter']
    : AI_PROVIDER_FALLBACK_ORDER;

  for (const providerId of providerOrder) {
    const provider = AI_PROVIDERS[providerId];
    if (!provider) continue;
    if (hasVisionPayload && !provider.supportsImages) continue;

    // Rotar hasta agotar las claves disponibles del proveedor (salto con 429, como consolidate-ats)
    for (let keyAttempt = 0; keyAttempt < 8; keyAttempt++) {
      const apiKey = await getNextAvailableKey(providerId);
      if (!apiKey) break; // no quedan claves disponibles para este proveedor → siguiente proveedor

      try {
        const result = await provider.complete(completionReq, apiKey);
        let content = result.content;

        // Si la tarea espera JSON, sanear/extraer el JSON en el servidor ANTES de darla por buena.
        // Respuesta vacía o JSON roto/truncado = fallo recuperable: otra clave del mismo proveedor
        // (y si se agotan, el siguiente proveedor) antes de devolver error.
        if (taskDef.responseSchema) {
          const recovered = recoverJsonFromText(content);
          if (!recovered.ok) {
            lastError = new Error(`Respuesta vacía o JSON inválido de ${providerId}`);
            console.warn(`[ai-generate] ${providerId} devolvió JSON vacío/inválido (intento de clave ${keyAttempt + 1}).`);
            continue; // siguiente clave del mismo proveedor
          }
          content = recovered.cleanText;
        }

        completionText = content;

        if (result.usage) {
          const actualModel = result.modelUsed || provider.defaultModel;
          const cost = calculateAiCost(providerId, actualModel, result.usage.promptTokens, result.usage.completionTokens);
          serverDal.aiTelemetry.logUsage({
            userId: '00000000-0000-0000-0000-000000000000', // Anonymous usage
            provider: providerId,
            model: actualModel,
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
          await markKeyRateLimited(providerId, apiKey, 60);
          console.warn(`[ai-generate] Clave de ${providerId} limitada (429). Rotando a la siguiente clave...`);
          continue; // siguiente clave del mismo proveedor
        }
        break; // error no recuperable para este proveedor → siguiente proveedor
      }
    }
    if (completionText) break;
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
    providerUsed: successfulProviderId
  });
}
