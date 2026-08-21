import React from 'react';
import { TemplateRenderer } from '../../../shared/core/pdf-engine/renderer/TemplateRenderer';
import { cvClasicoPreset } from '../../../shared/core/pdf-engine/layers/presets/presets/cv-clasico';
import { cvDataToContentSections } from '../../../shared/core/pdf-engine/layers/records/cvDataAdapter';
import { VectorDocViewer } from '../../../shared/core/pdf-engine/VectorDocViewer';
import { FileCheck } from 'lucide-react';

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
      {/* Header: Motor Vectorial por Capas (8 Capas) */}
      <div className="w-full max-w-4xl flex items-center gap-2.5 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-800 my-4 no-print">
        <FileCheck className="w-5 h-5 text-emerald-400" />
        <div>
          <span className="text-xs font-black uppercase tracking-wider block text-emerald-400">Motor Vectorial por Capas (TemplateRenderer + cv-clasico)</span>
          <span className="text-[10px] text-slate-400 font-medium">Arquitectura de 8 capas resuelta sin dependencias circulares</span>
        </div>
      </div>

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
