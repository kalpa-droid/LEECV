import React, { useState } from 'react';
import { FileText, FileType, AlertTriangle, Download } from 'lucide-react';
import { Modal } from '../../../shared/core/ui/Modal';
import { useToast } from '../../../shared/core/ui/Toast';
import { withErrorHandling } from '../../../shared/core/utils/errorHandler';
import { downloadBlob } from '../../../shared/core/utils/downloadUtils';
import { exportCoverLetterToDocx } from '../../../shared/core/export/docxExporter';
import { usePageAwareCreditGate } from '../../../shared/core/hooks/usePageAwareCreditGate';
import PdfCheckoutModal from '../../cv-builder/components/modals/PdfCheckoutModal';

import { button, elevationSystem, radius } from '../../../shared/core/uiDesignSystem';

interface CoverLetterExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  cvData: any;
  presetId?: string;
}

export function CoverLetterExportModal({ isOpen, onClose, cvData, presetId = 'carta-clasica' }: CoverLetterExportModalProps) {
  const { showError, showSuccess } = useToast();
  const { consumeCredits, isGating, gateError } = usePageAwareCreditGate();
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<'pdf' | 'docx' | null>(null);
  const [hasReviewed, setHasReviewed] = useState(false);

  const handleExportPdf = async () => {
    const allowed = await consumeCredits(1);
    if (!allowed) {
      setPendingAction('pdf');
      setIsCheckoutOpen(true);
      return;
    }

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
    if (!allowed) {
      setPendingAction('docx');
      setIsCheckoutOpen(true);
      return;
    }

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
    <>
      <Modal
        isOpen={isOpen && !isCheckoutOpen}
        onClose={onClose}
        title="Descargar Carta de Presentación"
        icon={<FileText className="w-5 h-5 text-[var(--ui-rose)]" />}
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-[var(--ui-text-secondary)]">
            Elegí el formato de descarga. Cada descarga consume un pago único.
          </p>

          <div className="bg-[var(--color-status-warning-muted)] border border-[var(--color-status-warning-base)] p-3 rounded-md flex items-start gap-2 mb-2">
            <input
              type="checkbox"
              id="review-gate"
              checked={hasReviewed}
              onChange={(e) => setHasReviewed(e.target.checked)}
              className="mt-1"
            />
            <label htmlFor="review-gate" className="text-xs text-[var(--color-status-warning-text)] leading-tight cursor-pointer">
              <strong>Confirmación Obligatoria:</strong> He revisado cuidadosamente el contenido de esta carta, reemplazado cualquier texto de relleno o sugerencias genéricas de la IA, y confirmo que es veraz y adecuada para la vacante.
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleExportPdf}
              disabled={!hasReviewed || isExportingPdf || isExportingDocx || isGating}
              className={`p-4 ${button.primary} rounded-[${radius.modal}] flex flex-col items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${elevationSystem.raised}`}
            >
              <Download className="w-5 h-5" />
              <span className="text-xs font-black">
                {isExportingPdf ? 'Generando PDF…' : isGating ? 'Verificando pago…' : 'Descargar PDF'}
              </span>
            </button>

            <button
              onClick={handleExportDocx}
              disabled={!hasReviewed || isExportingPdf || isExportingDocx || isGating}
              className={`p-4 ${button.secondary} rounded-[${radius.modal}] flex flex-col items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${elevationSystem.raised}`}
            >
              <FileType className="w-5 h-5" />
              <span className="text-xs font-black">
                {isExportingDocx ? 'Generando Word…' : isGating ? 'Verificando pago…' : 'Descargar Word (.docx)'}
              </span>
            </button>
          </div>
        </div>
      </Modal>

      <PdfCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onConfirm={() => {
          setIsCheckoutOpen(false);
          if (pendingAction === 'pdf') handleExportPdf();
          if (pendingAction === 'docx') handleExportDocx();
        }}
      />
    </>
  );
}
