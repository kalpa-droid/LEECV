import React, { useState, useMemo } from 'react';
import { PDFViewer } from '@react-pdf/renderer';
import { PlannerPdfDocument } from '../../shared/core/pdf-engine/renderer/PlannerPdfDocument';
import { getPreset } from '../../shared/core/pdf-engine/layers/presets/presetRegistry';
import { DocumentTypeId } from '../../types/document';


interface PlannerStudioContentProps {
  onNavigateToDocument: (docType: DocumentTypeId, draftId?: string) => void;
  currentDraftId: string | null;
}

export const PlannerStudioContent: React.FC<PlannerStudioContentProps> = ({
  onNavigateToDocument,
  currentDraftId
}) => {
  const [data, setData] = useState({
    year: new Date().getFullYear(),
    gridType: 'dot-grid' as const,
    layout: {
      pageSizeId: 'b5'
    },
    theme: {
      primaryColor: '#1E293B',
      fontFamily: 'Helvetica'
    }
  });

  const preset = getPreset('planner-clasico');

  const pdfElement = useMemo(() => (
    <PlannerPdfDocument data={data} presetId={preset.id} theme={data.theme} />
  ), [data, preset.id]);

  return (
    <div className="flex w-full h-screen bg-[var(--ui-bg-base)] text-[var(--ui-text-primary)] fixed inset-0 z-50">
      {/* Botón de volver temporal */}
      <button 
        onClick={() => onNavigateToDocument('cv')}
        className="absolute top-4 right-4 z-50 px-4 py-2 bg-black text-white border border-white/20 rounded-lg hover:bg-white/10"
      >
        Cerrar Studio
      </button>

      {/* Barra Lateral (Mock para la Fase 4) */}
      <div className="w-80 bg-[var(--ui-bg-surface)] border-r border-[var(--ui-border-base)] p-6 flex flex-col gap-6 overflow-y-auto z-10 shadow-xl">
        <h2 className="text-xl font-bold">Studio Agendas</h2>
        
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold">Año</label>
          <input 
            type="number" 
            value={data.year} 
            onChange={e => setData(d => ({ ...d, year: parseInt(e.target.value) || new Date().getFullYear() }))}
            className="px-3 py-2 bg-[var(--ui-bg-base)] border border-[var(--ui-border-base)] rounded-md text-[var(--ui-text-primary)]"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold">Retícula</label>
          <select 
            value={data.gridType}
            onChange={e => setData(d => ({ ...d, gridType: e.target.value as any }))}
            className="px-3 py-2 bg-[var(--ui-bg-base)] border border-[var(--ui-border-base)] rounded-md text-[var(--ui-text-primary)]"
          >
            <option value="dot-grid">Puntos (Dot-Grid)</option>
            <option value="lined">Líneas</option>
            <option value="blank">Blanco</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold">Color Principal</label>
          <input 
            type="color" 
            value={data.theme.primaryColor} 
            onChange={e => setData(d => ({ ...d, theme: { ...d.theme, primaryColor: e.target.value } }))}
            className="w-full h-10 p-1 bg-[var(--ui-bg-base)] border border-[var(--ui-border-base)] rounded-md cursor-pointer"
          />
        </div>
      </div>

      {/* Visor PDF Vectorial */}
      <div className="flex-1 bg-[var(--ui-bg-sunken)] p-4 relative overflow-hidden flex flex-col">
        <div className="flex-1 rounded-xl overflow-hidden shadow-2xl border border-[var(--ui-border-base)] bg-[var(--ui-bg-base)]">
          <PDFViewer width="100%" height="100%" className="border-none">
            {pdfElement}
          </PDFViewer>
        </div>
      </div>
    </div>
  );
};
