import { useCallback, useEffect, useRef, useState } from 'react';

export interface HistoryStackEntry<T> {
  stack: T[];
  index: number;
  lastPushTs: number;
}

export interface HistoryStoreConfig {
  maxEntries?: number;
  coalesceMs?: number;
}

/**
 * Almacén puro de historial por documento con coalescing para escritura continua
 * y migración de IDs (borrador temporal -> ID persistido en base local/nube).
 */
export class StudioHistoryStore<T> {
  private map = new Map<string, HistoryStackEntry<T>>();

  has(docId: string): boolean {
    return this.map.has(docId);
  }

  seed(docId: string, state: T): void {
    this.map.set(docId, { stack: [state], index: 0, lastPushTs: 0 });
  }

  record(
    docId: string,
    state: T,
    opts: HistoryStoreConfig & { forceBoundary?: boolean; now?: number } = {},
  ): boolean {
    const maxEntries = opts.maxEntries ?? 50;
    const coalesceMs = opts.coalesceMs ?? 800;
    const now = opts.now ?? Date.now();

    let entry = this.map.get(docId);
    if (!entry) {
      this.seed(docId, state);
      return false;
    }

    const current = entry.stack[entry.index];
    if (Object.is(current, state)) return false;

    const withinCoalesceWindow =
      !opts.forceBoundary &&
      entry.lastPushTs > 0 &&
      entry.index > 0 &&
      entry.index === entry.stack.length - 1 &&
      now - entry.lastPushTs <= coalesceMs;

    if (withinCoalesceWindow) {
      entry.stack[entry.index] = state;
      entry.lastPushTs = now;
      return true;
    }

    const nextStack = entry.stack.slice(0, entry.index + 1);
    nextStack.push(state);
    if (nextStack.length > maxEntries) {
      nextStack.shift();
    }
    entry.stack = nextStack;
    entry.index = nextStack.length - 1;
    entry.lastPushTs = now;
    return true;
  }

  undo(docId: string): T | undefined {
    const entry = this.map.get(docId);
    if (!entry || entry.index <= 0) return undefined;
    entry.index -= 1;
    entry.lastPushTs = 0;
    return entry.stack[entry.index];
  }

  redo(docId: string): T | undefined {
    const entry = this.map.get(docId);
    if (!entry || entry.index >= entry.stack.length - 1) return undefined;
    entry.index += 1;
    entry.lastPushTs = 0;
    return entry.stack[entry.index];
  }

  canUndo(docId: string): boolean {
    const entry = this.map.get(docId);
    return Boolean(entry && entry.index > 0);
  }

  canRedo(docId: string): boolean {
    const entry = this.map.get(docId);
    return Boolean(entry && entry.index < entry.stack.length - 1);
  }

  migrateDocId(oldId: string, newId: string, latestState?: T): void {
    if (!oldId || !newId || oldId === newId) return;
    const existing = this.map.get(oldId);
    if (!existing) {
      if (latestState !== undefined) this.seed(newId, latestState);
      return;
    }
    const nextStack = [...existing.stack];
    if (latestState !== undefined && nextStack.length > 0) {
      nextStack[existing.index] = latestState;
    }
    this.map.set(newId, {
      stack: nextStack,
      index: existing.index,
      lastPushTs: 0,
    });
    this.map.delete(oldId);
  }
}

export interface UseStudioHistoryOptions<T> {
  docId: string;
  state: T;
  applyState: (snapshot: T) => void;
  isHydrating?: boolean;
  isActive?: boolean;
  maxEntries?: number;
  coalesceMs?: number;
  enableKeyboardShortcuts?: boolean;
}

export interface UseStudioHistoryResult<T> {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  commitBoundary: () => void;
  resetSeed: (seedState: T) => void;
  migrateDocId: (oldId: string, newId: string, latestState?: T) => void;
}

