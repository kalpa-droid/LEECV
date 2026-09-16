import { apiClient } from '../utils/apiClient';

export interface AiClientGenerateParams {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AiClientGenerateResult {
  text: string;
  providerUsed: string;
  remainingCredits: number;
}

export async function generateAiCompletion(params: AiClientGenerateParams): Promise<AiClientGenerateResult> {
  const res = await apiClient.post('/api/ai-generate', params);

  if (!res.ok || !res.data?.success) {
    throw new Error(res.error || res.data?.error || res.data?.message || 'Error al comunicarse con el servicio de IA.');
  }

  return {
    text: res.data.text,
    providerUsed: res.data.providerUsed,
    remainingCredits: res.data.remainingCredits
  };
}
