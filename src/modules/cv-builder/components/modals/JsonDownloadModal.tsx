import React from 'react';
import { exportCVToJson } from '../../../../shared/core/utils/jsonImporterExporter';
import { Modal } from '../../../../shared/core/ui/Modal';

import { elevationSystem, radius } from '../../../../shared/core/uiDesignSystem';

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
            className={`px-4 py-2 bg-[var(--ui-btn-neutral-bg)] hover:bg-[var(--ui-btn-neutral-hover)] text-[var(--ui-btn-neutral-text)] border border-[var(--ui-btn-neutral-border)] text-xs font-bold rounded-[${radius.card}] transition cursor-pointer`}
          >
            Cerrar
          </button>
          <button
            onClick={() => {
              exportCVToJson(cvData);
              onClose();
            }}
            className={`px-4 py-2 bg-[var(--color-accent-purple)] hover:opacity-90 text-white font-black text-xs rounded-[${radius.card}] ${elevationSystem.floating} transition flex items-center gap-2 cursor-pointer`}
          >
            <span>⬇️ Descargar Archivo .JSON</span>
          </button>
        </div>
      }
    >
      <div className={`space-y-4 text-xs p-4 bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] rounded-[${radius.modal}]`}>
        <p className="text-xs text-[var(--ui-text-secondary)] leading-relaxed">
          El archivo <strong>.JSON</strong> guarda toda la información ingresada en tu CV (datos personales, experiencia, títulos, fotos y certificados).
        </p>

        <div className={`p-3.5 bg-[var(--ui-bg-card)] border border-[var(--ui-border)] rounded-[${radius.modal}] text-[11px] text-[var(--ui-text-secondary)] space-y-1.5`}>
          <p className="font-extrabold text-[var(--ui-text-primary)]">💡 ¿Para qué sirve este archivo?</p>
          <p className="text-[var(--ui-text-secondary)] leading-relaxed">
            Puedes conservarlo en tu computadora o pendrive. Si en el futuro ingresas a LEECV desde otro dispositivo, solo presionas <strong>"Abrir"</strong> y cargas este archivo para recuperar tu CV completo de inmediato.
          </p>
        </div>
      </div>
    </Modal>
  );
}
