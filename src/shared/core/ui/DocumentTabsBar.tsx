import React from 'react';
import { FileText, BookOpen, CreditCard, Plus, X, ChevronRight } from 'lucide-react';
import { OpenTabItem } from '../storage/documentTabEngine';
import { elevationSystem, radius } from '../uiDesignSystem';

export interface DocumentTabsBarProps {
  tabs: OpenTabItem[];
  activeId: string;
  docType?: 'cv' | 'business_card' | 'book';
  onSwitch: (id: string) => void;
  onNavigateToDocument?: (docType: 'cv' | 'business_card' | 'book', id: string) => void;
  onAdd: () => void;
  onClose: (e: React.MouseEvent, id: string, title: string) => void;
}

export const DocumentTabsBar: React.FC<DocumentTabsBarProps> = ({
  tabs,
  activeId,
  docType = 'cv',
  onSwitch,
  onNavigateToDocument,
  onAdd,
  onClose,
}) => {
  const getTabIcon = (tabDocType?: string) => {
    switch (tabDocType) {
      case 'book':
        return BookOpen;
      case 'business_card':
        return CreditCard;
      default:
        return FileText;
    }
  };

  return (
    <footer className="h-8 bg-[var(--ui-bg-panel)] border-t border-[var(--ui-border)] text-[var(--ui-text-primary)] px-2 sm:px-3 md:pl-28 flex items-center justify-between gap-1.5 shrink-0 no-print select-none text-[11px] font-sans z-40 mb-[76px] md:mb-0">
      {/* Pestañas de Documentos Abiertos + Botón "+" (con desplazamiento por ruedita del mouse) */}
      <div 
        onWheel={(e) => {
          if (e.currentTarget) {
            e.currentTarget.scrollLeft += (e.deltaY || e.deltaX);
          }
        }}
        className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1 py-0.5"
      >
        <div 
          onWheel={(e) => {
            if (e.currentTarget) {
              e.currentTarget.scrollLeft += (e.deltaY || e.deltaX);
            }
          }}
          className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-full"
        >
          {tabs.map((tab) => {
            const isActive = tab.cvId === activeId;
            const targetDocType = tab.docType || 'cv';
            const Icon = getTabIcon(targetDocType);

            return (
              <div
                key={tab.cvId}
                onClick={() => {
                  if (!isActive) {
                    if (targetDocType === docType) {
                      onSwitch(tab.cvId);
                    } else if (onNavigateToDocument) {
                      onNavigateToDocument(targetDocType as any, tab.cvId);
                    } else {
                      onSwitch(tab.cvId);
                    }
                  }
                }}
                className={`group flex items-center gap-1 px-2 py-0.5 h-6 rounded-[${radius.card}] text-[11px] font-bold transition cursor-pointer shrink-0 border ${
                  isActive
                    ? `bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] border-[var(--color-accent-base)] ${elevationSystem.raised}`
                    : 'bg-[var(--ui-bg-card)] text-[var(--ui-dock-text-muted)] border-[var(--ui-border)] hover:bg-[var(--ui-bg-panel)] hover:text-[var(--ui-dock-text)]'
                }`}
                title={tab.title}
              >
                {/* ICONO INMÓVIL A LA IZQUIERDA */}
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[var(--color-accent-on-base)]' : 'text-[var(--color-secondary-bright)]'}`} />

                {/* CONTENEDOR DE TEXTO CON DESPLAZAMIENTO INTERNO */}
                <div 
                  onWheel={(e) => {
                    if (e.currentTarget) {
                      e.stopPropagation();
                      e.currentTarget.scrollLeft += (e.deltaY || e.deltaX);
                    }
                  }}
                  className="overflow-x-auto no-scrollbar max-w-[85px] sm:max-w-[130px] flex items-center scroll-smooth"
                >
                  <span
                    ref={(el) => {
                      if (!el) return;
                      const parent = el.parentElement;
                      if (!parent) return;
                      const overflowsX = el.scrollWidth > parent.clientWidth + 2;
                      el.classList.toggle('ui-tab-title-marquee', overflowsX);
                    }}
                    className="whitespace-nowrap leading-none block"
                  >
                    {tab.title}
                  </span>
                </div>

                {tab.versionLabel && (
                  <span className={`text-[9px] px-1 py-0.2 rounded font-black uppercase tracking-tighter shrink-0 ${
                    isActive
                      ? 'bg-[var(--color-accent-on-base)] text-[var(--color-accent-base)]'
                      : 'bg-[var(--ui-bg-panel)] text-[var(--color-secondary-bright)] border border-[var(--ui-border)]'
                  }`}>
                    {tab.versionLabel}
                  </span>
                )}

                <button
                  type="button"
                  onClick={(e) => onClose(e, tab.cvId, tab.title)}
                  className="p-0.5 rounded transition cursor-pointer opacity-80 hover:opacity-100 shrink-0"
                  title="Cerrar Pestaña"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Botón "+" (Agregar Pestaña / Nuevo Documento) */}
        <button
          type="button"
          onClick={onAdd}
          className={`p-1.5 rounded-full bg-[var(--ui-bg-card)] border border-[var(--ui-border)] hover:bg-[var(--ui-bg-panel)] text-[var(--color-status-success-bright)] transition cursor-pointer active:scale-95 shrink-0 ${elevationSystem.raised}`}
          title="Crear Nuevo Documento (+)"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
        </button>

        {/* Flecha sutil y elegante que indica que hay más pestañas desplazables */}
        <div className="flex items-center text-[var(--color-accent-amber-bright)] opacity-80 animate-pulse shrink-0 px-0.5 pointer-events-none" title="Pestañas de documentos desplazables">
          <ChevronRight className="w-4 h-4 stroke-[2.5]" />
        </div>
      </div>

      {/* Enlaces Legales Públicos en el Footer */}
      <div className="hidden sm:flex items-center gap-3 text-[10px] text-[var(--ui-dock-text-muted)] shrink-0 pr-2">
        <a href="mailto:soporte@leecv.app" className="hover:text-[var(--ui-dock-text)] hover:underline font-bold text-[var(--ui-dock-text)]">Soporte</a>
        <a href="/privacidad" target="_blank" rel="noreferrer" className="hover:text-[var(--ui-dock-text)] hover:underline">Privacidad</a>
        <a href="/terminos" target="_blank" rel="noreferrer" className="hover:text-[var(--ui-dock-text)] hover:underline">Términos</a>
        <a href="/reembolsos" target="_blank" rel="noreferrer" className="hover:text-[var(--ui-dock-text)] hover:underline">Reembolsos</a>
      </div>
    </footer>
  );
};
