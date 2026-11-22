import React from 'react';
import { Undo2, Redo2 } from 'lucide-react';
import { elevationSystem, radius } from '../uiDesignSystem';
import { useDocumentSessionOptional } from '../documents/session/DocumentSessionContext';

export interface UndoRedoControlsProps {
  className?: string;
  isMobile?: boolean;
  undo?: () => void;
  redo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

/**
 * Controles de Deshacer/Rehacer desacoplados de CVContext (cierra D14).
 * Consume props explícitas o, si no se pasan, la sesión genérica `DocumentSession`.
 */
export function UndoRedoControls({
  className = '',
  isMobile = false,
  undo: undoProp,
  redo: redoProp,
  canUndo: canUndoProp,
  canRedo: canRedoProp,
}: UndoRedoControlsProps) {
  const session = useDocumentSessionOptional();
  const undo = undoProp ?? session?.undo ?? (() => {});
  const redo = redoProp ?? session?.redo ?? (() => {});
  const canUndo = canUndoProp ?? session?.canUndo ?? false;
  const canRedo = canRedoProp ?? session?.canRedo ?? false;

  return (
    <div
      className={`flex items-center gap-1 bg-[var(--ui-bg-dock)] px-2 py-1 border border-[var(--ui-dock-border)] ${elevationSystem.raised} select-none ${className}`}
      style={{ borderRadius: radius.card }}
    >
      <button
        type="button"
        onClick={undo}
        disabled={!canUndo}
        className={`p-1 transition cursor-pointer active:scale-95 ${
          canUndo
            ? 'hover:bg-[var(--color-accent-base)] text-[var(--ui-dock-text)] hover:text-white'
            : 'opacity-30 text-[var(--ui-dock-text)] cursor-not-allowed'
        }`}
        style={{ borderRadius: radius.control }}
        title="Deshacer (Ctrl+Z)"
      >
        <Undo2 className={isMobile ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      </button>

      <button
        type="button"
        onClick={redo}
        disabled={!canRedo}
        className={`p-1 transition cursor-pointer active:scale-95 ${
          canRedo
            ? 'hover:bg-[var(--color-accent-base)] text-[var(--ui-dock-text)] hover:text-white'
            : 'opacity-30 text-[var(--ui-dock-text)] cursor-not-allowed'
        }`}
        style={{ borderRadius: radius.control }}
        title="Rehacer (Ctrl+Y)"
      >
        <Redo2 className={isMobile ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      </button>
    </div>
  );
}
