import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export function usePageAwareCreditGate() {
  const [isGating, setIsGating] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);

  const consumeCredits = async (pageCount: number = 1): Promise<boolean> => {
    setIsGating(true);
    setGateError(null);
    try {
      if (!supabase) {
        setGateError('No se pudo conectar con la base de datos.');
        setIsGating(false);
        return false;
      }

      const token = localStorage.getItem('leecv_export_token');
      if (!token) {
        setGateError('Necesitas pagar por la exportación.');
        setIsGating(false);
        return false;
      }

      // We just consume the single token we have, regardless of pageCount for now
      // since the guest checkout model pays per export.
      const { data, error } = await supabase.rpc('consume_export_token', { p_token: token });

      if (error || !data) {
        setGateError('El pago no es válido o ya fue consumido.');
        setIsGating(false);
        return false;
      }

      localStorage.removeItem('leecv_export_token');
      setIsGating(false);
      return true;
    } catch (err) {
      console.error('[usePageAwareCreditGate] Exception while verifying credits:', err);
      setGateError('Error validando el pago.');
      setIsGating(false);
      return false;
    }
  };

  return { consumeCredits, isGating, gateError, setGateError };
}
