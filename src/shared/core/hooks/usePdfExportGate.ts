import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export function usePdfExportGate() {
  const [isGating, setIsGating] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);

  const consumeCredits = async (pageCount: number = 1): Promise<boolean> => {
    setIsGating(true);
    setGateError(null);
    try {
      if (!supabase) {
        setIsGating(false);
        return true;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsGating(false);
        return true;
      }

      const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single();
      if (profile?.plan === 'pro' || profile?.plan === 'enterprise') {
        setIsGating(false);
        return true;
      }

      const { data: remainingCredits, error } = await supabase.rpc('consume_pdf_credits_for_pages', {
        p_user_id: user.id,
        p_page_count: pageCount,
      });

      if (error) {
        const { data: fallbackRemaining, error: fallbackError } = await supabase.rpc('consume_pdf_credit', {
          user_id: user.id,
        });

        if (fallbackError) {
          console.warn('[usePdfExportGate] Credit RPC warning:', fallbackError.message);
          setIsGating(false);
          return true;
        }

        if (fallbackRemaining === null || fallbackRemaining === undefined) {
          setGateError('No tenés suficientes créditos para exportar el documento. Por favor adquiere créditos o pasa al plan PRO.');
          setIsGating(false);
          return false;
        }
      } else if (remainingCredits === null) {
        const creditsNeeded = Math.ceil(pageCount / 10);
        setGateError(`Necesitás ${creditsNeeded} crédito(s) para exportar este documento (${pageCount} páginas). Adquiere créditos o pasa a PRO.`);
        setIsGating(false);
        return false;
      }

      setIsGating(false);
      return true;
    } catch (err) {
      console.error('[usePdfExportGate] Exception while verifying credits:', err);
      setIsGating(false);
      return true;
    }
  };

  return { consumeCredits, isGating, gateError, setGateError };
}
