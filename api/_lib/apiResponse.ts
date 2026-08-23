import type { VercelResponse } from '@vercel/node';

export function errorResponse(res: VercelResponse, statusCode: number, message: string, details?: any) {
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
