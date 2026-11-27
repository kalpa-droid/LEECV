import type { VercelRequest, VercelResponse } from '@vercel/node';

import { requireRateLimit } from './_lib/rateLimiter.js';
import { supabaseAdmin } from './_lib/supabaseAdmin.js';
import { successResponse, errorResponse } from './_lib/apiResponse.js';
import { serverDal } from './_lib/serverDal.js';
import { AI_PROVIDERS, AI_PROVIDER_FALLBACK_ORDER, AI_PROVIDER_PRO_ORDER } from './_lib/aiProviders/registry.js';
import { getConfiguredKeyCount, getNextAvailableKey, markKeyRateLimited } from './_lib/aiProviders/keyRotation.js';
import { recoverJsonFromText } from './_lib/aiProviders/jsonRecovery.js';
import type { AiCompletionRequest } from './_lib/aiProviders/types.js';
import { calculateAiCost } from './_lib/costCalculator.js';
import { AI_TASKS_CATALOG } from './_lib/aiTasks/catalog.js';
import { buildCandidateContext } from './_lib/aiTasks/candidateContext.js';

export const maxDuration = 60;

const ANONYMOUS_USER_UUID = '00000000-0000-0000-0000-000000000000';

export const AI_DAILY_QUOTAS = {
  guest: { fast: 20, pro: 8 },
  free: { fast: 45, pro: 8 },
  paid_or_pass: { fast: 250, pro: 50 },
} as const;

type QuotaTierGroup = keyof typeof AI_DAILY_QUOTAS;

