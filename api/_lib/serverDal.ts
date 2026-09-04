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

  pdfExportCredits: {
    async getByUserId(userId: string): Promise<{ credits: number } | null> {
      const { data, error } = await supabaseAdmin
        .from('pdf_export_credits')
        .select('credits')
        .eq('user_id', userId)
        .maybeSingle();

      if (error || !data) return null;
      return { credits: Number(data.credits || 0) };
    },

    async grantCredits(userId: string, amount: number): Promise<{ credits: number }> {
      const { data, error } = await supabaseAdmin.rpc('grant_pdf_credits', {
        p_user_id: userId,
        p_amount: amount,
      });

      if (error) throw new Error(`Error acreditando exportaciones PDF: ${error.message}`);
      return { credits: Number(data || 0) };
    }
  },

  driveTokens: {
    async getByUserId(userId: string): Promise<any | null> {
      const { data, error } = await supabaseAdmin
        .from('google_drive_tokens')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error || !data) return null;
      return data;
    },

    async upsertToken(userId: string, refreshToken: string): Promise<void> {
      const { error } = await supabaseAdmin
        .from('google_drive_tokens')
        .upsert({
          user_id: userId,
          refresh_token: refreshToken,
          updated_at: new Date().toISOString()
        });

      if (error) throw new Error(`Error guardando token de Google Drive: ${error.message}`);
    },

    async deleteByUserId(userId: string): Promise<void> {
      const { error } = await supabaseAdmin
        .from('google_drive_tokens')
        .delete()
        .eq('user_id', userId);

      if (error) throw new Error(`Error eliminando token de Google Drive: ${error.message}`);
    }
  },

  processedPayments: {
    async checkIdempotency(provider: string, externalId: string): Promise<boolean> {
      const { data } = await supabaseAdmin
        .from('processed_payments')
        .select('id')
        .eq('provider', provider)
        .eq('external_id', externalId)
        .maybeSingle();

      return !!data;
    },

    async record(data: {
      payment_id?: string;
      provider: string;
      external_id?: string;
      amount?: number;
      user_id?: string;
      user_email?: string;
      plan?: string;
      details?: any;
    }): Promise<void> {
      const recordToInsert: Record<string, any> = {
        provider: data.provider,
        external_id: data.external_id || '',
        plan: data.plan || 'single_pdf',
        created_at: new Date().toISOString(),
      };
      if (data.user_id) recordToInsert.user_id = data.user_id;
      if (data.user_email) recordToInsert.user_email = data.user_email;
      if (data.amount !== undefined && data.amount !== null) recordToInsert.amount = data.amount;
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
    }
  },

  adminNotifications: {
    async create(data: { type: string; title: string; message: string; metadata?: any }): Promise<void> {
      const { error } = await supabaseAdmin
        .from('admin_notifications')
        .insert({
          ...data,
          created_at: new Date().toISOString()
        });

      if (error) console.error(`[adminNotifications] Error al crear notificación: ${error.message}`);
    }
  },

  organizations: {
    async getByOwnerId(ownerId: string): Promise<any | null> {
      const { data, error } = await supabaseAdmin
        .from('organizations')
        .select('*')
        .eq('owner_id', ownerId)
        .maybeSingle();

      if (error || !data) return null;
      return data;
    },

    async create(data: { name: string; owner_id: string; tier?: string }): Promise<any> {
      const { data: created, error } = await supabaseAdmin
        .from('organizations')
        .insert({
          name: data.name,
          owner_id: data.owner_id,
          tier: data.tier || 'agency',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw new Error(`Error creando organización: ${error.message}`);
      return created;
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
  }
};
