/**
 * Inicia el checkout de Mercado Pago (Argentina / LATAM) y redirige al usuario.
 */
export async function iniciarPagoMercadoPago(userId, email, plan = 'single_pdf') {
  const res = await fetch('/api/create-mp-preference', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, email, plan }),
  });
  const data = await res.json();
  if (data.checkoutUrl) {
    window.location.href = data.checkoutUrl;
  } else {
    throw new Error(data.error || 'No se pudo iniciar el pago con Mercado Pago');
  }
}

/**
 * Redirige al checkout hospedado de Lemon Squeezy (resto del mundo).
 */
export function iniciarPagoLemonSqueezy(userId, email, plan = 'single_pdf') {
  const base = import.meta.env.VITE_LEMONSQUEEZY_CHECKOUT_URL;
  if (!base) throw new Error('Falta configurar VITE_LEMONSQUEEZY_CHECKOUT_URL');
  const url = new URL(base);
  if (email) url.searchParams.set('checkout[email]', email);
  if (userId) url.searchParams.set('checkout[custom][user_id]', userId);
  url.searchParams.set('checkout[custom][plan]', plan);
  window.location.href = url.toString();
}
