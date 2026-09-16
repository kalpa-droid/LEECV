import React from 'react';
import { RecordFormSection } from '../../../../../shared/core/ui/RecordFormSection';
import { SectionManualAdjustment } from '../SectionManualAdjustment';

export const ExperienciaSection = ({ cvData, setCvData }: any) => {
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
      helpText="Experiencia Laboral detalla puestos desempeñados, instituciones o empresas y tareas clave realizadas."
      manualAdjustment={<SectionManualAdjustment sectionId="experiencia" cvData={cvData} setCvData={setCvData} />}
    />
  );
};
