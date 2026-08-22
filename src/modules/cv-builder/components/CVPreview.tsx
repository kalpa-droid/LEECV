import React, { useState, useEffect } from 'react';
import { TemplateRenderer } from '../../../shared/core/pdf-engine/renderer/TemplateRenderer';
import { CardSheetDocument } from '../../../shared/core/pdf-engine/renderer/CardSheetDocument';
import { getPreset } from '../../../shared/core/pdf-engine/layers/presets/presetRegistry';
import { cvDataToContentSections } from '../../../shared/core/pdf-engine/layers/records/cvDataAdapter';
import { buildCardDataFromCV, BusinessCardData } from '../../../shared/core/pdf-engine/layers/records/cardDataAdapter';
import { VectorDocViewer } from '../../../shared/core/pdf-engine/VectorDocViewer';
import { TemplateMenu } from '../../template-editor/components/TemplateMenu';

export default function CVPreview({ cvData, setCvData, activeTab, zoomLevel = 0.85 }: { cvData?: any; setCvData?: any; activeTab?: string; zoomLevel?: number }) {
  // activePresetId vive en cvData — es la ÚNICA fuente de verdad de "qué plantilla está
  // elegida" (antes había 3 campos distintos para esto y ninguno se leía de verdad acá).
  const activePresetId = cvData?.activePresetId || 'cv-clasico';
  const [cardData, setCardData] = useState<BusinessCardData | null>(null);
  const { theme = {} } = cvData || {};

  const activePreset = getPreset(activePresetId);
  const sections = cvDataToContentSections(cvData);

  useEffect(() => {
    buildCardDataFromCV(cvData).then(setCardData);
  }, [cvData]);

  const dynamicThemeStyle = {
    fontFamily: theme.fontFamily || 'Arial, sans-serif'
  };

  const handleSelectPreset = (presetId: string) => {
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
              showCoverPage={cvData?.showCoverPage !== false}
              coverFeaturedEducationId={cvData?.coverFeaturedEducationId}
              coverFeaturedProfessionId={cvData?.coverFeaturedProfessionId}
              roles={cvData?.roles || []}
              education={cvData?.education || []}
              professions={cvData?.professions || []}
              customTheme={cvData?.theme}
            />
          )
        } />
      </div>
    </div>
  );
}
