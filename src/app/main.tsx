import React, { StrictMode, Component, lazy, Suspense, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';

const App = lazy(() => import('./App'));
const AdminDashboard = lazy(() => import('../modules/admin/AdminDashboard'));

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('CRITICAL APP ERROR:', error, errorInfo);
  }

  handleSoftRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleHardReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.href = window.location.origin + window.location.pathname + '?clear=' + Date.now();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="max-w-md bg-slate-900 border border-purple-500/40 p-6 rounded-2xl shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-purple-600/20 border border-purple-500 text-purple-400 flex items-center justify-center mx-auto text-xl font-black">
              !
            </div>
            <h2 className="text-lg font-black tracking-wide text-purple-300">
              Aviso de Sesión de LEECV
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Ocurrió un inconveniente temporal en la renderización del editor:
            </p>
            {this.state.error?.message && (
              <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-red-300 text-[11px] font-mono break-all text-left">
                {this.state.error.message}
              </div>
            )}
            <div className="space-y-2 pt-2">
              <button
                onClick={this.handleSoftRetry}
                className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black rounded-xl shadow-lg transition cursor-pointer"
              >
                Reintentar Cargar el Editor (Conservar Datos)
              </button>
              <button
                onClick={this.handleHardReset}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Restaurar Editor Limpio
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const isAdminRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
const RootComponent = isAdminRoute ? AdminDashboard : App;

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <Suspense fallback={
          <div className="min-h-screen bg-[${colorSystem.neutral.textPrimary}] text-white flex items-center justify-center font-bold">
            Cargando LEECV...
          </div>
        }>
          <RootComponent />
        </Suspense>
      </ErrorBoundary>
    </StrictMode>,
  );
}
