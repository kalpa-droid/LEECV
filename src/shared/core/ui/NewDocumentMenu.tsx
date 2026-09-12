import React, { useState, useRef, useEffect } from 'react';
import { Plus, FileText, CreditCard, BookOpen } from 'lucide-react';
import { radius, elevationSystem } from '../uiDesignSystem';

export interface NewDocumentMenuProps {
  onSelectCV: () => void;
  onSelectCard: () => void;
  onSelectBook: () => void;
  className?: string;
}

export const NewDocumentMenu: React.FC<NewDocumentMenuProps> = ({
  onSelectCV,
  onSelectCard,
  onSelectBook,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`p-1.5 rounded-full bg-[var(--ui-bg-card)] border border-[var(--ui-border)] hover:bg-[var(--ui-bg-panel)] text-[var(--color-status-success-bright)] transition cursor-pointer active:scale-95 shrink-0 ${elevationSystem.raised}`}
        title="Crear Nuevo Documento (+)"
      >
        <Plus className="w-4 h-4 stroke-[3]" />
      </button>

      {isOpen && (
        <div className={`absolute left-0 bottom-full mb-2 w-56 rounded-[${radius.modal}] bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] text-[var(--ui-text-primary)] ${elevationSystem.floating} p-1.5 z-50 space-y-1 animate-fadeIn`}>
          <div className="px-2 py-1 text-[10px] font-black uppercase text-[var(--ui-text-secondary)] tracking-wider">
            ¿Qué querés crear?
          </div>

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onSelectCV();
            }}
            className="w-full text-left px-3 py-2 rounded-[10px] text-xs font-bold hover:bg-[var(--ui-btn-neutral-hover)] flex items-center gap-2.5 transition cursor-pointer group"
          >
            <div className={`p-1.5 rounded-[${radius.card}] bg-[var(--color-accent-purple-light)] text-[var(--color-accent-purple-text)] group-hover:scale-105 transition`}>
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <span className="block font-extrabold text-[var(--ui-text-primary)]">Nuevo Currículum Vitae</span>
              <span className="block text-[10px] text-[var(--ui-text-secondary)]">Formato A4 o Bolsillo</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onSelectCard();
            }}
            className="w-full text-left px-3 py-2 rounded-[10px] text-xs font-bold hover:bg-[var(--ui-btn-neutral-hover)] flex items-center gap-2.5 transition cursor-pointer group"
          >
            <div className={`p-1.5 rounded-[${radius.card}] bg-[var(--color-secondary-muted)] text-[var(--color-secondary-bright)] group-hover:scale-105 transition`}>
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <span className="block font-extrabold text-[var(--ui-text-primary)]">Nueva Tarjeta Personal</span>
              <span className="block text-[10px] text-[var(--ui-text-secondary)]">Formato 9 x 5 cm</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onSelectBook();
            }}
            className="w-full text-left px-3 py-2 rounded-[10px] text-xs font-bold hover:bg-[var(--ui-btn-neutral-hover)] flex items-center gap-2.5 transition cursor-pointer group"
          >
            <div className={`p-1.5 rounded-[${radius.card}] bg-[var(--color-status-warning-muted)] text-[var(--color-status-warning-text)] group-hover:scale-105 transition`}>
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <span className="block font-extrabold text-[var(--ui-text-primary)]">Nuevo Libro / Folleto</span>
              <span className="block text-[10px] text-[var(--ui-text-secondary)]">Montaje A4 / A3</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};
