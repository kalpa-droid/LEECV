/**
 * Completeness Gate del importador de CV (V2.10).
 *
 * Si la página tenía texto útil (kind 'image' o auxiliaryText abundante) y la IA
 * devuelve un JSON prácticamente vacío, disparamos UN reintento de verificación
 * antes de dar la página por buena. Función pura, sin dependencias.
 *
 * GEMELO conceptual: la heurística de completitud del texto vive en
 * src/shared/core/cv-import/cvContextSummary.ts (frontend); esta versión se usa
 * en el backend, que no puede importar desde src/.
 */
export function isFragmentEffectivelyEmpty(fragment: unknown): boolean {
  if (!fragment || typeof fragment !== 'object') return true;
  const data = fragment as Record<string, unknown>;

  const personalInfo = data.personalInfo;
  if (personalInfo && typeof personalInfo === 'object') {
    const hasAny = Object.values(personalInfo as Record<string, unknown>).some(
      v => typeof v === 'string' && v.trim().length > 0
    );
    if (hasAny) return false;
  }

  for (const [key, value] of Object.entries(data)) {
    if (key === 'personalInfo') continue;
    if (Array.isArray(value) && value.length > 0) return false;
    if (typeof value === 'string' && value.trim().length > 0) return false;
  }
  return true;
}
