import { supabaseAdmin } from './supabaseAdmin.js';

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

    async getByEmail(email: string): Promise<{ id: string } | null> {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (error || !data) return null;
      return { id: data.id };
    },

    async listCustomers(limit: number = 50, offset: number = 0, q: string = '') {
      let query = supabaseAdmin
        .from('profiles')
        .select(`
          id, email, plan, role, created_at,
          pdf_export_credits ( credits ),
          user_credits ( ai_credits )
        `, { count: 'exact' });
        
      if (q) {
        query = query.ilike('email', `%${q}%`);
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw new Error(`Error listando clientes: ${error.message}`);
      return { customers: data || [], totalCount: count || 0 };
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

    async getByProviderAndExternalId(provider: string, external_id: string): Promise<{ id: string; plan: string; entitlement_status?: string } | null> {
      const { data, error } = await supabaseAdmin
        .from('processed_payments')
        .select('id, plan, entitlement_status')
        .eq('provider', provider)
        .eq('external_id', external_id)
        .maybeSingle();

      if (error || !data) return null;
      return data;
    },

    async updateEntitlementStatus(provider: string, external_id: string, entitlement_status: 'completed' | 'failed' | 'pending'): Promise<void> {
      const { error } = await supabaseAdmin
        .from('processed_payments')
        .update({ entitlement_status })
        .eq('provider', provider)
        .eq('external_id', external_id);

      if (error) console.error(`[processedPayments] Error actualizando entitlement_status: ${error.message}`);
    }
  },

  pendingGrants: {
    async create(data: { email?: string; provider: string; external_id: string; plan: string; amount?: number; currency?: string }): Promise<void> {
      const { error } = await supabaseAdmin.from('pending_grants').insert({
        ...data,
        created_at: new Date().toISOString()
      });
      if (error) console.error(`[pendingGrants] Error creating pending grant: ${error.message}`);
    }
  },

  adminNotifications: {
    async create(data: { type: string; title: string; message: string; metadata?: any; user_id?: string | null }): Promise<void> {
      const { error } = await supabaseAdmin
        .from('admin_notifications')
        .insert({
          ...data,
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
      const patch: any = { status, updated_at: new Date().toISOString() };
      if (reviewedBy) patch.reviewed_by = reviewedBy;

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
    }
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
  }
};
