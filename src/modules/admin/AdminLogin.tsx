import React, { useState } from 'react';
import { login, signInWithGoogle } from '../auth/authService';
import { Lock } from 'lucide-react';
import { isValidEmail } from '../../shared/core/utils/validationEngine';

export default function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  async function handleGoogleLogin() {
    setError('');
    setLoadingGoogle(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err?.message || 'Inconveniente al conectar con Google.');
      setLoadingGoogle(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setError('Por favor ingresá un formato de correo electrónico válido.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      onLogin();
    } catch {
      setError('Email o contraseña incorrectos.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-neutral-text-primary)] px-4">
      <div className="bg-[var(--color-neutral-text-primary)] text-white rounded-3xl shadow-2xl p-8 w-full max-w-md border border-white/10 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[var(--color-accent-base)]/20 border border-[var(--color-accent-base)]/40 text-white flex items-center justify-center flex-shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-black text-xl text-white">Panel de Administración</h1>
            <p className="text-xs text-white/70">Acceso exclusivo para administradores supremos</p>
          </div>
        </div>

        {/* Iniciar Sesión con Google */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loadingGoogle}
            className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-[var(--color-neutral-surface-muted)] text-[var(--color-neutral-text-primary)] font-extrabold text-sm flex items-center justify-center gap-3 transition shadow-lg cursor-pointer disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.26v3.15C3.26 21.3 7.35 24 12 24z"/>
              <path fill="#FBBC05" d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.26C.46 8.23 0 10.06 0 12s.46 3.77 1.26 5.39l4.02-3.15z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.7 1.26 6.61l4.02 3.15c.95-2.85 3.6-4.96 6.72-4.96z"/>
            </svg>
            <span>{loadingGoogle ? 'Conectando con Google...' : 'Ingresar con Google'}</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-px bg-white/10 flex-1" />
          <span className="text-[11px] font-bold text-white/50 uppercase">o con email y clave</span>
          <div className="h-px bg-white/10 flex-1" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-extrabold text-white/80">Email de Administrador</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/20 text-white text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-base)]"
              required
            />
          </div>

          <div>
            <label className="text-xs font-extrabold text-white/80">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/20 text-white text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-base)]"
              required
            />
          </div>

          {error && <p className="text-[var(--color-status-danger-text)] text-xs font-bold text-center p-2 rounded-xl bg-[var(--color-status-danger-muted)] border border-[var(--color-status-danger-base)]/40">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl font-black text-xs text-white bg-[var(--color-accent-base)] hover:bg-[var(--color-accent-brand-hover)] transition shadow-lg disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Verificando...' : 'Ingresar con Contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}
