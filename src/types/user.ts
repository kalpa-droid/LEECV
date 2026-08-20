export type UserRole = 'user' | 'admin';
export type UserPlan = 'free' | 'pro' | 'enterprise';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  plan: UserPlan;
  plan_vence?: string | null;
  premium_activo?: boolean;
  premium_vence?: string | null;
  metodo_pago?: string | null;
  drive_connected?: boolean;
  drive_quota_percent?: number | null;
  drive_last_checked_at?: string | null;
  created_at?: string;
}
