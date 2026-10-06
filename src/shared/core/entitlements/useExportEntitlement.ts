import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../auth/AuthContext';

export function useExportEntitlement() {
  const { profile, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [canExport, setCanExport] = useState(false);
  const [reason, setReason] = useState<string | null>('sin_creditos');
  const [credits, setCredits] = useState(0);

  const checkEntitlement = useCallback(async () => {
    setLoading(true);
    try {
      if (user) {
        if (profile?.plan === 'pro') {
            setCanExport(true);
            setReason(null);
            setCredits(999);
            return;
        }
        
        // Count unconsumed paid tokens for this user
        const { count } = await supabase
          .from('pdf_export_tokens')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('paid', true)
          .eq('consumed', false);
          
        if (count && count > 0) {
           setCanExport(true);
           setReason(null);
           setCredits(count);
           return;
        }
      } else {
        // Guest user checks local token
        const token = localStorage.getItem('leecv_export_token');
        if (token) {
          const { data } = await supabase
            .rpc('check_export_token_status', { p_token: token })
            .single();
            
          const tokenData = data as { paid?: boolean; consumed?: boolean } | null;
          if (tokenData && tokenData.paid && !tokenData.consumed) {
            setCanExport(true);
            setReason(null);
            setCredits(1);
            return;
          }
        }
      }
      
      setCanExport(false);
      setReason('sin_creditos');
      setCredits(0);
    } catch (e) {
      console.error(e);
      setCanExport(false);
      setReason('error');
      setCredits(0);
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  useEffect(() => {
    checkEntitlement();
  }, [checkEntitlement]);

  const consumeEntitlementIfNeeded = useCallback(async () => {
    if (!supabase) return false;

    if (user) {
      const { data, error } = await supabase.rpc('check_and_consume_export_entitlement', { p_user_id: user.id });
      if (error || !data) return false;
      return true;
    } else {
      const token = localStorage.getItem('leecv_export_token');
      if (!token) return false;
      const { data, error } = await supabase.rpc('consume_export_token', { p_token: token });
      if (error || !data) return false;
      localStorage.removeItem('leecv_export_token');
      return true;
    }
  }, [user]);

  return {
    loading,
    canExport,
    reason,
    credits,
    consumeCreditIfNeeded: consumeEntitlementIfNeeded,
    refreshCredits: checkEntitlement
  };
}
