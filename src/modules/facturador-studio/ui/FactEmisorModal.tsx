import React from 'react';
import { Modal } from '../../../shared/core/ui/Modal';
import { FactStepBaseProps } from '../facturadorStepsShared';
import { FactEmisorStep } from '../steps/FactEmisorStep';
import { button } from '../../../shared/core/uiDesignSystem';

interface FactEmisorModalProps extends FactStepBaseProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FactEmisorModal: React.FC<FactEmisorModalProps> = ({
  isOpen,
  onClose,
  ...stepProps
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tu negocio y datos fiscales"
      size="lg"
      footer={
        <div className="flex justify-end">
          <button type="button" onClick={onClose} className={`${button.primary} text-xs`}>
            Listo, volver a facturar
          </button>
        </div>
      }
    >
      <FactEmisorStep {...stepProps} />
    </Modal>
  );
};

export default FactEmisorModal;
