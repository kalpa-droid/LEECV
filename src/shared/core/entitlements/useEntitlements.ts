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
            .select('plan, premium_vence')
            .eq('id', user.id)
            .single();

          const isExpired = !!(data?.premium_vence && new Date(data.premium_vence) < new Date());
          const effectivePlan = isExpired ? 'free' : (data?.plan || 'free');

          if (PLAN_FEATURES[effectivePlan]) {
            setPlan(effectivePlan);
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
    unlimitedExports: features.unlimitedExports,
    candidateManagement: features.candidateManagement,
    cloudStorageGB: features.cloudStorageGB
  };
}
