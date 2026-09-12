type UpdateListener = () => void;
const listeners: UpdateListener[] = [];
let updateReady = false;

export function initUpdateEngine() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then((reg) => {
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
    if (reloaded) return;
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
