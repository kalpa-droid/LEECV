import React from 'react';
import { TemplateRenderer } from '../../../shared/core/pdf-engine/renderer/TemplateRenderer';
import { cvClasicoPreset } from '../../../shared/core/pdf-engine/layers/presets/presets/cv-clasico';
import { cvDataToContentSections } from '../../../shared/core/pdf-engine/layers/records/cvDataAdapter';
import { VectorDocViewer } from '../../../shared/core/pdf-engine/VectorDocViewer';

export default function CVPreview({ cvData, setCvData, activeTab, zoomLevel = 0.85 }: { cvData?: any; setCvData?: any; activeTab?: string; zoomLevel?: number }) {
  const { theme = {} } = cvData || {};

  const sections = cvDataToContentSections(cvData);

  const dynamicThemeStyle = {
    fontFamily: theme.fontFamily || 'Arial, sans-serif'
  };

  return (
    <div 
      className="w-full min-h-full flex flex-col items-center print-wrapper relative"
      style={dynamicThemeStyle}
    >
      <div className="w-full max-w-5xl h-[1200px] bg-slate-900 p-2.5 rounded-3xl shadow-2xl border border-slate-800 my-2 no-print">
        <VectorDocViewer document={
          <TemplateRenderer
            preset={cvClasicoPreset}
            sections={sections}
            personalInfo={cvData?.personalInfo || {}}
            certificatesScanned={cvData?.certificatesScanned || []}
          />
        } />
      </div>
    </div>
  );
}
