import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Button } from './Button';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [dialogState, setDialogState] = useState({
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
  }) => {
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
    setDialogState(prev => ({ ...prev, isOpen: false }));
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl border-2 border-[#EFE2C9] max-w-sm w-full p-5 shadow-2xl space-y-4 text-center transform animate-scale-up">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto shadow-inner">
              {dialogState.variant === 'danger' ? <Trash2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-black text-[#2B1B2E]">{dialogState.title}</h3>
              <p className="text-xs text-slate-600 font-bold leading-relaxed">{dialogState.message}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button variant="outline" onClick={handleClose}>
                {dialogState.cancelText}
              </Button>
              <Button
                variant={dialogState.variant === 'danger' ? 'danger' : 'secondary'}
                onClick={handleConfirm}
              >
                {dialogState.confirmText}
              </Button>
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
