import React from 'react';
import { FolderOpen, Save, Calendar, Trash2 } from 'lucide-react';
import { radius, button } from '../../../../core/theme';

interface GuardadosSectionProps {
  savedList: any[];
  isSavingFromPanel: boolean;
  handleSaveFromPanel: () => void;
  handleOpenSavedFromPanel: (id: string) => void;
  handleDeleteSavedFromPanel: (id: string, name: string) => void;
}

export const GuardadosSection: React.FC<GuardadosSectionProps> = ({
  savedList,
  isSavingFromPanel,
  handleSaveFromPanel,
  handleOpenSavedFromPanel,
  handleDeleteSavedFromPanel
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b pb-2 border-[var(--color-neutral-border)]">
        <h3 className="text-xs font-extrabold uppercase text-[var(--ui-rose)] flex items-center gap-1.5">
          <FolderOpen className="w-4 h-4 text-[var(--ui-secondary)]" /> Abrir Mis Documentos Guardados
        </h3>

        <button
          onClick={handleSaveFromPanel}
          disabled={isSavingFromPanel}
          className={`px-3 py-1.5 font-bold text-xs rounded-[${radius.card}] transition flex items-center gap-1 cursor-pointer ${button.primary}`}
        >
          <Save className="w-3.5 h-3.5" />
          <span>{isSavingFromPanel ? 'Guardando...' : 'Guardar Actual'}</span>
        </button>
      </div>

      <div className="space-y-2.5">
        {savedList.length === 0 ? (
          <div className={`p-6 text-center text-xs text-[var(--color-neutral-text-primary)] font-medium border-2 border-dashed border-[var(--color-neutral-border)] rounded-[${radius.card}]`}>
            No hay currículums guardados aún. Haz clic en "Guardar Actual" para almacenar este borrador en WebP.
          </div>
        ) : (
          savedList.map((item) => (
            <div
              key={item.id}
              className={`p-3.5 rounded-[${radius.card}] border border-[var(--color-neutral-border)] bg-[var(--color-neutral-surface-warm)]/50 hover:border-[var(--color-accent-purple)] transition flex items-center justify-between gap-2`}
            >
              <div className="space-y-0.5 min-w-0">
                <h4 className="text-xs font-black text-[var(--color-neutral-text-primary)] font-black truncate">
                  {item.candidate_name || item.title}
                </h4>
                <p className="text-[10px] text-[var(--color-neutral-text-primary)] font-medium font-semibold flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[var(--color-neutral-text-primary)] font-medium" />
                  <span>{item.dni ? `DNI: ${item.dni}` : 'Borrador'}</span>
                </p>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => handleOpenSavedFromPanel(item.id)}
                  className={`px-3 py-1.5 font-black text-[11px] rounded-[${radius.control}] transition flex items-center gap-1 cursor-pointer ${button.primary}`}
                >
                  <FolderOpen className="w-3.5 h-3.5" /> Abrir
                </button>

                <button
                  onClick={() => handleDeleteSavedFromPanel(item.id, item.candidate_name || item.title)}
                  className={`p-1.5 text-[var(--color-neutral-text-primary)] font-medium hover:text-[var(--color-status-danger-text)] rounded-[${radius.control}] hover:bg-[var(--color-neutral-border)] transition cursor-pointer`}
                  title="Eliminar"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
