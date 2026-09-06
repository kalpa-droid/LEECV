import { processBookImposition, BookImpositionOptions } from './impositionEngine';

export interface WorkerMessageData {
  type: 'START_IMPOSITION';
  fileBuffer: ArrayBuffer;
  options: BookImpositionOptions;
}

export interface WorkerProgressResponse {
  type: 'PROGRESS';
  message: string;
  percent: number;
}

export interface WorkerSuccessResponse {
  type: 'SUCCESS';
  pdfBytes: Uint8Array;
}

export interface WorkerErrorResponse {
  type: 'ERROR';
  error: string;
}

export type WorkerResponse = WorkerProgressResponse | WorkerSuccessResponse | WorkerErrorResponse;

/**
 * Función utilitaria para ejecutar la imposición en el hilo principal con callbacks de progreso,
 * evitando problemas de soporte de OffscreenCanvas en Web Workers navegadores antiguos.
 */
export async function runBookImposition(
  fileBuffer: ArrayBuffer,
  options: BookImpositionOptions,
  onProgress?: (message: string, percent: number) => void
): Promise<Uint8Array> {
  return await processBookImposition(fileBuffer, {
    ...options,
    onProgress,
  });
}
