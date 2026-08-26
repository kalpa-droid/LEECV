import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { colorSystem, typeScale, elevationSystem, radius } from '../uiDesignSystem';

const ToastContext = createContext(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<any[]>([]);

  const addToast = useCallback((message: string, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id: any) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showSuccess = useCallback((msg: string) => addToast(msg, 'success'), [addToast]);
  const showError = useCallback((msg: string) => addToast(msg, 'error'), [addToast]);
  const showWarning = useCallback((msg: string) => addToast(msg, 'warning'), [addToast]);
  const showInfo = useCallback((msg: string) => addToast(msg, 'info'), [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, showSuccess, showError, showWarning, showInfo }}>
      {children}
      {/* Toast Render Container */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 max-w-sm w-full px-4 pointer-events-none">
        {toasts.map(toast => {
          let bg: string = colorSystem.secondary.text;
          let border: string = colorSystem.secondary.base;
          let textColor: string = colorSystem.neutral.textPrimary;

          if (toast.type === 'success') {
            bg = colorSystem.status.success.base;
            border = colorSystem.status.success.text;
          } else if (toast.type === 'error') {
            bg = colorSystem.status.danger.base;
            border = colorSystem.status.danger.text;
          } else if (toast.type === 'warning') {
            bg = colorSystem.status.warning.base;
            border = colorSystem.status.warning.text;
          }

          return (
            <div
              key={toast.id}
              style={{ backgroundColor: bg, borderColor: border, color: textColor }}
              className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-[${radius.card}] ${elevationSystem.overlay} border ${typeScale.body} font-medium transition-all transform animate-slide-up`}
            >
              <div className="flex items-center gap-2">
                {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
                {toast.type === 'error' && <XCircle className="w-4 h-4 flex-shrink-0" />}
                {toast.type === 'warning' && <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
                {toast.type === 'info' && <Info className="w-4 h-4 flex-shrink-0" />}
                <span>{toast.message}</span>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="ml-2 p-1 hover:opacity-75 transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback if rendered outside provider
    return {
      addToast: (msg) => alert(msg),
      showSuccess: (msg) => alert(`✅ ${msg}`),
      showError: (msg) => alert(`❌ ${msg}`),
      showWarning: (msg) => alert(`⚠️ ${msg}`),
      showInfo: (msg) => alert(`ℹ️ ${msg}`)
    };
  }
  return context;
}
