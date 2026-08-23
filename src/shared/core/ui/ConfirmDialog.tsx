import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { colorSystem, typeScale, button } from '../uiDesignSystem';

const ConfirmContext = createContext(null);

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
      {dialogState.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div
            className="bg-white rounded-[16px] border-2 max-w-sm w-full p-5 shadow-2xl space-y-4 text-center transform animate-scale-up"
            style={{ borderColor: colorSystem.neutral.border }}
          >
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
              <h3 className={typeScale.sectionTitle} style={{ color: colorSystem.neutral.textPrimary }}>
                {dialogState.title}
              </h3>
              <p className={typeScale.helper} style={{ color: colorSystem.neutral.textSecondary }}>
                {dialogState.message}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
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
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    return {
      confirm: ({ title, message, onConfirm }) => {
        if (window.confirm(`${title}\n${message}`)) {
          if (onConfirm) onConfirm();
        }
      }
    };
  }
  return context;
}
