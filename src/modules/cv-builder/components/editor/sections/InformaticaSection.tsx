import React from 'react';
import { RecordFormSection } from '../../../../../shared/core/ui/RecordFormSection';
import { SectionManualAdjustment } from '../SectionManualAdjustment';

export const InformaticaSection = ({ cvData, setCvData }: any) => {
  return (
    <RecordFormSection
      sectionKey="informatica"
      sectionTitle="Informática y TICs"
      kindKey="informatics"
      addLabel="Agregar Informática"
      cvData={cvData}
      setCvData={setCvData}
      fieldName="informatics"
      itemTitlePrefix="Curso Informático"
      helpText="Informática y TICs incluye cursos, herramientas de computación, lenguajes y software profesional."
      manualAdjustment={<SectionManualAdjustment sectionId="informatica" cvData={cvData} setCvData={setCvData} />}
    />
  );
};
