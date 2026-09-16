import React from 'react';
import { RecordFormSection } from '../../../../../shared/core/ui/RecordFormSection';
import { SectionManualAdjustment } from '../SectionManualAdjustment';

export const IdiomasSection = ({ cvData, setCvData }: any) => {
  return (
    <RecordFormSection
      sectionKey="idiomas"
      sectionTitle="Idiomas & Nivel de Dominio"
      kindKey="languages"
      addLabel="Agregar Idioma"
      cvData={cvData}
      setCvData={setCvData}
      fieldName="languages"
      itemTitlePrefix="Idioma"
      helpText="Indica los idiomas que dominas y tu nivel aproximado (A1, A2, B1, B2, C1, C2 o Nativo)."
      manualAdjustment={<SectionManualAdjustment sectionId="idiomas" cvData={cvData} setCvData={setCvData} />}
    />
  );
};
