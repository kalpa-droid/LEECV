/**
 * Contratos puros de sesión de documento (`DocumentSession`) para StudioHost.
 * 0 dependencias de React o de CVContext.
 */

export type DocumentSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface DocumentSessionState<TData = unknown> {
  readonly docId: string;
  readonly docType: string;
  readonly data: TData;
  readonly title: string;
  readonly revision: number;
  readonly isDirty: boolean;
  readonly saveStatus: DocumentSaveStatus;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly lastSavedAt: string | null;
}

export interface DocumentSessionApi<TData = unknown> extends DocumentSessionState<TData> {
  readonly update: (updater: (prev: TData) => TData) => void;
  readonly patch: (partial: Partial<TData>) => void;
  readonly replace: (next: TData, opts?: { markDirty?: boolean; resetHistory?: boolean }) => void;
  readonly undo: () => void;
  readonly redo: () => void;
  readonly saveNow: () => Promise<boolean>;
}
