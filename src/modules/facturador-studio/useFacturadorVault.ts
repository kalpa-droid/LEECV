import { useCallback, useEffect, useRef, useState } from 'react';
import { FacturadorVaultData, VaultSession } from './domain/facturadorTypes';
import {
  DEFAULT_VAULT_ID,
  loadEnvelope,
  saveEnvelope,
} from './domain/vaultStorage';
import { EMPTY_FACTURADOR_VAULT } from './domain/facturadorDefaults';
import {
  addRecoveryKey,
  createVault,
  rewrapWithNewPassword,
  sealVaultPayload,
  unlockWithPassword,
  unlockWithRecoveryKey,
} from './domain/vaultCrypto';
import { VaultEnvelope } from './domain/facturadorTypes';

export type FacturadorVaultPhase = 'loading' | 'needs_setup' | 'locked' | 'unlocked';

const IDLE_LOCK_MS = 15 * 60 * 1000;
const SAVE_DEBOUNCE_MS = 700;

/**
 * Estado de la bóveda cifrada de FacturLee.
 *
 * - La contraseña nunca se guarda: solo se usa para derivar la clave (PBKDF2).
 * - Cada cambio se re-cifra con la DEK de la sesión y se persiste en IndexedDB.
 * - A los 15 minutos sin actividad la sesión se bloquea sola (pero guarda antes).
 */
