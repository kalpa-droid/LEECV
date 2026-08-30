import React, { useEffect, useState } from 'react';
import { FileText, Plus, X, FolderOpen } from 'lucide-react';
import { getOpenTabs, removeOpenTab, addOpenTab, OpenTabItem } from '../../../shared/core/storage/documentTabEngine';
import { elevationSystem, radius } from '../../../shared/core/uiDesignSystem';

export interface DocumentTabBarProps {
  currentCvData: any;
  onSwitchDocument: (cvId: string) => Promise<void>;
  onNewDocument: () => void;
  onOpenSavedModal: () => void;
}

export function DocumentTabBar({
  currentCvData,
  onSwitchDocument,
  onNewDocument,
  onOpenSavedModal
}: DocumentTabBarProps) {
  const [tabs, setTabs] = useState<OpenTabItem[]>([]);

  const activeCvId = currentCvData?.id || '';

  // Sincronizar pestaña activa al cargar o actualizar cvData
  useEffect(() => {
    if (activeCvId) {
      const updated = addOpenTab(
        activeCvId,
        currentCvData?.title || 'Mi Currículum Vitae',
        currentCvData?.version_label
      );
      setTabs(updated);
    } else {
      setTabs(getOpenTabs());
    }
  }, [activeCvId, currentCvData?.title, currentCvData?.version_label]);

  const handleCloseTab = async (e: React.MouseEvent, cvId: string) => {
    e.stopPropagation();
    const remaining = removeOpenTab(cvId);
    setTabs(remaining);

    // Si se cierra la pestaña que está abierta en pantalla, conmuta a la última pestaña que quede o abre un documento nuevo
    if (cvId === activeCvId) {
      if (remaining.length > 0) {
        const lastTab = remaining[remaining.length - 1];
        await onSwitchDocument(lastTab.cvId);
      } else {
        onNewDocument();
      }
    }
  };

  return (
    <div 
      onWheel={(e) => {
        if (e.currentTarget) {
          e.currentTarget.scrollLeft += (e.deltaY || e.deltaX);
        }
      }}
      className="w-full bg-[var(--ui-bg-dock)] border-b border-[var(--ui-dock-border)] px-3 py-1.5 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar z-20 select-none"
    >
      {/* Listado Horizontal de Pestañas Abiertas */}
      <div 
        onWheel={(e) => {
          if (e.currentTarget) {
            e.currentTarget.scrollLeft += (e.deltaY || e.deltaX);
          }
        }}
        className="flex items-center gap-1.5 overflow-x-auto no-scrollbar"
      >
        {tabs.map((tab) => {
          const isActive = tab.cvId === activeCvId;
          return (
            <div
              key={tab.cvId}
              onClick={() => {
                if (!isActive) onSwitchDocument(tab.cvId);
              }}
              className={`group flex items-center gap-2 px-3 py-1.5 rounded-[${radius.card}] text-xs font-bold transition cursor-pointer shrink-0 border ${
                isActive
                  ? `bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] border-[var(--color-accent-base)] ${elevationSystem.raised}`
                  : 'bg-[var(--ui-bg-panel)] text-[var(--ui-dock-text-muted)] border-[var(--ui-border)] hover:bg-[var(--ui-bg-card)] hover:text-[var(--ui-dock-text)]'
              }`}
              title={tab.title}
            >
              {/* ICONO INMÓVIL A LA IZQUIERDA */}
              <FileText className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[var(--color-accent-on-base)]' : 'text-[var(--color-secondary-bright)]'}`} />

              {/* CONTENEDOR DE TEXTO QUE SE MUEVE INTERNAMENTE */}
              <div 
                onWheel={(e) => {
                  if (e.currentTarget) {
                    e.stopPropagation();
                    e.currentTarget.scrollLeft += (e.deltaY || e.deltaX);
                  }
                }}
                className="overflow-x-auto no-scrollbar max-w-[130px] flex items-center scroll-smooth"
              >
                <span className="whitespace-nowrap leading-none block group-hover:translate-x-[-15%] transition-transform duration-700 ease-in-out">
                  {tab.title}
                </span>
              </div>

              {tab.versionLabel && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-tighter shrink-0 ${
                  isActive
                    ? 'bg-[var(--color-accent-on-base)] text-[var(--color-accent-base)]'
                    : 'bg-[var(--ui-bg-card)] text-[var(--color-secondary-bright)] border border-[var(--ui-border)]'
                }`}>
                  {tab.versionLabel}
                </span>
              )}

              <button
                type="button"
                onClick={(e) => handleCloseTab(e, tab.cvId)}
                className={`p-0.5 rounded transition cursor-pointer ${
                  isActive ? 'text-[var(--color-accent-on-base)] bg-[var(--color-accent-base)]' : 'text-[var(--ui-dock-text-muted)] bg-[var(--ui-bg-panel)] hover:text-[var(--ui-dock-text)]'
                }`}
                title="Cerrar Pestaña"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Botones de Acción Rápida (Nuevo / Abrir) */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onNewDocument}
          className={`px-2.5 py-1.5 rounded-[${radius.card}] bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] hover:bg-[var(--ui-bg-card)] text-[var(--ui-dock-text)] text-xs font-extrabold flex items-center gap-1 transition cursor-pointer active:scale-95 ${elevationSystem.raised}`}
          title="Crear Nuevo Documento"
        >
          <Plus className="w-3.5 h-3.5 text-[var(--color-status-success-bright)]" />
          <span className="hidden sm:inline">Nuevo</span>
        </button>

        <button
          type="button"
          onClick={onOpenSavedModal}
          className={`px-2.5 py-1.5 rounded-[${radius.card}] bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] hover:bg-[var(--ui-bg-card)] text-[var(--ui-dock-text)] text-xs font-extrabold flex items-center gap-1 transition cursor-pointer active:scale-95 ${elevationSystem.raised}`}
          title="Abrir Documentos Guardados"
        >
          <FolderOpen className="w-3.5 h-3.5 text-[var(--color-secondary-bright)]" />
          <span className="hidden sm:inline">Abrir...</span>
        </button>
      </div>
    </div>
  );
}
