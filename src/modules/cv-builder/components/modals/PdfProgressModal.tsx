import React from 'react';
import { Modal } from '../../../../shared/core/ui/Modal';
import { button, radius } from '../../../../shared/core/uiDesignSystem';
import { t } from '../../../../shared/i18n/useText';

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
            className={`w-full py-2 ${button.success} text-xs font-bold`}
          >
            {t.common.actions.accept}
          </button>
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
            <div className={`w-12 h-12 rounded-[${radius.modal}] bg-[var(--color-status-success-muted)] border border-[var(--color-status-success-base)]/50 text-[var(--color-status-success-text)] flex items-center justify-center text-2xl mx-auto`}>
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
