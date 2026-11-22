/**
 * Contexto y hook genérico de sesión de documento (`DocumentSession<T>`) — Fase 5.
 *
 * Reemplaza la dependencia del tronco hacia `CVContext`:
 * - Funciona para cualquier `docType` (CV, Carta, Tarjeta, Libro, Agenda, FacturLee, EditorLee).
 * - Provee pila de deshacer/rehacer acotada, tracking de `isDirty`, autoguardado Local-First
 *   con debounce y `saveNow()`.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { DocumentSaveStatus, DocumentSessionApi } from '../../../contracts/sessionContract';
import { AUTOSAVE_DEBOUNCE_MS } from '../documentEngine/documentHelpers';

const MAX_HISTORY = 40;

export interface UseDocumentSessionOptions<TData> {
  docId: string;
  docType: string;
  initialData: TData;
  deriveTitle: (data: TData) => string;
  onPersist: (data: TData, docId: string, docType: string) => Promise<boolean>;
  autosaveDebounceMs?: number;
  autosaveEnabled?: boolean;
}

export function useDocumentSession<TData>(
  options: UseDocumentSessionOptions<TData>
): DocumentSessionApi<TData> {
  const {
    docId,
    docType,
    initialData,
    deriveTitle,
    onPersist,
    autosaveDebounceMs = AUTOSAVE_DEBOUNCE_MS,
    autosaveEnabled = true,
  } = options;

  const [data, setData] = useState<TData>(initialData);
  const [past, setPast] = useState<TData[]>([]);
  const [future, setFuture] = useState<TData[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [revision, setRevision] = useState(1);
  const [saveStatus, setSaveStatus] = useState<DocumentSaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const dataRef = useRef(data);
  dataRef.current = data;

  const update = useCallback((updater: (prev: TData) => TData) => {
    setData((prev) => {
      const next = updater(prev);
      if (Object.is(next, prev)) return prev;
      setPast((p) => [...p.slice(-(MAX_HISTORY - 1)), prev]);
      setFuture([]);
      setIsDirty(true);
      return next;
    });
  }, []);

  const patch = useCallback(
    (partial: Partial<TData>) => {
      update((prev) => ({ ...(prev as Record<string, unknown>), ...(partial as Record<string, unknown>) }) as TData);
    },
    [update]
  );

  const replace = useCallback((next: TData, opts?: { markDirty?: boolean; resetHistory?: boolean }) => {
    setData(next);
    if (opts?.resetHistory !== false) {
      setPast([]);
      setFuture([]);
    }
    setIsDirty(Boolean(opts?.markDirty));
  }, []);

  const undo = useCallback(() => {
    setPast((prevPast) => {
      if (prevPast.length === 0) return prevPast;
      const previous = prevPast[prevPast.length - 1];
      setFuture((prevFuture) => [dataRef.current, ...prevFuture.slice(0, MAX_HISTORY - 1)]);
      setData(previous);
      setIsDirty(true);
      return prevPast.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setFuture((prevFuture) => {
      if (prevFuture.length === 0) return prevFuture;
      const next = prevFuture[0];
      setPast((prevPast) => [...prevPast.slice(-(MAX_HISTORY - 1)), dataRef.current]);
      setData(next);
      setIsDirty(true);
      return prevFuture.slice(1);
    });
  }, []);

  const saveNow = useCallback(async (): Promise<boolean> => {
    setSaveStatus('saving');
    try {
      const ok = await onPersist(dataRef.current, docId, docType);
      if (ok) {
        setIsDirty(false);
        setRevision((r) => r + 1);
        setSaveStatus('saved');
        setLastSavedAt(new Date().toISOString());
      } else {
        setSaveStatus('error');
      }
      return ok;
    } catch {
      setSaveStatus('error');
      return false;
    }
  }, [docId, docType, onPersist]);

  useEffect(() => {
    if (!autosaveEnabled || !isDirty) return;
    const timer = setTimeout(() => {
      void saveNow();
    }, autosaveDebounceMs);
    return () => clearTimeout(timer);
  }, [autosaveEnabled, isDirty, data, autosaveDebounceMs, saveNow]);

  const title = useMemo(() => deriveTitle(data), [data, deriveTitle]);

  return useMemo(
    () => ({
      docId,
      docType,
      data,
      title,
      revision,
      isDirty,
      saveStatus,
      canUndo: past.length > 0,
      canRedo: future.length > 0,
      lastSavedAt,
      update,
      patch,
      replace,
      undo,
      redo,
      saveNow,
    }),
    [
      docId,
      docType,
      data,
      title,
      revision,
      isDirty,
      saveStatus,
      past.length,
      future.length,
      lastSavedAt,
      update,
      patch,
      replace,
      undo,
      redo,
      saveNow,
    ]
  );
}

const DocumentSessionContext = createContext<DocumentSessionApi<any> | null>(null);

export const DocumentSessionProvider: React.FC<{
  session: DocumentSessionApi<any>;
  children: React.ReactNode;
}> = ({ session, children }) => (
  <DocumentSessionContext.Provider value={session}>{children}</DocumentSessionContext.Provider>
);

export function useDocumentSessionOptional<TData = any>(): DocumentSessionApi<TData> | null {
  return useContext(DocumentSessionContext) as DocumentSessionApi<TData> | null;
}

export function useDocumentSessionContext<TData = any>(): DocumentSessionApi<TData> {
  const ctx = useDocumentSessionOptional<TData>();
  if (!ctx) {
    throw new Error('useDocumentSessionContext debe usarse dentro de <DocumentSessionProvider>');
  }
  return ctx;
}
