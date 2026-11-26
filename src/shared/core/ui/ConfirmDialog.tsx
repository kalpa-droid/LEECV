import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { AlertTriangle, Trash2, BookOpen } from 'lucide-react';
import { colorSystem, typeScale, button, elevationSystem } from '../uiDesignSystem';
import { Modal } from './Modal';

export interface ConfirmOptions {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const resolverRef = useRef<((accepted: boolean) => void) | null>(null);
  const [dialogState, setDialogState] = useState<
    Required<Omit<ConfirmOptions, 'onConfirm' | 'onCancel'>> & {
      isOpen: boolean;
      onConfirm?: (() => void) | null;
      onCancel?: (() => void) | null;
    }
  >({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Eliminar',
    cancelText: 'Cancelar',
    variant: 'danger',
    onConfirm: null,
    onCancel: null,
  });

  const confirm = useCallback(
    ({
      title = '¿Confirmar acción?',
      message = '¿Estás seguro de que deseas realizar esta acción?',
      confirmText = 'Sí, continuar',
      cancelText = 'Cancelar',
      variant = 'danger',
      onConfirm,
      onCancel,
    }: ConfirmOptions): Promise<boolean> => {
      if (resolverRef.current) {
        resolverRef.current(false);
        resolverRef.current = null;
      }
      return new Promise<boolean>((resolve) => {
        resolverRef.current = resolve;
        setDialogState({
          isOpen: true,
          title,
          message,
          confirmText,
          cancelText,
          variant,
          onConfirm: onConfirm ?? null,
          onCancel: onCancel ?? null,
        });
      });
    },
    [],
  );

  const handleClose = () => {
    const cb = dialogState.onCancel;
    setDialogState((prev) => ({ ...prev, isOpen: false, onConfirm: null, onCancel: null }));
    if (cb) cb();
    if (resolverRef.current) {
      const resolve = resolverRef.current;
      resolverRef.current = null;
      resolve(false);
    }
  };

  const handleConfirm = () => {
    const cb = dialogState.onConfirm;
    setDialogState((prev) => ({ ...prev, isOpen: false, onConfirm: null, onCancel: null }));
    if (cb) cb();
    if (resolverRef.current) {
      const resolve = resolverRef.current;
      resolverRef.current = null;
      resolve(true);
    }
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
            <button type="button" className={button.ghost} onClick={handleClose}>
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
            className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${elevationSystem.raised}`}
            style={{
              backgroundColor:
                dialogState.variant === 'danger'
                  ? colorSystem.status.danger.muted
                  : dialogState.variant === 'info'
                    ? colorSystem.secondary.muted
                    : colorSystem.status.warning.muted,
              color:
                dialogState.variant === 'danger'
                  ? colorSystem.status.danger.text
                  : dialogState.variant === 'info'
                    ? colorSystem.secondary.text
                    : colorSystem.status.warning.text,
            }}
          >
            {dialogState.variant === 'danger' ? (
              <Trash2 className="w-6 h-6" />
            ) : dialogState.variant === 'info' ? (
              <BookOpen className="w-6 h-6" />
            ) : (
              <AlertTriangle className="w-6 h-6" />
            )}
          </div>

          <div className="space-y-1">
            <h3 className={`${typeScale.sectionTitle} ui-text-primary`}>{dialogState.title}</h3>
            <p className={`${typeScale.helper} ui-text-secondary`}>{dialogState.message}</p>
          </div>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmContextValue {
  const context = useContext(ConfirmContext);
  if (!context) {
    return {
      confirm: ({ title, message, onConfirm, onCancel }: ConfirmOptions) => {
        const accepted =
          typeof window !== 'undefined' && typeof window.confirm === 'function'
            ? window.confirm(`${title || ''}\n${message || ''}`)
            : false;
        if (accepted) {
          onConfirm?.();
        } else {
          onCancel?.();
        }
        return Promise.resolve(accepted);
      },
    };
  }
  return context;
}
