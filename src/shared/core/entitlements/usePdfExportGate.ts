import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

export function usePdfExportGate() {
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);

  // We keep the return signature somewhat compatible for existing components
  const plan = 'free';
  const unlimitedExports = false;

  const refreshCredits = useCallback(async () => {
    try {
      const token = localStorage.getItem('leecv_export_token');
      if (!token || !supabase) {
        setCredits(0);
        return;
      }

      const { data, error } = await supabase
        .from('pdf_export_tokens')
        .select('paid, consumed')
        .eq('token', token)
        .single();

      if (error || !data) {
        setCredits(0);
        return;
      }

      if (data.paid && !data.consumed) {
        setCredits(1);
      } else {
        setCredits(0);
      }
    } catch (e) {
      setCredits(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCredits();
  }, [refreshCredits]);

  const canExport = credits > 0;
  const reason = credits > 0 ? null : 'sin_creditos';

  const consumeCreditIfNeeded = useCallback(async () => {
    if (!supabase) return false;

    const token = localStorage.getItem('leecv_export_token');
    if (!token) return false;

    const { data, error } = await supabase.rpc('consume_export_token', { p_token: token });
    if (error || !data) return false;

    setCredits(0);
    localStorage.removeItem('leecv_export_token');
    return true;
  }, []);

  return {
    plan,
    canExport,
    reason,
    credits,
    unlimitedExports,
    loading,
    consumeCreditIfNeeded,
    refreshCredits,
  };
}
