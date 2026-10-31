import React, { useState } from 'react';
import { Modal } from '../../../shared/core/ui/Modal';
import { Field } from '../../../shared/core/ui/Field';
import { useAuth } from '../../../shared/core/auth/AuthContext';
import { Mail, Send, CheckCircle, AlertCircle, ArrowRight, Lock } from 'lucide-react';
import { radius, button } from '../../../shared/core/uiDesignSystem';

interface PasswordlessModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

/**
 * Flujo Passwordless (Magic Link / Código OTP):
 * Paso 1 — Ingresá tu email para ver tus créditos y exportar tu CV.
 * Paso 2 — Te enviamos un código de 6 dígitos a tu correo.
 * Botón mágico directo compatible (autenticación SELECT / signInWithOtp vía Supabase).
 */
export function PasswordlessLoginModal({ isOpen, onClose, message }: PasswordlessModalProps) {
  const { requestOtp, verifyOtp } = useAuth();

  // Flujo: --empty -> step1 -> step2 -> done
  const [step, setStep] = useState<'step1' | 'step2' | '--empty'>('step1');
  const [email, setEmail] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  async function handleSendOtp() {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMsg('Ingresá un email válido.');
      return;
    }
    setIsProcessing(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await requestOtp(email);
      setStep('step2');
    } catch (err: any) {
      setErrorMsg(err?.message || 'No se pudo enviar el código. Intenta con otro email.');
      setStep('step1');
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleVerify() {
    if (!otpInput || otpInput.length !== 6) {
      setErrorMsg('El código tiene 6 dígitos.');
      return;
    }
    setIsProcessing(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await verifyOtp(email, otpInput);
      setSuccessMsg('✓ Entregaste tu acceso sin contraseña.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Código inválido. Reintentá.');
    } finally {
      setIsProcessing(false);
    }
  }

  function reset() {
    setStep('step1');
    setEmail('');
    setOtpInput('');
    setErrorMsg('');
    setSuccessMsg('');
  }

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={'Acceso sin contraseña'} icon={<Lock className="w-5 h-5 text-[var(--color-accent-text)]" />} size="sm">
      <div className={`space-y-4 text-xs p-4 bg-[var(--ui-bg-panel)] rounded-[${radius.modal}]`}>
        {message && (
          <div className="p-3 bg-[var(--color-status-info-muted)] border border-[var(--color-status-info-base)]/40 rounded-[var(--radius-card)]">
            {message}
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-[var(--color-status-success-muted)] border border-[var(--color-status-success-base)]/40 rounded-[var(--radius-card)] text-[var(--color-status-success-text)] font-bold flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            {successMsg}
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-[var(--color-status-danger-muted)] border border-[var(--color-status-danger-base)]/40 rounded-[var(--radius-card)] text-[var(--color-status-danger-text)] font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {errorMsg}
          </div>
        )}

        {step === 'step1' ? (
          <></>
        ) : null}

        {step === 'step1' && (
          <>
            <p className="text-[var(--ui-text-secondary)] pl-2 font-bold">
              🔑 Ingresá tu email para ver tus créditos y exportar tu CV
            </p>
            <Field
              label="Correo electrónico"
              type="email"
              required
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              id="pw-email"
              maxLength={320}
            />
            <button
              onClick={handleSendOtp}
              disabled={isProcessing || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)}
              className={`w-full ${button.primary} py-2.5 mt-2 flex items-center justify-center gap-2`}
              style={{ borderRadius: radius.control }}
            >
              <Send className="w-4 h-4" />
              {isProcessing ? 'Enviando código...' : '📧 Enviar código'}
            </button>
            <button
              onClick={handleClose}
              className={`w-full ${button.ghost} py-2.5 text-xs font-bold`}
              style={{ borderRadius: radius.control }}
            >
              Cancelar
            </button>
            <p className="pl-2 text-[10px] text-[var(--ui-text-secondary)]">
              Recibirás en menos de 1 minuto un código de 6 dígitos en tu correo. (Para soporte: consultá al +5493878342772)
            </p>
          </>
        )}

        {step === 'step2' && (
          <>
            <p className="text-[var(--ui-text-secondary)] pl-2 font-bold">
              🔐 Te enviamos un código de 6 dígitos
            </p>
            <div className="flex items-center justify-center gap-1 mb-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-9 w-9 rounded-[var(--radius-pill)] bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] flex items-center justify-center text-[var(--color-accent-text)] font-bold text-xs">
                  {String(i + 1).padStart(2, '0')[0]}
                </div>
              ))}
            </div>
            <Field
              label="Código de 6 dígitos"
              type="tel"
              maxLength={6}
              pattern="\d{6}"
              required
              placeholder="000000"
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(-6))}
              id="pw-otp"
            />
            <button
              onClick={handleVerify}
              disabled={isProcessing || otpInput.length !== 6}
              className={`w-full ${button.primary} py-2.5 mt-2 flex items-center justify-center gap-2`}
              style={{ borderRadius: radius.control }}
            >
              <CheckCircle className="w-4 h-4" />
              {isProcessing ? 'Verificando...' : '✓ Confirmar ingreso'}
            </button>
            <p className="pl-2 text-[10px] text-[var(--ui-text-secondary)]">
              Tus créditos comprados se vincularán automáticamente a tu cuenta.
            </p>
          </>
        )}
      </div>
    </Modal>
  );
}