export function useStudioHistory<T>({
  docId,
  state,
  applyState,
  isHydrating = false,
  isActive = true,
  maxEntries = 50,
  coalesceMs = 800,
  enableKeyboardShortcuts = true,
}: UseStudioHistoryOptions<T>): UseStudioHistoryResult<T> {
  const storeRef = useRef<StudioHistoryStore<T>>(new StudioHistoryStore<T>());
  const applyStateRef = useRef(applyState);
  applyStateRef.current = applyState;

  const isApplyingRef = useRef(false);
  const forceBoundaryRef = useRef(false);
  const pendingResetSeedRef = useRef(false);
  const prevStateRef = useRef<T>(state);
  const prevDocIdRef = useRef<string>(docId);
  const [, setTick] = useState(0);

  if (!storeRef.current.has(docId)) {
    storeRef.current.seed(docId, state);
  }

  useEffect(() => {
    const store = storeRef.current;

    if (pendingResetSeedRef.current) {
      pendingResetSeedRef.current = false;
      prevDocIdRef.current = docId;
      prevStateRef.current = state;
      store.seed(docId, state);
      setTick((t) => t + 1);
      return;
    }

    if (prevDocIdRef.current !== docId) {
      prevDocIdRef.current = docId;
      prevStateRef.current = state;
      if (!store.has(docId) || isHydrating) {
        store.seed(docId, state);
      }
      setTick((t) => t + 1);
      return;
    }

    if (isHydrating) {
      prevStateRef.current = state;
      store.seed(docId, state);
      setTick((t) => t + 1);
      return;
    }

    if (isApplyingRef.current) {
      isApplyingRef.current = false;
      prevStateRef.current = state;
      setTick((t) => t + 1);
      return;
    }

    if (Object.is(state, prevStateRef.current)) return;
    prevStateRef.current = state;

    const changed = store.record(docId, state, {
      forceBoundary: forceBoundaryRef.current,
      maxEntries,
      coalesceMs,
    });
    forceBoundaryRef.current = false;
    if (changed) {
      setTick((t) => t + 1);
    }
  }, [docId, state, isHydrating, maxEntries, coalesceMs]);

  const undo = useCallback(() => {
    const snap = storeRef.current.undo(docId);
    if (snap === undefined) return;
    isApplyingRef.current = true;
    applyStateRef.current(snap);
    setTick((t) => t + 1);
  }, [docId]);

  const redo = useCallback(() => {
    const snap = storeRef.current.redo(docId);
    if (snap === undefined) return;
    isApplyingRef.current = true;
    applyStateRef.current(snap);
    setTick((t) => t + 1);
  }, [docId]);

  const commitBoundary = useCallback(() => {
    forceBoundaryRef.current = true;
  }, []);

  const resetSeed = useCallback(
    (seedState: T) => {
      pendingResetSeedRef.current = true;
      prevStateRef.current = seedState;
      storeRef.current.seed(docId, seedState);
      setTick((t) => t + 1);
    },
    [docId],
  );

  const migrateDocId = useCallback((oldId: string, newId: string, latestState?: T) => {
    storeRef.current.migrateDocId(oldId, newId, latestState);
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!isActive || !enableKeyboardShortcuts || typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditingText =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);
      if (isEditingText) return;

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (!isCtrlOrCmd) return;

      const key = e.key.toLowerCase();
      if (key === 'z') {
        if (e.shiftKey) {
          if (storeRef.current.canRedo(docId)) {
            e.preventDefault();
            redo();
          }
        } else if (storeRef.current.canUndo(docId)) {
          e.preventDefault();
          undo();
        }
      } else if (key === 'y') {
        if (storeRef.current.canRedo(docId)) {
          e.preventDefault();
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [docId, isActive, enableKeyboardShortcuts, undo, redo]);

  return {
    undo,
    redo,
    canUndo: storeRef.current.canUndo(docId),
    canRedo: storeRef.current.canRedo(docId),
    commitBoundary,
    resetSeed,
    migrateDocId,
  };
}
