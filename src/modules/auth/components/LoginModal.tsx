import React, { useState } from 'react';
import { Modal } from '../../../shared/core/ui/Modal';
import { useAuth } from '../../../shared/core/auth/AuthContext';
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react';
import { radius, button } from '../../../shared/core/uiDesignSystem';
import { supabase } from '../../../shared/core/lib/supabaseClient';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultMode?: 'login' | 'register' | 'forgot_password' | 'update_password';
  message?: string;
}

export function LoginModal({ isOpen, onClose, onSuccess, defaultMode = 'login', message }: LoginModalProps) {
  const { login, signup, resetPasswordForEmail, updatePassword, isPasswordRecovery } = useAuth();
  // Override mode si estamos en recuperación de contraseña y el modal se abre
  const initialMode = isPasswordRecovery ? 'update_password' : defaultMode;
  const [mode, setMode] = useState<'login' | 'register' | 'forgot_password' | 'update_password'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Sincronizar mode si cambia isPasswordRecovery
  React.useEffect(() => {
    if (isPasswordRecovery && isOpen) {
      setMode('update_password');
    }
  }, [isPasswordRecovery, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsProcessing(true);

    try {
      if (mode === 'login') {
        await login(email, password);
        if (onSuccess) onSuccess();
        onClose();
      } else if (mode === 'register') {
        // Register flow
        const user = await signup(email, password, name);
        if (user) {
          if (onSuccess) onSuccess();
          onClose();
        } else {
          setSuccessMsg('Registro exitoso. Revisa tu correo para verificar tu cuenta e inicia sesión.');
          setMode('login');
        }
      } else if (mode === 'forgot_password') {
        await resetPasswordForEmail(email);
        setSuccessMsg('Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña.');
        setMode('login');
      } else if (mode === 'update_password') {
        await updatePassword(password);
        setSuccessMsg('Contraseña actualizada correctamente. Inicia sesión con tu nueva contraseña.');
        setMode('login');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocurrió un error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        mode === 'login' ? 'Iniciar Sesión' : 
        mode === 'register' ? 'Crear Cuenta' : 
        mode === 'forgot_password' ? 'Recuperar Contraseña' : 'Nueva Contraseña'
      }
      icon={<LogIn className="w-5 h-5 text-[var(--color-accent-text)]" />}
      size="sm"
    >
      <div className={`space-y-4 p-4 text-[var(--ui-text-primary)] bg-[var(--ui-bg-panel)] rounded-[${radius.modal}]`}>
        {message && !successMsg && (
          <div className="p-3 bg-[var(--color-status-info-muted)] border border-[var(--color-status-info-base)]/40 rounded-[var(--radius-card)] text-xs text-[var(--color-status-info-text)]">
            {message}
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-[var(--color-status-success-muted)] border border-[var(--color-status-success-base)]/40 rounded-[var(--radius-card)] text-xs text-[var(--color-status-success-text)]">
            {successMsg}
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-[var(--color-status-danger-muted)] border border-[var(--color-status-danger-base)]/40 rounded-[var(--radius-card)] text-[var(--color-status-danger-text)] text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-[var(--ui-text-secondary)]">Nombre completo</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full text-xs p-2.5 rounded-[${radius.control}] bg-[var(--ui-bg-card)] border border-[var(--ui-border)] focus:border-[var(--color-accent-base)] outline-none transition`}
                placeholder="Juan Pérez"
              />
            </div>
          )}

          {(mode === 'login' || mode === 'register' || mode === 'forgot_password') && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-[var(--ui-text-secondary)]">Correo electrónico</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ui-text-secondary)]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full text-xs pl-9 pr-3 py-2.5 rounded-[${radius.control}] bg-[var(--ui-bg-card)] border border-[var(--ui-border)] focus:border-[var(--color-accent-base)] outline-none transition`}
                  placeholder="tu@correo.com"
                />
              </div>
            </div>
          )}

          {(mode === 'login' || mode === 'register' || mode === 'update_password') && (
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-[var(--ui-text-secondary)]">
                  {mode === 'update_password' ? 'Nueva Contraseña' : 'Contraseña'}
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setMode('forgot_password')}
                    className="text-[10px] text-[var(--color-accent-text)] hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ui-text-secondary)]" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full text-xs pl-9 pr-3 py-2.5 rounded-[${radius.control}] bg-[var(--ui-bg-card)] border border-[var(--ui-border)] focus:border-[var(--color-accent-base)] outline-none transition`}
                  placeholder="••••••••"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isProcessing}
            className={`w-full ${button.primary} py-2.5 rounded-[${radius.control}] mt-4 flex items-center justify-center gap-2`}
          >
            {isProcessing ? (
              <span className="animate-pulse">Procesando...</span>
            ) : mode === 'login' ? (
              'Ingresar'
            ) : mode === 'register' ? (
              'Registrarme'
            ) : mode === 'forgot_password' ? (
              'Enviar Enlace'
            ) : (
              'Actualizar Contraseña'
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-[var(--ui-border)] text-center text-xs text-[var(--ui-text-secondary)] flex flex-col gap-2">
          {mode === 'login' && (
            <p>
              ¿No tienes cuenta?{' '}
              <button
                type="button"
                onClick={() => setMode('register')}
                className="text-[var(--color-accent-text)] font-bold hover:underline"
              >
                Crea una gratis
              </button>
            </p>
          )}
          {(mode === 'register' || mode === 'forgot_password') && (
            <p>
              ¿Ya tienes cuenta?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-[var(--color-accent-text)] font-bold hover:underline"
              >
                Inicia sesión
              </button>
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
