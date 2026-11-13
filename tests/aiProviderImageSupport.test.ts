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
  it('groq supports images (Visión)', () => {
    expect(AI_PROVIDERS.groq.supportsImages).toBe(true);
  });
  it('groq defaults to openai/gpt-oss-120b (vigente nov-2026)', () => {
    expect(AI_PROVIDERS.groq.defaultModel).toBe('openai/gpt-oss-120b');
  });
  it('groq vision model uses vigentes, no deprecated previews', () => {
    expect(AI_PROVIDERS.groq.displayName).toBe('Groq Cloud (GPT-OSS 120B + Qwen 3.8 Visión)');
  });
});
