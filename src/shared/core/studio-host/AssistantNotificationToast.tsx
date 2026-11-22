/**
 * LIDIO — Notificación flotante estilo macOS (AssistantNotificationToast.tsx)
 *
 * Muestra tanto tips automáticos por inactividad como explicaciones vivas del
 * bus de Lidio (`?`, cambios de perilla/ojo y guardado explícito en carpeta).
 * Se ubica sobre el Dock en celular (`bottom-[86px]`) para nunca quedar tapado.
 */
import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, BellOff, X, Lightbulb, CheckCircle2, AlertTriangle } from 'lucide-react';
import { DomSectionIcon } from '../pdf-engine/layers/icons/DomSectionIcon';
import { UI_ICON_IDS } from '../ui/iconCatalog';
import { elevationSystem, zIndex, button } from '../uiDesignSystem';
import { AssistantTip } from '../assistant/assistantTips';
import { LidioLiveMessage } from '../assistant/lidioBus';

interface AssistantNotificationToastProps {
  tip?: AssistantTip | null;
  liveMessage?: LidioLiveMessage | null;
  onDismiss: () => void;
  onGoToTab: (tabId: string) => void;
  onToggleMute: () => void;
}

export const AssistantNotificationToast: React.FC<AssistantNotificationToastProps> = ({
  tip,
  liveMessage,
  onDismiss,
  onGoToTab,
  onToggleMute,
}) => {
  const [visible, setVisible] = useState(true);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<number | null>(null);
  const autoDismissMs = liveMessage?.durationMs ?? 9000;

  useEffect(() => {
    setVisible(true);
  }, [tip?.id, liveMessage?.id]);

  useEffect(() => {
    if (paused) {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      return;
    }
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setVisible(false);
      window.setTimeout(onDismiss, 300);
    }, autoDismissMs);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [paused, onDismiss, autoDismissMs, tip?.id, liveMessage?.id]);

  const activeTitle = liveMessage ? (liveMessage.title || 'Lidio te explica') : (tip?.title || 'Tip de Lidio');
  const activeBody = liveMessage ? liveMessage.body : (tip?.body || '');
  const activeTargetTab = liveMessage ? liveMessage.targetTab : tip?.targetTab;

  const renderBadgeIcon = () => {
    if (!liveMessage) return <Lightbulb className="h-3.5 w-3.5 shrink-0" />;
    if (liveMessage.kind === 'state') return <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />;
    if (liveMessage.kind === 'warning') return <AlertTriangle className="h-3.5 w-3.5 shrink-0" />;
    if (liveMessage.kind === 'storage') {
      return <DomSectionIcon iconId={UI_ICON_IDS.folderSafe} size={14} strokeWidth={2} />;
    }
    return <DomSectionIcon iconId={UI_ICON_IDS.helpBubble} size={14} strokeWidth={2} />;
  };

  return (
    <div
      role="status"
      aria-live="polite"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={`${visible ? 'ui-assistant-notif-enter' : 'ui-assistant-notif-exit'} fixed bottom-[86px] left-3 right-3 md:left-auto md:bottom-24 md:right-5 md:w-[360px] flex items-start gap-2.5 rounded-[16px] border border-[var(--color-accent-base)]/40 bg-[var(--ui-bg-panel)] p-3 ${elevationSystem.overlay}`}
      style={{ zIndex: zIndex.assistantToast }}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-muted)] text-[var(--color-accent-text)]">
        <DomSectionIcon iconId={UI_ICON_IDS.assistant} className="h-4 w-4" color="currentColor" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-[var(--color-accent-text)]">
          {renderBadgeIcon()} <span className="truncate">{activeTitle}</span>
        </div>
        <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--ui-text-primary)]">{activeBody}</p>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {activeTargetTab && (
            <button
              type="button"
              onClick={() => onGoToTab(activeTargetTab)}
              aria-label="Ir a la sección"
              title={liveMessage?.targetLabel || 'Ir'}
              className={`${button.secondary} cursor-pointer px-2 py-1 text-[11px] inline-flex items-center gap-1`}
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              {liveMessage?.targetLabel && <span>{liveMessage.targetLabel}</span>}
            </button>
          )}
          {!liveMessage && tip && (
            <button
              type="button"
              onClick={onToggleMute}
              className="cursor-pointer rounded-[10px] p-1.5 text-[var(--ui-text-secondary)] hover:bg-[var(--ui-bg-hover)]"
              aria-label="Silenciar tips automáticos"
              title="Silenciar tips"
            >
              <BellOff className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onDismiss}
            className="cursor-pointer rounded-[10px] p-1.5 text-[var(--ui-text-secondary)] hover:bg-[var(--ui-bg-hover)] ml-auto"
            aria-label="Cerrar notificación"
            title="Cerrar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <span
        className="hidden md:block absolute -bottom-1 right-6 h-3 w-3 rotate-45 bg-[var(--ui-bg-panel)]"
        style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}
        aria-hidden="true"
      />
    </div>
  );
};

export default AssistantNotificationToast;
