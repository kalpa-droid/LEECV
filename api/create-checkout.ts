import type { VercelRequest, VercelResponse } from '@vercel/node';
import { errorResponse, successResponse } from './_lib/apiResponse.js';
import { requireRateLimit } from './_lib/rateLimiter.js';
import { createCheckoutForProvider } from './_lib/paymentProviders/checkoutInitiators.js';
import { getPrice } from './_lib/paymentProviders/pricingCatalog.js';
import { captureBackendException } from './_lib/sentryBackend.js';
import { supabaseAdmin } from './_lib/supabaseAdmin.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return errorResponse(res, 405, 'Method not allowed');

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

  const rateOk = await requireRateLimit(req, res, `guest:${ip}:create-checkout`, {
    maxRequests: 15,
    windowSeconds: 60,
  });
  if (!rateOk) return;

  // Identidad: el body NUNCA es fuente de identidad. Con sesión (JWT), el
  // usuario sale del token; sin sesión (invitado), sale del token de
  // exportación vinculado si lo tuviera, o queda undefined (la acreditación
  // cae en unclaimed_email_credits para reclamo por email).
  const authHeader = req.headers.authorization || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  let sessionUser: { id: string; email?: string } | null = null;
  if (bearer) {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(bearer);
    if (error || !user) {
      // Si el cliente mandó JWT es porque se cree autenticado: no degradar a
      // invitado en silencio (abriría la vía de suplantación por body).
      return errorResponse(res, 401, 'No autenticado');
    }
    sessionUser = { id: user.id, email: user.email ?? undefined };
  }

  const { providerId, plan = 'single_pdf', email, exportToken } = req.body || {};

  if (!providerId) {
    return errorResponse(res, 400, 'Falta el campo obligatorio: providerId');
  }
  if (providerId !== 'mercadopago' && providerId !== 'paypal') {
    return errorResponse(res, 400, 'Proveedor de pago no válido');
  }

  // Plan validado contra el catálogo server-side (el body no decide precios).
  if (typeof plan !== 'string' || plan === 'pro' || !getPrice(plan)) {
    return errorResponse(res, 400, 'Plan desconocido');
  }

  // Todo plan comprable es una compra atada a un token de exportación creado
  // antes de ir al checkout (PricingModal/PdfCheckoutModal). Sin token válido
  // no hay checkout.
  if (typeof exportToken !== 'string' || exportToken.trim() === '') {
    return errorResponse(res, 400, 'Falta el campo obligatorio: exportToken');
  }
  const token = exportToken.trim();

  const emailToUse = (sessionUser?.email || (typeof email === 'string' ? email.trim().toLowerCase() : '')).trim();
  if (!EMAIL_RE.test(emailToUse)) {
    return errorResponse(res, 400, 'Email no válido');
  }

  try {
    const { data: tokenRow, error: tokenError } = await supabaseAdmin
      .from('pdf_export_tokens')
      .select('token, paid, user_id')
      .eq('token', token)
      .maybeSingle();

    if (tokenError) {
      console.error('Error consultando pdf_export_tokens en create-checkout:', tokenError);
      return errorResponse(res, 500, 'No se pudo validar el token de exportación');
    }
    if (!tokenRow) {
      return errorResponse(res, 400, 'Token de exportación no válido');
    }
    if (tokenRow.paid) {
      return errorResponse(res, 400, 'Este token ya fue pagado');
    }

    let userId: string | undefined;
    if (tokenRow.user_id) {
      // El token pertenece a una cuenta: el checkout acredita a ESA cuenta.
      if (sessionUser && sessionUser.id !== tokenRow.user_id) {
        return errorResponse(res, 403, 'El token de exportación pertenece a otra cuenta');
      }
      userId = tokenRow.user_id;
    } else {
      userId = sessionUser?.id;
    }

    const result = await createCheckoutForProvider(providerId, plan, token, emailToUse, userId);
    return successResponse(res, { checkoutUrl: result.checkoutUrl });
  } catch (err: any) {
    console.error(`Error creando checkout [${providerId}]:`, err);
    await captureBackendException(err, 'create-checkout', { providerId, plan });
    return errorResponse(res, 500, 'No se pudo crear el checkout');
  }
}
