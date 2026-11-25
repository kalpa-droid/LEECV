import React, { useState } from 'react';
import { Cloud } from 'lucide-react';
import { Modal } from '../../../../shared/core/ui/Modal';
import { button, radius } from '../../../../shared/core/uiDesignSystem';
import { t } from '../../../../shared/i18n/useText';
import { getLastExportedArtifact } from '../../../../shared/core/utils/lastExportArtifactStore';
import { uploadFileToPersonalDrive } from '../../../../shared/core/storage/googleDriveClient';
import { useToast } from '../../../../shared/core/ui/Toast';

export default function PdfProgressModal({ isGenerating, isComplete, onClose }: any) {
  const { showSuccess, showError } = useToast();
  const [uploadingDrive, setUploadingDrive] = useState(false);
  const [driveUploadedName, setDriveUploadedName] = useState<string | null>(null);
  const lastArtifact = isComplete ? getLastExportedArtifact() : null;

  const handleUploadDrive = async () => {
    if (!lastArtifact || uploadingDrive) return;
    setUploadingDrive(true);
    try {
      const res = await uploadFileToPersonalDrive({
        blob: lastArtifact.blob,
        fileName: lastArtifact.fileName,
        folderKind: 'finished_docs',
      });
      setDriveUploadedName(res.file.name);
      showSuccess(`Archivo guardado en ${res.folderName}.`);
    } catch (err: any) {
      showError(err?.message || 'No se pudo subir el archivo a Google Drive.');
    } finally {
      setUploadingDrive(false);
    }
  };

  return (
    <Modal
      isOpen={isGenerating || isComplete}
      onClose={onClose}
      size="sm"
      closeOnOverlayClick={isComplete}
      closeOnEscape={isComplete}
      footer={
        isComplete ? (
          <div className="w-full flex flex-col gap-2">
            {lastArtifact && !driveUploadedName && (
              <button
                type="button"
                disabled={uploadingDrive}
                onClick={() => void handleUploadDrive()}
                className={`w-full py-2 ${button.secondary} text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer`}
              >
                <Cloud className="w-4 h-4 shrink-0" />
                <span>{uploadingDrive ? 'Subiendo a tu Google Drive...' : 'Guardar copia en mi Google Drive (incluido)'}</span>
              </button>
            )}
            {driveUploadedName && (
              <p className="text-[11px] font-bold text-center text-[var(--color-status-success-text)]">
                ✓ Copiado a Google Drive ({driveUploadedName})
              </p>
            )}
            <button
              onClick={onClose}
              className={`w-full py-2 ${button.success} text-xs font-bold`}
            >
              {t.common.actions.accept}
            </button>
          </div>
        ) : null
      }
    >
      <div className="text-center space-y-4 p-2">
        {isGenerating ? (
          <>
            <div className="w-12 h-12 border-4 border-[var(--color-status-warning-base)] border-t-transparent rounded-full animate-spin mx-auto" />
            <h3 className="text-base font-black text-[var(--ui-text-primary)]">{t.modals.pdfProgress.generatingTitle}</h3>
            <p className="text-xs text-[var(--ui-text-secondary)]">
              {t.modals.pdfProgress.generatingSub}
            </p>
          </>
        ) : (
          <>
            <div
              className="w-12 h-12 bg-[var(--color-status-success-muted)] border border-[var(--color-status-success-base)]/50 text-[var(--color-status-success-text)] flex items-center justify-center text-2xl mx-auto"
              style={{ borderRadius: radius.modal }}
            >
              ✓
            </div>
            <h3 className="text-base font-black text-[var(--ui-text-primary)]">{t.modals.pdfProgress.successTitle}</h3>
            <p className="text-xs text-[var(--ui-text-secondary)]">
              {t.modals.pdfProgress.successSub}
            </p>
          </>
        )}
      </div>
    </Modal>
  );
}
