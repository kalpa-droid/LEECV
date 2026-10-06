import { apiClient } from '../utils/apiClient';
import type { CVData } from '../../../types/cv';

export interface AiTaskParams<T = any> {
  taskId: 'improve_bullet' | 'generate_summary' | 'cover_letter' | 'generate_slogan' | 'explain_ats' | 'ats_analysis' | 'first_job_interview' | 'classify_raw_data';
  payload: T;
  cvData?: CVData;
  maxTokens?: number;
  temperature?: number;
}

export interface AiTaskResult<T = any> {
  data: T;
  providerUsed: string;
}

/**
 * Invoca una tarea de IA predefinida en el servidor.
 */
export async function executeAiTask<T = any>(params: AiTaskParams): Promise<AiTaskResult<T>> {
  const res = await apiClient.post('/api/ai-generate', params);

  if (!res.ok || !res.data?.success) {
    throw new Error(res.error || res.data?.error || res.data?.message || 'Error al comunicarse con el servicio de IA.');
  }

  let parsedData: T;
  try {
    const rawText = res.data.text;
    // Algunos providers pueden incluir markdown ```json ... ```, lo limpiamos si es necesario
    const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    parsedData = JSON.parse(cleanJson) as T;
  } catch (e) {
    console.error('Failed to parse AI response as JSON:', res.data.text);
    throw new Error('La respuesta de la IA no tiene el formato esperado.');
  }

  return {
    data: parsedData,
    providerUsed: res.data.providerUsed
  };
}
