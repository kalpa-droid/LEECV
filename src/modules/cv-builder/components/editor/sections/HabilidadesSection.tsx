import React from 'react';
import { Info } from 'lucide-react';
import { RepeatableSection } from '../../../../../shared/core/ui/RepeatableSection';
import { SectionManualAdjustment } from '../SectionManualAdjustment';
import { Field } from '../../../../../shared/core/ui/Field';
import { radius } from '../../../../../shared/core/uiDesignSystem';

interface HabilidadesSectionProps {
  cvData: any;
  setCvData: React.Dispatch<React.SetStateAction<any>>;
}

export const HabilidadesSection: React.FC<HabilidadesSectionProps> = ({ cvData, setCvData }) => {
  return (
    <div className="space-y-3">
      <div className={`p-3 bg-[var(--color-secondary-muted)] border border-[var(--color-secondary-base)]/30 rounded-[${radius.card}] text-xs text-[var(--color-secondary-text)] flex items-start gap-2 leading-relaxed`}>
        <Info className="w-4 h-4 text-[var(--color-secondary-text)] flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block">💡 Ayuda Contextual — Habilidades Técnicas (Hard Skills):</span>
          <span>Incluye conocimientos técnicos específicos, herramientas informáticas, tecnologías, lenguajes o metodologías aplicadas.</span>
        </div>
      </div>
      <RepeatableSection
        sectionKey="habilidades"
        sectionTitle="Habilidades Técnicas (Hard Skills)"
        addLabel="Agregar Habilidad Técnica"
        cvData={cvData}
        setCvData={setCvData}
        fieldName="hardSkills"
        emptyItem="Nueva Habilidad Técnica"
        itemTitlePrefix="Habilidad"
        getItemName={(item: any, idx: number) => typeof item === 'string' ? item : (item?.name || item?.title || `Habilidad #${idx + 1}`)}
        renderItem={(item: any, idx: number) => (
          <Field
            label={`Habilidad Técnica #${idx + 1}`}
            value={typeof item === 'string' ? item : (item?.name || '')}
            onChange={(e: any) => {
              const val = e.target.value;
              setCvData((prev: any) => {
                const current = [...(Array.isArray(prev.hardSkills) ? prev.hardSkills : [])];
                current[idx] = val;
                return { ...prev, hardSkills: current };
              });
            }}
            placeholder="Ej: React.js, AutoCAD, Adobe Illustrator, Metodologías Ágiles..."
          />
        )}
        manualAdjustment={<SectionManualAdjustment sectionId="habilidades" cvData={cvData} setCvData={setCvData} />}
      />
    </div>
  );
};
