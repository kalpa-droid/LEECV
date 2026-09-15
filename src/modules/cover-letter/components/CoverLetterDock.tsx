import React from 'react';
import { Database, Briefcase, Sparkles, FileText, Palette } from 'lucide-react';

export type CoverLetterTab = 'source_data' | 'vacancy' | 'ai_generate' | 'content' | 'styling';

interface CoverLetterDockProps {
  activeTab: CoverLetterTab;
  onSelectTab: (tab: CoverLetterTab) => void;
  aiCredits?: number;
}

export const CoverLetterDock: React.FC<CoverLetterDockProps> = ({
  activeTab,
  onSelectTab,
  aiCredits = 3
}) => {
  const tabs: Array<{ id: CoverLetterTab; label: string; icon: React.ReactNode; badge?: string }> = [
    {
      id: 'source_data',
      label: 'Origen de Datos',
      icon: <Database className="w-5 h-5 text-[var(--ui-text-secondary)]" />
    },
    {
      id: 'vacancy',
      label: 'Vacante',
      icon: <Briefcase className="w-5 h-5 text-[var(--ui-text-secondary)]" />
    },
    {
      id: 'ai_generate',
      label: 'Generar con IA',
      icon: <Sparkles className="w-5 h-5 text-[var(--color-status-warning-text)]" />,
      badge: `${aiCredits} cr.`
    },
    {
      id: 'content',
      label: 'Contenido',
      icon: <FileText className="w-5 h-5 text-[var(--ui-text-secondary)]" />
    },
    {
      id: 'styling',
      label: 'Diseño',
      icon: <Palette className="w-5 h-5 text-[var(--ui-text-secondary)]" />
    }
  ];

  return (
    <div className="w-64 bg-[var(--ui-bg-panel)] border-r border-[var(--ui-border)] flex flex-col h-full select-none">
      <div className="p-4 border-b border-[var(--ui-border)]">
        <h2 className="text-sm font-semibold text-[var(--ui-text-primary)] flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[var(--color-status-warning-text)]" />
          Carta de Presentación
        </h2>
        <p className="text-xs text-[var(--ui-text-secondary)] mt-1">
          Redacción adaptada por vacante impulsada por IA
        </p>
      </div>

      <nav className="p-2 space-y-1 flex-1 overflow-y-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-[var(--color-primary-base)] text-white shadow-sm'
                  : 'text-[var(--ui-text-secondary)] hover:bg-[var(--ui-bg-hover)] hover:text-[var(--ui-text-primary)]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {tab.icon}
                <span>{tab.label}</span>
              </div>
              {tab.badge && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-black/70 text-white' : 'bg-[var(--color-status-warning-muted)] text-[var(--color-status-warning-text)] border border-[var(--ui-border)]'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
