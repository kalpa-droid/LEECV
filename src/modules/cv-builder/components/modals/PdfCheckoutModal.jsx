import React from 'react';

export default function PdfCheckoutModal({ isOpen, onClose, onConfirm }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in no-print">
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-md w-full p-6 text-white space-y-4 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/50 text-amber-400 flex items-center justify-center text-2xl">
            📄
          </div>
          <div>
            <h3 className="text-base font-black text-white">Exportar Documento PDF A4</h3>
            <p className="text-xs text-amber-300 font-bold">Costo por descarga: $1 USD (o equivalente)</p>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Tu currículum se procesará en formato A4 nativo en alta resolución listo para enviar a postulaciones o imprimir.
        </p>

        <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl text-xs text-slate-300 space-y-1">
          <p className="font-extrabold text-amber-400">🎁 ¡Copia de Respaldo Incluida Gratis!</p>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Al exportar tu PDF, se guardará automáticamente un archivo de respaldo <code>.json</code> en tu equipo o correo para que puedas volver a cargarlo en cualquier momento sin perder tus datos.
          </p>
        </div>

        <div className="space-y-2 pt-2">
          <button
            onClick={onConfirm}
            className="w-full py-3 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>💳 Generar PDF e Incluir Respaldo .JSON</span>
          </button>
          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Volver al Editor
          </button>
        </div>
      </div>
    </div>
  );
}
