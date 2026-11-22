import React, { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { DomSectionIcon } from '../pdf-engine/layers/icons/DomSectionIcon';
import { PRODUCT_ICON_IDS } from './iconCatalog';
import { radius, elevationSystem } from '../uiDesignSystem';
import {
  ALL_DOCUMENT_TYPE_IDS,
  RegisteredDocumentTypeId,
} from '../capabilities/capabilityRegistry';
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

interface MenuPresentationSpec {
  title: string;
  subtitle: string;
  iconId: string;
  badgeClass: string;
}

const MENU_PRESENTATION_BY_TYPE: Record<RegisteredDocumentTypeId, MenuPresentationSpec> = {
  cv: {
    title: 'Nuevo Currículum Vitae',
    subtitle: 'Hoja común (A4) o bolsillo',
    iconId: PRODUCT_ICON_IDS.cv,
    badgeClass: 'bg-[var(--color-accent-purple-light)] text-[var(--color-accent-purple-text)]',
  },
  business_card: {
    title: 'Nueva Tarjeta Personal',
    subtitle: 'Formato 9 x 5 cm',
    iconId: PRODUCT_ICON_IDS.tarjeta,
    badgeClass: 'bg-[var(--color-secondary-muted)] text-[var(--color-secondary-bright)]',
  },
  book: {
    title: 'Nuevo Libro / Folleto',
    subtitle: 'En casa o en una imprenta (hojas A4 / A3)',
    iconId: PRODUCT_ICON_IDS.libro,
    badgeClass: 'bg-[var(--color-status-warning-muted)] text-[var(--color-status-warning-text)]',
  },
  cover_letter: {
    title: 'Nueva Carta de Presentación',
    subtitle: 'Redacción IA adaptada por vacante',
    iconId: PRODUCT_ICON_IDS.carta,
    badgeClass: 'bg-[var(--color-accent-muted)] text-[var(--color-accent-text)]',
  },
  planner: {
    title: 'Nueva Agenda / Planificador',
    subtitle: 'Para imprimir en casa o en una imprenta',
    iconId: PRODUCT_ICON_IDS.agenda,
    badgeClass: 'bg-[var(--color-accent-green-light)] text-[var(--color-accent-green-text)]',
  },
  invoice: {
    title: 'Nuevo Presupuesto / Factura',
    subtitle: 'Tus datos quedan en tu computadora, sin internet',
    iconId: PRODUCT_ICON_IDS.factura,
    badgeClass: 'bg-[var(--color-status-success-muted)] text-[var(--color-status-success-text)]',
  },
  editorial: {
    title: 'Nuevo Libro o Informe (EditorLee)',
    subtitle: 'Ensayos, tesis o informes con índice automático',
    iconId: PRODUCT_ICON_IDS.editor,
    badgeClass: 'bg-[var(--color-accent-muted)] text-[var(--color-accent-text)]',
  },
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

  const legacyHandlers: Record<RegisteredDocumentTypeId, (() => void) | undefined> = {
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

          {ALL_DOCUMENT_TYPE_IDS.map((docType) => {
            const action = legacyHandlers[docType] || (onSelectDocument ? () => onSelectDocument(docType) : undefined);
            if (!action) return null;
            const meta = MENU_PRESENTATION_BY_TYPE[docType];

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
                  className={`p-1.5 group-hover:scale-105 transition ${meta.badgeClass}`}
                >
                  <DomSectionIcon iconId={meta.iconId} className="w-4 h-4" />
                </div>
                <div>
                  <span className="block font-extrabold text-[var(--ui-text-primary)]">{meta.title}</span>
                  <span className="block text-[10px] text-[var(--ui-text-secondary)]">{meta.subtitle}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
