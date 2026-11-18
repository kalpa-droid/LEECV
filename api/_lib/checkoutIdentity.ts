import type { VercelRequest, VercelResponse } from '@vercel/node';
import { errorResponse } from './apiResponse.js';
import { getPrice } from './paymentProviders/pricingCatalog.js';
import { supabaseAdmin } from './supabaseAdmin.js';

/**
 * Resolución de identidad para iniciar un checkout (create-checkout y
 * paypal-order:create). El body NUNCA es fuente de identidad: con sesión
 * (JWT Bearer), el usuario sale del token; sin sesión, el dueño sale del
 * token de exportación vinculado en pdf_export_tokens (o queda undefined y
 * la acreditación cae en unclaimed_email_credits para reclamo por email).
 *
 * Devuelve null si ya se envió la respuesta de error al cliente — el caller
 * debe hacer `return;` inmediatamente.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export interface CheckoutIdentity {
  providerId: 'mercadopago' | 'paypal';
  plan: string;
  emailToUse: string;
  /** exportToken ya trimmed — usar esta, no la del body. */
  exportToken: string;
  userId: string | undefined;
}

export async function resolveCheckoutIdentity(
  req: VercelRequest,
  res: VercelResponse,
  opts: {
    /** Fuerza el proveedor (paypal-order ignora el providerId del body). */
    forcedProvider?: 'mercadopago' | 'paypal';
  } = {},
): Promise<CheckoutIdentity | null> {
  // Identidad: con sesión (JWT), el usuario sale del token; sin sesión
  // (invitado), sale del token de exportación vinculado si lo tuviera, o
  // queda undefined (la acreditación cae en unclaimed_email_credits).
  const authHeader = req.headers.authorization || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  let sessionUser: { id: string; email?: string } | null = null;
  if (bearer) {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(bearer);
    if (error || !user) {
      // Si el cliente mandó JWT es porque se cree autenticado: no degradar a
      // invitado en silencio (abriría la vía de suplantación por body).
      errorResponse(res, 401, 'No autenticado');
      return null;
    }
    sessionUser = { id: user.id, email: user.email ?? undefined };
  }

  const { providerId: bodyProviderId, plan = 'single_pdf', email, exportToken } = req.body || {};

  let providerId: 'mercadopago' | 'paypal';
  if (opts.forcedProvider) {
    providerId = opts.forcedProvider;
  } else {
    if (!bodyProviderId) {
      errorResponse(res, 400, 'Falta el campo obligatorio: providerId');
      return null;
    }
    if (bodyProviderId !== 'mercadopago' && bodyProviderId !== 'paypal') {
      errorResponse(res, 400, 'Proveedor de pago no válido');
      return null;
    }
    providerId = bodyProviderId;
  }

  // Plan validado contra el catálogo server-side (el body no decide precios).
  if (typeof plan !== 'string' || plan === 'pro' || !getPrice(plan)) {
    errorResponse(res, 400, 'Plan desconocido');
    return null;
  }

  // Todo plan comprable es una compra atada a un token de exportación creado
  // antes de ir al checkout (PricingModal/PdfCheckoutModal). Sin token válido
  // no hay checkout.
  if (typeof exportToken !== 'string' || exportToken.trim() === '') {
    errorResponse(res, 400, 'Falta el campo obligatorio: exportToken');
    return null;
  }
  const token = exportToken.trim();

  const emailToUse = (sessionUser?.email || (typeof email === 'string' ? email.trim().toLowerCase() : '')).trim();
  if (!EMAIL_RE.test(emailToUse)) {
    errorResponse(res, 400, 'Email no válido');
    return null;
  }

  try {
    const { data: tokenRow, error: tokenError } = await supabaseAdmin
      .from('pdf_export_tokens')
      .select('token, paid, user_id')
      .eq('token', token)
      .maybeSingle();

    if (tokenError) {
      console.error('Error consultando pdf_export_tokens en resolveCheckoutIdentity:', tokenError);
      errorResponse(res, 500, 'No se pudo validar el token de exportación');
      return null;
    }
    if (!tokenRow) {
      errorResponse(res, 400, 'Token de exportación no válido');
      return null;
    }
    if (tokenRow.paid) {
      errorResponse(res, 400, 'Este token ya fue pagado');
      return null;
    }

    let userId: string | undefined;
    if (tokenRow.user_id) {
      // El token pertenece a una cuenta: el checkout acredita a ESA cuenta.
      if (sessionUser && sessionUser.id !== tokenRow.user_id) {
        errorResponse(res, 403, 'El token de exportación pertenece a otra cuenta');
        return null;
      }
      userId = tokenRow.user_id;
    } else {
      userId = sessionUser?.id;
    }

    return { providerId, plan, emailToUse, exportToken: token, userId };
  } catch (err) {
    console.error('Error validando token de exportación en resolveCheckoutIdentity:', err);
    errorResponse(res, 500, 'No se pudo validar el token de exportación');
    return null;
  }
}
