import { supabaseAdmin } from './supabaseAdmin.js';

/** Escapa los comodines de LIKE/ILIKE para que un email no se comporte como patrón. */
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

/** IDs canónicos de tipo de documento (DOCUMENT_TYPE_REGISTRY en capabilityRegistry.ts). */
const DOC_TYPE_IDS = ['cv', 'cover_letter', 'business_card', 'book', 'planner', 'invoice', 'editorial'] as const;

export interface DocTypeCount {
  /** null = filas sin tipo asignado; 'otro' = tipo fuera de DOC_TYPE_IDS. */
  docType: string | null;
  count: number;
}

/**
 * Conteo exacto por tipo de documento con head-counts (sin traer filas).
 * Usado por las métricas del panel admin; un fallo de DB lanza con prefijo
 * de tabla para que el caller (endpoint admin) lo capture y responda 500.
 */
async function countByDocTypeColumn(table: string, column: string, paidOnly: boolean): Promise<DocTypeCount[]> {
  const countWhere = async (apply: (q: any) => any): Promise<number> => {
    let q: any = supabaseAdmin.from(table).select(column, { count: 'exact', head: true });
    if (paidOnly) q = q.eq('paid', true);
    q = apply(q);
    const { count, error } = await q;
    if (error) throw new Error(`[${table}] Error contando por ${column}: ${error.message}`);
    return count || 0;
  };

  const [total, nullCount, ...perType] = await Promise.all([
    countWhere((q) => q),
    countWhere((q) => q.is(column, null)),
    ...DOC_TYPE_IDS.map((t) => countWhere((q) => q.eq(column, t))),
  ]);

  const rows: DocTypeCount[] = DOC_TYPE_IDS.map((t, i) => ({ docType: t as string, count: perType[i] }));
  if (nullCount > 0) rows.push({ docType: null, count: nullCount });
  const known = perType.reduce((acc, n) => acc + n, 0) + nullCount;
  if (total > known) rows.push({ docType: 'otro', count: total - known });
  return rows;
}

