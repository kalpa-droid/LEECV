import React from 'react';
import { RecordFormSection } from '../../../../../shared/core/ui/RecordFormSection';
import { SectionManualAdjustment } from '../SectionManualAdjustment';

export const PublicacionesSection = ({ cvData, setCvData }: any) => {
  return (
    <RecordFormSection
      sectionKey="publicaciones"
      sectionTitle="Publicaciones & Investigaciones"
      kindKey="publications"
      addLabel="Agregar Publicación"
      cvData={cvData}
      setCvData={setCvData}
      fieldName="publications"
      itemTitlePrefix="Publicación"
      helpText="Artículos científicos, libros, ponencias o patentes que hayas publicado."
      manualAdjustment={<SectionManualAdjustment sectionId="publicaciones" cvData={cvData} setCvData={setCvData} />}
    />
  );
};
