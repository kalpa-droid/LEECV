import React from 'react';
import { Modal } from '../../../../shared/core/ui/Modal';

export default function PdfProgressModal({ isGenerating, isComplete, onClose }: any) {
  return (
    <Modal
      isOpen={isGenerating || isComplete}
      onClose={onClose}
      size="sm"
      closeOnOverlayClick={isComplete}
      closeOnEscape={isComplete}
      footer={
        isComplete ? (
          <button
            onClick={onClose}
            className="w-full py-2 bg-[var(--color-status-success-base)] hover:opacity-90 text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Aceptar
          </button>
        ) : null
      }
    >
      <div className="text-center space-y-4 p-2">
        {isGenerating ? (
          <>
            <div className="w-12 h-12 border-4 border-[var(--color-status-warning-base)] border-t-transparent rounded-full animate-spin mx-auto" />
            <h3 className="text-base font-black text-white">Generando Documento PDF A4...</h3>
            <p className="text-xs text-white/80">
              Procesando páginas, imágenes y anexos. La descarga iniciará en unos instantes.
            </p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-2xl bg-[var(--color-status-success-muted)] border border-[var(--color-status-success-base)]/50 text-[var(--color-status-success-text)] flex items-center justify-center text-2xl mx-auto">
              ✓
            </div>
            <h3 className="text-base font-black text-white">¡PDF Generado Exitosamente!</h3>
            <p className="text-xs text-white/80">
              El archivo PDF A4 y la copia de respaldo .JSON se han descargado correctamente.
            </p>
          </>
        )}
      </div>
    </Modal>
  );
}
