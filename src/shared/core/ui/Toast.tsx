import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showSuccess = useCallback((msg) => addToast(msg, 'success'), [addToast]);
  const showError = useCallback((msg) => addToast(msg, 'error'), [addToast]);
  const showWarning = useCallback((msg) => addToast(msg, 'warning'), [addToast]);
  const showInfo = useCallback((msg) => addToast(msg, 'info'), [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, showSuccess, showError, showWarning, showInfo }}>
      {children}
      {/* Toast Render Container */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 max-w-sm w-full px-4 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-2xl shadow-xl border text-xs font-bold transition-all transform animate-slide-up ${
              toast.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-500'
                : toast.type === 'error'
                ? 'bg-[#FF2E63] text-white border-[#E31555]'
                : toast.type === 'warning'
                ? 'bg-[#FFC93C] text-[#2B1B2E] border-[#F0AE00]'
                : 'bg-[#2B1B2E] text-white border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
              {toast.type === 'error' && <XCircle className="w-4 h-4 flex-shrink-0" />}
              {toast.type === 'warning' && <AlertTriangle className="w-4 h-4 flex-shrink-0 text-[#2B1B2E]" />}
              {toast.type === 'info' && <Info className="w-4 h-4 flex-shrink-0 text-[#00A8A0]" />}
              <span>{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-2 p-1 hover:opacity-75 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
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
