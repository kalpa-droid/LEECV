import React from 'react';
import { RecordFormSection } from '../../../../../shared/core/ui/RecordFormSection';
import { SectionManualAdjustment } from '../SectionManualAdjustment';

interface PortafolioSectionProps {
  cvData: any;
  setCvData: React.Dispatch<React.SetStateAction<any>>;
}

export const PortafolioSection: React.FC<PortafolioSectionProps> = ({ cvData, setCvData }) => {
  return (
    <RecordFormSection
      sectionKey="portafolio"
      sectionTitle="Portafolio / Trabajos Destacados"
      kindKey="portfolio"
      addLabel="Agregar Trabajo al Portafolio"
      cvData={cvData}
      setCvData={setCvData}
      fieldName="portfolio"
      itemTitlePrefix="Trabajo"
      helpText="Enlaces, descripciones e imágenes de tus mejores trabajos o proyectos."
      manualAdjustment={<SectionManualAdjustment sectionId="portafolio" cvData={cvData} setCvData={setCvData} />}
    />
  );
};
