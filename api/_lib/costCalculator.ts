export function calculateAiCost(
  provider: string,
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  let cost = 0;
  
  if (provider === 'gemini') {
    // Gemini Flash-Lite ($0.075 / 1M input, $0.30 / 1M output)
    if (model.includes('lite')) {
      cost = (promptTokens / 1_000_000) * 0.075 + (completionTokens / 1_000_000) * 0.30;
    }
    // Gemini Pro ($1.25 / 1M input, $5.00 / 1M output)
    else if (model.includes('pro')) {
      cost = (promptTokens / 1_000_000) * 1.25 + (completionTokens / 1_000_000) * 5.00;
    }
    // Gemini Flash estándar ($0.15 / 1M input, $0.60 / 1M output)
    else {
      cost = (promptTokens / 1_000_000) * 0.15 + (completionTokens / 1_000_000) * 0.60;
    }
  } else if (provider === 'groq') {
    // Llama 3 8B ($0.05 / 1M input, $0.08 / 1M output)
    if (model.includes('8b')) {
      cost = (promptTokens / 1_000_000) * 0.05 + (completionTokens / 1_000_000) * 0.08;
    }
    // GPT-OSS 120B ($0.15 / 1M input, $0.60 / 1M output)
    else if (model.includes('120b') || model.includes('gpt-oss')) {
      cost = (promptTokens / 1_000_000) * 0.15 + (completionTokens / 1_000_000) * 0.60;
    }
    // Qwen 3.8 27B / 32B ($0.20 / 1M input, $0.60 / 1M output)
    else if (model.includes('27b') || model.includes('32b') || model.includes('qwen')) {
      cost = (promptTokens / 1_000_000) * 0.20 + (completionTokens / 1_000_000) * 0.60;
    }
    // Llama 3 70B ($0.59 / 1M input, $0.79 / 1M output)
    else if (model.includes('70b')) {
      cost = (promptTokens / 1_000_000) * 0.59 + (completionTokens / 1_000_000) * 0.79;
    }
    // Fallback razonable para otros modelos de Groq
    else {
      cost = (promptTokens / 1_000_000) * 0.15 + (completionTokens / 1_000_000) * 0.60;
    }
  } else if (provider === 'openrouter') {
    // Modelos libres (:free) costo 0
    if (model.includes(':free')) {
      cost = 0;
    } else {
      // Promedio estándar estimado para modelos abiertos no-free
      cost = (promptTokens / 1_000_000) * 0.15 + (completionTokens / 1_000_000) * 0.60;
    }
  }

  // Ensure returning at least 0
  return Math.max(0, cost);
}
