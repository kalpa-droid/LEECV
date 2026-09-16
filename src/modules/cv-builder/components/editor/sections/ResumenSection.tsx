import React from 'react';
import { Field } from '../../../../../shared/core/ui/Field';
import { SectionManualAdjustment } from '../SectionManualAdjustment';
import { typeScale, colorSystem } from '../../../../../shared/core/uiDesignSystem';

interface ResumenSectionProps {
  cvData: any;
  setCvData: React.Dispatch<React.SetStateAction<any>>;
}

export const ResumenSection: React.FC<ResumenSectionProps> = ({ cvData, setCvData }) => {
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
        value={cvData.summary || ''}
        onChange={(e: any) => setCvData((prev: any) => ({ ...prev, summary: e.target.value }))}
        placeholder="Ej: Profesional con más de 7 años de experiencia liderando proyectos corporativos, optimización de procesos y gestión de equipos multidisciplinarios..."
      />
      <div className="pt-2 border-t border-[var(--color-neutral-border)]">
        <SectionManualAdjustment sectionId="resumen" cvData={cvData} setCvData={setCvData} />
      </div>
    </div>
  );
};
