import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../_lib/authMiddleware.js';
import { successResponse, errorResponse } from '../_lib/apiResponse.js';
import { serverDal } from '../_lib/serverDal.js';

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
