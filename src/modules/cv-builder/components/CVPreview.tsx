import React from 'react';
import { PAGE_SIZES } from '../../../shared/core/pdf-engine/pageSizes';
import { CvPdfDocument } from './pdf/CvPdfDocument';
import { VectorDocViewer } from '../../../shared/core/pdf-engine/VectorDocViewer';
import { FileCheck } from 'lucide-react';

export default function CVPreview({ cvData, setCvData, activeTab, zoomLevel = 0.85 }: { cvData?: any; setCvData?: any; activeTab?: string; zoomLevel?: number }) {
  const { theme = {} } = cvData || {};

  // Auto-scroll to active section when tab changes
  React.useEffect(() => {
    if (!activeTab) return;
    const tabToIdMap: Record<string, string> = {
      personales: 'cv-section-personales',
      formacion: 'cv-section-formacion',
      profesion: 'cv-section-profesion',
      experiencia: 'cv-section-experiencia',
      cursos: 'cv-section-cursos',
      informatica: 'cv-section-informatica',
      ecologia: 'cv-section-ecologia',
      certificados: 'cv-section-certificados',
      firma: 'cv-section-firma',
      diseno: 'cv-section-personales'
    };

    const targetId = tabToIdMap[activeTab];
    if (targetId) {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeTab]);

  const dynamicThemeStyle = {
    fontFamily: theme.fontFamily || 'Arial, sans-serif'
  };

  return (
    <div 
      className="w-full min-h-full flex flex-col items-center print-wrapper relative"
      style={dynamicThemeStyle}
    >
      {/* Header: una sola vista, sin selector — el motor vectorial es el único camino */}
      <div className="w-full max-w-4xl flex items-center gap-2.5 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-800 my-4 no-print">
        <FileCheck className="w-5 h-5 text-emerald-400" />
        <div>
          <span className="text-xs font-black uppercase tracking-wider block text-emerald-400">Motor Vectorial Nativo (@react-pdf/renderer + pdf.js)</span>
          <span className="text-[10px] text-slate-400 font-medium">Igual en PC y celular — es el mismo PDF que se descarga</span>
        </div>
      </div>

      <div className="w-full max-w-5xl h-[1200px] bg-slate-900 p-2.5 rounded-3xl shadow-2xl border border-slate-800 my-2 no-print">
        <VectorDocViewer document={<CvPdfDocument cvData={cvData} />} />
      </div>
    </div>
  );
}
