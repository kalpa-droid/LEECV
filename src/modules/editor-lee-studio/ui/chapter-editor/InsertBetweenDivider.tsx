import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { EditorialRecordType } from '../../domain/editorialTypes';
import { radius } from '../../../../shared/core/uiDesignSystem';

export interface InsertBetweenDividerProps {
  index: number;
  onInsertAt: (index: number, type: EditorialRecordType) => void;
  alwaysVisible?: boolean;
}

const QUICK_INSERT_OPTIONS: Array<{ type: EditorialRecordType; label: string }> = [
  { type: 'paragraph', label: 'Párrafo' },
  { type: 'subtitle', label: 'Subtítulo' },
  { type: 'image', label: 'Imagen' },
  { type: 'table', label: 'Tabla' },
  { type: 'quote', label: 'Cita' },
  { type: 'list', label: 'Lista' },
  { type: 'callout', label: 'Recuadro' },
  { type: 'poem', label: 'Poema' },
  { type: 'epigraph', label: 'Epígrafe' },
  { type: 'figure_placeholder', label: 'Figura' },
];

export const InsertBetweenDivider: React.FC<InsertBetweenDividerProps> = ({
  index,
  onInsertAt,
  alwaysVisible = false,
}) => {
  const [open, setOpen] = useState(false);

  if (open) {
    return (
      <div
        className="my-1.5 p-2 border border-[var(--color-accent-base)]/50 bg-[var(--ui-bg-card)] space-y-1.5"
        style={{ borderRadius: radius.control }}
      >
        <div className="flex items-center justify-between text-[11px] font-bold text-[var(--color-accent-text)]">
          <span>Insertar en esta posición</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú de inserción"
            className="p-0.5 text-[var(--ui-text-secondary)] hover:text-[var(--ui-text-primary)] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_INSERT_OPTIONS.map((opt) => (
            <button
              key={opt.type}
              type="button"
              onClick={() => {
                onInsertAt(index, opt.type);
                setOpen(false);
              }}
              className="px-2 py-1 text-[11px] font-bold border border-[var(--ui-border)] bg-[var(--ui-bg-panel)] hover:border-[var(--color-accent-base)] text-[var(--ui-text-primary)] cursor-pointer"
              style={{ borderRadius: radius.control }}
            >
              + {opt.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group relative h-4 flex items-center justify-center transition-opacity ${
        alwaysVisible ? 'opacity-90' : 'opacity-25 hover:opacity-100 focus-within:opacity-100'
      }`}
    >
      <div className="absolute inset-x-2 h-px bg-[var(--ui-border)] group-hover:bg-[var(--color-accent-base)]/50" />
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Insertar bloque aquí"
        title="Insertar párrafo, imagen, tabla o subtítulo aquí"
        className="relative z-10 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold border border-[var(--ui-border)] bg-[var(--ui-bg-panel)] text-[var(--ui-text-secondary)] hover:text-[var(--color-accent-text)] hover:border-[var(--color-accent-base)] rounded-full cursor-pointer"
      >
        <Plus className="w-3 h-3" />
        <span className={alwaysVisible ? 'inline' : 'hidden group-hover:inline'}>Insertar aquí</span>
      </button>
    </div>
  );
};
