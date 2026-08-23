import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { colorSystem, typeScale, button } from '../uiDesignSystem';
import { Modal } from './Modal';

const ConfirmContext = createContext<any>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [dialogState, setDialogState] = useState<any>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Eliminar',
    cancelText: 'Cancelar',
    variant: 'danger',
    onConfirm: null
  });

  const confirm = useCallback(({
    title = '¿Confirmar acción?',
    message = '¿Estás seguro de que deseas realizar esta acción?',
    confirmText = 'Sí, continuar',
    cancelText = 'Cancelar',
    variant = 'danger',
    onConfirm
  }: any) => {
    setDialogState({
      isOpen: true,
      title,
      message,
      confirmText,
      cancelText,
      variant,
      onConfirm
    });
  }, []);

  const handleClose = () => {
    setDialogState((prev: any) => ({ ...prev, isOpen: false }));
  };

  const handleConfirm = () => {
    if (dialogState.onConfirm) {
      dialogState.onConfirm();
    }
    handleClose();
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Modal
        isOpen={dialogState.isOpen}
        onClose={handleClose}
        size="sm"
        footer={
          <div className="grid grid-cols-2 gap-2 w-full">
            <button
              type="button"
              className={button.ghost}
              onClick={handleClose}
            >
              {dialogState.cancelText}
            </button>
            <button
              type="button"
              className={dialogState.variant === 'danger' ? button.danger : button.primary}
              onClick={handleConfirm}
            >
              {dialogState.confirmText}
            </button>
          </div>
        }
      >
        <div className="space-y-4 text-center p-2">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto shadow-inner"
            style={{
              backgroundColor: colorSystem.status.danger.muted,
              color: colorSystem.status.danger.text
            }}
          >
            {dialogState.variant === 'danger' ? <Trash2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
          </div>

          <div className="space-y-1">
            <h3 className={`${typeScale.sectionTitle} ui-text-primary`}>
              {dialogState.title}
            </h3>
            <p className={`${typeScale.helper} ui-text-secondary`}>
              {dialogState.message}
            </p>
          </div>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    return {
      confirm: ({ title, message, onConfirm }: any) => {
        if (window.confirm(`${title}\n${message}`)) {
          if (onConfirm) onConfirm();
        }
      }
    };
  }
  return context;
}
