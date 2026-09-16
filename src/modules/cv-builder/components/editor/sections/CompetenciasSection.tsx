import React from 'react';
import { Info } from 'lucide-react';
import { RepeatableSection } from '../../../../../shared/core/ui/RepeatableSection';
import { SectionManualAdjustment } from '../SectionManualAdjustment';
import { Field } from '../../../../../shared/core/ui/Field';
import { radius } from '../../../../../shared/core/uiDesignSystem';

interface CompetenciasSectionProps {
  cvData: any;
  setCvData: React.Dispatch<React.SetStateAction<any>>;
}

export const CompetenciasSection: React.FC<CompetenciasSectionProps> = ({ cvData, setCvData }) => {
  return (
    <div className="space-y-3">
      <div className={`p-3 bg-[var(--color-secondary-muted)] border border-[var(--color-secondary-base)]/30 rounded-[${radius.card}] text-xs text-[var(--color-secondary-text)] flex items-start gap-2 leading-relaxed`}>
        <Info className="w-4 h-4 text-[var(--color-secondary-text)] flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block">💡 Ayuda Contextual — Competencias Clave (Soft Skills):</span>
          <span>Incluye aptitudes interpersonales, liderazgo, trabajo en equipo, capacidad analítica, resolución de conflictos y competencias conductuales.</span>
        </div>
      </div>
      <RepeatableSection
        sectionKey="competencias"
        sectionTitle="Competencias Clave (Soft Skills)"
        addLabel="Agregar Competencia"
        cvData={cvData}
        setCvData={setCvData}
        fieldName="skills"
        emptyItem="Nueva Competencia"
        itemTitlePrefix="Competencia"
        getItemName={(item: any, idx: number) => typeof item === 'string' ? item : (item?.name || item?.title || `Competencia #${idx + 1}`)}
        renderItem={(item: any, idx: number, updateField: (field: string, val: any) => void) => (
          <Field
            label={`Competencia Clave #${idx + 1}`}
            value={typeof item === 'string' ? item : (item?.name || '')}
            onChange={(e: any) => {
              const val = e.target.value;
              setCvData((prev: any) => {
                const currentSkills = [...(Array.isArray(prev.skills) ? prev.skills : [])];
                currentSkills[idx] = val;
                return { ...prev, skills: currentSkills };
              });
            }}
            placeholder="Ej: Pedagogía Dialógica, Alfabetización Digital, Liderazgo de Equipos..."
          />
        )}
        manualAdjustment={<SectionManualAdjustment sectionId="competencias" cvData={cvData} setCvData={setCvData} />}
      />
    </div>
  );
};
