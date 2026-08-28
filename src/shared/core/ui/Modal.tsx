import React, { useEffect, useRef, ReactNode } from 'react';
import { X } from 'lucide-react';
import { elevationSystem, radius } from '../uiDesignSystem';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  icon?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | 'full';
  children: ReactNode;
  footer?: ReactNode;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  className?: string;
  headerClassName?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  icon,
  size = 'md',
  children,
  footer,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className = '',
  headerClassName = ''
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    full: 'max-w-6xl w-full h-[90vh]'
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnOverlayClick && e.target === overlayRef.current) {
      onClose();
    }
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-5 animate-fade-in no-print select-none"
    >
      <div
        data-ui-modal="true"
        className={`w-full ${sizeClasses[size] || sizeClasses.md} bg-[var(--ui-bg-card)] ui-bg-card text-[var(--ui-text-primary)] ui-border border-2 rounded-[${radius.modal}] ${elevationSystem.overlay} overflow-hidden flex flex-col max-h-[92vh] ${className}`}
      >
        {/* Header */}
        {(title || icon) && (
          <div
            className={`flex items-center justify-between px-5 py-3.5 bg-[var(--ui-bg-header)] ui-bg-header ui-text-primary border-b ui-border ${headerClassName}`}
          >
            <div className="flex items-center gap-2.5 font-black text-sm tracking-wide">
              {icon && <span className="text-[var(--color-accent-amber-bright)] flex-shrink-0">{icon}</span>}
              <span className="truncate">{title}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={`p-1.5 rounded-[${radius.control}] hover:bg-[var(--ui-dock-hover)] text-[var(--ui-text-secondary)] hover:text-[var(--ui-text-primary)] transition cursor-pointer`}
              title="Cerrar ventana"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 leading-relaxed">
          {children}
        </div>

        {/* Optional Footer */}
        {footer && (
          <div className="px-5 py-3.5 border-t ui-border ui-bg-panel flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
