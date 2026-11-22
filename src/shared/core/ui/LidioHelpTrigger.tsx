import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { DomSectionIcon } from '../pdf-engine/layers/icons/DomSectionIcon';
import { UI_ICON_IDS } from './iconCatalog';
import { emitLidioMessage } from '../assistant/lidioBus';
import { elevationSystem, zIndex } from '../uiDesignSystem';

export interface LidioHelpTriggerProps {
  /** Título breve de la ayuda en el globo de Lidio. */
  title?: string;
  /** Explicación sencilla y precisa de para qué sirve el botón/opción. */
  text: string;
  /** Clave para reemplazar mensajes previos del mismo control en Lidio. */
  groupKey?: string;
  /** Pestaña opcional relacionada para acceso rápido. */
  targetTab?: string;
  targetLabel?: string;
  size?: 'xs' | 'sm';
  className?: string;
  ariaLabel?: string;
}

interface PopoverCoords {
  top: number;
  left: number;
}

/**
 * Globo `?` de Lidio: único punto de entrada visual para explicar botones,
 * acciones y estados sin ensuciar el panel con párrafos largos.
 *
 * - En celular (fuera de modales): al tocarlo envía el globo flotante de Lidio
 *   justo sobre el Dock inferior (`lidioBus`).
 * - En escritorio o dentro de modales: al acercar el cursor o tocarlo abre una
 *   burbuja flotante vía Portal con posicionamiento inteligente.
 */
export const LidioHelpTrigger: React.FC<LidioHelpTriggerProps> = ({
  title,
  text,
  groupKey,
  targetTab,
  targetLabel,
  size = 'sm',
  className = '',
  ariaLabel,
}) => {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [coords, setCoords] = useState<PopoverCoords>({ top: 0, left: 0 });

  const isSmallViewport = () =>
    typeof window !== 'undefined' && window.innerWidth < 768;

  const isInsideModal = () =>
    Boolean(triggerRef.current?.closest('[data-ui-modal="true"]'));

  const updateCoords = () => {
    const el = triggerRef.current;
    if (!el || typeof window === 'undefined') return;
    const rect = el.getBoundingClientRect();
    const width = Math.min(288, window.innerWidth - 24);
    let left = rect.right - width;
    if (left < 12) left = Math.min(rect.left, window.innerWidth - width - 12);
    if (left < 12) left = 12;

    const estimatedHeight = 140;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top =
      spaceBelow >= estimatedHeight + 16
        ? rect.bottom + 8
        : Math.max(12, rect.top - estimatedHeight - 8);

    setCoords({ top, left });
  };

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (!popoverOpen) return;
    updateCoords();
    const handleOutside = (ev: MouseEvent | TouchEvent) => {
      const target = ev.target as Node | null;
      if (triggerRef.current && target && triggerRef.current.contains(target)) return;
      if ((target as HTMLElement | null)?.closest?.('[data-lidio-help-popover="true"]')) return;
      setPopoverOpen(false);
      setPinned(false);
    };
    const handleKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        setPopoverOpen(false);
        setPinned(false);
      }
    };
    window.addEventListener('mousedown', handleOutside);
    window.addEventListener('touchstart', handleOutside);
    window.addEventListener('keydown', handleKey);
    window.addEventListener('resize', updateCoords);
    return () => {
      window.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('touchstart', handleOutside);
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('resize', updateCoords);
    };
  }, [popoverOpen]);

  useEffect(() => () => clearCloseTimer(), []);

  if (!text) return null;

  const handleMouseEnter = () => {
    if (isSmallViewport()) return;
    clearCloseTimer();
    updateCoords();
    setPopoverOpen(true);
  };

  const handleMouseLeave = () => {
    if (pinned || isSmallViewport()) return;
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setPopoverOpen(false);
    }, 160);
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (isSmallViewport() && !isInsideModal()) {
      emitLidioMessage({
        kind: 'help',
        title: title || 'Lidio te explica',
        body: text,
        groupKey: groupKey || `help-${title || text.slice(0, 28)}`,
        targetTab,
        targetLabel,
      });
      return;
    }

    updateCoords();
    setPinned((prev) => {
      const next = !prev;
      setPopoverOpen(next);
      return next;
    });
  };

  const sizeClass =
    size === 'xs' ? 'w-5 h-5' : 'w-6 h-6';
  const iconSize = size === 'xs' ? 12 : 14;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        aria-label={ariaLabel || (title ? `Ayuda de Lidio: ${title}` : 'Ayuda de Lidio')}
        aria-expanded={popoverOpen}
        data-lidio-help-trigger="true"
        className={`inline-flex items-center justify-center rounded-full border border-[var(--color-accent-base)]/40 bg-[var(--color-accent-muted)] text-[var(--color-accent-text)] hover:bg-[var(--color-accent-base)] hover:text-[var(--color-accent-on-base)] transition-colors cursor-pointer shrink-0 ${sizeClass} ${className}`}
      >
        <DomSectionIcon iconId={UI_ICON_IDS.helpBubble} size={iconSize} strokeWidth={2.2} />
      </button>

      {popoverOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="tooltip"
            data-lidio-help-popover="true"
            onMouseEnter={clearCloseTimer}
            onMouseLeave={handleMouseLeave}
            onClick={(e) => e.stopPropagation()}
            className={`fixed w-[min(288px,calc(100vw-24px))] rounded-[14px] border border-[var(--color-accent-base)] bg-[var(--ui-bg-card)] text-[var(--ui-text-primary)] p-3 ${elevationSystem.overlay} animate-fade-in`}
            style={{
              top: coords.top,
              left: coords.left,
              zIndex: zIndex.modal + 20,
            }}
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--color-accent-muted)] text-[var(--color-accent-text)] shrink-0">
                  <DomSectionIcon iconId={UI_ICON_IDS.assistant} size={11} strokeWidth={2} />
                </span>
                <span className="text-[11px] font-bold text-[var(--ui-text-primary)] truncate">
                  {title || 'Lidio te explica'}
                </span>
              </div>
              {pinned && (
                <button
                  type="button"
                  onClick={() => {
                    setPinned(false);
                    setPopoverOpen(false);
                  }}
                  aria-label="Cerrar explicación"
                  className="p-0.5 rounded text-[var(--ui-text-secondary)] hover:text-[var(--ui-text-primary)] cursor-pointer shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <p className="text-[11px] leading-relaxed text-[var(--ui-text-secondary)]">
              {text}
            </p>
          </div>,
          document.body
        )}
    </>
  );
};
