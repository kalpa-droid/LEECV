import React from 'react';
import { Sparkles } from 'lucide-react';
import { PanelSection } from '../../../../../shared/core/ui/PanelSection';
import { AIButton } from '../../../../../shared/core/ui/AIButton';
import { generateAiCompletion } from '../../../../../shared/core/ai/aiClient';

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
            <div className="flex items-center justify-between gap-2 mb-1">
              <label className="block text-xs font-bold text-[var(--color-neutral-text-primary)]">Eslogan / Frase Corta</label>
              <AIButton
                label="Sugerir Eslogan"
                onGenerate={async () => {
                  const role = cvData?.cardOverrides?.role || cvData?.roles?.[0] || 'Profesional';
                  const brand = cvData?.cardOverrides?.brandName || cvData?.personalInfo?.fullName || 'Marca Personal';
                  const res = await generateAiCompletion({
                    systemPrompt: 'Eres un estratega de marca personal y copywriter. Genera una sola frase corta, profesional, pegadiza y concisa (máximo 8 palabras) en español para una tarjeta personal.',
                    userPrompt: `Profesión: ${role}. Marca/Empresa: ${brand}.`,
                    maxTokens: 100,
                    temperature: 0.8
                  });
                  return res.text.replace(/^["'«]/, '').replace(/["'»]$/, '').trim();
                }}
                onSuccess={(slogan) => {
                  setCvData((prev: any) => ({
                    ...prev,
                    cardOverrides: { ...(prev?.cardOverrides || {}), tagline: slogan }
                  }));
                }}
              />
            </div>
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
