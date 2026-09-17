import React from 'react';
import { RecordFormSection } from '../../../../../shared/core/ui/RecordFormSection';
import { SectionManualAdjustment } from '../SectionManualAdjustment';

export const ProfesionSection = ({ cvData, setCvData }: any) => {
  return (
    <RecordFormSection
      sectionKey="profesion"
      sectionTitle="Títulos Profesionales"
      kindKey="profession"
      addLabel="Agregar Título"
      cvData={cvData}
      setCvData={setCvData}
      fieldName="profession"
      itemTitlePrefix="Título Profesional"
      helpText="Títulos Profesionales incluye carreras o títulos habilitantes para ejercer. Puedes añadir el campo opcional Resolución N° / Disposición legal que avala tu titulación."
      manualAdjustment={<SectionManualAdjustment sectionId="profesion" cvData={cvData} setCvData={setCvData} />}
    />
  );
};
