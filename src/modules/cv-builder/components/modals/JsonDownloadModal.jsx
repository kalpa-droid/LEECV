import React from 'react';
import { exportCVToJson } from '../../../../utils/jsonImporterExporter';

export default function JsonDownloadModal({ isOpen, onClose, cvData }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in no-print">
      <div className="bg-slate-900 border border-indigo-500/40 rounded-3xl max-w-md w-full p-6 text-white space-y-4 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/50 text-indigo-400 flex items-center justify-center text-2xl">
            💾
          </div>
          <div>
            <h3 className="text-base font-black text-white">Respaldo en Formato .JSON</h3>
            <p className="text-xs text-indigo-300 font-bold">100% Gratuito y Libre de Costo</p>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          El archivo <strong>.JSON</strong> guarda toda la información ingresada en tu CV (datos personales, experiencia, títulos, fotos y certificados).
        </p>

        <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl text-[11px] text-slate-300 space-y-1.5">
          <p className="font-extrabold text-indigo-400">💡 ¿Para qué sirve este archivo?</p>
          <p className="text-slate-400 leading-relaxed">
            Puedes conservarlo en tu computadora o pendrive. Si en el futuro ingresas a LEECV desde otro dispositivo, solo presionas <strong>"Abrir"</strong> y cargas este archivo para recuperar tu CV completo de inmediato.
          </p>
        </div>

        <div className="space-y-2 pt-2">
          <button
            onClick={() => {
              exportCVToJson(cvData);
              onClose();
            }}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>⬇️ Descargar Archivo .JSON a mi Equipo</span>
          </button>
          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
