import React, { useState, useEffect, useMemo, useSyncExternalStore } from 'react';
import { TemplateRenderer } from '../../../shared/core/pdf-engine/renderer/TemplateRenderer';
import { CardSheetDocument } from '../../../shared/core/pdf-engine/renderer/CardSheetDocument';
import { getPreset, resolveActivePreset, subscribeToPresetChanges, getPresetsSnapshot } from '../../../shared/core/pdf-engine/layers/presets/presetRegistry';
import { cvDataToContentSections } from '../../../shared/core/pdf-engine/layers/records/cvDataAdapter';
import { buildCardDataFromCV, BusinessCardData } from '../../../shared/core/pdf-engine/layers/records/cardDataAdapter';
import { VectorDocViewer } from '../../../shared/core/pdf-engine/VectorDocViewer';
import { ErrorBoundary } from '../../../shared/core/ui/ErrorBoundary';

export default function CVPreview({ cvData, setCvData: _setCvData, activeTab, zoomLevel = 0.85 }: { cvData?: any; setCvData?: any; activeTab?: string; zoomLevel?: number }) {
  // Suscripción reactiva con useSyncExternalStore para re-renderizado automático sin F5 al cambiar plantillas
  const presetsVersion = useSyncExternalStore(subscribeToPresetChanges, getPresetsSnapshot, getPresetsSnapshot);

  // Debounce de cvData para evitar re-generar el PDF en cada pulsación de tecla
  const [debouncedCvData, setDebouncedCvData] = useState(cvData);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedCvData(cvData);
    }, 300);
    return () => clearTimeout(handler);
  }, [cvData]);

  const [cardData, setCardData] = useState<BusinessCardData | null>(null);
  const { theme = {} } = debouncedCvData || {};

  const activePreset = useMemo(
    () => resolveActivePreset(debouncedCvData),
    [
      debouncedCvData?.activePresetId,
      debouncedCvData?.colorPresetId,
      debouncedCvData?.typographyPresetId,
      debouncedCvData?.columnLayoutPresetId
    ]
  );
  const sections = useMemo(() => cvDataToContentSections(debouncedCvData), [debouncedCvData]);

  useEffect(() => {
    buildCardDataFromCV(debouncedCvData).then(setCardData);
  }, [debouncedCvData]);

  const dynamicThemeStyle = useMemo(() => ({
    fontFamily: theme.fontFamily || 'Arial, sans-serif'
  }), [theme.fontFamily]);

  const renderedDocument = useMemo(() => {
    if (activePreset.pageCategory === 'tarjeta') {
      return <CardSheetDocument card={cardData} preset={activePreset} />;
    }
    return (
      <TemplateRenderer
        preset={activePreset}
        sections={sections}
        personalInfo={debouncedCvData?.personalInfo || {}}
        activeFormatId={debouncedCvData?.activeFormatId}
        certificatesScanned={debouncedCvData?.certificatesScanned || []}
        showCoverPage={debouncedCvData?.showCoverPage !== false}
        coverFeaturedEducationId={debouncedCvData?.coverFeaturedEducationId}
        coverFeaturedProfessionId={debouncedCvData?.coverFeaturedProfessionId}
        roles={debouncedCvData?.roles || []}
        education={debouncedCvData?.education || []}
        professions={debouncedCvData?.professions || []}
        userFontFamily={debouncedCvData?.theme?.fontFamily}
        layoutOverrides={debouncedCvData?.layout}
        customRecordCardDesigns={debouncedCvData?.recordCardDesigns}
        interactiveAnchors={true}
      />
    );
  }, [activePreset, sections, cardData, debouncedCvData]);

  return (
    <div 
      className="w-full min-h-full flex flex-col items-center print-wrapper relative"
      style={dynamicThemeStyle}
    >
      <div 
        className="w-full max-w-5xl my-2 no-print transition-transform duration-150 ease-out"
        style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center' }}
      >
        <ErrorBoundary 
          compact 
          title="Inconveniente en la vista previa" 
          subtitle="Ocurrió un problema al procesar la plantilla del PDF. Tu información guardada no se ve afectada."
        >
          <VectorDocViewer 
            key={`${activePreset.id}_v${presetsVersion}`} 
            document={renderedDocument} 
            zoomLevel={zoomLevel}
            activeTab={activeTab}
            sections={sections}
            preset={activePreset}
            layoutOverrides={debouncedCvData?.layout}
          />
        </ErrorBoundary>
      </div>
    </div>
  );
}
