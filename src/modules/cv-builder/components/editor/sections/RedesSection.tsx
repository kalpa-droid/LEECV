import React from 'react';
import { RecordFormSection } from '../../../../../shared/core/ui/RecordFormSection';
import { SectionManualAdjustment } from '../SectionManualAdjustment';

interface RedesSectionProps {
  cvData: any;
  setCvData: React.Dispatch<React.SetStateAction<any>>;
}

export const RedesSection: React.FC<RedesSectionProps> = ({ cvData, setCvData }) => {
  return (
    <RecordFormSection
      sectionKey="redes"
      sectionTitle="Redes Sociales & Enlaces"
      kindKey="redes"
      addLabel="Agregar Red / Enlace"
      cvData={cvData}
      setCvData={setCvData}
      fieldName="redes"
      itemTitlePrefix="Red Social / Enlace"
      helpText="Agrega tus perfiles profesionales, sitio web o portafolio digital."
      manualAdjustment={<SectionManualAdjustment sectionId="redes" cvData={cvData} setCvData={setCvData} />}
    />
  );
};
