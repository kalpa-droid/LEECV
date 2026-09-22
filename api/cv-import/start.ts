import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../_lib/authMiddleware.js';
import { successResponse, errorResponse } from '../_lib/apiResponse.js';
import { serverDal } from '../_lib/serverDal.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return errorResponse(res, 405, 'Método no permitido');
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;

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
