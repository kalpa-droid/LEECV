import React, { useState } from 'react';
import { Modal } from '../../../shared/core/ui/Modal';
import { useAuth } from '../../../shared/core/auth/AuthContext';
import { LogIn, Mail, Lock, AlertCircle, CheckCircle, Send, KeyRound, Eye, EyeOff } from 'lucide-react';
import { radius, button } from '../../../shared/core/uiDesignSystem';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultMode?: 'login' | 'register';
  message?: string;
}

export function LoginModal({ isOpen, onClose, onSuccess, defaultMode = 'login', message }: LoginModalProps) {
  const { login, signup, requestOtp, verifyOtp } = useAuth();
  
  // Metodo de autenticacion: 'otp' (sin contrasena) o 'password'
  const [authMethod, setAuthMethod] = useState<'otp' | 'password'>('otp');
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);
  
  // Campos
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpStep, setOtpStep] = useState<'request' | 'verify'>('request');
  const [showPassword, setShowPassword] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setOtpCode('');
    setOtpStep('request');
    setErrorMsg('');
    setInfoMsg('');
    setIsProcessing(false);
    setShowPassword(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Enviar codigo OTP por email
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');
    if (!email || !/^[^s@]+@[^s@]+.[^s@]+$/.test(email)) {
      setErrorMsg('Ingresá un correo electrónico válido.');
      return;
    }
    setIsProcessing(true);
    try {
      await requestOtp(email);
      setOtpStep('verify');
      setInfoMsg('Te enviamos un código de 6 dígitos a tu correo. Ingrésalo a continuación:');
    } catch (err: any) {
      setErrorMsg(err.message || 'No se pudo enviar el código. Revisa tu correo e intenta de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Verificar codigo OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (otpCode.length !== 6) {
      setErrorMsg('El código debe tener 6 dígitos.');
      return;
    }
    setIsProcessing(true);
    try {
      const res = await verifyOtp(email, otpCode);
      if (res?.user) {
        if (onSuccess) onSuccess();
        handleClose();
      } else {
        setErrorMsg('No se pudo verificar el código. Intenta nuevamente.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Código inválido o vencido.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Login o Registro con contrasena
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');
    setIsProcessing(true);

    try {
      if (mode === 'login') {
        const user = await login(email, password);
        if (user) {
          if (onSuccess) onSuccess();
          handleClose();
        }
      } else {
        const result = await signup(email, password, name);
        if (result?.session) {
          if (onSuccess) onSuccess();
          handleClose();
        } else if (result?.user) {
          setInfoMsg('¡Cuenta creada con éxito! Si tu cuenta requiere confirmación, revisa tu correo antes de ingresar.');
          setMode('login');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocurrió un error al procesar tu solicitud.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={authMethod === 'otp' ? 'Acceso rápido con código' : mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
      icon={<LogIn className="w-5 h-5 text-[var(--color-accent-text)]" />}
      size="sm"
    >
      <div className={`space-y-4 p-4 text-[var(--ui-text-primary)] bg-[var(--ui-bg-panel)] rounded-[${radius.modal}]`}>
        {/* Selector de metodo: OTP vs Password */}
        <div className="flex rounded-full bg-[var(--ui-bg-card)] border border-[var(--ui-border)] p-1 text-xs">
          <button
            type="button"
            onClick={() => { setAuthMethod('otp'); setErrorMsg(''); setInfoMsg(''); }}
            className={`flex-1 py-1.5 px-3 rounded-full font-bold transition flex items-center justify-center gap-1.5 ${
              authMethod === 'otp'
                ? 'bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] shadow-sm'
                : 'text-[var(--ui-text-secondary)] hover:text-[var(--ui-text-primary)]'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Código al email</span>
          </button>
          <button
            type="button"
            onClick={() => { setAuthMethod('password'); setErrorMsg(''); setInfoMsg(''); }}
            className={`flex-1 py-1.5 px-3 rounded-full font-bold transition flex items-center justify-center gap-1.5 ${
              authMethod === 'password'
                ? 'bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] shadow-sm'
                : 'text-[var(--ui-text-secondary)] hover:text-[var(--ui-text-primary)]'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Contraseña</span>
          </button>
        </div>

        {message && (
          <div className="p-3 bg-[var(--color-status-info-muted)] border border-[var(--color-status-info-base)]/40 rounded-[var(--radius-card)] text-xs text-[var(--color-status-info-text)]">
            {message}
          </div>
        )}

        {infoMsg && (
          <div className="p-3 bg-[var(--color-status-success-muted)] border border-[var(--color-status-success-base)]/40 rounded-[var(--radius-card)] text-[var(--color-status-success-text)] text-xs font-bold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{infoMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-[var(--color-status-danger-muted)] border border-[var(--color-status-danger-base)]/40 rounded-[var(--radius-card)] text-[var(--color-status-danger-text)] text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* METODO 1: OTP (Codigo de 6 digitos sin contrasena) */}
        {authMethod === 'otp' && (
          <>
            {otpStep === 'request' ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <p className="text-xs text-[var(--ui-text-secondary)]">
                  Te enviamos un código de acceso a tu correo. Sin contraseñas que recordar.
                </p>
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

                <button
                  type="submit"
                  disabled={isProcessing || !email}
                  className={`w-full ${button.primary} py-2.5 rounded-[${radius.control}] mt-2 flex items-center justify-center gap-2`}
                >
                  <Send className="w-4 h-4" />
                  {isProcessing ? 'Enviando código...' : 'Enviar código de 6 dígitos'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--ui-text-secondary)]">Código de 6 dígitos</label>
                  <input
                    type="tel"
                    required
                    maxLength={6}
                    pattern="\\d{6}"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\\D/g, '').slice(0, 6))}
                    className={`w-full text-center text-lg tracking-widest font-mono p-2.5 rounded-[${radius.control}] bg-[var(--ui-bg-card)] border border-[var(--ui-border)] focus:border-[var(--color-accent-base)] outline-none transition`}
                    placeholder="000000"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={isProcessing || otpCode.length !== 6}
                  className={`w-full ${button.primary} py-2.5 rounded-[${radius.control}] mt-2 flex items-center justify-center gap-2`}
                >
                  <CheckCircle className="w-4 h-4" />
                  {isProcessing ? 'Verificando...' : 'Confirmar e ingresar'}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => { setOtpStep('request'); setOtpCode(''); }}
                    className="text-xs text-[var(--color-accent-text)] hover:underline font-bold"
                  >
                    ← Cambiar correo o reenviar código
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {/* METODO 2: Password tradicional */}
        {authMethod === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
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

            <div className="space-y-1">
              <label className="text-xs font-bold text-[var(--ui-text-secondary)]">Contraseña</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ui-text-secondary)]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full text-xs pl-9 pr-10 py-2.5 rounded-[${radius.control}] bg-[var(--ui-bg-card)] border border-[var(--ui-border)] focus:border-[var(--color-accent-base)] outline-none transition`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ui-text-secondary)] hover:text-[var(--ui-text-primary)] transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className={`w-full ${button.primary} py-2.5 rounded-[${radius.control}] mt-4 flex items-center justify-center gap-2`}
            >
              {isProcessing ? (
                <span className="animate-pulse">Procesando...</span>
              ) : mode === 'login' ? (
                'Ingresar'
              ) : (
                'Registrarme'
              )}
            </button>

            <div className="pt-3 border-t border-[var(--ui-border)] text-center text-xs text-[var(--ui-text-secondary)]">
              {mode === 'login' ? (
                <p>
                  ¿No tienes cuenta?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('register'); setErrorMsg(''); setInfoMsg(''); }}
                    className="text-[var(--color-accent-text)] font-bold hover:underline"
                  >
                    Crea una gratis
                  </button>
                </p>
              ) : (
                <p>
                  ¿Ya tienes cuenta?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setErrorMsg(''); setInfoMsg(''); }}
                    className="text-[var(--color-accent-text)] font-bold hover:underline"
                  >
                    Inicia sesión
                  </button>
                </p>
              )}
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
