import React, { useState } from 'react';
import { Modal } from '../../../shared/core/ui/Modal';
import { CheckCircle2, AlertTriangle, AlertCircle, Sparkles, FileText, ArrowRight, Wand2, Target } from 'lucide-react';
import { AtsPreflightResult } from '../../../shared/core/pdf-engine/layers/ats/atsPreflightCheck';
import { AtsAiFinding } from '../../../shared/core/pdf-engine/layers/ats/atsAiAnalysis';

import { button, elevationSystem, radius } from '../../../shared/core/uiDesignSystem';

export interface AtsCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: AtsPreflightResult;
  onExportAtsPdf?: () => void;
  /** Análisis IA de contenido: opcional, se muestra debajo del chequeo estructural. */
  onRunAiAnalysis?: (jobDescription: string) => void;
  isAnalyzingAi?: boolean;
  aiSemanticScore?: number | null;
  aiFindings?: AtsAiFinding[] | null;
  aiError?: string | null;
}

const AI_FINDING_LABEL: Record<AtsAiFinding['category'], string> = {
  keyword_gap: 'Palabra clave ausente',
  weak_bullet: 'Redacción a mejorar',
  quantification: 'Falta cuantificar',
  general: 'Sugerencia'
};

export function AtsCheckModal({
  isOpen,
  onClose,
  result,
  onExportAtsPdf,
  onRunAiAnalysis,
  isAnalyzingAi = false,
  aiSemanticScore = null,
  aiFindings = null,
  aiError = null
}: AtsCheckModalProps) {
  const [jobDescription, setJobDescription] = useState('');

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
              </div>
            ))
          )}
        </div>

        {/* Análisis de Contenido con IA */}
        {onRunAiAnalysis && (
          <div className={`p-3.5 rounded-[${radius.modal}] bg-[var(--ui-bg-card)] border border-[var(--ui-border)] space-y-3`}>
            <div className="flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-[var(--color-status-warning-text)] flex-shrink-0" />
              <p className="text-xs font-black text-[var(--ui-text-primary)]">Análisis de Contenido con IA</p>
            </div>
            <p className="text-[11px] text-[var(--ui-text-secondary)] leading-snug">
              El chequeo de arriba revisa la estructura. Esto además lee el contenido: palabras clave de la vacante, redacción de tus logros y si están cuantificados.
            </p>

            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Opcional: pegá el texto de la vacante para comparar palabras clave puntuales. Sin esto, se evalúa calidad general de redacción."
              rows={3}
              className={`w-full text-xs p-2.5 rounded-[${radius.control}] bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] text-[var(--ui-text-primary)] placeholder:text-[var(--ui-text-muted)] resize-none`}
            />

            <button
              onClick={() => onRunAiAnalysis(jobDescription)}
              disabled={isAnalyzingAi}
              className={`${button.primary} px-4 py-2 font-black text-xs flex items-center gap-1.5 w-full justify-center disabled:opacity-60`}
            >
              <Sparkles className="w-4 h-4" />
              <span>{isAnalyzingAi ? 'Analizando con IA…' : 'Analizar Contenido con IA'}</span>
            </button>

            {aiError && (
              <p className="text-[11px] text-[var(--color-status-danger-text)] font-semibold">{aiError}</p>
            )}

            {aiSemanticScore !== null && aiFindings && (
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center gap-2">
                  <Target className="w-3.5 h-3.5 text-[var(--color-status-warning-text)]" />
                  <p className="text-[11px] font-black text-[var(--ui-text-primary)]">
                    Puntaje semántico IA: {aiSemanticScore} / 100
                  </p>
                </div>
                {aiFindings.length === 0 ? (
                  <p className="text-[11px] text-[var(--color-status-success-text)] font-semibold">
                    La IA no encontró problemas relevantes de contenido.
                  </p>
                ) : (
                  aiFindings.map((f) => (
                    <div key={f.id} className={`p-2.5 rounded-[${radius.control}] bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] space-y-1`}>
                      <p className="text-[10px] font-black uppercase tracking-wide text-[var(--color-status-warning-text)]">
                        {AI_FINDING_LABEL[f.category]}
                      </p>
                      <p className="text-[11px] font-bold text-[var(--ui-text-primary)]">{f.title}</p>
                      <p className="text-[11px] text-[var(--ui-text-secondary)] leading-snug">{f.detail}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
