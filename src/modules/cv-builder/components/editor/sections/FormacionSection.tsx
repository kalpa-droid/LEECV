import React from 'react';
import { RecordFormSection } from '../../../../../shared/core/ui/RecordFormSection';
import { SectionManualAdjustment } from '../SectionManualAdjustment';

export const FormacionSection = ({ cvData, setCvData }: any) => {
  return (
    <RecordFormSection
      sectionKey="formacion"
      sectionTitle="Formación Académica"
      kindKey="education"
      addLabel="Agregar Formación"
      cvData={cvData}
      setCvData={setCvData}
      fieldName="education"
      itemTitlePrefix="Estudio / Formación"
      helpText="Formación Académica refiere al nivel educativo alcanzado (Secundario, Terciario, Universitario, Posgrado)."
      manualAdjustment={<SectionManualAdjustment sectionId="formacion" cvData={cvData} setCvData={setCvData} />}
    />
  );
};
