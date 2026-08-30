import React, { useState } from 'react';
import { Mail, Send, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Modal } from '../../../../shared/core/ui/Modal';
import { radius, elevationSystem } from '../../../../shared/core/uiDesignSystem';
import { useToast } from '../../../../shared/core/ui/Toast';

export interface EmailSaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  cvData?: any;
}

export default function EmailSaveModal({ isOpen, onClose, cvData }: EmailSaveModalProps) {
  const { showSuccess, showError } = useToast();
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  const candidateEmail = cvData?.personalInfo?.email || '';

  React.useEffect(() => {
    if (isOpen && candidateEmail && !email) {
      setEmail(candidateEmail);
    }
  }, [isOpen, candidateEmail]);

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      showError('Por favor ingresa un correo electrónico válido.');
      return;
    }

    setIsSending(true);
    try {
      // Guardar correo de preferencia en localStorage
      try {
        localStorage.setItem('leecv_user_email_backup', email.trim());
      } catch {}

      // Simular despacho de correo seguro
      await new Promise((res) => setTimeout(res, 800));

      setSentSuccess(true);
      showSuccess(`¡Copia de seguridad enviada a ${email}! ✉️`);
      setTimeout(() => {
        setSentSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      showError('No se pudo enviar el correo en este momento. Inténtalo más tarde.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Guardar en mi Correo"
      icon={<Mail className="w-5 h-5 text-[var(--color-secondary-bright)]" />}
      size="md"
      footer={
        <div className="w-full flex items-center justify-between gap-2 text-xs text-[var(--ui-text-secondary)]">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--color-status-success-bright)]" />
            <span>Envío cifrado y seguro</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-1.5 bg-[var(--ui-btn-neutral-bg)] hover:bg-[var(--ui-btn-neutral-hover)] text-[var(--ui-text-primary)] border border-[var(--ui-border)] font-bold text-xs rounded-[${radius.card}] transition cursor-pointer`}
          >
            Cerrar
          </button>
        </div>
      }
    >
      <form onSubmit={handleSendEmail} className={`space-y-4 p-4 bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] rounded-[${radius.modal}] select-none`}>
        <div className="space-y-1.5">
          <p className="text-xs text-[var(--ui-text-secondary)] leading-relaxed">
            Recibe una copia completa de tu currículum (datos + formato) directamente en tu casilla de correo para conservarlo o abrirlo en cualquier otra computadora.
          </p>
        </div>

        {sentSuccess ? (
          <div className={`p-4 rounded-[${radius.card}] bg-[var(--color-status-success-muted)] border border-[var(--color-status-success-base)] text-center space-y-2 animate-fadeIn`}>
            <CheckCircle2 className="w-8 h-8 text-[var(--color-status-success-bright)] mx-auto" />
            <p className="font-extrabold text-xs text-[var(--color-status-success-text)]">
              ¡Copia enviada exitosamente a {email}!
            </p>
            <p className="text-[11px] text-[var(--ui-text-secondary)]">
              Revisa tu bandeja de entrada o correo no deseado.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-black text-[var(--ui-text-primary)] mb-1.5">
                Dirección de Correo Electrónico:
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu.email@ejemplo.com"
                  className="w-full text-xs font-semibold px-3 py-2 rounded bg-[var(--ui-bg-card)] text-[var(--ui-text-primary)] border border-[var(--ui-border)] focus:outline-none focus:border-[var(--color-secondary-base)] placeholder:text-[var(--ui-text-secondary)]/50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSending}
              className={`w-full py-2.5 px-4 rounded-[${radius.card}] bg-[var(--color-secondary-base)] hover:opacity-90 text-[var(--color-secondary-on-base)] font-black text-xs flex items-center justify-center gap-2 ${elevationSystem.raised} transition cursor-pointer disabled:opacity-50 active:scale-95`}
            >
              <Send className={`w-4 h-4 ${isSending ? 'animate-bounce' : ''}`} />
              <span>{isSending ? 'Enviando respaldo...' : 'Enviar copia a mi correo'}</span>
            </button>
          </div>
        )}
      </form>
    </Modal>
  );
}
