import { serverDal } from './serverDal.js';
import { sendTelegramAdminAlert } from './telegramAlert.js';
import { sendResendEmail } from './emails/lifecycleEmails.js';

export interface ResendIntegrationStatus {
  id: 'resend';
  status: 'active' | 'missing_vars';
  label: string;
}

export function getResendStatus(): ResendIntegrationStatus {
  const configured = Boolean(process.env.RESEND_API_KEY?.trim());
  return {
    id: 'resend',
    status: configured ? 'active' : 'missing_vars',
    label: configured ? 'Resend activo' : 'Falta RESEND_API_KEY',
  };
}

export async function notifyAdminEvent(params: {
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  skipDbInsert?: boolean;
}): Promise<void> {
  const tasks: Array<Promise<unknown>> = [];

  if (!params.skipDbInsert && typeof serverDal?.adminNotifications?.create === 'function') {
    tasks.push(
      serverDal.adminNotifications
        .create({
          type: params.type,
          title: params.title,
          message: params.message,
          metadata: params.metadata || {},
        })
        .catch(() => undefined)
    );
  }

  tasks.push(
    sendTelegramAdminAlert(`${params.title} — ${params.message}`, params.metadata).catch(() => undefined)
  );

  const adminAlertEmail = process.env.ADMIN_ALERT_EMAIL?.trim();
  if (adminAlertEmail && process.env.RESEND_API_KEY?.trim()) {
    tasks.push(
      sendResendEmail({
        to: adminAlertEmail,
        subject: `[LEECV Admin] ${params.title}`,
        html: `<div style="font-family:sans-serif"><h3>${params.title}</h3><p>${params.message}</p><pre style="background:#f4f4f5;padding:8px">${JSON.stringify(params.metadata || {}, null, 2)}</pre></div>`,
      }).catch(() => undefined)
    );
  }

  await Promise.allSettled(tasks);
}
