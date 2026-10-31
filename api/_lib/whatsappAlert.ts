/**
 * DESPACHADOR NO BLOQUEANTE DE ALERTAS WHATSAPP AL ADMINISTRADOR
 * Plan: pag-pagos-admin-magic-link.md (Etapa 2)
 * Destino: +5493878342772 — celular personal de Kalpa (CODEOWNER / Admin)
 * Estilo: fire-and-forget; nunca falla el webhook ni applyPayment.
 */

const ADMIN_WHATSAPP = '+5493878342772';

function buildWaLink(text: string): string {
  // Codificación segura para URL de WhatsApp
  return `https://wa.me/${ADMIN_WHATSAPP.replace(/\+/g, '')}?text=${encodeURIComponent(text)}`;
}

function dispatchWaAlert(message: string, context?: Record<string, unknown>): void {
  // No bloqueante: no await, no throw. Solo log para auditoría.
  try {
    const text = `[LEECV ALERTA SERVIDOR] ${message}${context ? ` | ctx=${JSON.stringify(context).slice(0, 200)}` : ''}`;
    const url = buildWaLink(text);
    // Fire-and-forget fetch (no bloqueante);
    fetch(url, { method: 'GET', keepalive: true }).catch(() => {
      // Silenciado intencionalmente: no romper el webhook por falla de red
    });
    console.log(`[WhatsAppAdmin] Alerta no bloqueante enviada a ${ADMIN_WHATSAPP}: ${message.slice(0, 120)}`);
  } catch {
    // Silenciado: nunca afectar el flujo de pago
  }
}

export { ADMIN_WHATSAPP, dispatchWaAlert, buildWaLink };
