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
      <div className="max-w-7xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2">
        {/* Brand & Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center font-black text-sm sm:text-xl shadow-lg shadow-purple-500/20">
            CV
          </div>
          <div>
            <h1 className="font-extrabold text-sm sm:text-base tracking-wide text-white">
              CVPREMIUM
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-400 hidden sm:block">Plataforma Profesional de CV</p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* VER CV DE EJEMPLO */}
          <button
            onClick={onLoadExampleCV}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-extrabold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
            title="Cargar currículum de ejemplo"
          >
            <Eye className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
            <span>Ejemplo</span>
          </button>

          {/* NUEVO CV */}
          <button
            onClick={onStartNewCVWizard}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-extrabold text-white bg-purple-600/90 hover:bg-purple-600 border border-purple-500/40 transition shadow-md shadow-purple-600/20"
            title="Iniciar un nuevo CV"
          >
            <FilePlus className="w-3.5 h-3.5 text-pink-300 flex-shrink-0" />
            <span>Nuevo</span>
          </button>

          {/* IMPRIMIR */}
          <button
            onClick={onPrint}
            className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white font-extrabold text-xs shadow-lg shadow-purple-600/30 transition transform active:scale-95"
            title="Imprimir o guardar como PDF"
          >
            <Printer className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>
    </header>
  );
}
