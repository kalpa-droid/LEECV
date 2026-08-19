import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export const PLAN_FEATURES = {
  free:       { unlimitedExports: false, candidateManagement: false, cloudStorageGB: 0 },
  pro:        { unlimitedExports: true,  candidateManagement: true,  cloudStorageGB: 0 },  // Drive propio
  enterprise: { unlimitedExports: true,  candidateManagement: true,  cloudStorageGB: 50 }, // LEECV Cloud
};

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
            .select('plan')
            .eq('id', user.id)
            .single();

          if (data?.plan && PLAN_FEATURES[data.plan]) {
            setPlan(data.plan);
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

  return {
    plan,
    loading,
    features,
    unlimitedExports: features.unlimitedExports,
    candidateManagement: features.candidateManagement,
    cloudStorageGB: features.cloudStorageGB
  };
}
