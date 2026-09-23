export interface AiCompletionRequest {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
  images?: Array<{ mimeType: 'image/png' | 'image/jpeg'; base64: string }>;
  /** Pide a Gemini que devuelva JSON validado contra este esquema (no texto libre a interpretar). */
  responseSchema?: object;
}

export interface AiProviderPingResult {
  status: 'active' | 'missing_vars' | 'invalid_credentials' | 'error';
  label: string;
  model: string;
}

export interface AiCompletionResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AiProviderDefinition {
  id: string;
  displayName: string;
  requiredEnvVars: string[];
  defaultModel: string;
  complete: (req: AiCompletionRequest, apiKey: string, model?: string) => Promise<AiCompletionResponse>;
  ping: () => Promise<AiProviderPingResult>;
}
