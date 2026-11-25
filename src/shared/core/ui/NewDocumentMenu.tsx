import React, { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { DomSectionIcon } from '../pdf-engine/layers/icons/DomSectionIcon';
import { radius, elevationSystem } from '../uiDesignSystem';
import {
  ALL_DOCUMENT_TYPE_IDS,
  DOCUMENT_TYPE_REGISTRY,
} from '../capabilities/capabilityRegistry';
import { APP_SURFACE_MANIFEST } from '../capabilities/appSurfaceManifest';
import type { MenuBadgeTone } from '../../contracts/appContract';
import type { DocumentTypeId } from '../../../types/document';

export interface NewDocumentMenuProps {
  onSelectDocument?: (docType: DocumentTypeId) => void;
  onSelectCV?: () => void;
  onSelectCard?: () => void;
  onSelectBook?: () => void;
  onSelectCoverLetter?: () => void;
  onSelectPlanner?: () => void;
  onSelectInvoice?: () => void;
  onSelectEditorial?: () => void;
  className?: string;
}

const BADGE_TONE_CLASSES: Record<MenuBadgeTone, string> = {
  purple: 'bg-[var(--color-accent-purple-light)] text-[var(--color-accent-purple-text)]',
  secondary: 'bg-[var(--color-secondary-muted)] text-[var(--color-secondary-bright)]',
  warning: 'bg-[var(--color-status-warning-muted)] text-[var(--color-status-warning-text)]',
  accent: 'bg-[var(--color-accent-muted)] text-[var(--color-accent-text)]',
  green: 'bg-[var(--color-accent-green-light)] text-[var(--color-accent-green-text)]',
  success: 'bg-[var(--color-status-success-muted)] text-[var(--color-status-success-text)]',
};

export const NewDocumentMenu: React.FC<NewDocumentMenuProps> = ({
  onSelectDocument,
  onSelectCV,
  onSelectCard,
  onSelectBook,
  onSelectCoverLetter,
  onSelectPlanner,
  onSelectInvoice,
  onSelectEditorial,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
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

  const handleToggle = () => {
    if (!isOpen && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const spaceRight = window.innerWidth - rect.left;
      setAlignRight(spaceRight < 270);
    }
    setIsOpen(!isOpen);
  };

  const legacyHandlers: Partial<Record<string, (() => void) | undefined>> = {
    cv: onSelectCV,
    business_card: onSelectCard,
    book: onSelectBook,
    cover_letter: onSelectCoverLetter,
    planner: onSelectPlanner,
    invoice: onSelectInvoice,
    editorial: onSelectEditorial,
  };

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        type="button"
        onClick={handleToggle}
        className={`p-1.5 rounded-full bg-[var(--ui-bg-card)] border border-[var(--ui-border)] hover:bg-[var(--ui-bg-panel)] text-[var(--color-status-success-bright)] transition cursor-pointer active:scale-95 shrink-0 ${elevationSystem.raised}`}
        title="Crear Nuevo Documento (+)"
      >
        <Plus className="w-4 h-4 stroke-[3]" />
      </button>

      {isOpen && (
        <div
          style={{ borderRadius: radius.modal }}
          className={`absolute ${alignRight ? 'right-0' : 'left-0'} bottom-full mb-2 w-[calc(100vw-2rem)] max-w-64 bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] text-[var(--ui-text-primary)] ${elevationSystem.floating} p-1.5 z-50 space-y-1 animate-fadeIn`}
        >
          <div className="px-2 py-1 text-[10px] font-black uppercase text-[var(--ui-text-secondary)] tracking-wider">
            ¿Qué querés crear?
          </div>

          {ALL_DOCUMENT_TYPE_IDS.filter(
            (docType) => APP_SURFACE_MANIFEST[docType]?.features.showInNewDocumentMenu !== false,
          ).map((docType) => {
            const action = legacyHandlers[docType] || (onSelectDocument ? () => onSelectDocument(docType) : undefined);
            if (!action) return null;
            const { ui } = DOCUMENT_TYPE_REGISTRY[docType];
            const badgeClass = BADGE_TONE_CLASSES[ui.menuBadgeTone] || BADGE_TONE_CLASSES.accent;

            return (
              <button
                key={docType}
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  action();
                }}
                className="w-full text-left px-3 py-2 rounded-[10px] text-xs font-bold hover:bg-[var(--ui-btn-neutral-hover)] flex items-center gap-2.5 transition cursor-pointer group"
              >
                <div
                  style={{ borderRadius: radius.card }}
                  className={`p-1.5 group-hover:scale-105 transition ${badgeClass}`}
                >
                  <DomSectionIcon iconId={ui.productIconId} className="w-4 h-4" />
                </div>
                <div>
                  <span className="block font-extrabold text-[var(--ui-text-primary)]">{ui.menuTitle}</span>
                  <span className="block text-[10px] text-[var(--ui-text-secondary)]">{ui.menuSubtitle}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
