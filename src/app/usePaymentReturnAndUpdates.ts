import { useEffect, useRef, useState } from 'react';
import { initUpdateEngine, onUpdateReady } from '../shared/core/pwa/updateEngine';
import { navigation } from '../shared/core/utils/navigation';
import { procesarRetornoPago } from '../shared/core/payments/paymentService';
import { claimCreditsOnAuth } from '../shared/core/auth/authService';
import { useAuth } from '../shared/core/auth/AuthContext';
import { useEntitlements } from '../shared/core/entitlements/useEntitlements';
import { useToast } from '../shared/core/ui/Toast';

interface UsePaymentReturnAndUpdatesArgs {
  isSaving: boolean;
  hasPendingChanges: boolean;
}

export function usePaymentReturnAndUpdates({
  isSaving,
  hasPendingChanges,
}: UsePaymentReturnAndUpdatesArgs) {
  const [updateBannerVisible, setUpdateBannerVisible] = useState(false);
  const { refreshEntitlements } = useEntitlements();
  const { user, isLoading: authLoading } = useAuth();
  const { showSuccess, showError } = useToast();

  // Refs espejo para el retorno de pago tras hidratación de sesión.
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const authLoadingRef = useRef(authLoading);
  useEffect(() => {
    authLoadingRef.current = authLoading;
  }, [authLoading]);

  useEffect(() => {
    initUpdateEngine();
    onUpdateReady(() => setUpdateBannerVisible(true));
  }, []);

  useEffect(() => {
    if (!updateBannerVisible) return;
    const timer = setTimeout(() => {
      if (!isSaving && !hasPendingChanges) {
        navigation.reload();
      }
    }, 5 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [updateBannerVisible, isSaving, hasPendingChanges]);

  useEffect(() => {
    import('../shared/core/pdf-engine/layers/presets/presetStorageService')
      .then((m) => m.syncPresetsFromStorage())
      .catch((err) => console.warn('Error sincronizando presets iniciales:', err));

    const esperarSesionHidratada = async () => {
      for (let i = 0; i < 15 && authLoadingRef.current; i++) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    };

    let cancelled = false;

    const procesar = async () => {
      const res = await procesarRetornoPago();
      if (!res || cancelled) return;
      if (res.status === 'paypal_captured') {
        showSuccess('¡Pago procesado con éxito vía PayPal! Tus créditos han sido activados.');
      } else if (res.status === 'payment_success') {
        showSuccess('¡Pago confirmado! Tu cuenta ha sido actualizada.');
      }

      await esperarSesionHidratada();
      if (cancelled) return;
      for (let intento = 0; intento < 3; intento++) {
        if (intento > 0) await new Promise((resolve) => setTimeout(resolve, 2000));
        if (cancelled) return;
        const currentUser = userRef.current;
        if (currentUser) await claimCreditsOnAuth(currentUser);
        await refreshEntitlements();
      }

      navigation.cleanQueryParams();
    };

    procesar().catch((err) => {
      if (!cancelled) {
        showError(err?.message || 'Inconveniente al procesar el retorno del pago.');
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    updateBannerVisible,
    setUpdateBannerVisible,
  };
}
