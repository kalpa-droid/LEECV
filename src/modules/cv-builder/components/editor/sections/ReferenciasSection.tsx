import React from 'react';
import { RecordFormSection } from '../../../../../shared/core/ui/RecordFormSection';
import { SectionManualAdjustment } from '../SectionManualAdjustment';

export const ReferenciasSection = ({ cvData, setCvData }: any) => {
  return (
    <RecordFormSection
      sectionKey="referencias"
      sectionTitle="Referencias Laborales & Comprobables"
      kindKey="references"
      addLabel="Agregar Referencia"
      cvData={cvData}
      setCvData={setCvData}
      fieldName="references"
      itemTitlePrefix="Referencia"
      helpText="Contactos de ex-supervisores o colegas que puedan certificar tu desempeño profesional."
      manualAdjustment={<SectionManualAdjustment sectionId="referencias" cvData={cvData} setCvData={setCvData} />}
    />
  );
};
