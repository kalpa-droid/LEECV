/**
 * Emails de ciclo de vida enviados vía Resend sobre el dominio oficial leecv.app.
 * Todos devuelven false en silencio si falta RESEND_API_KEY (sin disparar fetch
 * ni ensuciar tests unitarios que mockean fetch global).
 */

async function sendResendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim() || '';
  if (!apiKey || !to) {
    return false;
  }

  const from = process.env.RESEND_FROM_EMAIL?.trim() || 'LEECV <hola@leecv.app>';

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('[lifecycleEmails] Error Resend:', errText);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[lifecycleEmails] Excepción Resend:', err);
    return false;
  }
}

export async function sendPassActivatedEmail(
  toEmail: string,
  passLabel: string,
  extraDetails?: string
): Promise<boolean> {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <h1 style="color: #6a1b9a;">¡Tu acceso ya está activo en LEECV!</h1>
      <p>Hola,</p>
      <p>Confirmamos la activación de: <strong>${passLabel}</strong>.</p>
      ${extraDetails ? `<p style="background:#f4f4f5;border-left:3px solid #6a1b9a;padding:10px;">${extraDetails}</p>` : ''}
      <p>Podés entrar cuando quieras en <a href="https://leecv.app">leecv.app</a> y exportar tus archivos listos para imprimir o compartir.</p>
      <p>Si tenés alguna consulta, podés responder directamente a este correo.</p>
      <p>Saludos,<br>El equipo de LEECV.</p>
    </div>
  `;

  return await sendResendEmail({
    to: toEmail,
    subject: `Acceso activado en LEECV: ${passLabel}`,
    html,
  });
}

export async function sendTeamInviteEmail(
  invitedEmail: string,
  inviterEmail: string,
  projectTitle: string
): Promise<boolean> {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <h1 style="color: #6a1b9a;">Te invitaron a colaborar en EditorLee</h1>
      <p>Hola,</p>
      <p><strong>${inviterEmail}</strong> te sumó a la sala compartida del proyecto: <strong>${projectTitle}</strong>.</p>
      <p>No necesitás pagar nada para participar: entrá con este mismo correo en <a href="https://leecv.app/editor">leecv.app/editor</a> y tocá <strong>Sala de Equipo</strong> para abrir el documento en vivo.</p>
      <p>Saludos,<br>El equipo de LEECV.</p>
    </div>
  `;

  return await sendResendEmail({
    to: invitedEmail,
    subject: `Invitación al equipo de "${projectTitle}" en LEECV`,
    html,
  });
}

export async function sendCalmExpiryNoticeEmail(
  toEmail: string,
  passLabel: string,
  daysLeft: number,
  expiresIso: string
): Promise<boolean> {
  const formattedDate = (() => {
    try {
      return new Date(expiresIso).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return expiresIso.slice(0, 10);
    }
  })();

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <h1 style="color: #6a1b9a;">Recordatorio tranquilo de tu acceso en LEECV</h1>
      <p>Hola,</p>
      <p>Te avisamos con tiempo que tu <strong>${passLabel}</strong> vence en aproximadamente <strong>${daysLeft} día(s)</strong> (el ${formattedDate}).</p>
      <p style="background:#f4f4f5;border-left:3px solid #6a1b9a;padding:10px;">
        <strong>Sin cobros automáticos ni sorpresas:</strong> no vamos a renovarlo ni debitar nada de tu tarjeta. Tus borradores guardados en tu computadora y tu Google Drive siguen siendo tuyos para siempre.
      </p>
      <p>Si más adelante querés seguir exportando, podés elegir un nuevo pase o pack de créditos cuando lo necesites en <a href="https://leecv.app">leecv.app</a>.</p>
      <p>Saludos,<br>El equipo de LEECV.</p>
    </div>
  `;

  return await sendResendEmail({
    to: toEmail,
    subject: `Aviso tranquilo: tu ${passLabel} vence pronto (sin débito automático)`,
    html,
  });
}

export { sendResendEmail };
