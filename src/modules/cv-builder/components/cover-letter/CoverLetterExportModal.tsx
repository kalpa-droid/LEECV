import React, { useState } from 'react';
import { FileText, FileType, Download } from 'lucide-react';
import { Modal } from '../../../../shared/core/ui/Modal';
import { ActionGrid } from '../../../../shared/core/ui/ActionGrid';
import { ActionTileButton } from '../../../../shared/core/ui/ActionTileButton';
import { SectionSwitch } from '../../../../shared/core/ui/SectionSwitch';
import { useToast } from '../../../../shared/core/ui/Toast';
import { withErrorHandling } from '../../../../shared/core/utils/errorHandler';
import { downloadBlob } from '../../../../shared/core/utils/downloadUtils';
import { exportCoverLetterToDocx } from '../../../../shared/core/export/docxExporter';

import { button, elevationSystem, radius } from '../../../../shared/core/uiDesignSystem';

interface CoverLetterExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  cvData: any;
  presetId?: string;
}

export function CoverLetterExportModal({ isOpen, onClose, cvData, presetId = 'carta-clasica' }: CoverLetterExportModalProps) {
  const { showError, showSuccess } = useToast();
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    await withErrorHandling(
      async () => {
        const [{ exportDocumentToPDF }] = await Promise.all([
          import('../../../../shared/core/pdf-engine/pdfExporter'),
          import('../../pdf/CoverLetterPdfDocument'),
        ]);
        await exportDocumentToPDF(cvData, cvData?.activePresetId || presetId);
        showSuccess('Carta de presentación exportada en PDF por separado.');
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
    setIsExportingDocx(true);
    await withErrorHandling(
      async () => {
        const blob = await exportCoverLetterToDocx(cvData);
        const fileName = `${cvData?.title || 'Carta de Presentacion'}.docx`;
        downloadBlob(blob, fileName);
        showSuccess('Carta de presentación exportada en Word (.docx) por separado.');
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
      helpText="La exportación de cartas es gratis (sin consumir créditos) y siempre se descarga en un archivo separado del CV."
      icon={<FileText className="w-5 h-5 text-[var(--ui-rose)]" />}
      size="lg"
    >
      <div className="space-y-4">
        <div className="bg-[var(--color-status-warning-muted)] border border-[var(--color-status-warning-base)]/40 p-3 rounded-[12px] flex items-center justify-between gap-3">
          <span className="text-xs text-[var(--color-status-warning-text)] font-bold leading-snug">
            Confirmación obligatoria: revisé el texto y reemplacé cualquier dato de ejemplo.
          </span>
          <SectionSwitch
            checked={hasReviewed}
            onChange={setHasReviewed}
            label="Revisión de la carta"
            announceOnChange={false}
          />
        </div>

        <ActionGrid columns={2}>
          <ActionTileButton
            label={isExportingPdf ? 'Generando PDF…' : 'Descargar PDF'}
            icon={<Download className="w-4 h-4" />}
            badge="Gratis"
            variant="accent"
            disabled={!hasReviewed || isExportingPdf || isExportingDocx}
            helpText="Genera la carta en formato PDF listo para enviar por correo o postulación, sin consumir créditos."
            onClick={handleExportPdf}
          />
          <ActionTileButton
            label={isExportingDocx ? 'Generando Word…' : 'Descargar Word'}
            icon={<FileType className="w-4 h-4" />}
            badge=".docx"
            variant="secondary"
            disabled={!hasReviewed || isExportingPdf || isExportingDocx}
            helpText="Genera un documento Word (.docx) editable por separado del CV sin consumir créditos."
            onClick={handleExportDocx}
          />
        </ActionGrid>
      </div>
    </Modal>
  );
}
