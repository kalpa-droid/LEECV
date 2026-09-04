import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export const PLAN_FEATURES = {
  free:       { unlimitedExports: false, candidateManagement: false, cloudStorageGB: 0 },
  pro:        { unlimitedExports: true,  candidateManagement: true,  cloudStorageGB: 0 },  // Drive propio
  enterprise: { unlimitedExports: true,  candidateManagement: true,  cloudStorageGB: 50 }, // LEECV Cloud
};

export function isProOrEnterprise(plan?: string | null): boolean {
  return plan === 'pro' || plan === 'enterprise';
}

export function isAdminRole(role?: string | null): boolean {
  return role === 'admin';
}

export function useEntitlements() {
  const [plan, setPlan] = useState('free');
  const [inGracePeriod, setInGracePeriod] = useState(false);
  const [graceEndsAt, setGraceEndsAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlan() {
      if (!supabase) {
        setLoading(false);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select('plan, premium_vence, grace_period_ends_at')
            .eq('id', user.id)
            .single();

          if (data) {
            const now = new Date();
            const isPastDue = !!(data.premium_vence && new Date(data.premium_vence) < now);
            const inGrace = isPastDue && !!(data.grace_period_ends_at && new Date(data.grace_period_ends_at) > now);
            const effectivePlan = (isPastDue && !inGrace) ? 'free' : (data.plan || 'free');

            if (PLAN_FEATURES[effectivePlan]) {
              setPlan(effectivePlan);
            }
            setInGracePeriod(inGrace);
            setGraceEndsAt(data.grace_period_ends_at || null);
          }
        }
      } catch (err) {
        console.warn('Error obteniendo plan de usuario:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchPlan();
  }, []);

  const features = PLAN_FEATURES[plan] || PLAN_FEATURES.free;
  const isPremium = isProOrEnterprise(plan);

  return {
    plan,
    loading,
    features,
    isPremium,
    inGracePeriod,
    graceEndsAt,
    canEmergencyExport: inGracePeriod || isPremium,
    unlimitedExports: features.unlimitedExports,
    candidateManagement: features.candidateManagement,
    cloudStorageGB: features.cloudStorageGB
  };
}
