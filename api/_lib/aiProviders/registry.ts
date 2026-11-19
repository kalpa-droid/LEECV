import type { AiProviderDefinition } from './types.js';
import { groqProvider } from './groq.js';
import { openrouterProvider } from './openrouter.js';
import { geminiProvider } from './gemini.js';

export const AI_PROVIDERS: Record<string, AiProviderDefinition> = {
  groq: groqProvider,
  openrouter: openrouterProvider,
  gemini: geminiProvider
};

export const AI_PROVIDER_FALLBACK_ORDER = ['groq', 'openrouter', 'gemini'];
