import type { VercelResponse } from '@vercel/node';
import { captureBackendException } from './sentryBackend.js';

export function errorResponse(res: VercelResponse, statusCode: number, message: string, details?: any) {
  if (statusCode >= 500) {
    const errToReport = details instanceof Error ? details : new Error(message);
    captureBackendException(errToReport, 'API_SERVER_ERROR', { statusCode, message, details }).catch(() => {});
  }

  return res.status(statusCode).json({
    success: false,
    error: message,
    ...(details ? { details } : {})
  });
}

export function successResponse(res: VercelResponse, data: any = {}, statusCode: number = 200) {
  return res.status(statusCode).json({
    success: true,
    ...data
  });
}
