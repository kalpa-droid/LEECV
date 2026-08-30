import React from 'react';
import { exportCVToJson, exportCVToZip } from '../../../../shared/core/utils/jsonImporterExporter';
import { Modal } from '../../../../shared/core/ui/Modal';
import { elevationSystem, radius } from '../../../../shared/core/uiDesignSystem';
import { FileText, FileArchive, Download } from 'lucide-react';

export default function JsonDownloadModal({ isOpen, onClose, cvData }: any) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Descargar Copia Portátil (.JSON / .ZIP)"
      icon={<Download className="w-5 h-5 text-[var(--color-status-warning-bright)]" />}
      size="md"
      footer={
        <div className="w-full flex items-center justify-between gap-2">
          <span className="text-[11px] text-[var(--ui-text-secondary)] font-bold">
            💡 Compatible con cualquier dispositivo
          </span>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-1.5 bg-[var(--ui-btn-neutral-bg)] hover:bg-[var(--ui-btn-neutral-hover)] text-[var(--ui-text-primary)] border border-[var(--ui-btn-neutral-border)] text-xs font-bold rounded-[${radius.card}] transition cursor-pointer`}
          >
            Cerrar
          </button>
        </div>
      }
    >
      <div className={`space-y-4 text-xs p-4 bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] rounded-[${radius.modal}] select-none`}>
        <p className="text-xs text-[var(--ui-text-secondary)] leading-relaxed">
          Selecciona el formato de respaldo portátil que prefieras para conservar en tu disco o transferir a otra computadora:
        </p>

        <div className="space-y-3">
          {/* Opción A: Archivo .JSON Liviano */}
          <button
            type="button"
            onClick={() => {
              exportCVToJson(cvData);
              onClose();
            }}
            className={`w-full text-left p-3.5 rounded-[${radius.modal}] bg-[var(--ui-bg-card)] hover:bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] hover:border-[var(--color-secondary-base)] transition group flex items-start gap-3 cursor-pointer`}
          >
            <div className={`p-2.5 rounded-[${radius.card}] bg-[var(--color-secondary-muted)] text-[var(--color-secondary-bright)] group-hover:scale-110 transition flex-shrink-0`}>
              <FileText className="w-5 h-5" />
            </div>
            <div className="space-y-0.5 min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs sm:text-sm text-[var(--ui-text-primary)]">📄 Archivo .JSON Portátil</span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[var(--color-secondary-muted)] text-[var(--color-secondary-bright)]">
                  Más Rápido (1 Solo Archivo)
                </span>
              </div>
              <p className="text-[11px] text-[var(--ui-text-secondary)]">
                Guarda todos tus datos y fotos codificadas dentro de un solo archivo .json. Ideal para restaurar en LEECV en otra PC.
              </p>
            </div>
          </button>

          {/* Opción B: Paquete .ZIP Completo */}
          <button
            type="button"
            onClick={async () => {
              await exportCVToZip(cvData);
              onClose();
            }}
            className={`w-full text-left p-3.5 rounded-[${radius.modal}] bg-[var(--color-accent-purple-light)]/40 hover:bg-[var(--color-accent-purple-light)]/60 border border-[var(--color-accent-purple)]/40 hover:border-[var(--color-accent-purple)]/60 transition group flex items-start gap-3 cursor-pointer`}
          >
            <div className={`p-2.5 rounded-[${radius.card}] bg-[var(--color-accent-purple-light)] text-[var(--color-accent-purple-text)] group-hover:scale-110 transition flex-shrink-0`}>
              <FileArchive className="w-5 h-5" />
            </div>
            <div className="space-y-0.5 min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs sm:text-sm text-[var(--ui-text-primary)]">📦 Paquete Completo (.ZIP)</span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[var(--color-accent-purple-light)] text-[var(--color-accent-purple-text)]">
                  Paquete con Imágenes Reales
                </span>
              </div>
              <p className="text-[11px] text-[var(--ui-text-secondary)]">
                Empaqueta el archivo cv_datos.json junto con tus fotos y certificados originales por separado en una carpeta comprimida.
              </p>
            </div>
          </button>
        </div>
      </div>
    </Modal>
  );
}
