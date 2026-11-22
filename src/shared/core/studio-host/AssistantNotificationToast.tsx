/**
 * LIDIO — Notificación flotante estilo macOS (AssistantNotificationToast.tsx)
 *
 * Aparece sola por inactividad, emerge sobre el botón flotante con una cola
 * sutil. Auto-descarte a los ~9s (se pausa con hover/focus). Acciones solo con
 * ícono: Ir / Silenciar / Cerrar. Temas por variables CSS; print:hidden.
 */
import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, BellOff, X, Lightbulb } from 'lucide-react';
import { DomSectionIcon } from '../pdf-engine/layers/icons/DomSectionIcon';
import { UI_ICON_IDS } from '../ui/iconCatalog';
import { elevationSystem, zIndex, button } from '../uiDesignSystem';
import { AssistantTip } from '../assistant/assistantTips';

interface AssistantNotificationToastProps {
  tip: AssistantTip;
  onDismiss: () => void;
  onGoToTab: (tabId: string) => void;
  onToggleMute: () => void;
}

export const AssistantNotificationToast: React.FC<AssistantNotificationToastProps> = ({
  tip,
  onDismiss,
  onGoToTab,
  onToggleMute,
}) => {
  const [visible, setVisible] = useState(true);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<number | null>(null);
  const AUTO_DISMISS_MS = 9000;

  useEffect(() => {
    if (paused) {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      return;
    }
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setVisible(false);
      window.setTimeout(onDismiss, 300);
    }, AUTO_DISMISS_MS);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [paused, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={`${visible ? 'ui-assistant-notif-enter' : 'ui-assistant-notif-exit'} fixed bottom-24 right-5 flex w-[min(340px,calc(100vw-2rem))] items-start gap-2.5 rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-bg-panel)]/95 p-3 shadow-2xl backdrop-blur-md ${elevationSystem.overlay}`}
      style={{ zIndex: zIndex.drawer + 10 }}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-muted)] text-[var(--color-accent-text)]">
        <DomSectionIcon iconId={UI_ICON_IDS.assistant} className="h-4 w-4" color="currentColor" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-[var(--color-accent-text)]">
          <Lightbulb className="h-3.5 w-3.5" /> {tip.title}
        </div>
        <p className="mt-0.5 text-[12px] text-[var(--ui-text-primary)]">{tip.body}</p>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {tip.targetTab && (
            <button
              type="button"
              onClick={() => onGoToTab(tip.targetTab!)}
              aria-label="Ir a la sección"
              title="Ir"
              className={`${button.secondary} cursor-pointer px-2 py-1`}
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onToggleMute}
            className="cursor-pointer rounded-[10px] p-1.5 text-[var(--ui-text-secondary)] hover:bg-[var(--ui-bg-hover)]"
            aria-label="Silenciar tips automáticos"
            title="Silenciar tips"
          >
            <BellOff className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="cursor-pointer rounded-[10px] p-1.5 text-[var(--ui-text-secondary)] hover:bg-[var(--ui-bg-hover)]"
            aria-label="Cerrar notificación"
            title="Cerrar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <span
        className="absolute -bottom-1 right-6 h-3 w-3 rotate-45 bg-[var(--ui-bg-panel)]/95"
        style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}
        aria-hidden="true"
      />
    </div>
  );
};

export default AssistantNotificationToast;
