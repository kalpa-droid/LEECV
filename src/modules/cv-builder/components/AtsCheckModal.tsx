import React, { useState } from 'react';
import { Modal } from '../../../shared/core/ui/Modal';
import { CheckCircle2, AlertTriangle, AlertCircle, Sparkles, FileText, ArrowRight } from 'lucide-react';
import { AtsPreflightResult } from '../../../shared/core/pdf-engine/layers/ats/atsPreflightCheck';

import { button, elevationSystem, radius } from '../../../shared/core/uiDesignSystem';

export interface AtsCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: AtsPreflightResult;
  onExportAtsPdf?: () => void;
  onExportOriginal?: () => void;
  onFixAction?: (actionId: string, ruleId: string) => void;
}

export function AtsCheckModal({
  isOpen,
  onClose,
  result,
  onExportAtsPdf,
  onExportOriginal,
  onFixAction
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
            className={`${button.secondary} px-4 py-2 font-bold text-xs`}
          >
            Cerrar
          </button>

          <div className="flex gap-2">
            {onExportOriginal && (
              <button
                onClick={() => {
                  onClose();
                  onExportOriginal();
                }}
                className={`${button.secondary} px-4 py-2 font-black text-xs flex items-center gap-1.5 border-[var(--ui-border)] hover:bg-[var(--ui-bg-hover)]`}
              >
                <span>Descargar de todos modos</span>
              </button>
            )}

            {onExportAtsPdf && (
              <button
                onClick={() => {
                  onClose();
                  onExportAtsPdf();
                }}
                className={`${button.primary} px-4 py-2 font-black text-xs flex items-center gap-1.5`}
              >
                <FileText className="w-4 h-4" />
                <span>Exportar Versión ATS (1 Columna)</span>
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Score Header */}
        <div className={`p-4 rounded-[${radius.modal}] bg-[var(--ui-bg-card)] border border-[var(--ui-border)] flex items-center justify-between gap-4`}>
          <div className="space-y-1">
            <p className="text-xs text-[var(--ui-text-secondary)] font-bold">Puntaje Estimado de Lectura ATS</p>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-black text-[var(--ui-text-primary)]">{result.score} / 100</span>
              <span className={`px-2.5 py-1 rounded-[${radius.control}] text-xs font-black border ${scoreBadge.color}`}>
                {scoreBadge.label}
              </span>
            </div>
          </div>
        </div>

        {/* Warnings List */}
        <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
          {result.warnings.length === 0 ? (
            <div className={`p-6 text-center text-[var(--color-status-success-text)] bg-[var(--color-status-success-muted)] border border-[var(--color-status-success-base)]/40 rounded-[${radius.modal}] space-y-2`}>
              <CheckCircle2 className="w-8 h-8 mx-auto text-[var(--color-status-success-text)]" />
              <p className="font-black text-sm">¡Excelente! Tu currículum cumple con las pautas ATS.</p>
              <p className="text-xs text-[var(--color-status-success-text)]">No se detectaron interferencias en el flujo de lectura lineal.</p>
            </div>
          ) : (
            result.warnings.map((w) => (
              <div
                key={w.id}
                className={`p-3.5 rounded-[${radius.modal}] bg-[var(--ui-bg-card)] border border-[var(--ui-border)] space-y-1.5`}
              >
                <div className="flex items-center gap-2">
                  {w.level === 'critical' ? (
                    <AlertCircle className="w-4 h-4 text-[var(--color-status-danger-bright)] flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-[var(--color-accent-amber-bright)] flex-shrink-0" />
                  )}
                  <p className="text-xs font-black text-[var(--ui-text-primary)]">{w.title}</p>
                </div>
                <p className="text-[11px] text-[var(--ui-text-secondary)] leading-snug">{w.description}</p>
                <p className="text-[11px] text-[var(--color-accent-amber-bright)] font-semibold flex items-center gap-1">
                  <ArrowRight className="w-3 h-3 flex-shrink-0" />
                  <span>{w.recommendation}</span>
                </p>
                {(w.articleSlug || w.fixAction) && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[var(--ui-border)]/50">
                    {w.fixAction && (
                      <button 
                        className={`${button.primary} px-2.5 py-1 text-[10px] font-bold h-auto`}
                        onClick={() => {
                          if (onFixAction) {
                            onFixAction(w.fixAction!, w.id);
                          } else {
                            onClose();
                          }
                        }}
                      >
                        Arreglar
                      </button>
                    )}
                    {w.articleSlug && (
                      <a 
                        href={`/blog/${w.articleSlug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${button.secondary} px-2.5 py-1 text-[10px] font-bold h-auto flex items-center gap-1`}
                      >
                        <FileText className="w-3 h-3" /> Leer Guía
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
