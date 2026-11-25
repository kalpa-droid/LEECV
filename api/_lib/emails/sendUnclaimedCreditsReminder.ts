/**
 * Email recordatorio para créditos comprados sin cuenta que siguen sin
 * reclamar (~día 7). Mismo canal (Resend) que el recibo de compra.
 * Devuelve true si el envío fue aceptado por Resend.
 */
export async function sendUnclaimedCreditsReminder(
  toEmail: string,
  credits: number
): Promise<boolean> {
  const RESEND_API_KEY = process.env.RESEND_API_KEY?.trim() || '';
  if (!RESEND_API_KEY) {
    return false;
  }
  const from = process.env.RESEND_FROM_EMAIL?.trim() || 'LEECV <hola@leecv.app>';

  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <h1 style="color: #6a1b9a;">Tenés créditos esperando en LEECV</h1>
      <p>Hola,</p>
      <p>Hace unos días compraste <strong>${credits} crédito(s) de exportación</strong> en LEECV con este correo, pero todavía no los usaste.</p>
      <p><strong>No tenés que hacer nada especial:</strong> entrá a <a href="https://leecv.app">leecv.app</a> con este mismo email (código de acceso por correo o con tu cuenta) y los créditos se acreditan solos en tu saldo.</p>
      <p>Para que no se pierdan, vas a tenerlos disponibles durante un tiempo; pasado un año sin entrar, los créditos sin reclamar expiran.</p>
      <p>Si tenés alguna consulta, respondé a este correo.</p>
      <p>Saludos,<br>El equipo de LEECV.</p>
    </div>
  `;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: [toEmail],
        subject: 'Tus créditos de LEECV están esperando',
        html: htmlContent
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Error enviando recordatorio vía Resend:', errText);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Excepción al enviar recordatorio:', error);
    return false;
  }
}
