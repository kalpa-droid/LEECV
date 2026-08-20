// api/_lib/applyPayment.js
//
// NÚCLEO ÚNICO de activación de pagos. Todos los webhooks (Mercado Pago,
// PayPal, comprobante manual/OCR) llaman a esta misma función en vez de
// repetir la lógica de "sumar crédito" / "activar plan" cada uno por su
// lado. Si mañana cambia una regla de negocio (ej. duración de la
// suscripción, cuántos créditos da un pack), se cambia acá una sola vez.

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {object} payment
 * @param {string} payment.userId
 * @param {string} [payment.email]
 * @param {'single_pdf'|'credits_pack_5'|'credits_pack_10'|'pro'|'enterprise'} payment.plan
 * @param {string} payment.metodoPago - 'mercadopago' | 'paypal' | 'lemonsqueezy' | 'manual'
 * @param {string} [payment.externalId] - id de la transacción en la pasarela, para la idempotencia
 * @param {number} [payment.amount]
 * @param {string} [payment.currency]
 */
export async function applyPayment(supabaseAdmin, payment) {
  const { userId, email, plan, metodoPago, externalId, amount, currency } = payment;

  if (!userId && !email) {
    throw new Error('applyPayment requiere userId o email para identificar al usuario');
  }

  // Check idempotency if externalId is provided
  if (externalId && metodoPago) {
    const { data: alreadyProcessed } = await supabaseAdmin
      .from('processed_payments')
      .select('id')
      .eq('provider', metodoPago)
      .eq('external_id', externalId)
      .single();

    if (alreadyProcessed) {
      console.log(`[applyPayment] Transacción duplicada omitida (${metodoPago}: ${externalId})`);
      return { type: 'already_processed', message: 'Payment already recorded' };
    }
  }

  const CREDIT_PACKS = {
    single_pdf: 1,
    credits_pack_5: 5,
    credits_pack_10: 10,
  };

  let result;

  if (CREDIT_PACKS[plan]) {
    result = await grantCredits(supabaseAdmin, userId, CREDIT_PACKS[plan]);
  } else if (plan === 'pro' || plan === 'enterprise') {
    result = await activateSubscription(supabaseAdmin, { userId, email, plan, metodoPago });
  } else {
    throw new Error(`Plan desconocido en applyPayment: ${plan}`);
  }

  // Record payment in processed_payments for idempotency
  if (externalId && metodoPago) {
    await supabaseAdmin.from('processed_payments').insert({
      provider: metodoPago,
      external_id: externalId,
      user_id: userId || null,
      plan
    }).catch(err => console.warn('Could not record idempotency log:', err));
  }

  // Registro único de auditoría + fuente para el panel de admin ("avisos de pago").
  await supabaseAdmin.from('admin_notifications').insert({
    type: 'payment_received',
    title: `Pago recibido (${metodoPago})`,
    detail: `Plan/paquete: ${plan}${amount ? ` — ${amount} ${currency || ''}` : ''}${externalId ? ` — ref: ${externalId}` : ''}`,
    user_id: userId || null,
    user_email: email || null,
    metadata: { plan, metodoPago, externalId, amount, currency },
  });

  return result;
}

async function grantCredits(supabaseAdmin, userId, amount) {
  const { data: existing } = await supabaseAdmin
    .from('pdf_export_credits')
    .select('credits')
    .eq('user_id', userId)
    .single();

  const newCredits = (existing?.credits || 0) + amount;
  const { error } = await supabaseAdmin
    .from('pdf_export_credits')
    .upsert({ user_id: userId, credits: newCredits, updated_at: new Date().toISOString() });

  if (error) throw error;
  return { type: 'credits', credits: newCredits };
}

async function activateSubscription(supabaseAdmin, { userId, email, plan, metodoPago }) {
  const vence = new Date();
  vence.setMonth(vence.getMonth() + 1);

  const patch = {
    plan,
    plan_vence: vence.toISOString(),
    premium_activo: true,
    premium_vence: vence.toISOString(),
    metodo_pago: metodoPago,
  };

  const query = supabaseAdmin.from('profiles').update(patch);
  const { data: updated, error } = userId
    ? await query.eq('id', userId).select('id').single()
    : await query.eq('email', email).select('id').single();
  if (error) throw error;

  // Enterprise necesita una organización para poder invitar miembros. Se crea
  // acá una sola vez (no en el frontend) para que quede ligado al pago real,
  // no a que el usuario abra el panel.
  if (plan === 'enterprise' && updated?.id) {
    const { data: existingOrg } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('owner_id', updated.id)
      .single();

    if (!existingOrg) {
      await supabaseAdmin.from('organizations').insert({
        name: email ? `Organización de ${email}` : 'Mi organización',
        owner_id: updated.id,
      });
    }
  }

  return { type: 'subscription', plan, vence: vence.toISOString() };
}
