import React from 'react';
import { Modal } from '../../../shared/core/ui/Modal';
import { CheckCircle2, AlertTriangle, AlertCircle, Sparkles, FileText, ArrowRight } from 'lucide-react';
import { AtsPreflightResult } from '../../../shared/core/pdf-engine/layers/ats/atsPreflightCheck';

export interface AtsCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: AtsPreflightResult;
  onExportAtsPdf?: () => void;
}

export function AtsCheckModal({
  isOpen,
  onClose,
  result,
  onExportAtsPdf
}: AtsCheckModalProps) {
  const getScoreBadge = (score: number) => {
    if (score >= 85) {
      return { label: 'Excelente Compatibilidad', color: 'bg-[var(--color-status-success-muted)] text-[var(--color-status-success-text)] border-[var(--color-status-success-base)]/60' };
    }
    if (score >= 60) {
      return { label: 'Compatibilidad Media', color: 'bg-[var(--color-status-warning-muted)] text-[var(--color-status-warning-text)] border-[var(--color-status-warning-base)]/60' };
    }
    return { label: 'Requiere Atención', color: 'bg-[var(--color-status-danger-muted)] text-[var(--color-status-danger-text)] border-[var(--color-status-danger-base)]/60' };
  };

  const scoreBadge = getScoreBadge(result.score);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Diagnóstico de Compatibilidad ATS"
      icon={<Sparkles className="w-5 h-5 text-[var(--color-status-warning-text)]" />}
      size="xl"
      footer={
        <div className="w-full flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Cerrar
          </button>

          {onExportAtsPdf && (
            <button
              onClick={() => {
                onClose();
                onExportAtsPdf();
              }}
              className="px-4 py-2 bg-[var(--color-status-warning-base)] hover:opacity-90 text-white font-black text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Exportar Versión ATS (1 Columna)</span>
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {/* Score Header */}
        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs text-white/60 font-bold">Puntaje Estimado de Lectura ATS</p>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-black text-white">{result.score} / 100</span>
              <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${scoreBadge.color}`}>
                {scoreBadge.label}
              </span>
            </div>
          </div>
        </div>

        {/* Warnings List */}
        <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
          {result.warnings.length === 0 ? (
            <div className="p-6 text-center text-[var(--color-status-success-text)] bg-[var(--color-status-success-muted)] border border-[var(--color-status-success-base)]/40 rounded-2xl space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-[var(--color-status-success-text)]" />
              <p className="font-black text-sm">¡Excelente! Tu currículum cumple con las pautas ATS.</p>
              <p className="text-xs text-[var(--color-status-success-text)]/80">No se detectaron interferencias en el flujo de lectura lineal.</p>
            </div>
          ) : (
            result.warnings.map((w) => (
              <div
                key={w.id}
                className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-1.5"
              >
                <div className="flex items-center gap-2">
                  {w.level === 'critical' ? (
                    <AlertCircle className="w-4 h-4 text-[var(--color-status-danger-text)] flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-[var(--color-status-warning-text)] flex-shrink-0" />
                  )}
                  <p className="text-xs font-black text-white">{w.title}</p>
                </div>
                <p className="text-[11px] text-white/60 leading-snug">{w.description}</p>
                <p className="text-[11px] text-[var(--color-status-warning-text)] font-semibold flex items-center gap-1">
                  <ArrowRight className="w-3 h-3 flex-shrink-0" />
                  <span>{w.recommendation}</span>
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
