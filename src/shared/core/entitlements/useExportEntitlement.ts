import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../auth/AuthContext';

export function useExportEntitlement(docType?: string) {
  const { profile, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [canExport, setCanExport] = useState(false);
  const [reason, setReason] = useState<string | null>('sin_creditos');
  const [credits, setCredits] = useState(0);

  const checkEntitlement = useCallback(async () => {
    setLoading(true);
    try {
      if (user) {
        const exportAccessMode = profile?.pdf_export_access_mode || 'automatic';
        if (exportAccessMode === 'disabled') {
          setCanExport(false);
          setReason('exportacion_bloqueada');
          setCredits(0);
          return;
        }

        if (exportAccessMode === 'enabled') {
          setCanExport(true);
          setReason(null);
          setCredits(0);
          return;
        }

        if (profile?.plan === 'pro' || profile?.plan === 'pass_30d') {
          const planVence = profile.plan_vence ? new Date(profile.plan_vence) : null;
          const planVigente = !planVence || planVence > new Date();
          if (planVigente) {
            setCanExport(true);
            setReason(null);
            setCredits(999);
            return;
          }
          // Plan vencido: continuar verificando si posee pases permanentes o créditos sueltos.
        }

        if (docType && supabase) {
          const { data: appPasses } = await supabase
            .from('user_app_passes')
            .select('id, is_permanent, expires_at, revoked_at')
            .eq('user_id', user.id)
            .eq('doc_type', docType)
            .is('revoked_at', null);

          const nowMs = Date.now();
          const hasAppPass = Array.isArray(appPasses) && appPasses.some(
            (p: any) => p.is_permanent || !p.expires_at || new Date(p.expires_at).getTime() > nowMs
          );
          if (hasAppPass) {
            setCanExport(true);
            setReason(null);
            setCredits(999);
            return;
          }
        }
        
        // Count unconsumed paid tokens: por user_id directo O por email cuando
        // el token se creó como invitado (user_id null) y claimCreditsOnAuth
        // todavía no lo vinculó.
        const userEmail = user.email ? user.email.trim().toLowerCase() : '';
        const orFilter = userEmail
          ? `user_id.eq.${user.id},and(user_id.is.null,email.eq.${userEmail})`
          : `user_id.eq.${user.id}`;

        const { count } = await supabase
          .from('pdf_export_tokens')
          .select('*', { count: 'exact', head: true })
          .eq('paid', true)
          .eq('consumed', false)
          .or(orFilter);
          
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
  }, [user, profile, docType]);

  useEffect(() => {
    checkEntitlement();
  }, [checkEntitlement]);

  const consumeEntitlementIfNeeded = useCallback(async (docTypeOverride?: string) => {
    if (!supabase) return false;

    const effectiveDocType = docTypeOverride || docType;

    if (user) {
      const rpcParams: { p_user_id: string; p_doc_type?: string } = { p_user_id: user.id };
      if (effectiveDocType) rpcParams.p_doc_type = effectiveDocType;
      const { data, error } = await supabase.rpc('check_and_consume_export_entitlement', rpcParams);
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
