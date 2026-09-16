import React from 'react';
import { CreditCard } from 'lucide-react';
import { PanelSection } from '../PanelSection';
import { getOpenTabs } from '../../../../../shared/core/documents/tabStore';
import { loadCVById } from '../../../services/cvStorageService';
import { useToast } from '../../../../../shared/core/ui/Toast';

interface Props {
  cvData: any;
  setCvData: React.Dispatch<React.SetStateAction<any>>;
}

export function CardExtractSection({ cvData, setCvData }: Props) {
  const { showSuccess } = useToast();
  const openTabsList = getOpenTabs();
  const cvTabs = openTabsList.filter(t => !t.docType || t.docType === 'cv');

  return (
    <div className="space-y-6">
      <PanelSection icon={<CreditCard className="w-4 h-4 text-[var(--color-accent-text)]" />} title="Fuente de Datos del CV">
        <div className="p-3 bg-[var(--ui-bg-card)] rounded-[var(--radius-card)] border border-[var(--color-neutral-border)] space-y-3">
          {cvTabs.length === 0 ? (
            <div className="p-3 bg-[var(--color-status-warning-muted)] border border-[var(--color-status-warning-text)]/40 rounded-[var(--radius-card)] text-xs text-[var(--color-status-warning-text)] leading-relaxed">
              <span className="font-bold block mb-1">⚠️ No hay ningún CV abierto en el editor</span>
              <span>Podés introducir los datos de tu tarjeta personal manualmente o abrir un CV para vincular sus datos.</span>
            </div>
          ) : cvTabs.length === 1 ? (
            <div className="p-3 bg-[var(--color-secondary-muted)] border border-[var(--color-secondary-base)]/30 rounded-[var(--radius-card)] text-xs text-[var(--color-secondary-text)] flex items-center justify-between">
              <span className="font-bold">📄 Vinculado a: "{cvTabs[0].title}"</span>
              <button
                type="button"
                onClick={async () => {
                  const loaded = await loadCVById(cvTabs[0].cvId);
                  if (loaded) {
                    setCvData((prev: any) => ({
                      ...prev,
                      sourceCvTabId: cvTabs[0].cvId,
                      personalInfo: loaded.personalInfo,
                      roles: loaded.roles,
                      profession: loaded.profession
                    }));
                    showSuccess(`Datos vinculados desde CV "${loaded.title || 'Seleccionado'}".`);
                  }
                }}
                className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[var(--color-secondary-base)] text-[var(--color-secondary-on-base)] cursor-pointer hover:opacity-90 transition"
              >
                Vincular
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[var(--color-neutral-text-primary)]">
                Extraer registros desde pestaña de CV:
              </label>
              <select
                value={cvData?.sourceCvTabId || cvTabs[0].cvId}
                onChange={async (e) => {
                  const tabId = e.target.value;
                  const loaded = await loadCVById(tabId);
                  if (loaded) {
                    setCvData((prev: any) => ({
                      ...prev,
                      sourceCvTabId: tabId,
                      personalInfo: loaded.personalInfo,
                      roles: loaded.roles,
                      profession: loaded.profession
                    }));
                    showSuccess(`Datos vinculados desde CV "${loaded.title || 'Seleccionado'}".`);
                  }
                }}
                className="w-full text-xs p-2.5 rounded-[var(--radius-card)] border border-[var(--color-secondary-base)] bg-[var(--ui-bg-card)] text-[var(--color-neutral-text-primary)] font-bold outline-none cursor-pointer"
              >
                {cvTabs.map((t) => (
                  <option key={t.cvId} value={t.cvId}>
                    📄 {t.title} {t.versionLabel ? `(${t.versionLabel})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </PanelSection>
    </div>
  );
}
