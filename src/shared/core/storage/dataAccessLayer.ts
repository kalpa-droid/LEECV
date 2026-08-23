import { supabase } from '../lib/supabaseClient';
import { safeSupabaseCall } from '../utils/safeSupabaseCall';
import { UserProfile, UserPlan } from '../../../types/user';
import { PaymentClaim } from '../../../types/payments';
import { Organization } from '../../../types/organization';

/**
 * CAPA CANÓNICA DE ACCESO A DATOS (Data Access Layer - DAL)
 * 
 * Aísla las consultas a tablas de Supabase (profiles, published_cvs, admin_notifications, etc.)
 * en métodos tipados y reutilizables. Elimina llamadas directas `supabase.from()` dispersas.
 */
export const dal = {
  profiles: {
    async getById(userId: string): Promise<UserProfile | null> {
      if (!supabase) return null;
      const res = await safeSupabaseCall(() =>
        supabase.from('profiles').select('*').eq('id', userId).single()
      );
      return (res.data as UserProfile) || null;
    },

    async update(userId: string, patch: Partial<UserProfile>): Promise<UserProfile | null> {
      if (!supabase) return null;
      const res = await safeSupabaseCall(() =>
        supabase.from('profiles').update(patch).eq('id', userId).select().single()
      );
      return (res.data as UserProfile) || null;
    },

    async listConnectedDrives(): Promise<UserProfile[]> {
      if (!supabase) return [];
      const res = await safeSupabaseCall(() =>
        supabase
          .from('profiles')
          .select('id, email, plan, drive_connected, drive_quota_percent, drive_last_checked_at')
          .eq('drive_connected', true)
          .order('drive_quota_percent', { ascending: false })
      );
      return (res.data as UserProfile[]) || [];
    },
  },

  adminNotifications: {
    async list(): Promise<any[]> {
      if (!supabase) return [];
      const res = await safeSupabaseCall(() =>
        supabase.from('admin_notifications').select('*').order('created_at', { ascending: false })
      );
      return (res.data as any[]) || [];
    },

    async markRead(id: string): Promise<boolean> {
      if (!supabase) return false;
      const res = await safeSupabaseCall(() =>
        supabase.from('admin_notifications').update({ read: true }).eq('id', id)
      );
      return res.success;
    },

    async insert(payload: { type: string; title: string; detail?: string; user_id?: string | null; user_email?: string | null; metadata?: any }): Promise<boolean> {
      if (!supabase) return false;
      const res = await safeSupabaseCall(() =>
        supabase.from('admin_notifications').insert(payload)
      );
      return res.success;
    },
  },

  paymentClaims: {
    async listPending(): Promise<PaymentClaim[]> {
      if (!supabase) return [];
      const res = await safeSupabaseCall(() =>
        supabase
          .from('payment_claims')
          .select('*')
          .eq('status', 'pendiente')
          .order('created_at', { ascending: false })
      );
      return (res.data as PaymentClaim[]) || [];
    },

    async insert(payload: Partial<PaymentClaim>): Promise<PaymentClaim | null> {
      if (!supabase) return null;
      const res = await safeSupabaseCall(() =>
        supabase.from('payment_claims').insert(payload).select().single()
      );
      return (res.data as PaymentClaim) || null;
    },
  },

  publishedCvs: {
    async getBySlugOrId(slug: string): Promise<any | null> {
      if (!supabase) return null;
      const res = await safeSupabaseCall(() =>
        supabase
          .from('published_cvs')
          .select('drive_file_id, cv_id')
          .or(`slug.eq.${slug},id.eq.${slug}`)
          .single()
      );
      return res.data || null;
    },

    async upsert(payload: any): Promise<boolean> {
      if (!supabase) return false;
      const res = await safeSupabaseCall(() =>
        supabase.from('published_cvs').upsert(payload, { onConflict: 'slug' })
      );
      return res.success;
    },
  },

  organizations: {
    async list(): Promise<Organization[]> {
      if (!supabase) return [];
      const res = await safeSupabaseCall(() =>
        supabase
          .from('organizations')
          .select('id, name, owner_id, max_members, storage_limit_mb, created_at')
          .order('created_at', { ascending: false })
      );
      return (res.data as Organization[]) || [];
    },
  },
};
