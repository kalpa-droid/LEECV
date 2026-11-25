/**
 * DESPACHADOR NO BLOQUEANTE DE ALERTAS AL ADMINISTRADOR
 * Redirige las alertas del servidor hacia el Bot real de Telegram (`telegramAlert.ts`),
 * manteniendo exportados ADMIN_WHATSAPP y buildWaLink por compatibilidad histórica.
 * Estilo: fire-and-forget; nunca falla el webhook ni applyPayment.
 */
import { sendTelegramAdminAlert } from './telegramAlert.js';

const ADMIN_WHATSAPP = '+5493878342772';

function buildWaLink(text: string): string {
  // Codificación segura para URL de WhatsApp (enlaces manuales en soporte)
  return `https://wa.me/${ADMIN_WHATSAPP.replace(/\+/g, '')}?text=${encodeURIComponent(text)}`;
}

function dispatchWaAlert(message: string, context?: Record<string, unknown>): void {
  // No bloqueante: no await, no throw. Envía por Bot de Telegram real cuando hay env vars.
  try {
    void sendTelegramAdminAlert(message, context).catch(() => {
      // Silenciado intencionalmente: no romper el webhook por falla de red
    });
    console.log(`[AdminAlert] Despacho no bloqueante enviado: ${message.slice(0, 120)}`);
  } catch {
    // Silenciado: nunca afectar el flujo de pago
  }
}

export { ADMIN_WHATSAPP, dispatchWaAlert, buildWaLink };
