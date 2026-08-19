/**
 * Inicia el checkout de Mercado Pago (Argentina) y redirige al usuario.
 */
export async function iniciarPagoMercadoPago(userId, email) {
  const res = await fetch('/api/create-mp-preference', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, email }),
  });
  const data = await res.json();
  if (data.checkoutUrl) window.location.href = data.checkoutUrl;
  else throw new Error('No se pudo iniciar el pago con Mercado Pago');
}

/**
 * Redirige al checkout hospedado de Lemon Squeezy (resto del mundo).
 * Reemplazá LEMONSQUEEZY_CHECKOUT_URL por la URL de tu producto (Lemon Squeezy > Products > Share > Copy URL),
 * y creá previamente el producto "LEECV Premium" en tu tienda de Lemon Squeezy.
 */
export function iniciarPagoLemonSqueezy(userId, email) {
  const base = import.meta.env.VITE_LEMONSQUEEZY_CHECKOUT_URL;
  if (!base) throw new Error('Falta configurar VITE_LEMONSQUEEZY_CHECKOUT_URL');
  const url = new URL(base);
  url.searchParams.set('checkout[email]', email);
  url.searchParams.set('checkout[custom][user_id]', userId);
  window.location.href = url.toString();
}
