import React, { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('CRITICAL APP ERROR:', error, errorInfo);
  }

  handleReset = () => {
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
              Restaurando Sesión de LEECV
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ocurrió un ajuste de memoria en el navegador. Haz clic abajo para volver al editor limpio.
            </p>
            <button
              onClick={this.handleReset}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-black rounded-xl shadow-lg transition cursor-pointer"
            >
              Restaurar Editor
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
