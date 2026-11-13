export interface AiCompletionRequest {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
  images?: Array<{ mimeType: 'image/png' | 'image/jpeg' | 'image/webp'; base64: string }>;
  /** Pide a Gemini que devuelva JSON validado contra este esquema (no texto libre a interpretar). */
  responseSchema?: object;
  /** Solo Gemini: resolución de medios para imágenes (p. ej. MEDIA_RESOLUTION_HIGH). Los demás proveedores lo ignoran. */
  mediaResolution?: 'MEDIA_RESOLUTION_UNSPECIFIED' | 'MEDIA_RESOLUTION_LOW' | 'MEDIA_RESOLUTION_MEDIUM' | 'MEDIA_RESOLUTION_HIGH';
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
  /** Modelo efectivo usado en la cascada (difiere de defaultModel cuando hay fallback). */
  modelUsed?: string;
}

export interface AiProviderDefinition {
  id: string;
  displayName: string;
  requiredEnvVars: string[];
  defaultModel: string;
  supportsImages: boolean;
  complete: (req: AiCompletionRequest, apiKey: string, model?: string) => Promise<AiCompletionResponse>;
  ping: () => Promise<AiProviderPingResult>;
}
