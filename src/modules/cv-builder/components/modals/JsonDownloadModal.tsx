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
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white/80 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Cerrar
          </button>
          <button
            onClick={() => {
              exportCVToJson(cvData);
              onClose();
            }}
            className="px-4 py-2 bg-[var(--color-accent-purple)] hover:opacity-90 text-white font-black text-xs rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer"
          >
            <span>⬇️ Descargar Archivo .JSON</span>
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-xs p-4 bg-[var(--ui-bg-dock)] text-white rounded-2xl">
        <p className="text-xs text-white/80 leading-relaxed">
          El archivo <strong>.JSON</strong> guarda toda la información ingresada en tu CV (datos personales, experiencia, títulos, fotos y certificados).
        </p>

        <div className="p-3.5 bg-black/40 border border-white/10 rounded-2xl text-[11px] text-white/80 space-y-1.5">
          <p className="font-extrabold text-[var(--color-accent-purple-bright)]">💡 ¿Para qué sirve este archivo?</p>
          <p className="text-white/60 leading-relaxed">
            Puedes conservarlo en tu computadora o pendrive. Si en el futuro ingresas a LEECV desde otro dispositivo, solo presionas <strong>"Abrir"</strong> y cargas este archivo para recuperar tu CV completo de inmediato.
          </p>
        </div>
      </div>
    </Modal>
  );
}
