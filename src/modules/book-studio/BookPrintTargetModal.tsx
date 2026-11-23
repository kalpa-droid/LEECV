import React, { useEffect, useMemo, useState } from 'react';
import { Home, Printer, Check, AlertCircle } from 'lucide-react';
import { Modal } from '../../shared/core/ui/Modal';
import { button, radius, selectableCard } from '../../shared/core/uiDesignSystem';
import { GlobalApplyMode } from '../../shared/core/presets/configCascadeEngine';
import {
  BOOK_PAPER_SPECS,
  BOOK_PRINT_PROFILES,
  BookPrintTarget,
  detectBookPrintTargetConflicts,
  inferBookPrintTarget,
} from './domain/bookPrintProfileEngine';
import { BookImpositionOptions } from './domain/impositionEngine';

export interface BookPrintTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  options: BookImpositionOptions;
  onApplyProfile: (target: BookPrintTarget, mode: GlobalApplyMode) => void;
}

export const BookPrintTargetModal: React.FC<BookPrintTargetModalProps> = ({
  isOpen,
  onClose,
  options,
  onApplyProfile,
}) => {
  const activeTarget = useMemo(() => inferBookPrintTarget(options), [options]);
  const [selectedTarget, setSelectedTarget] = useState<BookPrintTarget>(activeTarget);

  useEffect(() => {
    if (isOpen) {
      setSelectedTarget(inferBookPrintTarget(options));
    }
  }, [isOpen, options]);

  const conflicts = useMemo(
    () => detectBookPrintTargetConflicts(options, selectedTarget),
    [options, selectedTarget],
  );

  const targetOrder: BookPrintTarget[] = ['home', 'print_shop'];

  const handleConfirm = (mode: GlobalApplyMode) => {
    onApplyProfile(selectedTarget, mode);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      icon={selectedTarget === 'home' ? <Home className="w-4 h-4" /> : <Printer className="w-4 h-4" />}
      title="¿Dónde vas a imprimir este libro?"
      helpText="Esta elección global ajusta las hojas disponibles, los márgenes de impresora, las líneas guía para recortar y cómo se arma la tapa. Podés cambiar un ajuste puntual después sin perder tu control."
      helpTitle="Perfil global de impresión"
    >
      <div className="space-y-4">
        <p className="text-xs text-[var(--ui-text-secondary)] leading-relaxed">
          Elegí el entorno donde vas a sacar las copias. Si ya tocaste algún detalle a mano, te dejamos decidir si lo conservás o aplicás todo el perfil nuevo.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {targetOrder.map((targetId) => {
            const profile = BOOK_PRINT_PROFILES[targetId];
            const isSelected = selectedTarget === targetId;
            const Icon = targetId === 'home' ? Home : Printer;
            return (
              <button
                key={targetId}
                type="button"
                onClick={() => setSelectedTarget(targetId)}
                aria-pressed={isSelected}
                className={`${selectableCard.base} ${
                  isSelected ? selectableCard.selected : selectableCard.unselected
                } p-4 text-left flex flex-col justify-between gap-2.5 cursor-pointer`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 text-sm font-extrabold text-[var(--ui-text-primary)]">
                      <Icon className="w-4 h-4 text-[var(--color-accent-text)] shrink-0" />
                      <span>{profile.shortName}</span>
                    </span>
                    {isSelected && <Check className="w-4 h-4 text-[var(--color-accent-text)] shrink-0" />}
                  </div>
                  <p className="text-xs font-semibold text-[var(--ui-text-primary)]">{profile.title}</p>
                  <p className="text-[11px] text-[var(--ui-text-secondary)] leading-relaxed">{profile.summary}</p>
                </div>

                <div className="flex flex-wrap gap-1 pt-1 border-t border-[var(--ui-border)]/60">
                  {profile.allowedPaperSizes.map((paperId) => {
                    const spec = BOOK_PAPER_SPECS[paperId];
                    return (
                      <span
                        key={paperId}
                        className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[var(--ui-bg-surface)] text-[var(--ui-text-secondary)] border border-[var(--ui-border)]"
                      >
                        {spec.pageSize.name}
                      </span>
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>

        {conflicts.length > 0 && (
          <div
            className="p-3 bg-[var(--color-status-warning-muted)] border border-[var(--color-status-warning-base)]/40 space-y-2"
            style={{ borderRadius: radius.control }}
          >
            <div className="flex items-start gap-2 text-xs font-bold text-[var(--color-status-warning-text)]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p>
                  Tenés {conflicts.length} ajuste(s) fino(s) manual(es) que difieren del perfil &ldquo;{BOOK_PRINT_PROFILES[selectedTarget].shortName}&rdquo;:
                </p>
                <ul className="mt-1 list-disc list-inside text-[11px] font-normal space-y-0.5">
                  {conflicts.slice(0, 4).map((c) => (
                    <li key={c.fieldKey}>
                      {c.label}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-[var(--ui-border)]">
          <button
            type="button"
            onClick={onClose}
            className={`${button.base} ${button.secondary}`}
          >
            Cancelar
          </button>

          {conflicts.length > 0 && (
            <button
              type="button"
              onClick={() => handleConfirm('preserve-manual')}
              className={`${button.base} border border-[var(--color-accent-base)] text-[var(--color-accent-text)] bg-[var(--ui-bg-surface)] hover:bg-[var(--color-accent-muted)]`}
            >
              Conservar mis ajustes manuales
            </button>
          )}

          <button
            type="button"
            onClick={() => handleConfirm('apply-all')}
            className={`${button.base} ${button.primary}`}
          >
            {conflicts.length > 0 ? 'Aplicar todo el perfil nuevo' : `Usar perfil ${BOOK_PRINT_PROFILES[selectedTarget].shortName}`}
          </button>
        </div>
      </div>
    </Modal>
  );
};
