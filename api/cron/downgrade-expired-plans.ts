import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_lib/supabaseAdmin.js';
import { errorResponse, successResponse } from '../_lib/apiResponse.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers['authorization'];
  const isVercelCron = req.headers['x-vercel-cron'] === '1';

  // Si CRON_SECRET está configurado, validar que coincida el header Bearer o el header x-vercel-cron
  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && !isVercelCron) {
    return errorResponse(res, 401, 'No autorizado para ejecutar el cron de degradación de suscripciones.');
  }

  try {
    const nowIso = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ plan: 'free' })
      .lt('premium_vence', nowIso)
      .in('plan', ['pro', 'enterprise'])
      .select('id');

    if (error) {
      return errorResponse(res, 500, `Error ejecutando degradación de perfiles: ${error.message}`);
    }

    const degradedCount = data?.length || 0;
    return successResponse(res, {
      message: `Degradación ejecutada con éxito. Perfiles actualizados a 'free': ${degradedCount}`,
      degradedCount,
      timestamp: nowIso
    });
  } catch (err: any) {
    return errorResponse(res, 500, `Excepción en cron de degradación: ${err.message}`);
  }
}
