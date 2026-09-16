import React from 'react';
import { RecordFormSection } from '../../../../../shared/core/ui/RecordFormSection';
import { SectionManualAdjustment } from '../SectionManualAdjustment';

export const ProyectosSection = ({ cvData, setCvData }: any) => {
  return (
    <RecordFormSection
      sectionKey="proyectos"
      sectionTitle="Proyectos Destacados & Portafolio"
      kindKey="projects"
      addLabel="Agregar Proyecto"
      cvData={cvData}
      setCvData={setCvData}
      fieldName="projects"
      itemTitlePrefix="Proyecto"
      helpText="Destaca aplicaciones, desarrollos, iniciativas o portafolios relevantes para tu puesto."
      manualAdjustment={<SectionManualAdjustment sectionId="proyectos" cvData={cvData} setCvData={setCvData} />}
    />
  );
};
