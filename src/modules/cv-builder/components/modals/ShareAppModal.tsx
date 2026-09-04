import React from 'react';
import { Share2, Copy, Check, ExternalLink, Send, Mail, MessageSquare } from 'lucide-react';
import { Modal } from '../../../../shared/core/ui/Modal';
import { radius, elevationSystem } from '../../../../shared/core/uiDesignSystem';
import { useToast } from '../../../../shared/core/ui/Toast';
import { navigation } from '../../../../shared/core/utils/navigation';

export interface ShareAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareAppModal({ isOpen, onClose }: ShareAppModalProps) {
  const { showSuccess } = useToast();
  const [copied, setCopied] = React.useState(false);

  const appUrl = navigation.getOrigin() || 'https://leecv.app';
  const shareTitle = 'LEECV — Generador de Currículums Vitae A4 y Tarjetas Profesionales';
  const shareText = 'Crea tu Currículum Vitae profesional A4 listo para imprimir y optimizado para sistemas ATS en minutos con LEECV.';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopied(true);
      showSuccess('¡Enlace de LEECV copiado al portapapeles! 📋');
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: appUrl,
        });
      } catch {}
    }
  };

  const shareLinks = [
    {
      name: 'WhatsApp',
      icon: MessageSquare,
      className: 'bg-[var(--color-secondary-base)] text-[var(--color-secondary-on-base)] font-extrabold hover:opacity-90',
      url: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText}\n${appUrl}`)}`
    },
    {
      name: 'Telegram',
      icon: Send,
      className: 'bg-[var(--color-secondary-base)] text-[var(--color-secondary-on-base)] font-extrabold hover:opacity-90',
      url: `https://t.me/share/url?url=${encodeURIComponent(appUrl)}&text=${encodeURIComponent(shareText)}`
    },
    {
      name: 'Correo / Gmail',
      icon: Mail,
      className: 'bg-[var(--color-accent-amber)] text-black font-extrabold hover:opacity-90',
      url: `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(`${shareText}\n\n${appUrl}`)}`
    },
    {
      name: 'LinkedIn',
      icon: ExternalLink,
      className: 'bg-[var(--color-secondary-base)] text-[var(--color-secondary-on-base)] font-extrabold hover:opacity-90',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(appUrl)}`
    },
    {
      name: 'X (Twitter)',
      icon: Share2,
      className: 'bg-[var(--ui-bg-card)] text-[var(--ui-text-primary)] border border-[var(--ui-border)] hover:bg-[var(--ui-bg-panel)] font-extrabold',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(appUrl)}`
    }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Compartir LEECV"
      icon={<Share2 className="w-5 h-5 text-[var(--color-secondary-bright)]" />}
      size="md"
      footer={
        <div className="w-full flex items-center justify-between gap-2 text-xs text-[var(--ui-text-primary)]">
          <span className="text-[11px] font-bold text-[var(--ui-text-primary)]">¡Gracias por recomendar LEECV! 🚀</span>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-1.5 bg-[var(--ui-btn-neutral-bg)] hover:bg-[var(--ui-btn-neutral-hover)] text-[var(--ui-text-primary)] border border-[var(--ui-btn-neutral-border)] font-bold text-xs rounded-[${radius.card}] transition cursor-pointer`}
          >
            Cerrar
          </button>
        </div>
      }
    >
      <div className={`space-y-4 p-4 bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] rounded-[${radius.modal}] select-none`}>
        <p className="text-xs text-[var(--ui-text-primary)] leading-relaxed">
          Comparte LEECV con tus amigos, colegas o redes para ayudarlos a crear un currículum vitae profesional en minutos.
        </p>

        {/* Input con Botón de Copiar Enlace */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-extrabold text-[var(--ui-text-primary)]">
            Enlace de la Aplicación:
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={appUrl}
              className="flex-1 text-xs font-semibold px-3 py-2 rounded bg-[var(--ui-bg-card)] text-[var(--ui-text-primary)] border border-[var(--ui-border)] focus:outline-none select-all"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className={`px-3 py-2 rounded-[${radius.card}] bg-[var(--color-secondary-base)] hover:opacity-90 text-[var(--color-secondary-on-base)] font-bold text-xs flex items-center gap-1.5 ${elevationSystem.raised} transition cursor-pointer active:scale-95`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>
        </div>

        {/* Botones de Redes Sociales */}
        <div className="space-y-1.5 pt-1">
          <label className="block text-[11px] font-extrabold text-[var(--ui-text-primary)]">
            Compartir por mensajería o redes sociales:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {shareLinks.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.name}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-2.5 rounded-[${radius.card}] ${item.className} text-xs flex items-center justify-between transition ${elevationSystem.raised} cursor-pointer active:scale-95`}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                </a>
              );
            })}
          </div>
        </div>

        {/* Botón de Compartir Nativo (si disponible) */}
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <button
            type="button"
            onClick={handleNativeShare}
            className={`w-full py-2.5 px-4 rounded-[${radius.card}] bg-[var(--ui-bg-card)] hover:bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] text-[var(--ui-text-primary)] font-extrabold text-xs flex items-center justify-center gap-2 transition cursor-pointer active:scale-95`}
          >
            <Share2 className="w-4 h-4 text-[var(--color-secondary-bright)]" />
            <span>Compartir usando mi dispositivo...</span>
          </button>
        )}
      </div>
    </Modal>
  );
}
