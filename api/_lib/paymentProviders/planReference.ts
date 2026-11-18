import { getPrice } from './pricingCatalog.js';
import { captureBackendException } from '../sentryBackend.js';

export interface PlanReference {
  plan: string;
  exportToken?: string;
  userId?: string;
}

/**
 * Formato compacto de referencia para las pasarelas, dentro del límite
 * estricto de 127 caracteres de PayPal (custom_id):
 *   `<plan>|<exportToken>|<userId?>`
 * Los UUIDs no contienen '|', así el formato es inequívoco contra el JSON
 * legacy (que siempre empieza con '{'); parsePlanReference acepta ambos.
 */
export function formatPlanReference(plan: string, exportToken?: string | null, userId?: string | null): string {
  return [plan, exportToken || '', userId || ''].join('|');
}

/** ¿El rawStr viene en formato compacto (pipes) en vez de JSON legacy? */
function isCompactReference(rawStr: string): boolean {
  return rawStr.includes('|') && !rawStr.trimStart().startsWith('{');
}

async function resolvePlanReference(
  plan: string | undefined,
  exportToken: string | undefined,
  userId: string | undefined,
  provider: string,
  rawStr: string,
  externalId: string,
  fallbackPlan?: string
): Promise<PlanReference | null> {
  // Check if plan exists in catalog (sin default silencioso salvo el JSON legacy
  // histórico que usaba 'single_pdf' cuando el campo plan faltaba).
  const planKey = plan || fallbackPlan;
  const planData = getPrice(planKey);
  if (!planKey || !planData) {
    console.warn(`[planReference] Plan desconocido "${plan}" en ${provider} para ${externalId}`);
    await captureBackendException(new Error(`Unknown plan: ${plan}`), 'parsePlanReference', {
      provider,
      rawPrefix: String(rawStr).slice(0, 24),
      externalId,
    });
    return null;
  }
  return {
    plan: planKey,
    exportToken,
    userId
  };
}

/**
 * Parsea y valida un external_reference o custom_id de la pasarela de pagos.
 * Solo devuelve el plan si existe en el catálogo. Si no, devuelve null (no se acredita nada).
 */
export async function parsePlanReference(rawStr: string | null | undefined, provider: string, externalId: string): Promise<PlanReference | null> {
  if (!rawStr) {
    console.warn(`[planReference] ${provider} devolvió una referencia vacía para ${externalId}`);
    return null;
  }

  // Formato compacto nuevo: plan|exportToken|userId? (formatPlanReference).
  if (isCompactReference(rawStr)) {
    const [plan, exportToken, userId] = rawStr.split('|');
    return resolvePlanReference(plan, exportToken || undefined, userId || undefined, provider, rawStr, externalId);
  }

  try {
    const parsed = JSON.parse(rawStr);
    return resolvePlanReference(
      parsed.plan,
      parsed.exportToken,
      parsed.userId,
      provider,
      rawStr,
      externalId,
      'single_pdf' // default histórico del JSON legacy cuando faltaba plan
    );
  } catch (err) {
    console.warn(`[planReference] Error parseando referencia en ${provider}: ${String(rawStr).slice(0, 24)}`);
    await captureBackendException(new Error('Unparseable reference'), 'parsePlanReference', {
      provider,
      rawPrefix: String(rawStr).slice(0, 24),
      externalId,
    });
    return null; // Don't give a default pro plan!
  }
}
