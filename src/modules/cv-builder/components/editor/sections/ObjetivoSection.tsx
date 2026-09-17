import React from 'react';
import { Target } from 'lucide-react';
import { Field } from '../../../../../shared/core/ui/Field';
import { SectionManualAdjustment } from '../SectionManualAdjustment';

interface ObjetivoSectionProps {
  cvData: any;
  setCvData: React.Dispatch<React.SetStateAction<any>>;
}

export const ObjetivoSection: React.FC<ObjetivoSectionProps> = ({ cvData, setCvData }) => {
  return (
    <div className="space-y-3 p-3 bg-[var(--ui-bg-card)] border border-[var(--color-neutral-border)] rounded-[var(--radius-card)]">
      <h3 className="text-sm font-black text-[var(--color-neutral-text-primary)] flex items-center gap-1.5">
        <Target className="w-4 h-4 text-[var(--color-secondary-bright)]" />
        Objetivo Profesional / Resumen Ejecutivo
      </h3>
      <Field
        id="objective"
        as="textarea"
        rows={5}
        label="Objetivo Profesional"
        value={cvData.objective || ''}
        onChange={(e: any) => setCvData((prev: any) => ({ ...prev, objective: e.target.value }))}
        placeholder="Ej: Aspiración profesional y metas a corto y largo plazo..."
      />
      <div className="pt-2 border-t border-[var(--color-neutral-border)]">
        <SectionManualAdjustment sectionId="objetivo" cvData={cvData} setCvData={setCvData} />
      </div>
    </div>
  );
};
