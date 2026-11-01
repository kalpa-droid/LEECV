import { describe, it, expect } from 'vitest';
import { AI_PROVIDERS } from '../api/_lib/aiProviders/registry.js';

describe('AI provider image support', () => {
  it('gemini supports images', () => {
    expect(AI_PROVIDERS.gemini.supportsImages).toBe(true);
  });
  it('groq does not support images', () => {
    expect(AI_PROVIDERS.groq.supportsImages).toBe(false);
  });
});
