import React from 'react';
import { 
  Printer, 
  Eye, 
  FilePlus
} from 'lucide-react';

export default function Navbar({ 
  onPrint, 
  onLoadExampleCV, 
  onStartNewCVWizard 
}) {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800 text-white shadow-xl no-print">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center font-black text-xl shadow-lg shadow-purple-500/20">
            CV
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-wide flex items-center gap-1.5 text-white">
              CVPREMIUM <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">Editorial A4</span>
            </h1>
            <p className="text-xs text-slate-400">Plataforma Profesional de CV</p>
          </div>
        </div>

        {/* Global Action Buttons (No duplicated buttons) */}
        <div className="flex items-center gap-3">
          {/* VER CV DE EJEMPLO */}
          <button
            onClick={onLoadExampleCV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
            title="Cargar currículum de ejemplo completo de Mónica Burgos (Editable)"
          >
            <Eye className="w-4 h-4 text-purple-400" /> Ver CV de Ejemplo
          </button>

          {/* NUEVO CV (ASISTENTE PASO A PASO) */}
          <button
            onClick={onStartNewCVWizard}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-purple-600/90 hover:bg-purple-600 border border-purple-500/40 transition shadow-md shadow-purple-600/20"
            title="Iniciar asistente para crear un nuevo CV desde cero paso a paso"
          >
            <FilePlus className="w-4 h-4 text-pink-300" /> Nuevo CV (Paso a Paso)
          </button>

          {/* IMPRIMIR / PDF A4 */}
          <button
            onClick={onPrint}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition transform hover:scale-[1.02] active:scale-95"
          >
            <Printer className="w-4 h-4" /> IMPRIMIR / PDF A4
          </button>
        </div>
      </div>
    </header>
  );
}
