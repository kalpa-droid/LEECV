import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useEntitlements } from './useEntitlements';

/**
 * Único punto de decisión de "¿puede exportar PDF ahora mismo?".
 * Usado tanto por el flujo Registrado-gratis (créditos) como por
 * Premium/Enterprise (ilimitado) — un solo hook, no una función por plan.
 */
export function usePdfExportGate() {
  const { plan, unlimitedExports, loading: loadingPlan } = useEntitlements();
  const [credits, setCredits] = useState(0);
  const [loadingCredits, setLoadingCredits] = useState(true);

  const refreshCredits = useCallback(async () => {
    if (!supabase || unlimitedExports) {
      setLoadingCredits(false);
      return;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoadingCredits(false); return; }
      const { data } = await supabase
        .from('pdf_export_credits')
        .select('credits')
        .eq('user_id', user.id)
        .single();
      setCredits(data?.credits || 0);
    } catch {
      setCredits(0);
    } finally {
      setLoadingCredits(false);
    }
  }, [unlimitedExports]);

  useEffect(() => { refreshCredits(); }, [refreshCredits]);

  const canExport = unlimitedExports || credits > 0;
  const reason = unlimitedExports
    ? null
    : credits > 0
      ? null
      : plan === 'free'
        ? 'sin_creditos'   // mostrar paywall: comprar créditos o suscribirse
        : 'no_logueado';   // usuario anónimo: solo puede descargar zip/json, no PDF

  /**
   * Descuenta 1 crédito vía RPC (server-side, no confía en el cliente)
   * y actualiza el estado local. Devuelve false si no había créditos —
   * el llamador debe abortar la exportación en ese caso.
   */
  const consumeCreditIfNeeded = useCallback(async () => {
    if (unlimitedExports) return true;
    if (!supabase) return false;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase.rpc('consume_pdf_credit', { p_user_id: user.id });
    if (error || !data) return false;

    setCredits(c => Math.max(0, c - 1));
    return true;
  }, [unlimitedExports]);

  return {
    plan,
    canExport,
    reason,
    credits,
    unlimitedExports,
    loading: loadingPlan || loadingCredits,
    consumeCreditIfNeeded,
    refreshCredits,
  };
}
