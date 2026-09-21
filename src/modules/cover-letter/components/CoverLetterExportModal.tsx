import React, { useState } from 'react';
import { FileText, FileType, AlertTriangle, Download } from 'lucide-react';
import { Modal } from '../../../shared/core/ui/Modal';
import { useToast } from '../../../shared/core/ui/Toast';
import { withErrorHandling } from '../../../shared/core/utils/errorHandler';
import { downloadBlob } from '../../../shared/core/utils/downloadUtils';
import { exportCoverLetterToDocx } from '../../../shared/core/export/docxExporter';
import { usePageAwareCreditGate } from '../../../shared/core/hooks/usePageAwareCreditGate';

import { button, elevationSystem, radius } from '../../../shared/core/uiDesignSystem';

interface CoverLetterExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  cvData: any;
  presetId?: string;
}

/**
 * Exportación de Carta de Presentación: mismo criterio que la exportación de
 * Tarjeta (CardSheetExportSelector) — un crédito de página por descarga,
 * consumido en el momento mediante el motor compartido usePageAwareCreditGate,
 * sin el checkout de múltiples proveedores de pago de PdfCheckoutModal (ese
 * flujo queda reservado para CV, que es el documento principal de venta).
 */
export function CoverLetterExportModal({ isOpen, onClose, cvData, presetId = 'carta-clasica' }: CoverLetterExportModalProps) {
  const { showError, showSuccess } = useToast();
  const { consumeCredits, isGating, gateError } = usePageAwareCreditGate();
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);

  const handleExportPdf = async () => {
    const allowed = await consumeCredits(1);
    if (!allowed) return;

    setIsExportingPdf(true);
    await withErrorHandling(
      async () => {
        const { exportDocumentToPDF } = await import('../../../shared/core/pdf-engine/pdfExporter');
        await exportDocumentToPDF(cvData, cvData?.activePresetId || presetId);
        showSuccess('Carta de presentación exportada en PDF.');
        onClose();
      },
      {
        context: 'Exportación de Carta a PDF',
        errorMessage: 'Error al exportar la carta a PDF.',
        notify: (msg) => showError(msg)
      }
    );
    setIsExportingPdf(false);
  };

  const handleExportDocx = async () => {
    const allowed = await consumeCredits(1);
    if (!allowed) return;

    setIsExportingDocx(true);
    await withErrorHandling(
      async () => {
        const blob = await exportCoverLetterToDocx(cvData);
        const fileName = `${cvData?.title || 'Carta de Presentacion'}.docx`;
        downloadBlob(blob, fileName);
        showSuccess('Carta de presentación exportada en Word (.docx).');
        onClose();
      },
      {
        context: 'Exportación de Carta a Word',
        errorMessage: 'Error al exportar la carta a Word.',
        notify: (msg) => showError(msg)
      }
    );
    setIsExportingDocx(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Descargar Carta de Presentación"
      icon={<FileText className="w-5 h-5 text-[var(--ui-rose)]" />}
      size="lg"
    >
      <div className="space-y-4">
        <p className="text-xs text-[var(--ui-text-secondary)]">
          Elegí el formato de descarga. Cada descarga consume 1 crédito de exportación (igual que la Tarjeta Personal).
        </p>

        {gateError && (
          <div className={`p-3 bg-[var(--color-status-danger-muted)] border border-[var(--color-status-danger-text)]/40 rounded-[${radius.card}] text-xs text-[var(--color-status-danger-text)] font-bold flex items-center gap-2`}>
            <AlertTriangle className="w-4 h-4 text-[var(--color-status-danger-text)] flex-shrink-0" />
            <span>{gateError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf || isExportingDocx || isGating}
            className={`p-4 ${button.primary} rounded-[${radius.modal}] flex flex-col items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${elevationSystem.raised}`}
          >
            <Download className="w-5 h-5" />
            <span className="text-xs font-black">
              {isExportingPdf ? 'Generando PDF…' : isGating ? 'Verificando créditos…' : 'Descargar PDF'}
            </span>
          </button>

          <button
            onClick={handleExportDocx}
            disabled={isExportingPdf || isExportingDocx || isGating}
            className={`p-4 ${button.secondary} rounded-[${radius.modal}] flex flex-col items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${elevationSystem.raised}`}
          >
            <FileType className="w-5 h-5" />
            <span className="text-xs font-black">
              {isExportingDocx ? 'Generando Word…' : isGating ? 'Verificando créditos…' : 'Descargar Word (.docx)'}
            </span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
