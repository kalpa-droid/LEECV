import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { button, elevationSystem, radius } from '../uiDesignSystem';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in UI:', error, errorInfo);
    // Here we could also send to Sentry via captureException(error)
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--ui-bg-base)] flex items-center justify-center p-4">
          <div className={`max-w-md w-full bg-[var(--ui-bg-card)] border border-[var(--color-status-danger-base)]/20 p-8 rounded-[${radius.modal}] ${elevationSystem.raised} text-center space-y-6`}>
            <div className={`w-16 h-16 rounded-full bg-[var(--color-status-danger-muted)] text-[var(--color-status-danger-text)] mx-auto flex items-center justify-center mb-4`}>
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-xl font-black text-[var(--ui-text-primary)] mb-2">Algo salió mal</h1>
              <p className="text-xs text-[var(--ui-text-secondary)]">
                La aplicación encontró un error inesperado y no puede continuar. 
                Nuestros ingenieros ya fueron notificados.
              </p>
            </div>
            
            {import.meta.env.DEV && this.state.error && (
              <div className={`text-left p-4 bg-[var(--ui-bg-panel)] rounded-[${radius.card}] overflow-x-auto text-[10px] text-[var(--color-status-danger-text)] font-mono border border-[var(--color-status-danger-base)]/20`}>
                <strong>{this.state.error.name}:</strong> {this.state.error.message}
              </div>
            )}

            <button
              onClick={this.handleReload}
              className={`w-full py-3 flex items-center justify-center gap-2 ${button.primary} rounded-[${radius.control}]`}
            >
              <RefreshCw className="w-4 h-4" />
              <span>Recargar la aplicación</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
