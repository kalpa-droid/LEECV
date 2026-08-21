import React, { useState } from 'react';
import { TemplateRenderer } from '../../../shared/core/pdf-engine/renderer/TemplateRenderer';
import { CardSheetDocument } from '../../../shared/core/pdf-engine/renderer/CardSheetDocument';
import { getPreset } from '../../../shared/core/pdf-engine/layers/presets/presetRegistry';
import { cvDataToContentSections } from '../../../shared/core/pdf-engine/layers/records/cvDataAdapter';
import { VectorDocViewer } from '../../../shared/core/pdf-engine/VectorDocViewer';
import { TemplateMenu } from '../../template-editor/components/TemplateMenu';

export default function CVPreview({ cvData, setCvData, activeTab, zoomLevel = 0.85 }: { cvData?: any; setCvData?: any; activeTab?: string; zoomLevel?: number }) {
  const [activePresetId, setActivePresetId] = useState<string>('cv-clasico');
  const { theme = {} } = cvData || {};

  const activePreset = getPreset(activePresetId);
  const sections = cvDataToContentSections(cvData);

  const personalInfo = cvData?.personalInfo || {};
  const cardData = {
    fullName: `${personalInfo.surname || ''} ${personalInfo.givenNames || ''}`.trim() || 'Juan Pérez',
    role: cvData?.roles?.[0] || cvData?.profession?.[0]?.degree || 'Profesional',
    phone: personalInfo.phone || '',
    email: personalInfo.email || '',
    website: personalInfo.cityProvince || '',
    brandName: personalInfo.surname ? `${personalInfo.surname} Studio` : 'Marca Personal',
    tagline: personalInfo.quote || 'Servicios Profesionales de Alta Calidad'
  };

  const dynamicThemeStyle = {
    fontFamily: theme.fontFamily || 'Arial, sans-serif'
  };

  const handleSelectPreset = (presetId: string) => {
    setActivePresetId(presetId);
    if (setCvData) {
      setCvData((prev: any) => ({ ...prev, activePresetId: presetId }));
    }
  };

  return (
    <div 
      className="w-full min-h-full flex flex-col items-center print-wrapper relative"
      style={dynamicThemeStyle}
    >
      {/* Top Preset Selector Bar */}
      <TemplateMenu
        activePresetId={activePresetId}
        onSelectPreset={handleSelectPreset}
        cvData={cvData}
      />

      <div className="w-full max-w-5xl h-[1200px] bg-slate-900 p-2.5 rounded-3xl shadow-2xl border border-slate-800 my-2 no-print">
        <VectorDocViewer key={activePresetId} document={
          activePreset.pageCategory === 'tarjeta' ? (
            <CardSheetDocument card={cardData} preset={activePreset} />
          ) : (
            <TemplateRenderer
              preset={activePreset}
              sections={sections}
              personalInfo={cvData?.personalInfo || {}}
              certificatesScanned={cvData?.certificatesScanned || []}
            />
          )
        } />
      </div>
    </div>
  );
}
