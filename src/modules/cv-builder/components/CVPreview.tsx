import React, { useState, useEffect, useSyncExternalStore } from 'react';
import { TemplateRenderer } from '../../../shared/core/pdf-engine/renderer/TemplateRenderer';
import { CardSheetDocument } from '../../../shared/core/pdf-engine/renderer/CardSheetDocument';
import { getPreset, subscribeToPresetChanges, getPresetsSnapshot } from '../../../shared/core/pdf-engine/layers/presets/presetRegistry';
import { cvDataToContentSections } from '../../../shared/core/pdf-engine/layers/records/cvDataAdapter';
import { buildCardDataFromCV, BusinessCardData } from '../../../shared/core/pdf-engine/layers/records/cardDataAdapter';
import { VectorDocViewer } from '../../../shared/core/pdf-engine/VectorDocViewer';

export default function CVPreview({ cvData, setCvData: _setCvData, activeTab: _activeTab, zoomLevel = 0.85 }: { cvData?: any; setCvData?: any; activeTab?: string; zoomLevel?: number }) {
  // Suscripción reactiva con useSyncExternalStore para re-renderizado automático sin F5 al cambiar plantillas
  const presetsVersion = useSyncExternalStore(subscribeToPresetChanges, getPresetsSnapshot, getPresetsSnapshot);

  // activePresetId vive en cvData — es la ÚNICA fuente de verdad de "qué plantilla está elegida"
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

  return (
    <div 
      className="w-full min-h-full flex flex-col items-center print-wrapper relative"
      style={dynamicThemeStyle}
    >
      <div 
        className="w-full max-w-5xl my-2 no-print transition-transform duration-150 ease-out"
        style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center' }}
      >
        <VectorDocViewer key={`${activePresetId}_v${presetsVersion}`} document={
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
              customRecordCardDesigns={cvData?.recordCardDesigns}
            />
          )
        } />
      </div>
    </div>
  );
}
