import React, { useState } from 'react';
import { login } from '../../shared/core/auth/authService';
import { Lock } from 'lucide-react';
import { isValidEmail } from '../../shared/core/utils/validationEngine';

import { elevationSystem, radius, button } from '../../shared/core/uiDesignSystem';

export default function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);


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
    <div className="min-h-screen flex items-center justify-center bg-[var(--ui-bg-panel)] px-4">
      <div className={`bg-[var(--ui-bg-card)] text-[var(--ui-text-primary)] rounded-[${radius.modal}] ${elevationSystem.overlay} p-8 w-full max-w-md border border-[var(--ui-border)] space-y-6`}>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-[${radius.modal}] bg-[var(--color-accent-muted)] border border-[var(--color-accent-muted)] text-[var(--color-accent-text)] flex items-center justify-center flex-shrink-0`}>
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-black text-xl text-[var(--ui-text-primary)]">Panel de Administración</h1>
            <p className="text-xs text-[var(--ui-text-secondary)]">Acceso exclusivo para administradores supremos</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-extrabold text-[var(--ui-text-primary)]">Email de Administrador</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full mt-1 px-3.5 py-2.5 rounded-[${radius.card}] bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] text-[var(--ui-text-primary)] text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-muted)]`}
              required
            />
          </div>

          <div>
            <label className="text-xs font-extrabold text-[var(--ui-text-primary)]">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full mt-1 px-3.5 py-2.5 rounded-[${radius.card}] bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] text-[var(--ui-text-primary)] text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-muted)]`}
              required
            />
          </div>

          {error && <p className={`text-[var(--color-status-danger-text)] text-xs font-bold text-center p-2 rounded-[${radius.card}] bg-[var(--color-status-danger-muted)] border border-[var(--color-status-danger-base)]/40`}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 ${button.primary} rounded-[${radius.modal}] cursor-pointer`}
          >
            {loading ? 'Verificando...' : 'Ingresar con Contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}
