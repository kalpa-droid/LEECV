import React from 'react';
import { Undo2, Redo2 } from 'lucide-react';
import { useCVContext } from '../../../context/CVContext';
import { elevationSystem, radius } from '../uiDesignSystem';

interface UndoRedoControlsProps {
  className?: string;
  isMobile?: boolean;
}

export function UndoRedoControls({ className = '', isMobile = false }: UndoRedoControlsProps) {
  const { undo, redo, canUndo, canRedo } = useCVContext();

  return (
    <div className={`flex items-center gap-1 bg-[var(--ui-bg-dock)] px-2 py-1 rounded-[${radius.card}] border border-[var(--ui-dock-border)] ${elevationSystem.raised} select-none ${className}`}>
      <button
        type="button"
        onClick={undo}
        disabled={!canUndo}
        className={`p-1 rounded-[${radius.control}] transition cursor-pointer active:scale-95 ${
          canUndo
            ? 'hover:bg-[var(--color-accent-base)] text-[var(--ui-dock-text)] hover:text-white'
            : 'opacity-30 text-[var(--ui-dock-text)] cursor-not-allowed'
        }`}
        title="Deshacer (Ctrl+Z)"
      >
        <Undo2 className={isMobile ? "w-3 h-3" : "w-3.5 h-3.5"} />
      </button>

      <button
        type="button"
        onClick={redo}
        disabled={!canRedo}
        className={`p-1 rounded-[${radius.control}] transition cursor-pointer active:scale-95 ${
          canRedo
            ? 'hover:bg-[var(--color-accent-base)] text-[var(--ui-dock-text)] hover:text-white'
            : 'opacity-30 text-[var(--ui-dock-text)] cursor-not-allowed'
        }`}
        title="Rehacer (Ctrl+Y)"
      >
        <Redo2 className={isMobile ? "w-3 h-3" : "w-3.5 h-3.5"} />
      </button>
    </div>
  );
}
