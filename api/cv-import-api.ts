import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from './_lib/authMiddleware.js';
import { successResponse, errorResponse } from './_lib/apiResponse.js';
import { serverDal } from './_lib/serverDal.js';
import { requireRateLimit } from './_lib/rateLimiter.js';
import { AI_PROVIDERS } from './_lib/aiProviders/registry.js';
import { getNextAvailableKey, markKeyRateLimited } from './_lib/aiProviders/keyRotation.js';
import type { AiCompletionRequest } from './_lib/aiProviders/types.js';
import { calculateAiCost } from './_lib/costCalculator.js';

export const maxDuration = 60;
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    }
  }
};

export interface CVFragment {
  personalInfo?: Record<string, string>;
  experience?: Array<any>;
  education?: Array<any>;
  skills?: Array<any>;
  languages?: Array<any>;
  [key: string]: any;
}

function mergePageFragments(fragments: CVFragment[]): CVFragment {
  const merged: CVFragment = {
    personalInfo: {},
    experience: [],
    education: [],
    skills: [],
    languages: []
  };

  for (const fragment of fragments) {
    if (!fragment) continue;

    if (fragment.personalInfo) {
      for (const [key, value] of Object.entries(fragment.personalInfo)) {
        if (value && typeof value === 'string' && value.trim() !== '') {
          if (!merged.personalInfo![key]) {
             merged.personalInfo![key] = value;
          }
        }
      }
    }

    const arrayFields = ['experience', 'education', 'skills', 'languages'];
    for (const field of arrayFields) {
      if (Array.isArray(fragment[field])) {
        if (!merged[field]) merged[field] = [];
        
        for (const item of fragment[field]) {
          if (item.continuesFromPrevious && merged[field].length > 0) {
            const lastItem = merged[field][merged[field].length - 1];
            for (const [k, v] of Object.entries(item)) {
              if (k === 'continuesFromPrevious') continue;
              if (typeof v === 'string' && typeof lastItem[k] === 'string') {
                lastItem[k] = `${lastItem[k].trim()} ${v.trim()}`.trim();
              } else if (!lastItem[k] && v) {
                lastItem[k] = v;
              }
            }
          } else {
            const newItem = { ...item };
            delete newItem.continuesFromPrevious;
            const isDuplicate = merged[field].some((existing: any) => 
              JSON.stringify(existing) === JSON.stringify(newItem)
            );
            if (!isDuplicate) {
              merged[field].push(newItem);
            }
          }
        }
      }
    }
  }

  return merged;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return errorResponse(res, 405, 'Método no permitido');
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const action = req.query.action as string;

  switch (action) {
    case 'start': {
      const { totalPages } = req.body || {};
      if (typeof totalPages !== 'number' || totalPages < 1 || totalPages > 20) {
        return errorResponse(res, 400, 'Número de páginas inválido (máx 20)');
      }

      try {
        const job = await serverDal.cvImportJobs.create(auth.user.id, totalPages);
        return successResponse(res, { jobId: job.id, status: 'processing' });
      } catch (error: any) {
        console.error('Error starting cv import job:', error);
        return errorResponse(res, 500, 'Error interno del servidor');
      }
    }

    case 'process-page': {
      const rateLimitOk = await requireRateLimit(req, res, `cv_import:${auth.user.id}`, { maxRequests: 20, windowSeconds: 60 });
      if (!rateLimitOk) return;

      const { jobId, pageIndex, kind, content } = req.body || {};
      
      if (!jobId || typeof pageIndex !== 'number' || typeof content !== 'string') {
        return errorResponse(res, 400, 'Faltan parámetros requeridos');
      }

      try {
        const job = await serverDal.cvImportJobs.getById(jobId);
        if (!job || job.user_id !== auth.user.id) {
          return errorResponse(res, 403, 'Job no encontrado o sin acceso');
        }

        if (job.status !== 'processing') {
          return errorResponse(res, 400, 'El job ya fue finalizado o cancelado');
        }

        if (pageIndex >= job.total_pages) {
          return errorResponse(res, 400, 'pageIndex fuera de rango');
        }

        const previousPages = await serverDal.cvImportJobPages.getAllForJob(jobId);
        let contextSummary = '';
        if (previousPages.length > 0) {
          const summaries = previousPages.map(p => `Página ${p.page_index}: ${JSON.stringify(p.fragment_json)}`);
          contextSummary = `\nContexto previo extraido:\n${summaries.join('\n')}\n`;
        }

        const gemini = AI_PROVIDERS['gemini'];
        const apiKey = getNextAvailableKey('gemini');

        if (!gemini || !apiKey) {
          return errorResponse(res, 503, 'Servicio de IA no disponible');
        }

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

        let jsonString;
        try {
          const result = await gemini.complete(request, apiKey, gemini.defaultModel);
          jsonString = result.content;

          if (result.usage) {
            const cost = calculateAiCost('gemini', gemini.defaultModel, result.usage.promptTokens, result.usage.completionTokens);
            serverDal.aiTelemetry.logUsage({
              userId: auth.user.id,
              provider: 'gemini',
              model: gemini.defaultModel,
              endpoint: 'cv-import',
              promptTokens: result.usage.promptTokens,
              completionTokens: result.usage.completionTokens,
              estimatedCostUsd: cost
            }).catch(err => console.error('[aiTelemetry] Error logging usage in cv-import-api:', err));
          }
        } catch (error: any) {
          if (error.status === 429 || error.message?.includes('429')) {
            markKeyRateLimited('gemini', apiKey, 60);
          }
          throw error;
        }
        
        // Parse to ensure it's valid JSON
        let fragmentJson = {};
        try {
          const cleanJsonStr = jsonString.replace(/^```json/i, '').replace(/```$/, '').trim();
          fragmentJson = JSON.parse(cleanJsonStr);
        } catch (parseErr) {
          console.error('Gemini no devolvió JSON válido', jsonString);
          return errorResponse(res, 500, 'Error procesando respuesta de IA');
        }

        await serverDal.cvImportJobPages.insert(jobId, pageIndex, fragmentJson);

        return successResponse(res, { 
          pageIndex, 
          done: previousPages.length + 1 >= job.total_pages,
          progress: `${previousPages.length + 1}/${job.total_pages}`
        });
      } catch (error: any) {
        console.error('Error processing cv import page:', error);
        return errorResponse(res, 500, 'Error interno del servidor');
      }
    }

    case 'finalize': {
      const { jobId } = req.body || {};
      if (!jobId) {
        return errorResponse(res, 400, 'jobId requerido');
      }

      try {
        const job = await serverDal.cvImportJobs.getById(jobId);
        if (!job || job.user_id !== auth.user.id) {
          return errorResponse(res, 403, 'Job no encontrado o sin acceso');
        }

        if (job.status !== 'processing') {
          return errorResponse(res, 400, 'El job ya fue finalizado o cancelado');
        }

        const pages = await serverDal.cvImportJobPages.getAllForJob(jobId);
        
        if (pages.length !== job.total_pages) {
          return errorResponse(res, 400, 'Faltan procesar páginas para finalizar');
        }

        const fragments: CVFragment[] = pages.map((p: any) => p.fragment_json);
        const mergedCv = mergePageFragments(fragments);

        const consumeRes = await serverDal.aiCredits.consumeImportCredit(auth.user.id, job.total_pages);
        if (!consumeRes.success) {
          await serverDal.cvImportJobs.updateStatus(jobId, 'failed');
          return errorResponse(res, 402, 'Créditos de IA insuficientes para completar la importación');
        }

        await serverDal.cvImportJobs.updateStatus(jobId, 'done');

        return successResponse(res, { success: true, cvData: mergedCv, remainingCredits: consumeRes.remaining });
      } catch (error: any) {
        console.error('Error finalizing cv import:', error);
        return errorResponse(res, 500, 'Error interno del servidor');
      }
    }

    default:
      return errorResponse(res, 400, 'Acción no válida');
  }
}
