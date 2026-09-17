import React from 'react';
import { RecordFormSection } from '../../../../../shared/core/ui/RecordFormSection';
import { SectionManualAdjustment } from '../SectionManualAdjustment';

export const LogrosSection = ({ cvData, setCvData }: any) => {
  return (
    <RecordFormSection
      sectionKey="logros"
      sectionTitle="Logros Cuantificables & Métricas"
      kindKey="achievements"
      addLabel="Agregar Logro"
      cvData={cvData}
      setCvData={setCvData}
      fieldName="achievements"
      itemTitlePrefix="Logro"
      helpText="Métricas, premios o resultados cuantificables alcanzados en tu trayectoria."
      manualAdjustment={<SectionManualAdjustment sectionId="logros" cvData={cvData} setCvData={setCvData} />}
    />
  );
};
