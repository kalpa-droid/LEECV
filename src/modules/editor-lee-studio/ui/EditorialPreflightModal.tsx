import React from 'react';
import { AlertCircle, AlertTriangle, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { Modal } from '../../../shared/core/ui/Modal';
import { button, radius } from '../../../shared/core/uiDesignSystem';
import type { EditorialPreflightIssue, EditorialPreflightReport } from '../domain/editorialPreflightEngine';

export interface EditorialPreflightModalProps {
  isOpen: boolean;
  report: EditorialPreflightReport | null;
  onClose: () => void;
  onGoToIssue: (issue: EditorialPreflightIssue) => void;
  onAutoCleanPunctuation?: () => void;
  onExportAnyway: () => void;
}

export const EditorialPreflightModal: React.FC<EditorialPreflightModalProps> = ({
  isOpen,
  report,
  onClose,
  onGoToIssue,
  onAutoCleanPunctuation,
  onExportAnyway,
}) => {
  if (!report) return null;
  const totalIssues = report.errors.length + report.warnings.length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      icon={
        report.errors.length > 0 ? (
          <AlertCircle className="w-5 h-5 text-[var(--color-status-danger-text)]" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-[var(--color-status-warning-text)]" />
        )
      }
      title="Revisión previa a descargar el PDF"
      helpTitle="Control de calidad sin costo"
      helpText="Revisamos páginas vacías, figuras pendientes y espaciado antes de usar tu crédito de exportación."
    >
      <div className="space-y-4">
        <p className="text-xs text-[var(--ui-text-secondary)]">
          Detectamos {totalIssues} detalle(s) para revisar antes de generar tu archivo final. Podés corregirlos ahora o continuar igual.
        </p>

        {report.hasAutoFixablePunctuation && onAutoCleanPunctuation && (
          <div
            className="p-3 border border-[var(--color-accent-base)]/40 bg-[var(--color-accent-muted)] flex items-center justify-between gap-3"
            style={{ borderRadius: radius.card }}
          >
            <div className="min-w-0">
              <p className="text-xs font-bold text-[var(--color-accent-text)]">
                Limpieza rápida disponible
              </p>
              <p className="text-[11px] text-[var(--ui-text-secondary)]">
                Separá automáticamente comas pegadas y espacios dobles sin alterar tus poemas ni citas.
              </p>
            </div>
            <button
              type="button"
              onClick={onAutoCleanPunctuation}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] text-xs font-bold cursor-pointer shrink-0"
              style={{ borderRadius: radius.control }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Limpiar ahora
            </button>
          </div>
        )}

        {report.errors.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-status-danger-text)]">
              Prioritarios ({report.errors.length})
            </h4>
            {report.errors.map((issue) => (
              <div
                key={issue.id}
                className="p-3 border border-[var(--color-status-danger-base)]/40 bg-[var(--color-status-danger-muted)] flex items-start justify-between gap-3"
                style={{ borderRadius: radius.card }}
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="text-xs font-bold text-[var(--color-status-danger-text)]">
                    {issue.title}
                  </p>
                  <p className="text-[11px] text-[var(--ui-text-secondary)] leading-relaxed">
                    {issue.description}
                  </p>
                </div>
                {(issue.sectionId || issue.code === 'default_or_empty_title') && (
                  <button
                    type="button"
                    onClick={() => onGoToIssue(issue)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 border border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-[11px] font-bold text-[var(--ui-text-primary)] cursor-pointer shrink-0 hover:opacity-90"
                    style={{ borderRadius: radius.control }}
                  >
                    Ir
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {report.warnings.length > 0 && (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            <h4 className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-status-warning-text)]">
              Sugerencias ({report.warnings.length})
            </h4>
            {report.warnings.map((issue) => (
              <div
                key={issue.id}
                className="p-2.5 border border-[var(--color-status-warning-base)]/40 bg-[var(--color-status-warning-muted)] flex items-start justify-between gap-3"
                style={{ borderRadius: radius.control }}
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="text-xs font-bold text-[var(--color-status-warning-text)]">
                    {issue.title}
                  </p>
                  <p className="text-[11px] text-[var(--ui-text-secondary)] leading-relaxed">
                    {issue.description}
                  </p>
                </div>
                {issue.sectionId && (
                  <button
                    type="button"
                    onClick={() => onGoToIssue(issue)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 border border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-[11px] font-bold text-[var(--ui-text-primary)] cursor-pointer shrink-0 hover:opacity-90"
                    style={{ borderRadius: radius.control }}
                  >
                    Ver
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {totalIssues === 0 && (
          <div
            className="p-3 border border-[var(--color-status-success-base)]/40 bg-[var(--color-status-success-muted)] flex items-center gap-2 text-xs font-semibold text-[var(--color-status-success-text)]"
            style={{ borderRadius: radius.card }}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Todo se ve limpio y listo para exportar.</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-[var(--ui-border)]">
          <button
            type="button"
            onClick={onClose}
            className={button.secondary}
            style={{ borderRadius: radius.control }}
          >
            Corregir primero
          </button>
          <button
            type="button"
            onClick={onExportAnyway}
            className={button.primary}
            style={{ borderRadius: radius.control }}
          >
            Exportar igual
          </button>
        </div>
      </div>
    </Modal>
  );
};
