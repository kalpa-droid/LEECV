import React from 'react';
import { RecordFormSection } from '../../../../../shared/core/ui/RecordFormSection';
import { SectionManualAdjustment } from '../SectionManualAdjustment';

export const ExperienciaSection = ({ cvData, setCvData }: any) => {
  const guide = (
    <div className="space-y-2 mt-1">
      <p className="font-bold text-[var(--color-primary-base)]">¿Qué mira un reclutador acá?</p>
      <p>Busca resultados concretos, no un listado de responsabilidades genéricas. Usá la fórmula: <span className="font-medium">"Hice [tarea] usando [herramienta] logrando [resultado]"</span>.</p>
      <div className="bg-[var(--ui-bg-page)] p-2 rounded text-xs border border-[var(--color-neutral-border)]">
        <p className="text-[var(--color-danger-base)] font-medium">❌ Antes:</p>
        <p className="mb-2 italic text-[var(--color-neutral-text-secondary)]">"Me encargaba de las ventas y atención al cliente."</p>
        <p className="text-[var(--color-success-base)] font-medium">✅ Después:</p>
        <p className="italic text-[var(--color-neutral-text-secondary)]">"Aumenté las ventas un 15% mensual liderando la atención de una cartera de 50+ clientes VIP."</p>
      </div>
      <p>Usá el botón <strong>"Sugerir Logros"</strong> en cada campo de descripción para que la IA te ayude a redactar viñetas de impacto.</p>
    </div>
  );

  return (
    <RecordFormSection
      sectionKey="experiencia"
      sectionTitle="Experiencia Laboral"
      kindKey="experience"
      addLabel="Agregar Experiencia"
      cvData={cvData}
      setCvData={setCvData}
      fieldName="experience"
      itemTitlePrefix="Experiencia Laboral"
      helpText={guide}
      manualAdjustment={<SectionManualAdjustment sectionId="experiencia" cvData={cvData} setCvData={setCvData} />}
    />
  );
};
