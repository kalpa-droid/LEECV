export function isTextLayerCoherent(rawText: string): boolean {
  const clean = rawText.replace(/\s+/g, ' ').trim();
  if (clean.length < 20) return false; // casi sin texto → mejor imagen

  const letters = clean.match(/\p{L}/gu) || [];
  const alphaRatio = letters.length / clean.length;
  if (alphaRatio < 0.55) return false; // demasiados símbolos raros

  // Fuentes con encoding roto typicamente producen texto sin espacios entre
  // palabras reales, o palabras rarísimamente largas (cid a cid mal mapeado).
  const words = clean.split(' ').filter(Boolean);
  const avgWordLen = words.reduce((a, w) => a + w.length, 0) / (words.length || 1);
  if (avgWordLen > 14) return false;

  // Al menos algunas palabras comunes en CVs, en varios idiomas, deben aparecer.
  const commonWords = /\b(de|la|el|en|con|para|experiencia|educacion|educación|and|the|with|for|experience|education|email|tel[ée]fono|phone)\b/i;
  if (!commonWords.test(clean)) return false;

  return true;
}