export const serverDal = {
  profiles: {
    async getRole(id: string): Promise<string | null> {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', id)
        .maybeSingle();

      if (error || !data) return null;
      return data.role || null;
    },

    async getById(id: string): Promise<{ id: string; email: string | null } | null> {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id, email')
        .eq('id', id)
        .maybeSingle();

      if (error || !data) return null;
      return data;
    },

    async getByEmail(email: string): Promise<{ id: string } | null> {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .ilike('email', escapeLikePattern(email))
        .maybeSingle();

      if (error || !data) return null;
      return { id: data.id };
    },

    async listCustomers(limit: number = 50, offset: number = 0, q: string = '') {
      let query = supabaseAdmin
        .from('profiles')
        .select('id, email, plan, role, created_at, pdf_export_access_mode', { count: 'exact' });
        
      if (q) {
        query = query.ilike('email', `%${q}%`);
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw new Error(`Error listando clientes: ${error.message}`);

      const customers = data || [];
      const userIds = customers.map((customer: any) => customer.id);
      const tokenBalances = new Map<string, number>();
      const aiCreditBalances = new Map<string, number>();

      if (userIds.length > 0) {
        // Consultar saldos de exportación PDF (no bloqueante)
        try {
          const { data: balances, error: balanceError } = await supabaseAdmin.rpc(
            'admin_export_token_balances',
            { p_user_ids: userIds }
          );

          if (!balanceError && balances) {
            for (const balance of balances) {
              tokenBalances.set(balance.user_id, Number(balance.credits));
            }
          }
        } catch (e) {
          console.warn('[serverDal] Fallo no bloqueante al consultar saldos de exportación:', e);
        }

        // Consultar créditos de IA de forma desacoplada (sin requerir FK en PostgREST)
        try {
          const { data: creditsData } = await supabaseAdmin
            .from('user_credits')
            .select('user_id, ai_credits')
            .in('user_id', userIds);

          if (creditsData) {
            for (const c of creditsData) {
              aiCreditBalances.set(c.user_id, Number(c.ai_credits) || 0);
            }
          }
        } catch (e) {
          console.warn('[serverDal] Fallo no bloqueante al consultar créditos de IA:', e);
        }
      }

      return {
        customers: customers.map((customer: any) => ({
          ...customer,
          user_credits: { ai_credits: aiCreditBalances.get(customer.id) || 0 },
          pdf_export_tokens: tokenBalances.get(customer.id) || 0,
        })),
        totalCount: count || 0,
      };
    },

    async updateDriveStatus(
      userId: string, 
      patch: { drive_connected: boolean; drive_email?: string | null; drive_avatar?: string | null; drive_quota_percent?: number | null }
    ): Promise<void> {
      const { error } = await supabaseAdmin
        .from('profiles')
        .update(patch)
        .eq('id', userId);

      if (error) throw new Error(`Error actualizando estado de Drive en perfiles: ${error.message}`);
    },

    async updateSubscription(
      matchBy: { id?: string; email?: string },
      patch: Record<string, any>
    ): Promise<{ id: string } | null> {
      let query = supabaseAdmin.from('profiles').update(patch);
      if (matchBy.id) {
        query = query.eq('id', matchBy.id);
      } else if (matchBy.email) {
        query = query.eq('email', matchBy.email);
      } else {
        throw new Error('updateSubscription requiere "id" o "email" para filtrar.');
      }

      const { data, error } = await query.select('id').single();
      if (error) throw new Error(`Error actualizando suscripción de perfil: ${error.message}`);
      return data ? { id: data.id } : null;
    }
  },

  processedPayments: {
    // Nota: la idempotencia ya no se chequea con un SELECT previo (checkIdempotency,
    // removida) — applyPayment.ts inserta primero y usa el error de violación del
    // UNIQUE(provider, external_id) como señal atómica de "ya procesado", cerrando
    // la ventana de carrera que un SELECT-antes-de-INSERT dejaba abierta.
    async record(data: {
      payment_id?: string;
      provider: string;
      external_id?: string;
      amount?: number;
      currency?: string;
      user_id?: string;
      user_email?: string;
      plan?: string;
      entitlement_status?: string;
      details?: any;
    }): Promise<void> {
      const recordToInsert: Record<string, any> = {
        provider: data.provider,
        external_id: data.external_id || '',
        plan: data.plan || 'single_pdf',
        entitlement_status: data.entitlement_status || 'pending',
        created_at: new Date().toISOString(),
      };
      if (data.user_id) recordToInsert.user_id = data.user_id;
      if (data.user_email) recordToInsert.user_email = data.user_email;
      if (data.amount !== undefined && data.amount !== null) recordToInsert.amount = data.amount;
      if (data.currency) recordToInsert.currency = data.currency;
      if (data.payment_id) recordToInsert.payment_id = data.payment_id;
      if (data.details) recordToInsert.details = data.details;

      const { error } = await supabaseAdmin
        .from('processed_payments')
        .insert(recordToInsert);

      if (error) {
        const errObj: any = new Error(`Error registrando pago procesado: ${error.message}`);
        errObj.code = error.code;
        throw errObj;
      }
    },

    async listPending(minAgeIso: string, limit: number) {
      const { data, error } = await supabaseAdmin
        .from('processed_payments')
        .select('id, provider, external_id, plan, amount, currency, user_email, user_id, created_at, details')
        .eq('entitlement_status', 'pending')
        .lt('created_at', minAgeIso)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) throw new Error(`[processedPayments] Error listando pagos pendientes: ${error.message}`);
      return data || [];
    },

    async getByProviderAndExternalId(provider: string, external_id: string): Promise<{ id: string; plan: string; entitlement_status?: string } | null> {
      const { data, error } = await supabaseAdmin
        .from('processed_payments')
        .select('id, plan, entitlement_status')
        .eq('provider', provider)
        .eq('external_id', external_id)
        .maybeSingle();

      if (error) {
        throw new Error(`[processedPayments] Error consultando pago (${provider}:${external_id}): ${error.message}`);
      }
      return data || null;
    },

    async updateEntitlementStatus(
      provider: string,
      external_id: string,
      entitlement_status: 'completed' | 'failed' | 'pending',
      /** Patch opcional para la columna jsonb `details` (p. ej. { unclaimed: true }). */
      details?: any
    ): Promise<void> {
      const patch: Record<string, unknown> = { entitlement_status };
      if (details !== undefined) patch.details = details;

      const { error } = await supabaseAdmin
        .from('processed_payments')
        .update(patch)
        .eq('provider', provider)
        .eq('external_id', external_id);

      if (error) {
        throw new Error(`[processedPayments] Error actualizando entitlement_status: ${error.message}`);
      }
    },

    /**
     * Ingresos confirmados (entitlement_status='completed') agregados por
     * plan+moneda, calculados en JS a partir de las 3 columnas necesarias.
     * Sin doc_type: processed_payments no tiene esa columna (decisión del
     * alcance PR-E; agregarla requeriría migración).
     */
    async revenueByPlanCurrency(): Promise<Array<{ plan: string; currency: string; totalAmount: number; count: number }>> {
      const { data, error } = await supabaseAdmin
        .from('processed_payments')
        .select('plan, currency, amount')
        .eq('entitlement_status', 'completed');

      if (error) throw new Error(`[processedPayments] Error agregando ingresos por plan y moneda: ${error.message}`);

      const byKey = new Map<string, { plan: string; currency: string; totalAmount: number; count: number }>();
      for (const row of data || []) {
        const plan = String((row as any).plan || 'desconocido');
        const currency = String((row as any).currency || 'sin_moneda').toLowerCase();
        const amount = Number((row as any).amount);
        const key = `${plan}|${currency}`;
        const bucket = byKey.get(key) || { plan, currency, totalAmount: 0, count: 0 };
        bucket.count += 1;
        if (Number.isFinite(amount)) bucket.totalAmount += amount;
        byKey.set(key, bucket);
      }
      return [...byKey.values()].sort((a, b) => b.totalAmount - a.totalAmount);
    }
  },

  // Exportaciones de PDF pagadas (pdf_export_tokens.paid = true) por tipo de documento.
  exportTokens: {
    async countPaidByDocType(): Promise<DocTypeCount[]> {
      return countByDocTypeColumn('pdf_export_tokens', 'doc_type', true);
    },
  },

  pendingGrants: {
    async create(data: {
      email?: string;
      provider: string;
      external_id: string;
      plan: string;
      amount?: number;
      currency?: string;
      hold_reason?: 'amount_mismatch' | 'missing_profile' | 'provider_pending';
      export_token?: string;
    }): Promise<void> {
      const { error } = await supabaseAdmin.from('pending_grants').insert({
        ...data,
        created_at: new Date().toISOString()
      });
      if (error) {
        if (
          error.code === '23505' ||
          String(error.message).includes('duplicate key') ||
          String(error.message).includes('unique constraint')
        ) {
          // Idempotente: si ya existe una entrada para este pago, omitir sin error
          return;
        }
        throw new Error(`[pendingGrants] Error creando pending grant: ${error.message}`);
      }
    },

    async listProviderPending(minAgeIso: string, limit: number) {
      const { data, error } = await supabaseAdmin
        .from('pending_grants')
        .select('id, email, provider, external_id, plan, amount, currency, hold_reason, export_token, created_at')
        .is('resolved_at', null)
        .eq('hold_reason', 'provider_pending')
        .lt('created_at', minAgeIso)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) throw new Error(`[pendingGrants] Error listando retenidos por pasarela: ${error.message}`);
      return data || [];
    },

    async listUnresolved(limit: number, offset: number) {
      const { data, count, error } = await supabaseAdmin
        .from('pending_grants')
        .select('id, email, provider, external_id, plan, amount, currency, hold_reason, created_at', { count: 'exact' })
        .is('resolved_at', null)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw new Error(`[pendingGrants] Error listando pagos retenidos: ${error.message}`);
      return { grants: data || [], totalCount: count || 0 };
    },

    async getUnresolvedById(id: string) {
      const { data, error } = await supabaseAdmin
        .from('pending_grants')
        .select('id, email, provider, external_id, plan, amount, currency, hold_reason, export_token, resolved_at')
        .eq('id', id)
        .is('resolved_at', null)
        .maybeSingle();

      if (error) throw new Error(`[pendingGrants] Error consultando pago retenido: ${error.message}`);
      return data;
    },

    async markResolved(id: string, userId: string | null, adminId: string, reason: string): Promise<boolean> {
      const { data, error } = await supabaseAdmin
        .from('pending_grants')
        .update({
          resolved_at: new Date().toISOString(),
          resolved_by: adminId,
          resolved_user_id: userId,
          resolution_reason: reason,
          resolution_action: 'admin_resolved',
        })
        .eq('id', id)
        .is('resolved_at', null)
        .select('id')
        .maybeSingle();

      if (error) throw new Error(`[pendingGrants] Error resolviendo pago retenido: ${error.message}`);
      return Boolean(data);
    },

    /**
     * Cierra automáticamente una retención cuando el webhook de aprobación
     * confirma el mismo pago. Evita que la bandeja quede con filas obsoletas
     * después de una acreditación exitosa.
     */
    async resolveIfPending(provider: string, externalId: string, reason: string): Promise<void> {
      const { error } = await supabaseAdmin
        .from('pending_grants')
        .update({
          resolved_at: new Date().toISOString(),
          resolution_reason: reason,
          resolution_action: 'auto_resolved',
        })
        .eq('provider', provider)
        .eq('external_id', externalId)
        .is('resolved_at', null);

      if (error) throw new Error(`[pendingGrants] Error resolviendo pago retenido automáticamente: ${error.message}`);
    }
  },

  unclaimedCredits: {
    async listPending(limit: number, offset: number) {
      const { data, count, error } = await supabaseAdmin
        .from('unclaimed_email_credits')
        .select('id, email, credits, provider, plan, amount, currency, created_at, reminder_sent_at', { count: 'exact' })
        .is('claimed_at', null)
        .is('expired_at', null)
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) throw new Error(`[unclaimedCredits] Error listando créditos sin reclamar: ${error.message}`);
      return { credits: data || [], totalCount: count || 0 };
    },

    async getById(id: string) {
      const { data, error } = await supabaseAdmin
        .from('unclaimed_email_credits')
        .select('id, email, credits, provider, plan, amount, currency, created_at, reminder_sent_at, expired_at')
        .eq('id', id)
        .maybeSingle();

      if (error) throw new Error(`[unclaimedCredits] Error consultando crédito sin reclamar: ${error.message}`);
      return data || null;
    },

    async markReminded(id: string): Promise<void> {
      const { error } = await supabaseAdmin
        .from('unclaimed_email_credits')
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq('id', id)
        .is('claimed_at', null)
        .is('expired_at', null);

      if (error) throw new Error(`[unclaimedCredits] Error marcando recordatorio: ${error.message}`);
    },
  },

  adminNotifications: {
    async create(data: { type: string; title: string; message: string; metadata?: any; user_id?: string | null }): Promise<void> {
      const { error } = await supabaseAdmin
        .from('admin_notifications')
        .insert({
          type: data.type,
          title: data.title,
          detail: data.message, // tabla usa 'detail', no 'message'
          metadata: data.metadata,
          user_id: data.user_id,
          created_at: new Date().toISOString()
        });

      if (error) console.error(`[adminNotifications] Error al crear notificación: ${error.message}`);
    }
  },


  manualClaims: {
    async getById(id: string): Promise<any | null> {
      const { data, error } = await supabaseAdmin
        .from('payment_claims')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error || !data) return null;
      return data;
    },

    async updateStatus(id: string, status: string, reviewedBy?: string): Promise<void> {
      const patch: any = { status };
      if (reviewedBy) patch.reviewed_by = reviewedBy;
      patch.updated_at = new Date().toISOString(); // columna reconciliada en 20261026_reconcile_payment_claims

      const { error } = await supabaseAdmin
        .from('payment_claims')
        .update(patch)
        .eq('id', id);

      if (error) throw new Error(`Error actualizando reclamo manual: ${error.message}`);
    }
  },

  publishedCvs: {
    async getBySlugOrId(slug: string): Promise<any | null> {
      const { data, error } = await supabaseAdmin
        .from('published_cvs')
        .select('*')
        .or(`slug.eq.${slug},id.eq.${slug}`)
        .maybeSingle();

      if (error || !data) return null;
      return data;
    },

    /**
     * Lista paginada para moderación. Si `search` contiene '@', filtra por
     * email del dueño vía join server-side a profiles (la tabla publicadas no
     * guarda email); si no, ilike por slug. Nunca expone drive_file_id a quien
     * no deba verlo: el endpoint admin lo entrega solo a admins autenticados.
     */
    async listForModeration({ search = '', page = 0, limit = 20 }: { search?: string; page?: number; limit?: number }): Promise<{ items: any[]; totalCount: number }> {
      const q = search.trim();
      const fromIndex = page * limit;
      const toIndex = fromIndex + limit - 1;
      const byEmail = q.includes('@');

      let query: any = supabaseAdmin
        .from('published_cvs')
        .select(
          byEmail
            ? 'id, user_id, cv_id, slug, drive_file_id, is_active, created_at, updated_at, profiles!inner(email)'
            : 'id, user_id, cv_id, slug, drive_file_id, is_active, created_at, updated_at',
          { count: 'exact' }
        );

      if (q) {
        query = byEmail
          ? query.ilike('profiles.email', `%${escapeLikePattern(q)}%`)
          : query.ilike('slug', `%${escapeLikePattern(q)}%`);
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(fromIndex, toIndex);

      if (error) throw new Error(`[publishedCvs] Error listando CVs publicados: ${error.message}`);

      const items = (data || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        cvId: row.cv_id,
        slug: row.slug,
        driveFileId: row.drive_file_id,
        isActive: row.is_active,
        ownerEmail: row.profiles?.email ?? null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      return { items, totalCount: count || 0 };
    },

    /** Activa/desactiva la publicación pública (/c/:slug). Nunca borra nada: ni el CV ni el archivo de Drive. */
    async setActive(id: string, isActive: boolean): Promise<{ id: string; user_id: string; slug: string; is_active: boolean } | null> {
      const { data, error } = await supabaseAdmin
        .from('published_cvs')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('id, user_id, slug, is_active')
        .maybeSingle();

      if (error) throw new Error(`[publishedCvs] Error actualizando el estado de publicación: ${error.message}`);
      return data || null;
    }
  },

  adminAuditLogs: {
    async log(adminId: string, actionType: string, targetUserId: string | null = null, details: object = {}): Promise<void> {
      const { error } = await supabaseAdmin
        .from('admin_audit_logs')
        .insert({
          admin_id: adminId,
          action_type: actionType,
          target_user_id: targetUserId,
          details,
        });

      // Best-effort no bloqueante: una fila de auditoría perdida no debe
      // tumbar una acción admin que ya se aplicó.
      if (error) console.error(`[adminAuditLogs] Error registrando auditoría: ${error.message}`);
    },
  },

  cvs: {
    // Confirma que `fileId` es realmente el drive_file_id de un CV que pertenece
    // a `userId`, antes de autorizar un borrado en Google Drive.
    async findByDriveFileIdAndUser(fileId: string, userId: string): Promise<{ id: string } | null> {
      const { data, error } = await supabaseAdmin
        .from('cvs')
        .select('id')
        .eq('drive_file_id', fileId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error || !data) return null;
      return data;
    },

    async clearDriveBackup(cvId: string): Promise<void> {
      const { error } = await supabaseAdmin
        .from('cvs')
        .update({ drive_file_id: null, drive_synced_at: null })
        .eq('id', cvId);

      if (error) throw new Error(`Error limpiando puntero de Drive: ${error.message}`);
    },

    /** Documentos creados por tipo (head-counts exactos, sin traer filas). */
    async countByDocType(): Promise<DocTypeCount[]> {
      return countByDocTypeColumn('cvs', 'doc_type_id', false);
    }
  },

  aiKeyCooldowns: {
    /**
     * Pausas de claves de IA ACTIVAS (paused_until > ahora). Devuelve solo el
     * provider y los primeros 8 caracteres del hash SHA-256 de la clave:
     * nunca expone la clave ni su hash completo (la tabla no tiene key en claro).
     */
    async listActive(): Promise<Array<{ provider: string; keyHashPrefix: string; pausedUntil: string; updatedAt: string }>> {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabaseAdmin
        .from('ai_key_cooldowns')
        .select('provider, key_hash, paused_until, updated_at')
        .gt('paused_until', nowIso)
        .order('paused_until', { ascending: true });

      if (error) throw new Error(`[aiKeyCooldowns] Error listando pausas de claves: ${error.message}`);

      return (data || []).map((row: any) => ({
        provider: String(row.provider || ''),
        keyHashPrefix: String(row.key_hash || '').slice(0, 8),
        pausedUntil: row.paused_until,
        updatedAt: row.updated_at,
      }));
    }
  },

  aiTelemetry: {
    async logUsage(data: {
      userId: string;
      provider: string;
      model: string;
      endpoint: string;
      promptTokens: number;
      completionTokens: number;
      estimatedCostUsd: number;
    }): Promise<void> {
      const { error } = await supabaseAdmin
        .from('ai_usage_telemetry')
        .insert({
          user_id: data.userId,
          provider: data.provider,
          model: data.model,
          endpoint: data.endpoint,
          prompt_tokens: data.promptTokens,
          completion_tokens: data.completionTokens,
          estimated_cost_usd: data.estimatedCostUsd,
          created_at: new Date().toISOString()
        });
      
      if (error) {
        console.error(`[aiTelemetry] Error logging usage: ${error.message}`);
      }
    }
  },

  ocrJobs: {
    /** Crear un nuevo job de OCR/IA */
    async create(payload: { userId?: string; email: string; pagesTotal?: number; status?: 'pending' | 'processing' | 'completed' | 'failed' }): Promise<{ id: string } | null> {
      if (!supabaseAdmin) return null;
      const res = await supabaseAdmin
        .from('ocr_jobs')
        .insert({
          user_id: payload.userId,
          email: payload.email,
          pages_total: payload.pagesTotal,
          status: payload.status ?? 'pending',
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      return res.data || null;
    },

    /** Consultar estado actual de un job */
    async getById(jobId: string): Promise<any | null> {
      if (!supabaseAdmin) return null;
      const { data, error } = await supabaseAdmin
        .from('ocr_jobs')
        .select('*')
        .eq('id', jobId)
        .maybeSingle();
      if (error) console.error(`[ocrJobs] Error consultando job ${jobId}: ${error.message}`);
      return data || null;
    },

    /** Actualizar job (estado, resultado, marcas de tiempo) */
    async update(jobId: string, payload: {
      status?: 'pending' | 'processing' | 'completed' | 'failed';
      result_json?: any;
      error_message?: string;
      completed_at?: string;
    }): Promise<boolean> {
      if (!supabaseAdmin) return false;
      const { error } = await supabaseAdmin
        .from('ocr_jobs')
        .update(payload)
        .eq('id', jobId);
      return !error;
    },

    /** Listar jobs por usuario */
    async listByUser(userId: string, limit: number = 50): Promise<any[]> {
      if (!supabaseAdmin) return [];
      const { data } = await supabaseAdmin
        .from('ocr_jobs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      return data || [];
    },
  }
};
