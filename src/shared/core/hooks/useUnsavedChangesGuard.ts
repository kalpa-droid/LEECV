import { useEffect, useRef } from 'react';
import { registerBeforeReloadFlush } from '../pwa/updateEngine';

export interface UseUnsavedChangesGuardOptions {
  isDirty: boolean;
  onFlush?: () => Promise<void> | void;
  warningMessage?: string;
}

/**
 * Protege cualquier estudio standalone contra cierres accidentales de pestaña (`beforeunload`)
 * y registra el flusher de guardado antes de aplicar actualizaciones del Service Worker.
 */
export function useUnsavedChangesGuard({
  isDirty,
  onFlush,
  warningMessage = 'Tenés cambios recientes sin guardar. ¿Seguro que querés salir?',
}: UseUnsavedChangesGuardOptions): void {
  const flushRef = useRef(onFlush);
  flushRef.current = onFlush;

  useEffect(() => {
    const unregister = registerBeforeReloadFlush(async () => {
      if (flushRef.current) {
        await flushRef.current();
      }
    });
    return unregister;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !isDirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = warningMessage;
      return warningMessage;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty, warningMessage]);
}

export default useUnsavedChangesGuard;
