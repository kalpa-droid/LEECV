import React from 'react';
import { exportCVToJson } from '../../../../shared/core/utils/jsonImporterExporter';
import { Modal } from '../../../../shared/core/ui/Modal';

export default function JsonDownloadModal({ isOpen, onClose, cvData }: any) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Respaldo en Formato .JSON"
      icon={<span className="text-xl">💾</span>}
      size="md"
      footer={
        <div className="w-full flex items-center justify-between gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Cerrar
          </button>
          <button
            onClick={() => {
              exportCVToJson(cvData);
              onClose();
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer"
          >
            <span>⬇️ Descargar Archivo .JSON</span>
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        <p className="text-xs text-slate-300 leading-relaxed">
          El archivo <strong>.JSON</strong> guarda toda la información ingresada en tu CV (datos personales, experiencia, títulos, fotos y certificados).
        </p>

        <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl text-[11px] text-slate-300 space-y-1.5">
          <p className="font-extrabold text-indigo-400">💡 ¿Para qué sirve este archivo?</p>
          <p className="text-slate-400 leading-relaxed">
            Puedes conservarlo en tu computadora o pendrive. Si en el futuro ingresas a LEECV desde otro dispositivo, solo presionas <strong>"Abrir"</strong> y cargas este archivo para recuperar tu CV completo de inmediato.
          </p>
        </div>
      </div>
    </Modal>
  );
}
