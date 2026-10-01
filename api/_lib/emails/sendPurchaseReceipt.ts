export async function sendPurchaseReceipt(toEmail: string, planLabel: string, amountPaid: string, orderId: string) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY || '';

  const htmlContent = `
    <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; color: #333;">
      <h1 style="color: #6a1b9a;">¡Gracias por tu compra en LEECV!</h1>
      <p>Hola,</p>
      <p>Hemos recibido el pago de tu compra con éxito.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr style="background: #f4f4f5; border-bottom: 1px solid #ddd;">
          <td style="padding: 10px; font-weight: bold;">Plan Adquirido</td>
          <td style="padding: 10px; text-align: right;">${planLabel}</td>
        </tr>
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 10px; font-weight: bold;">Monto Abonado</td>
          <td style="padding: 10px; text-align: right;">${amountPaid}</td>
        </tr>
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 10px; font-weight: bold;">N° de Orden</td>
          <td style="padding: 10px; text-align: right;">${orderId}</td>
        </tr>
      </table>
      <p>Tus créditos / plan ya han sido acreditados en tu cuenta. Puedes ir a <a href="https://leecv.com">LEECV</a> para empezar a usarlos.</p>
      <p>Si tienes alguna consulta, puedes responder a este correo.</p>
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
        from: 'LEECV Pagos <pagos@leecv.com>',
        to: [toEmail],
        subject: `Recibo de tu compra: ${planLabel}`,
        html: htmlContent
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Error enviando email via Resend:', errText);
      return false;
    }

    const data = await res.json();
    console.log('Email de recibo enviado:', data);
    return true;
  } catch (error) {
    console.error('Excepción al enviar email:', error);
    return false;
  }
}
