type UpdateListener = () => void;
type BeforeReloadFlush = () => Promise<void> | void;

const listeners: UpdateListener[] = [];
const flushers = new Set<BeforeReloadFlush>();
let updateReady = false;
let waitingWorker: ServiceWorker | null = null;
let userConfirmedReload = false;

export function registerBeforeReloadFlush(fn: BeforeReloadFlush): () => void {
  flushers.add(fn);
  return () => {
    flushers.delete(fn);
  };
}

export async function runAllBeforeReloadFlushes(): Promise<void> {
  const tasks = Array.from(flushers).map(async (fn) => {
    try {
      await fn();
    } catch {
      // No bloquear otros flushers si uno falla
    }
  });
  await Promise.all(tasks);
}

export async function applyPendingUpdate(): Promise<void> {
  userConfirmedReload = true;
  await runAllBeforeReloadFlushes();
  if (waitingWorker) {
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    return;
  }
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
}

export function initUpdateEngine() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then((reg) => {
    if (reg.waiting && navigator.serviceWorker.controller) {
      waitingWorker = reg.waiting;
      updateReady = true;
      listeners.forEach((fn) => fn());
    }

    reg.update().catch(() => {});

    // Periodic check every 10 minutes
    setInterval(() => reg.update().catch(() => {}), 10 * 60 * 1000);

    // Check when user returns to tab
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update().catch(() => {});
    });

    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      newWorker?.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          waitingWorker = newWorker;
          updateReady = true;
          listeners.forEach((fn) => fn());
        }
      });
    });
  }).catch((err) => {
    console.warn('Registro de Service Worker omitido o fallido:', err);
  });

  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!userConfirmedReload || reloaded) return;
    reloaded = true;
    window.location.reload();
  });
}

export function isUpdateReady() {
  return updateReady;
}

export function onUpdateReady(fn: UpdateListener) {
  listeners.push(fn);
  if (updateReady) {
    fn();
  }
}
