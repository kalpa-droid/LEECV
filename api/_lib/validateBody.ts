import type { VercelRequest, VercelResponse } from '@vercel/node';
import { errorResponse } from './apiResponse.js';

/**
 * MOTOR CANÓNICO DE VALIDACIÓN DE CUERPO HTTP (validateBody)
 * 
 * Valida que req.body contenga los campos requeridos y que sus valores no sean vacíos.
 * Si falta alguno, responde automáticamente status 400 Bad Request y devuelve null.
 */
export function validateBody<T = any>(
  req: VercelRequest,
  res: VercelResponse,
  requiredFields: (keyof T)[]
): T | null {
  const body = (req.body || {}) as T;
  const missing = requiredFields.filter(field => {
    const val = body[field];
    return val === undefined || val === null || val === '';
  });

  if (missing.length > 0) {
    errorResponse(res, 400, `Campos requeridos faltantes o vacíos: ${missing.join(', ')}`);
    return null;
  }

  return body;
}
