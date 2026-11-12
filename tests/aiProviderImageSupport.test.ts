import { describe, it, expect } from 'vitest';
import { AI_PROVIDERS } from '../api/_lib/aiProviders/registry.js';

describe('AI provider image support', () => {
  it('gemini supports images', () => {
    expect(AI_PROVIDERS.gemini.supportsImages).toBe(true);
  });
  it('gemini defaults to gemini-3.8-flash', () => {
    expect(AI_PROVIDERS.gemini.defaultModel).toBe('gemini-3.8-flash');
  });
  it('gemini has active fallback models cascade', () => {
    expect(AI_PROVIDERS.gemini.displayName).toBe('Google Gemini (Cascada Flash/Lite)');
  });
  it('groq does not support images', () => {
    expect(AI_PROVIDERS.groq.supportsImages).toBe(false);
  });
});
