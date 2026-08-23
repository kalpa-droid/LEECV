import React, { Component, ReactNode } from 'react';
import { colorSystem, button, typeScale } from '../uiDesignSystem';
import { navigation } from '../utils/navigation';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error | null;
}

/**
 * Red de contención global — envuelve toda la app en main.tsx. Si cualquier
 * componente tira una excepción en render, esto evita la pantalla en blanco
 * y ofrece 2 salidas: reintentar sin perder datos, o resetear limpio.
 *
 * Antes vivía escrito a mano adentro de main.tsx, con su propia familia de
 * colores (slate/purple/emerald) desconectada de colorSystem. Ahora usa el
 * mismo núcleo que el resto de la interfaz.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
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
    navigation.goTo(`${navigation.getOrigin()}${navigation.getPathname()}?clear=${Date.now()}`);
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex flex-col items-center justify-center p-6 text-center font-sans"
          style={{ backgroundColor: colorSystem.criticalSurface.bg, color: colorSystem.criticalSurface.textPrimary }}
        >
          <div
            className="max-w-md p-6 rounded-2xl shadow-2xl space-y-4"
            style={{ backgroundColor: colorSystem.criticalSurface.card, border: `1px solid ${colorSystem.accent.base}66` }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto text-xl font-black"
              style={{ backgroundColor: `${colorSystem.status.danger.base}33`, border: `1px solid ${colorSystem.status.danger.base}`, color: colorSystem.status.danger.base }}
            >
              !
            </div>
            <h2 className={typeScale.pageTitle} style={{ color: colorSystem.criticalSurface.textPrimary }}>
              Hubo un problema
            </h2>
            <p className={typeScale.helper} style={{ color: colorSystem.criticalSurface.textSecondary }}>
              Ocurrió un inconveniente temporal al mostrar el editor.
            </p>
            {this.state.error?.message && (
              <div
                className="p-3 rounded-xl text-[11px] font-mono break-all text-left"
                style={{ backgroundColor: `${colorSystem.status.danger.base}22`, border: `1px solid ${colorSystem.status.danger.base}66`, color: colorSystem.status.danger.base }}
              >
                {this.state.error.message}
              </div>
            )}
            <div className="space-y-2 pt-2">
              <button onClick={this.handleSoftRetry} className={`w-full ${button.base} ${button.primary}`}>
                Reintentar (conservar datos)
              </button>
              <button onClick={this.handleHardReset} className={`w-full ${button.base} ${button.ghost}`} style={{ color: colorSystem.criticalSurface.textSecondary }}>
                Reiniciar editor
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
