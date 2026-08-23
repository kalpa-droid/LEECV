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

    async listAll(searchQuery: string = '', planFilter: string = 'all'): Promise<UserProfile[]> {
      if (!supabase) return [];
      const res = await safeSupabaseCall(() => {
        let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });
        if (searchQuery) {
          query = query.or(`email.ilike.%${searchQuery}%,id.ilike.%${searchQuery}%`);
        }
        if (planFilter && planFilter !== 'all') {
          query = query.eq('plan', planFilter);
        }
        return query;
      }, []);
      return (res.data as UserProfile[]) || [];
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

    async getPlatformMetrics() {
      if (!supabase) return { totalUsers: 0, proUsers: 0, enterpriseUsers: 0, activeSubscriptions: 0 };
      const [total, pro, ent] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('plan', 'pro'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('plan', 'enterprise')
      ]);

      const totalUsers = total.count || 0;
      const proUsers = pro.count || 0;
      const enterpriseUsers = ent.count || 0;
      return {
        totalUsers,
        proUsers,
        enterpriseUsers,
        activeSubscriptions: proUsers + enterpriseUsers,
      };
    },

    async updateDriveQuota(userId: string, percentUsed: number): Promise<boolean> {
      if (!supabase) return false;
      const res = await safeSupabaseCall(() =>
        supabase.from('profiles').update({
          drive_quota_percent: percentUsed,
          drive_last_checked_at: new Date().toISOString(),
        }).eq('id', userId)
      );
      return res.success;
    }
  },

  adminAuditLogs: {
    async list(searchQuery: string = ''): Promise<any[]> {
      if (!supabase) return [];
      const res = await safeSupabaseCall(() => {
        let query = supabase.from('admin_audit_logs').select('*').order('created_at', { ascending: false });
        if (searchQuery) {
          query = query.or(`action.ilike.%${searchQuery}%,performed_by.ilike.%${searchQuery}%`);
        }
        return query;
      }, []);
      return (res.data as any[]) || [];
    },

    async log(performedBy: string, action: string, targetUserId: string | null = null, details: object = {}): Promise<boolean> {
      if (!supabase) return false;
      const res = await safeSupabaseCall(() =>
        supabase.from('admin_audit_logs').insert({
          performed_by: performedBy,
          action,
          target_user_id: targetUserId,
          details,
        })
      );
      return res.success;
    }
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

  retentionOffers: {
    async insert(payload: { user_id: string; plan_at_offer: string; discount_percent: number; valid_until: string }): Promise<boolean> {
      if (!supabase) return false;
      const res = await safeSupabaseCall(() =>
        supabase.from('retention_offers').insert(payload)
      );
      return res.success;
    }
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

    async updateTimestamp(slug: string): Promise<boolean> {
      if (!supabase) return false;
      const res = await safeSupabaseCall(() =>
        supabase.from('published_cvs').update({ updated_at: new Date().toISOString() }).eq('slug', slug)
      );
      return res.success;
    }
  },

  cvs: {
    async listByUser(userId: string): Promise<any[]> {
      if (!supabase) return [];
      const res = await safeSupabaseCall(() =>
        supabase
          .from('cvs')
          .select('id, title, candidate_name, dni, updated_at')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })
      );
      return (res.data as any[]) || [];
    },

    async getById(id: string): Promise<any | null> {
      if (!supabase) return null;
      const res = await safeSupabaseCall(() =>
        supabase.from('cvs').select('cv_data').eq('id', id).single()
      );
      return res.data?.cv_data || null;
    },

    async upsert(payload: any): Promise<boolean> {
      if (!supabase) return false;
      const res = await safeSupabaseCall(() =>
        supabase.from('cvs').upsert(payload)
      );
      return res.success;
    },

    async delete(id: string): Promise<boolean> {
      if (!supabase) return false;
      const res = await safeSupabaseCall(() =>
        supabase.from('cvs').delete().eq('id', id)
      );
      return res.success;
    }
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

    async getById(id: string): Promise<Organization | null> {
      if (!supabase) return null;
      const res = await safeSupabaseCall(() =>
        supabase.from('organizations').select('*').eq('id', id).single()
      );
      return (res.data as Organization) || null;
    },

    async getByOwner(ownerId: string): Promise<Organization | null> {
      if (!supabase) return null;
      const res = await safeSupabaseCall(() =>
        supabase.from('organizations').select('*').eq('owner_id', ownerId).single()
      );
      return (res.data as Organization) || null;
    },

    async insert(name: string, ownerId: string): Promise<Organization | null> {
      if (!supabase) return null;
      const res = await safeSupabaseCall(() =>
        supabase.from('organizations').insert({ name, owner_id: ownerId }).select().single()
      );
      return (res.data as Organization) || null;
    }
  },

  orgMembers: {
    async getByUser(userId: string): Promise<any | null> {
      if (!supabase) return null;
      const res = await safeSupabaseCall(() =>
        supabase
          .from('org_members')
          .select('*, organizations(*)')
          .eq('user_id', userId)
          .eq('status', 'active')
          .single()
      );
      return res.data || null;
    },

    async listByOrg(orgId: string): Promise<any[]> {
      if (!supabase) return [];
      const res = await safeSupabaseCall(() =>
        supabase
          .from('org_members')
          .select('*')
          .eq('org_id', orgId)
          .order('created_at', { ascending: false })
      );
      return (res.data as any[]) || [];
    },

    async countActiveOrPending(orgId: string): Promise<number> {
      if (!supabase) return 0;
      const { count } = await supabase
        .from('org_members')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .in('status', ['pending', 'active']);
      return count || 0;
    },

    async insert(payload: any): Promise<any | null> {
      if (!supabase) return null;
      const res = await safeSupabaseCall(() =>
        supabase.from('org_members').insert(payload).select().single()
      );
      return res.data || null;
    },

    async getByToken(token: string): Promise<any | null> {
      if (!supabase) return null;
      const res = await safeSupabaseCall(() =>
        supabase.from('org_members').select('*').eq('invitation_token', token).single()
      );
      return res.data || null;
    },

    async acceptInvitation(id: string, userId: string): Promise<any | null> {
      if (!supabase) return null;
      const res = await safeSupabaseCall(() =>
        supabase
          .from('org_members')
          .update({
            user_id: userId,
            status: 'active',
            joined_at: new Date().toISOString()
          })
          .eq('id', id)
          .select()
          .single()
      );
      return res.data || null;
    },

    async delete(memberId: string): Promise<boolean> {
      if (!supabase) return false;
      const res = await safeSupabaseCall(() =>
        supabase.from('org_members').delete().eq('id', memberId)
      );
      return res.success;
    }
  },

  orgCandidates: {
    async list(orgId: string | null = null, ownerId?: string): Promise<any[]> {
      if (!supabase) return [];
      const res = await safeSupabaseCall(() => {
        let query = supabase.from('org_candidates').select('*');
        if (orgId) {
          query = query.eq('org_id', orgId);
        } else if (ownerId) {
          query = query.eq('owner_id', ownerId);
        }
        return query.order('updated_at', { ascending: false });
      }, []);
      return (res.data as any[]) || [];
    },

    async upsert(payload: any): Promise<any | null> {
      if (!supabase) return null;
      const res = await safeSupabaseCall(() =>
        supabase.from('org_candidates').upsert(payload).select().single()
      );
      return res.data || null;
    }
  }
};
