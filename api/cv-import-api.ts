import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireRateLimit } from './_lib/rateLimiter.js';
import { requireAuth } from './_lib/authMiddleware.js';
import { successResponse, errorResponse } from './_lib/apiResponse.js';
import { serverDal } from './_lib/serverDal.js';
import { AI_PROVIDERS, AI_PROVIDER_FALLBACK_ORDER } from './_lib/aiProviders/registry.js';
import { getNextAvailableKey, markKeyRateLimited } from './_lib/aiProviders/keyRotation.js';
import type { AiCompletionRequest } from './_lib/aiProviders/types.js';
import { calculateAiCost } from './_lib/costCalculator.js';

export const maxDuration = 60;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return errorResponse(res, 405, 'Método no permitido');
  }

  const auth = await requireAuth(req, res);
  if (!auth) return; // Ya responde con 401

  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket?.remoteAddress || 'unknown-ip';

  const rateLimitOk = await requireRateLimit(req, res, `cv_import_ip_${clientIp}`, { maxRequests: 20, windowSeconds: 3600 });
  if (!rateLimitOk) return;

  const action = req.query.action as string;

  if (action !== 'extract-page') {
    return errorResponse(res, 400, 'Acción no válida');
  }

  const { kind, content, contextSummary = '' } = req.body || {};
  
  if (!content) {
    return errorResponse(res, 400, 'Faltan parámetros requeridos');
  }

  try {
    const systemInstruction = `Eres un extractor experto de CVs. Extrae la información de la página provista a un objeto JSON que respete esta estructura:
{
  "personalInfo": { "fullName": "", "email": "", "phone": "", "role": "", "location": "", "summary": "" },
  "experience": [ { "company": "", "role": "", "startDate": "", "endDate": "", "description": "", "continuesFromPrevious": false } ],
  "education": [ { "institution": "", "degree": "", "startDate": "", "endDate": "", "continuesFromPrevious": false } ],
  "skills": [ { "name": "" } ],
  "languages": [ { "language": "", "proficiency": "" } ]
}
REGLA CRITICA: Si un dato (ej. descripcion de experiencia) es la CONTINUACION exacta del texto de la pagina anterior y no un nuevo trabajo, debes poner "continuesFromPrevious": true en ese objeto de experiencia, para que sepamos que debemos concatenar ese texto al ultimo trabajo de la pagina anterior. Devuelve SOLO JSON valido.`;

    const request: AiCompletionRequest = {
      systemPrompt: systemInstruction,
      userPrompt: kind === 'text' 
        ? `Extrae los datos de este texto de CV:\n\n${content}\n${contextSummary}` 
        : `Extrae los datos de la imagen de la página del CV provista.\n${contextSummary}`,
      maxTokens: 2000,
      temperature: 0.1,
      responseSchema: {
        type: "object",
        properties: {
          personalInfo: { type: "object", additionalProperties: true },
          experience: { type: "array", items: { type: "object", additionalProperties: true } },
          education: { type: "array", items: { type: "object", additionalProperties: true } },
          skills: { type: "array", items: { type: "object", additionalProperties: true } },
          languages: { type: "array", items: { type: "object", additionalProperties: true } }
        }
      }
    };

    if (kind === 'image') {
      const base64Data = content.includes(',') ? content.split(',')[1] : content;
      request.images = [{
        mimeType: 'image/jpeg',
        base64: base64Data
      }];
    }

    let completionText: string | null = null;
    let successfulProviderId: string | null = null;
    let lastError: Error | null = null;

    for (const providerId of AI_PROVIDER_FALLBACK_ORDER) {
      const provider = AI_PROVIDERS[providerId];
      if (!provider) continue;

      const apiKey = getNextAvailableKey(providerId);
      if (!apiKey) continue;

      try {
        const result = await provider.complete(request, apiKey);
        completionText = result.content;
        
        if (result.usage) {
          const cost = calculateAiCost(providerId, provider.defaultModel, result.usage.promptTokens, result.usage.completionTokens);
          serverDal.aiTelemetry.logUsage({
            userId: auth.user.id,
            provider: providerId,
            model: provider.defaultModel,
            endpoint: 'cv-import-stateless',
            promptTokens: result.usage.promptTokens,
            completionTokens: result.usage.completionTokens,
            estimatedCostUsd: cost
          }).catch(err => console.error('[aiTelemetry] Error logging usage in cv-import:', err));
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
      console.error('[cv-import] Error al procesar página:', lastError);
      return errorResponse(
        res,
        502,
        `No se pudo procesar con los proveedores de IA disponibles: ${lastError?.message || 'Servicios no disponibles'}`
      );
    }
    
    // Parse to ensure it's valid JSON
    let fragmentJson = {};
    try {
      const cleanJsonStr = completionText.replace(/^```json/i, '').replace(/```$/, '').trim();
      fragmentJson = JSON.parse(cleanJsonStr);
    } catch (parseErr) {
      console.error('Gemini no devolvió JSON válido', completionText);
      return errorResponse(res, 500, 'Error procesando respuesta de IA (Formato inválido)');
    }

    return successResponse(res, { fragmentJson });
  } catch (error: any) {
    console.error('Error processing cv import page:', error);
    return errorResponse(res, 500, 'Error interno del servidor');
  }
}
