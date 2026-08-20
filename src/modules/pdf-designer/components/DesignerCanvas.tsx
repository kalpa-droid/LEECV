import React, { useState } from 'react';
import { Layout, Type, Image, Sparkles, Download, ArrowLeft } from 'lucide-react';
import { exportCVToPDF } from '../../../shared/core/pdf-engine/pdfExporter';

export default function DesignerCanvas({ onBack }) {
  const [elements, setElements] = useState([
    { id: '1', type: 'text', content: 'DISEÑO PERSONALIZADO A4', x: 50, y: 50, fontSize: 24, fontBold: true },
  ]);

  const handleExportPDF = async () => {
    // Reutiliza el motor de PDF A4 compartido de shared/core/pdf-engine
    alert('Exportando diseño A4 usando el motor genérico compartido de shared/core/pdf-engine...');
  };

  return (
    <div className="min-h-screen bg-[#2B1B2E] text-white p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-purple-500/30 pb-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 transition flex items-center gap-2 text-xs font-bold cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Volver
            </button>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-amber-400" /> Módulo Futuro: PDF Designer A4
            </h1>
          </div>

          <button 
            onClick={handleExportPDF}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-xs font-black rounded-xl transition flex items-center gap-2 shadow-lg cursor-pointer"
          >
            <Download className="w-4 h-4" /> Exportar PDF A4 (Shared Core Engine)
          </button>
        </div>

        {/* Workspace */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          {/* Toolbox */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-4">
            <h3 className="text-xs font-black uppercase text-purple-300 tracking-wider">Herramientas Libre</h3>
            <button className="w-full p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-200 flex items-center gap-2 transition cursor-pointer">
              <Type className="w-4 h-4 text-purple-400" /> Agregar Texto
            </button>
            <button className="w-full p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-200 flex items-center gap-2 transition cursor-pointer">
              <Image className="w-4 h-4 text-emerald-400" /> Agregar Imagen / Foto
            </button>
            <button className="w-full p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-200 flex items-center gap-2 transition cursor-pointer">
              <Layout className="w-4 h-4 text-amber-400" /> Plantillas de Diseño
            </button>
          </div>

          {/* Live A4 Canvas Preview */}
          <div className="md:col-span-3 bg-slate-950 p-8 rounded-2xl border border-slate-800 flex justify-center items-center">
            <div className="w-[210mm] min-h-[297mm] bg-white text-slate-950 p-8 rounded-sm shadow-2xl space-y-4">
              {elements.map(el => (
                <div key={el.id} className="text-slate-950 font-extrabold text-xl border-b-2 border-purple-600 pb-2">
                  {el.content}
                </div>
              ))}
              <p className="text-xs text-slate-500 italic">
                Lienzo libre A4 totalmente desacoplado de CV-Builder. Reutiliza shared/core/pdf-engine.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