async function resolveCallerQuotaContext(req: VercelRequest): Promise<{
  userId: string | null;
  tierGroup: QuotaTierGroup;
}> {
  const rawAuth = req.headers?.authorization;
  if (
    typeof rawAuth !== 'string' ||
    !rawAuth.startsWith('Bearer ') ||
    typeof supabaseAdmin?.auth?.getUser !== 'function'
  ) {
    return { userId: null, tierGroup: 'guest' };
  }

  const jwt = rawAuth.slice(7).trim();
  if (!jwt) return { userId: null, tierGroup: 'guest' };

  let userId: string | null = null;
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(jwt);
    if (!error && data?.user?.id) {
      userId = data.user.id;
    }
  } catch {
    return { userId: null, tierGroup: 'guest' };
  }

  if (!userId) return { userId: null, tierGroup: 'guest' };

  // Detectar si cuenta con plan activo, pases permanentes o compras/créditos aprobados
  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('plan, plan_vence')
      .eq('id', userId)
      .maybeSingle();

    const nowMs = Date.now();
    const validPaidPlan =
      (profile?.plan === 'pro' || profile?.plan === 'pass_30d') &&
      (!profile?.plan_vence || new Date(profile.plan_vence).getTime() > nowMs);

    if (validPaidPlan) {
      return { userId, tierGroup: 'paid_or_pass' };
    }
  } catch {
    // Continuar con degradación segura
  }

  try {
    const { data: paidTokens } = await supabaseAdmin
      .from('pdf_export_tokens')
      .select('id')
      .eq('user_id', userId)
      .eq('paid', true)
      .limit(1);

    if (Array.isArray(paidTokens) && paidTokens.length > 0) {
      return { userId, tierGroup: 'paid_or_pass' };
    }
  } catch {
    // Continuar con degradación segura
  }

  try {
    const { data: passes } = await supabaseAdmin
      .from('user_app_passes')
      .select('id, is_permanent, expires_at, revoked_at')
      .eq('user_id', userId)
      .is('revoked_at', null);

    const nowMs = Date.now();
    const hasActivePass = Array.isArray(passes) && passes.some(
      (p: any) => p.is_permanent || !p.expires_at || new Date(p.expires_at).getTime() > nowMs
    );
    if (hasActivePass) {
      return { userId, tierGroup: 'paid_or_pass' };
    }
  } catch {
    // Tabla aún no migrada o cliente mockeado
  }

  return { userId, tierGroup: 'free' };
}

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

  const { taskId, payload, cvData, maxTokens, temperature } = req.body || {};

  if (!taskId) {
    return errorResponse(res, 400, 'El campo taskId es obligatorio');
  }

  const taskDef = AI_TASKS_CATALOG[taskId];
  if (!taskDef) {
    return errorResponse(res, 400, `Tarea no reconocida: ${taskId}`);
  }

  const caller = await resolveCallerQuotaContext(req);
  const taskTierBucket = taskDef.tier === 'pro' ? 'pro' : 'fast';
  const maxDailyRequests = AI_DAILY_QUOTAS[caller.tierGroup][taskTierBucket];
  const rateLimitActor = caller.userId ? `user_${caller.userId}` : `ip_${clientIp}`;
  const rateLimitKey = `ai_${taskTierBucket}_${rateLimitActor}`;

  const rateLimitOk = await requireRateLimit(req, res, rateLimitKey, {
    maxRequests: maxDailyRequests,
    windowSeconds: 86400,
  });
  if (!rateLimitOk) return;

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

  const safePayload = payload && typeof payload === 'object' ? payload : {};
  let systemPrompt = '';
  let userPrompt = '';
  try {
    systemPrompt = taskDef.buildSystemPrompt(cvContext, safePayload, formatContext);
    userPrompt = taskDef.buildUserPrompt(safePayload);
  } catch (promptErr: any) {
    return errorResponse(res, 400, promptErr?.message || 'Datos insuficientes para construir la consulta de IA.');
  }

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

  const isProTask = taskDef.tier === 'pro';
  const defaultTokens = taskDef.defaultMaxTokens ?? 1200;
  const maxTokensCeiling = Math.min(8192, Math.max(taskDef.maxTokensCeiling ?? (isProTask ? 8192 : 4000), 256));
  const parsedMaxTokens = Number(maxTokens);
  const clampedMaxTokens = Number.isFinite(parsedMaxTokens) && parsedMaxTokens > 0
    ? Math.min(Math.max(parsedMaxTokens, 256), maxTokensCeiling)
    : Math.min(defaultTokens, maxTokensCeiling);

  const completionReq: AiCompletionRequest = {
    systemPrompt: String(systemPrompt),
    userPrompt: String(userPrompt),
    maxTokens: clampedMaxTokens,
    temperature: resolveTemperature(temperature),
    tier: isProTask ? 'pro' : 'fast',
    ...(validImages && validImages.length > 0 ? { images: validImages } : {}),
    ...(taskDef.responseSchema && { responseSchema: taskDef.responseSchema }),
  };

  let completionText: string | null = null;
  let successfulProviderId: string | null = null;
  let lastError: Error | null = null;

  const hasVisionPayload = Boolean(validImages && validImages.length > 0);
  const providerOrder = (hasVisionPayload || isProTask)
    ? AI_PROVIDER_PRO_ORDER
    : AI_PROVIDER_FALLBACK_ORDER;

  for (const providerId of providerOrder) {
    const provider = AI_PROVIDERS[providerId];
    if (!provider) continue;
    if (hasVisionPayload && !provider.supportsImages) continue;

    const keyPoolId = (providerId === 'gemini' && isProTask) ? 'gemini_pro' : providerId;
    const maxAttempts = Math.max(8, getConfiguredKeyCount(keyPoolId));
    const triedKeys = new Set<string>();

    // Rotar hasta agotar las claves disponibles del proveedor (salto con 429 o 401/403)
    for (let keyAttempt = 0; keyAttempt < maxAttempts; keyAttempt++) {
      const apiKey = await getNextAvailableKey(keyPoolId, triedKeys);
      if (!apiKey) break; // no quedan claves disponibles para este proveedor → siguiente proveedor
      triedKeys.add(apiKey);

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
            userId: caller.userId || ANONYMOUS_USER_UUID,
            provider: providerId,
            model: actualModel,
            endpoint: `ai-generate:${taskId}`,
            promptTokens: result.usage.promptTokens,
            completionTokens: result.usage.completionTokens,
            estimatedCostUsd: cost
          }).catch(err => console.error('[aiTelemetry] Error logging usage in ai-generate:', err));
        }

        successfulProviderId = providerId;
        break;
      } catch (err: any) {
        lastError = err;
        if (err.status === 429 || err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED')) {
          await markKeyRateLimited(keyPoolId, apiKey, err.retryAfterSec || 60);
          console.warn(`[ai-generate] Clave de ${keyPoolId} limitada (429). Rotando a la siguiente clave...`);
          continue; // siguiente clave del mismo proveedor
        }
        if (err.status === 401 || err.status === 403 || err.message?.includes('API_KEY_INVALID')) {
          await markKeyRateLimited(keyPoolId, apiKey, 3600);
          if (providerId === 'gemini') {
            const siblingPool = keyPoolId === 'gemini_pro' ? 'gemini' : 'gemini_pro';
            await markKeyRateLimited(siblingPool, apiKey, 3600);
          }
          console.warn(`[ai-generate] Clave de ${keyPoolId} rechazada (${err.status || 'invalid'}). Pausada 1h y rotando...`);
          continue;
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
