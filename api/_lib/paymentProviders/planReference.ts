import { getPrice } from './pricingCatalog.js';
import { captureBackendException } from '../sentryBackend.js';

export interface PlanReference {
  plan: string;
  exportToken?: string;
  userId?: string;
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

  try {
    const parsed = JSON.parse(rawStr);
    const plan = parsed.plan || 'single_pdf';
    
    // Check if plan exists in catalog
    const planData = getPrice(plan);
    if (!planData) {
      console.warn(`[planReference] Plan desconocido "${plan}" en ${provider} para ${externalId}`);
      await captureBackendException(new Error(`Unknown plan: ${plan}`), 'parsePlanReference', { provider, rawStr, externalId });
      return null;
    }

    return {
      plan,
      exportToken: parsed.exportToken,
      userId: parsed.userId
    };
  } catch (err) {
    console.warn(`[planReference] Error parseando referencia en ${provider}: ${rawStr}`);
    await captureBackendException(new Error('Unparseable reference'), 'parsePlanReference', { provider, rawStr, externalId });
    return null; // Don't give a default pro plan!
  }
}
