import React from 'react';

export default function PdfProgressModal({ isGenerating, isComplete, onClose }) {
  if (!isGenerating && !isComplete) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in no-print">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full p-6 text-white text-center space-y-4 shadow-2xl">
        {isGenerating ? (
          <>
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <h3 className="text-base font-black text-white">Generando Documento PDF A4...</h3>
            <p className="text-xs text-slate-300">
              Procesando páginas, imágenes y anexos. La descarga iniciará en unos instantes.
            </p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 flex items-center justify-center text-2xl mx-auto">
              ✓
            </div>
            <h3 className="text-base font-black text-white">¡PDF Generado Exitosamente!</h3>
            <p className="text-xs text-slate-300">
              El archivo PDF A4 y la copia de respaldo .JSON se han descargado correctamente.
            </p>
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Aceptar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
