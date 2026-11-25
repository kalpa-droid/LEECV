/**
 * Despachador real y no bloqueante de alertas operativas por Bot de Telegram.
 * Variables esperadas en Vercel (Production/Preview):
 *  - TELEGRAM_BOT_TOKEN
 *  - TELEGRAM_ADMIN_CHAT_ID
 */

export interface TelegramSendResult {
  sent: boolean;
  reason?: string;
}

export interface TelegramIntegrationStatus {
  id: 'telegram';
  status: 'active' | 'missing_vars';
  label: string;
}

export function isTelegramConfigured(): boolean {
  return Boolean(
    process.env.TELEGRAM_BOT_TOKEN?.trim() &&
      process.env.TELEGRAM_ADMIN_CHAT_ID?.trim()
  );
}

export function getTelegramStatus(): TelegramIntegrationStatus {
  const configured = isTelegramConfigured();
  return {
    id: 'telegram',
    status: configured ? 'active' : 'missing_vars',
    label: configured
      ? 'Bot de Telegram conectado'
      : 'Falta TELEGRAM_BOT_TOKEN / TELEGRAM_ADMIN_CHAT_ID',
  };
}

export async function sendTelegramAdminAlert(
  message: string,
  context?: Record<string, unknown>
): Promise<TelegramSendResult> {
  if (!isTelegramConfigured()) {
    return { sent: false, reason: 'missing_env' };
  }

  const token = process.env.TELEGRAM_BOT_TOKEN!.trim();
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID!.trim();

  const ctxSlice = context ? `\n${JSON.stringify(context).slice(0, 400)}` : '';
  const text = `[LEECV] ${message}${ctxSlice}`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) {
      return { sent: false, reason: `http_${res.status}` };
    }
    return { sent: true };
  } catch (err: any) {
    return { sent: false, reason: err?.message || 'network_error' };
  }
}
