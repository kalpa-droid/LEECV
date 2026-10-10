import React, { useState } from 'react';
import { Field } from '../../../../../shared/core/ui/Field';
import { SectionManualAdjustment } from '../SectionManualAdjustment';
import { typeScale, colorSystem, button } from '../../../../../shared/core/uiDesignSystem';
import { AIButton } from '../../../../../shared/core/ui/AIButton';
import { executeAiTask } from '../../../../../shared/core/ai/aiClient';

interface ResumenSectionProps {
  cvData: any;
  setCvData: React.Dispatch<React.SetStateAction<any>>;
}

export const ResumenSection: React.FC<ResumenSectionProps> = ({ cvData, setCvData }) => {
  const [suggestion, setSuggestion] = useState('');

  const handleGenerateSummary = async () => {
    const jobTargetStr = cvData.jobTarget?.jobDescription || cvData.jobTarget?.jobTitle || 'No especificada';
    const res = await executeAiTask<{ summary: string }>({
      taskId: 'generate_summary',
      payload: { 
        jobTargetText: jobTargetStr,
        currentSummary: cvData.summary || ''
      },
      cvData,
      temperature: 0.4
    });
    return res.data.summary;
  };

  return (
    <div className="space-y-4 bg-white p-4 rounded-[12px] border border-[var(--color-neutral-border)]">
      <h3 className={`${typeScale.sectionTitle} uppercase tracking-wide`} style={{ color: colorSystem.neutral.textPrimary }}>
        Resumen Profesional / Extracto (Elevator Pitch)
      </h3>
      <Field
        id="summary"
        as="textarea"
        rows={5}
        label="Extracto o Perfil Profesional"
        headerAction={
          <AIButton
            label="Proponer mejora"
            onGenerate={handleGenerateSummary}
            onSuccess={setSuggestion}
          />
        }
        value={cvData.summary || ''}
        onChange={(e: any) => setCvData((prev: any) => ({ ...prev, summary: e.target.value }))}
        placeholder="Ej: Profesional con más de 7 años de experiencia liderando proyectos corporativos, optimización de procesos y gestión de equipos multidisciplinarios..."
      />
      {suggestion && (
        <div className="space-y-2 rounded-[12px] border border-[var(--color-neutral-border)] bg-[var(--ui-bg-card)] p-3">
          <p className="text-sm font-semibold text-[var(--color-neutral-text-primary)]">Propuesta para revisar</p>
          <p className="whitespace-pre-wrap text-sm text-[var(--color-neutral-text-secondary)]">{suggestion}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={button.primary}
              onClick={() => {
                setCvData((prev: any) => ({ ...prev, summary: suggestion }));
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
        <SectionManualAdjustment sectionId="resumen" cvData={cvData} setCvData={setCvData} />
      </div>
    </div>
  );
};
