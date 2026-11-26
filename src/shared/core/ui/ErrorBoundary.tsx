import React, { Component, ReactNode } from 'react';
import { colorSystem, button, typeScale, elevationSystem, radius } from '../uiDesignSystem';
import { navigation } from '../utils/navigation';

interface ErrorBoundaryProps {
  children?: ReactNode;
  title?: string;
  subtitle?: string;
  compact?: boolean;
  /** Cuando cambia este valor (ruta o pestaña activa), el boundary limpia su estado de error automáticamente. */
  resetKey?: string | number;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error | null;
}

function safeFormatErrorMessage(error: unknown): string {
  if (!error) return '';
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && 'message' in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === 'string') return msg;
    if (msg !== undefined && msg !== null) {
      try {
        return JSON.stringify(msg);
      } catch {
        return String(msg);
      }
    }
  }
  try {
    return String(error);
  } catch {
    return 'Error inesperado';
  }
}

/**
 * Red de contención global y localizada — envuelve toda la app en main.tsx, rutas de estudio y visores PDF.
 * Si cualquier componente tira una excepción en render, evita la pantalla en blanco
 * y ofrece salidas seguras sin destruir sesiones ni datos guardados.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private popstateHandler = () => {
    if (this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  componentDidMount(): void {
    try {
      if (!this.state.hasError) {
        sessionStorage.removeItem('chunk_reload_retry');
      }
      if (typeof window !== 'undefined') {
        window.addEventListener('popstate', this.popstateHandler);
      }
    } catch {}
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  componentWillUnmount(): void {
    try {
      if (typeof window !== 'undefined') {
        window.removeEventListener('popstate', this.popstateHandler);
      }
    } catch {}
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('CRITICAL APP ERROR:', error, errorInfo);

    try {
      import('../utils/monitoring')
        .then(({ reportException }) => {
          reportException(error, {
            context: 'ErrorBoundary',
            extra: { componentStack: errorInfo.componentStack },
          });
        })
        .catch(() => {});
    } catch {}

    const errMsg = safeFormatErrorMessage(error);
    const isChunkLoadError =
      Boolean(errMsg) &&
      (/failed to fetch dynamically imported module/i.test(errMsg) ||
        /importing a module script failed/i.test(errMsg) ||
        (/failed to fetch/i.test(errMsg) && errMsg.includes('.js')));

    if (isChunkLoadError) {
      try {
        const hasRetried = sessionStorage.getItem('chunk_reload_retry');
        if (!hasRetried) {
          sessionStorage.setItem('chunk_reload_retry', 'true');
          navigation.goTo(`${navigation.getOrigin()}${navigation.getPathname()}?reload=${Date.now()}`);
          return;
        }
      } catch {}
    }
  }

  handleSoftRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleSafeReloadHome = () => {
    try {
      sessionStorage.removeItem('chunk_reload_retry');
      localStorage.removeItem('leecv_active_tab_id');
    } catch {}
    navigation.goTo('/');
  };

  render() {
    if (this.state.hasError) {
      const displayTitle = this.props.title || 'Hubo un problema';
      const displaySubtitle =
        this.props.subtitle ||
        (this.props.compact
          ? 'Ocurrió un inconveniente al renderizar la vista previa.'
          : 'Ocurrió un inconveniente temporal al mostrar esta pantalla. Tus documentos guardados están a salvo.');
      const errorDetail = safeFormatErrorMessage(this.state.error);

      if (this.props.compact) {
        return (
          <div className="w-full min-h-[360px] p-6 flex flex-col items-center justify-center text-center font-sans">
            <div
              className={`max-w-md w-full p-6 ${elevationSystem.raised} space-y-4`}
              style={{
                borderRadius: radius.card,
                backgroundColor: colorSystem.criticalSurface.card,
                border: `1px solid ${colorSystem.accent.base}44`,
              }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center mx-auto text-lg font-black"
                style={{
                  backgroundColor: `${colorSystem.status.danger.base}22`,
                  border: `1px solid ${colorSystem.status.danger.base}`,
                  color: colorSystem.status.danger.base,
                }}
              >
                !
              </div>
              <h3 className={typeScale.sectionTitle} style={{ color: colorSystem.criticalSurface.textPrimary }}>
                {displayTitle}
              </h3>
              <p className={typeScale.helper} style={{ color: colorSystem.criticalSurface.textSecondary }}>
                {displaySubtitle}
              </p>
              {errorDetail && (
                <div
                  className="p-3 text-[11px] font-mono break-all text-left max-h-32 overflow-y-auto"
                  style={{
                    borderRadius: radius.card,
                    backgroundColor: `${colorSystem.status.danger.base}15`,
                    border: `1px solid ${colorSystem.status.danger.base}44`,
                    color: colorSystem.status.danger.base,
                  }}
                >
                  {errorDetail}
                </div>
              )}
              <div className="pt-2">
                <button onClick={this.handleSoftRetry} className={`w-full ${button.base} ${button.primary}`}>
                  Reintentar vista previa
                </button>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div
          className="min-h-screen flex flex-col items-center justify-center p-6 text-center font-sans"
          style={{
            backgroundColor: colorSystem.criticalSurface.bg,
            color: colorSystem.criticalSurface.textPrimary,
          }}
        >
          <div
            className={`max-w-md p-6 ${elevationSystem.overlay} space-y-4`}
            style={{
              borderRadius: radius.modal,
              backgroundColor: colorSystem.criticalSurface.card,
              border: `1px solid ${colorSystem.accent.base}66`,
            }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto text-xl font-black"
              style={{
                backgroundColor: `${colorSystem.status.danger.base}33`,
                border: `1px solid ${colorSystem.status.danger.base}`,
                color: colorSystem.status.danger.base,
              }}
            >
              !
            </div>
            <h2 className={typeScale.pageTitle} style={{ color: colorSystem.criticalSurface.textPrimary }}>
              {displayTitle}
            </h2>
            <p className={typeScale.helper} style={{ color: colorSystem.criticalSurface.textSecondary }}>
              {displaySubtitle}
            </p>
            {errorDetail && (
              <div
                className="p-3 text-[11px] font-mono break-all text-left max-h-36 overflow-y-auto"
                style={{
                  borderRadius: radius.card,
                  backgroundColor: `${colorSystem.status.danger.base}22`,
                  border: `1px solid ${colorSystem.status.danger.base}66`,
                  color: colorSystem.status.danger.base,
                }}
              >
                {errorDetail}
              </div>
            )}
            <div className="space-y-2 pt-2">
              <button onClick={this.handleSoftRetry} className={`w-full ${button.base} ${button.primary}`}>
                Reintentar (conservar datos)
              </button>
              <button
                onClick={this.handleSafeReloadHome}
                className={`w-full ${button.base} ${button.ghost}`}
                style={{ color: colorSystem.criticalSurface.textSecondary }}
              >
                Volver al inicio (sin borrar mis documentos)
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