export function useFacturadorVault(vaultId: string = DEFAULT_VAULT_ID) {
  const [phase, setPhase] = useState<FacturadorVaultPhase>('loading');
  const [vault, setVault] = useState<FacturadorVaultData | null>(null);
  const [session, setSession] = useState<VaultSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chainRef = useRef<Promise<void>>(Promise.resolve());
  const latestRef = useRef<FacturadorVaultData | null>(null);
  const sessionRef = useRef<VaultSession | null>(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    latestRef.current = vault;
  }, [vault]);

  const refresh = useCallback(async () => {
    const envelope = await loadEnvelope(vaultId);
    setPhase(envelope ? 'locked' : 'needs_setup');
  }, [vaultId]);

  useEffect(() => {
    let cancelled = false;
    loadEnvelope(vaultId)
      .then((envelope) => {
        if (!cancelled) setPhase(envelope ? 'locked' : 'needs_setup');
      })
      .catch(() => {
        if (!cancelled) setPhase('needs_setup');
      });
    return () => {
      cancelled = true;
    };
  }, [vaultId]);

  const applyUnlocked = useCallback((result: { data: FacturadorVaultData; session: VaultSession }) => {
    latestRef.current = result.data;
    sessionRef.current = result.session;
    setVault(result.data);
    setSession(result.session);
    setPhase('unlocked');
    setError(null);
  }, []);

  const createWithPassword = useCallback(
    async (password: string, withRecoveryKey: boolean) => {
      setIsBusy(true);
      setError(null);
      try {
        const data = latestRef.current || EMPTY_FACTURADOR_VAULT;
        const result = await createVault({ vaultId, data, password, withRecoveryKey });
        await saveEnvelope(result.envelope);
        applyUnlocked({ data, session: result.session });
        return result.recoveryKey;
      } catch (err: any) {
        setError(err?.message || 'no_se_pudo_crear');
        throw err;
      } finally {
        setIsBusy(false);
      }
    },
    [applyUnlocked, vaultId]
  );

  const unlock = useCallback(
    async (password: string) => {
      setIsBusy(true);
      setError(null);
      try {
        const envelope = await loadEnvelope(vaultId);
        if (!envelope) throw new Error('boveda_inexistente');
        applyUnlocked(await unlockWithPassword(envelope, password));
      } catch (err: any) {
        setError(err?.message === 'clave_incorrecta' ? 'clave_incorrecta' : 'no_se_pudo_abrir');
      } finally {
        setIsBusy(false);
      }
    },
    [applyUnlocked, vaultId]
  );

  const unlockRecovery = useCallback(
    async (recoveryKey: string) => {
      setIsBusy(true);
      setError(null);
      try {
        const envelope = await loadEnvelope(vaultId);
        if (!envelope) throw new Error('boveda_inexistente');
        applyUnlocked(await unlockWithRecoveryKey(envelope, recoveryKey));
      } catch (err: any) {
        setError(err?.message === 'llave_invalida' ? 'llave_invalida' : 'no_se_pudo_abrir');
      } finally {
        setIsBusy(false);
      }
    },
    [applyUnlocked, vaultId]
  );

  const enqueueSave = useCallback((data: FacturadorVaultData) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const currentSession = sessionRef.current;
      if (!currentSession) return;
      chainRef.current = chainRef.current
        .then(async () => {
          const envelope = await sealVaultPayload(currentSession, data);
          await saveEnvelope(envelope);
        })
        .catch(() => {
          // Un fallo de guardado no debe romper la edición: el próximo cambio reintenta.
        });
    }, SAVE_DEBOUNCE_MS);
  }, []);

  /** Actualiza la bóveda en memoria y agenda el cifrado + guardado. */
  const updateVault = useCallback(
    (updater: (prev: FacturadorVaultData) => FacturadorVaultData) => {
      setVault((prev) => {
        if (!prev) return prev;
        const next = { ...updater(prev), updatedAt: new Date().toISOString() };
        latestRef.current = next;
        enqueueSave(next);
        return next;
      });
    },
    [enqueueSave]
  );

  const flush = useCallback(async () => {
    const hasPending = Boolean(timerRef.current);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const currentSession = sessionRef.current;
    const pendingData = latestRef.current;
    if (hasPending && currentSession && pendingData) {
      chainRef.current = chainRef.current
        .then(async () => {
          const envelope = await sealVaultPayload(currentSession, pendingData);
          await saveEnvelope(envelope);
        })
        .catch(() => {
          // El próximo guardado reintentará
        });
    }
    await chainRef.current;
  }, []);

  const lock = useCallback(async () => {
    await flush();
    sessionRef.current = null;
    setSession(null);
    setVault(null);
    setPhase((prev) => (prev === 'unlocked' ? 'locked' : prev));
  }, [flush]);

  const regenerateRecoveryKey = useCallback(async () => {
    const currentSession = sessionRef.current;
    if (!currentSession) throw new Error('sesion_bloqueada');
    const { envelope, recoveryKey } = await addRecoveryKey(currentSession);
    await saveEnvelope(envelope);
    setSession({ ...currentSession, envelope });
    return recoveryKey;
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const currentSession = sessionRef.current;
    if (!currentSession) throw new Error('sesion_bloqueada');
    const envelope = await rewrapWithNewPassword(currentSession, currentPassword, newPassword);
    await saveEnvelope(envelope);
    setSession({ ...currentSession, envelope });
  }, []);

  /** Restaura una copia portátil: abre el sobre con su contraseña y lo vuelve la bóveda activa. */
  const restoreFromEnvelope = useCallback(
    async (envelope: VaultEnvelope, password: string) => {
      const result = await unlockWithPassword(envelope, password);
      await saveEnvelope(envelope);
      applyUnlocked(result);
    },
    [applyUnlocked]
  );

  // Bloqueo automático por inactividad: guarda y cierra la sesión.
  useEffect(() => {
    if (phase !== 'unlocked') return;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    const reset = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        void lock();
      }, IDLE_LOCK_MS);
    };
    const events: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'wheel'];
    events.forEach((evt) => window.addEventListener(evt, reset, { passive: true }));
    reset();
    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      events.forEach((evt) => window.removeEventListener(evt, reset));
    };
  }, [phase, lock]);

  return {
    phase,
    vault,
    session,
    error,
    isBusy,
    refresh,
    createWithPassword,
    unlock,
    unlockRecovery,
    updateVault,
    flush,
    lock,
    regenerateRecoveryKey,
    changePassword,
    restoreFromEnvelope,
  };
}
