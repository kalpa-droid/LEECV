import React, { useState } from 'react';
import { Target } from 'lucide-react';
import { Field } from '../../../../../shared/core/ui/Field';
import { SectionManualAdjustment } from '../SectionManualAdjustment';
import { AIButton } from '../../../../../shared/core/ui/AIButton';
import { ContextualGuideBox } from '../../../../../shared/core/ui/ContextualGuideBox';
import { executeAiTask } from '../../../../../shared/core/ai/aiClient';
import { button } from '../../../../../shared/core/uiDesignSystem';

interface ObjetivoSectionProps {
  cvData: any;
  setCvData: React.Dispatch<React.SetStateAction<any>>;
}

export const ObjetivoSection: React.FC<ObjetivoSectionProps> = ({ cvData, setCvData }) => {
  const [suggestion, setSuggestion] = useState('');

  const handleGenerateObjective = async () => {
    const jobTargetText = [
      cvData.jobTarget?.jobTitle,
      cvData.jobTarget?.companyName,
      cvData.jobTarget?.jobDescription
    ].filter(Boolean).join('\n');
    const result = await executeAiTask<{ objective: string }>({
      taskId: 'generate_objective',
      payload: {
        currentObjective: cvData.objective || '',
        jobTargetText
      },
      cvData,
      temperature: 0.4
    });

    if (!result.data.objective?.trim()) {
      throw new Error('La IA no devolvió una propuesta de objetivo profesional.');
    }

    return result.data.objective.trim();
  };

  return (
    <div className="space-y-3 p-3 bg-[var(--ui-bg-card)] border border-[var(--color-neutral-border)] rounded-[12px]">
      <h3 className="text-sm font-black text-[var(--color-neutral-text-primary)] flex items-center gap-1.5">
        <Target className="w-4 h-4 text-[var(--color-secondary-bright)]" />
        Objetivo Profesional
      </h3>
      <ContextualGuideBox title="Cómo redactar tu Objetivo">
        Contá en 2 o 3 líneas qué rol buscás y qué aporte hacés al equipo.
      </ContextualGuideBox>
      <Field
        id="objective"
        as="textarea"
        rows={5}
        label="Objetivo Profesional"
        headerAction={
          <AIButton
            label="Proponer objetivo con IA"
            helpText="La IA propone un objetivo profesional adaptado a tu perfil y puesto buscado."
            onGenerate={handleGenerateObjective}
            onSuccess={setSuggestion}
          />
        }
        value={cvData.objective || ''}
        onChange={(e: any) => setCvData((prev: any) => ({ ...prev, objective: e.target.value }))}
        placeholder="Ej: Aspiración profesional y metas a corto y largo plazo..."
      />
      {suggestion && (
        <div className="space-y-2 rounded-[var(--radius-card)] border border-[var(--color-neutral-border)] bg-[var(--ui-bg-card)] p-3">
          <p className="text-sm font-semibold text-[var(--color-neutral-text-primary)]">Propuesta para revisar</p>
          <p className="whitespace-pre-wrap text-sm text-[var(--color-neutral-text-secondary)]">{suggestion}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={button.primary}
              onClick={() => {
                setCvData((prev: any) => ({ ...prev, objective: suggestion }));
                setSuggestion('');
              }}
            >
              Aplicar propuesta
            </button>
            <button type="button" className={button.ghost} onClick={() => setSuggestion('')}>
              Descartar
            </button>
          </div>
        </div>
      )}
      <div className="pt-2 border-t border-[var(--color-neutral-border)]">
        <SectionManualAdjustment sectionId="objetivo" cvData={cvData} setCvData={setCvData} />
      </div>
    </div>
  );
};
