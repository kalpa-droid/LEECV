import { supabase } from '../lib/supabaseClient';

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
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;

  if (!token) {
    throw new Error('Debes iniciar sesión para utilizar el generador de IA.');
  }

  const response = await fetch('/api/ai-generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(params)
  });

  const body = await response.json();

  if (!response.ok || !body.success) {
    throw new Error(body.error || body.message || 'Error al comunicarse con el servicio de IA.');
  }

  return {
    text: body.text,
    providerUsed: body.providerUsed,
    remainingCredits: body.remainingCredits
  };
}
