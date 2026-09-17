import React from 'react';
import { RecordFormSection } from '../../../../../shared/core/ui/RecordFormSection';
import { SectionManualAdjustment } from '../SectionManualAdjustment';

export const CursosSection = ({ cvData, setCvData }: any) => {
  return (
    <RecordFormSection
      sectionKey="cursos"
      sectionTitle="Cursos y Capacitaciones"
      kindKey="course"
      addLabel="Agregar Curso"
      cvData={cvData}
      setCvData={setCvData}
      fieldName="coursesAndCertificates"
      itemTitlePrefix="Curso / Capacitación"
      helpText="Cursos y Capacitaciones incluye talleres, simposios, diplomaturas y certificaciones de formación continua."
      manualAdjustment={<SectionManualAdjustment sectionId="cursos" cvData={cvData} setCvData={setCvData} />}
    />
  );
};
