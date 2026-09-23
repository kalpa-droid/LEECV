export function calculateAiCost(
  provider: string,
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  let cost = 0;
  
  if (provider === 'gemini') {
    // Gemini 1.5 Flash (pricing approx $0.075 / 1M input, $0.30 / 1M output)
    if (model.includes('flash')) {
      cost = (promptTokens / 1_000_000) * 0.075 + (completionTokens / 1_000_000) * 0.30;
    } 
    // Gemini 1.5 Pro ($1.25 / 1M input, $5.00 / 1M output for context < 128k)
    else if (model.includes('pro')) {
      cost = (promptTokens / 1_000_000) * 1.25 + (completionTokens / 1_000_000) * 5.00;
    }
  } else if (provider === 'groq') {
    // Llama 3 8B approx $0.05 / 1M input, $0.08 / 1M output
    if (model.includes('8b')) {
      cost = (promptTokens / 1_000_000) * 0.05 + (completionTokens / 1_000_000) * 0.08;
    } 
    // Llama 3 70B approx $0.59 / 1M input, $0.79 / 1M output
    else if (model.includes('70b')) {
      cost = (promptTokens / 1_000_000) * 0.59 + (completionTokens / 1_000_000) * 0.79;
    }
  }

  // Ensure returning at least 0
  return Math.max(0, cost);
}
