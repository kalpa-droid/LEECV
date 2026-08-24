import React, { useState } from 'react';
import { login } from '../auth/authService';
import { Lock } from 'lucide-react';
import { isValidEmail } from '../../shared/core/utils/validationEngine';

export default function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
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
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm border border-[var(--color-neutral-border)]/40">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-accent-base)] flex items-center justify-center">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-black text-lg text-[var(--color-neutral-text-primary)]">Panel de Administración</h1>
        </div>

        <label className="text-xs font-bold text-[var(--color-neutral-text-primary)]/70">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 mt-1 px-3 py-2 rounded-lg border border-[var(--color-neutral-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary-base)]"
          required
        />

        <label className="text-xs font-bold text-[var(--color-neutral-text-primary)]/70">Contraseña</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 mt-1 px-3 py-2 rounded-lg border border-[var(--color-neutral-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary-base)]"
          required
        />

        {error && <p className="text-[var(--color-accent-base)] text-xs font-bold mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-xl font-extrabold text-white bg-[var(--color-secondary-base)] hover:bg-[var(--color-secondary-hover)] transition disabled:opacity-50"
        >
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}
