import { persistenceEngine } from './persistenceEngine';

export const lifecycleEngine = {
  /**
   * Registers global event listeners to flush all data when the app is closing or hiding
   */
  registerUnloadHandlers: (getCurrentDocData: () => { docData: any; docType: string } | null) => {
    if (typeof window === 'undefined') return () => {};

    const handleFlush = () => {
      const current = getCurrentDocData();
      if (current && current.docData && current.docType) {
        persistenceEngine.flushAll(current.docData, current.docType);
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        handleFlush();
      }
    };

    window.addEventListener('beforeunload', handleFlush);
    window.addEventListener('pagehide', handleFlush);
    window.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('beforeunload', handleFlush);
      window.removeEventListener('pagehide', handleFlush);
      window.removeEventListener('visibilitychange', handleVisibility);
    };
  }
};
