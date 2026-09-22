import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../_lib/authMiddleware.js';
import { successResponse, errorResponse } from '../_lib/apiResponse.js';
import { serverDal } from '../_lib/serverDal.js';
import { requireRateLimit } from '../_lib/rateLimiter.js';
import { AI_PROVIDERS } from '../_lib/aiProviders/registry.js';
import { getNextAvailableKey, markKeyRateLimited } from '../_lib/aiProviders/keyRotation.js';
import type { AiCompletionRequest } from '../_lib/aiProviders/types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return errorResponse(res, 405, 'Método no permitido');
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;

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
      jsonString = await gemini.complete(request, apiKey, gemini.defaultModel);
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
