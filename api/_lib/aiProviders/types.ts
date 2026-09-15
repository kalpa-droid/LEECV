export interface AiCompletionRequest {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AiProviderPingResult {
  status: 'active' | 'missing_vars' | 'invalid_credentials' | 'error';
  label: string;
  model: string;
}

export interface AiProviderDefinition {
  id: string;
  displayName: string;
  requiredEnvVars: string[];
  defaultModel: string;
  complete: (req: AiCompletionRequest, apiKey: string, model?: string) => Promise<string>;
  ping: () => Promise<AiProviderPingResult>;
}
