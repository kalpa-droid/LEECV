import React from 'react';
import { Sparkles } from 'lucide-react';
import { PanelSection } from '../PanelSection';

interface Props {
  cvData: any;
  setCvData: React.Dispatch<React.SetStateAction<any>>;
}

export function CardBackSection({ cvData, setCvData }: Props) {
  return (
    <div className="space-y-6">
      <PanelSection icon={<Sparkles className="w-4 h-4" />} title="Datos del Dorso (Marca & Eslogan)">
        <div className="p-4 bg-[var(--ui-bg-card)] rounded-[var(--radius-card)] border border-[var(--color-neutral-border)] space-y-3">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-[var(--color-neutral-text-primary)]">Nombre de Marca / Empresa</label>
            <input
              type="text"
              value={cvData?.cardOverrides?.brandName ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                setCvData((prev: any) => ({
                  ...prev,
                  cardOverrides: { ...(prev?.cardOverrides || {}), brandName: val }
                }));
              }}
              placeholder="Ej: Pérez Studio / Mi Marca Personal"
              className="w-full text-xs p-2.5 rounded-[var(--radius-card)] border border-[var(--color-neutral-border)] bg-[var(--ui-bg-card)] text-[var(--color-neutral-text-primary)] font-bold outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold text-[var(--color-neutral-text-primary)]">Eslogan / Frase Corta</label>
            <input
              type="text"
              value={cvData?.cardOverrides?.tagline ?? cvData?.personalInfo?.quote ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                setCvData((prev: any) => ({
                  ...prev,
                  cardOverrides: { ...(prev?.cardOverrides || {}), tagline: val }
                }));
              }}
              placeholder="Ej: Soluciones de Diseño de Alta Calidad"
              className="w-full text-xs p-2.5 rounded-[var(--radius-card)] border border-[var(--color-neutral-border)] bg-[var(--ui-bg-card)] text-[var(--color-neutral-text-primary)] font-bold outline-none"
            />
          </div>
        </div>
      </PanelSection>
    </div>
  );
}
