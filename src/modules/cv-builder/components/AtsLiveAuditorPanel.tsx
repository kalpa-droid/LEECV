import React, { useState } from 'react';
import { Modal } from '../../../shared/core/ui/Modal';
import { AlertCircle, AlertTriangle, Eye, ShieldOff, Sparkles, ArrowRight, FileText, X } from 'lucide-react';
import { button } from '../../../shared/core/uiDesignSystem';
import { AtsPreflightResult } from '../../../shared/core/pdf-engine/layers/ats/atsPreflightCheck';

export interface AtsLiveAuditorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  result?: AtsPreflightResult | null;
  onJumpToSection?: (sectionId: string) => void;
  onHideSensitiveData?: () => void;
  onOpenAssist?: () => void;
}

type Severity = 'all' | 'critical' | 'recommendation';

export function AtsLiveAuditorPanel({
  isOpen,
  onClose,
  result,
  onJumpToSection,
  onHideSensitiveData,
  onOpenAssist,
}: AtsLiveAuditorPanelProps) {
  const [severityFilter, setSeverityFilter] = useState<Severity>('all');

  const warnings = result?.warnings ?? [];
  const criticalCount = warnings.filter(w => w.level === 'critical').length;
  const warningCount = warnings.filter(w => w.level === 'warning').length;
  const infoCount = warnings.filter(w => w.level === 'info').length;
  const score = result?.score ?? 70;

  const filtered = severityFilter === 'all'
    ? warnings
    : severityFilter === 'critical'
      ? warnings.filter(w => w.level === 'critical')
      : warnings.filter(w => w.level !== 'critical');

  let scoreTone = {
    bg: 'bg-[var(--color-status-warning-muted)]',
    border: 'border-[var(--color-status-warning-base)]',
    text: 'text-[var(--color-status-warning-text)]',
    label: 'Compatibilidad Media — revisá las mejoras',
  };
  if (score >= 85) {
    scoreTone = {
      bg: 'bg-[var(--color-status-success-muted)]',
      border: 'border-[var(--color-status-success-base)]',
      text: 'text-[var(--color-status-success-text)]',
      label: 'Excelente Compatibilidad ATS',
    };
  } else if (score < 60) {
    scoreTone = {
      bg: 'bg-[var(--color-status-danger-muted)]',
      border: 'border-[var(--color-status-danger-base)]',
      text: 'text-[var(--color-status-danger-text)]',
      label: 'Riesgo de descarte en filtros',
    };
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Diagnóstico ATS en tiempo real"
      icon={<Sparkles className="w-5 h-5 text-[var(--color-status-warning-text)]" />}
      size="xl"
      footer={
        <div className="w-full flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-2 flex-wrap">
            {onJumpToSection && (
              <button
                type="button"
                onClick={() => onJumpToSection('experience')}
                className={`${button.primary} px-4 py-2 font-black text-xs flex items-center gap-1.5`}
              >
                <Eye className="w-4 h-4" />
                <span>Ir a Experiencia</span>
              </button>
            )}
            {onHideSensitiveData && (
              <button
                type="button"
                onClick={() => onHideSensitiveData()}
                className={`${button.secondary} px-4 py-2 font-black text-xs flex items-center gap-1.5`}
              >
                <ShieldOff className="w-4 h-4" />
                <span>Ocultar datos sensibles</span>
              </button>
            )}
            {onOpenAssist && (
              <button
                type="button"
                onClick={() => onOpenAssist()}
                className={`${button.secondary} px-4 py-2 font-black text-xs flex items-center gap-1.5`}
              >
                <ArrowRight className="w-4 h-4" />
                <span>Guía ACR</span>
              </button>
            )}
          </div>
          <button type="button" onClick={onClose} className={`${button.secondary} px-4 py-2 font-black text-xs flex items-center gap-1.5`}>
            <X className="w-3.5 h-3.5" />
            <span>Cerrar</span>
          </button>
        </div>
      }
    >
      {/* Score header */}
      <div className="p-4 rounded-2xl bg-[var(--ui-bg-card)] border border-[var(--ui-border)]">
        <p className="text-xs text-[var(--ui-text-secondary)] font-bold mb-1">Puntaje actual del CV</p>
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`text-3xl font-black ${scoreTone.text}`}>{score} / 100</span>
          <span className={`px-2.5 py-1 rounded-full text-xs font-black border ${scoreTone.bg} ${scoreTone.border} ${scoreTone.text}`}>
            {scoreTone.label}
          </span>
        </div>
        <div className="flex gap-4 mt-2 text-[11px] font-bold">
          <span className="text-[var(--color-status-danger-text)]">{criticalCount} Críticos</span>
          <span className="text-[var(--color-status-warning-text)]">{warningCount} Recomendaciones</span>
          <span className="text-[var(--color-neutral-text-muted)]">{infoCount} Información adicional</span>
        </div>
      </div>

      {/* Severity filter */}
      <div className="flex gap-2 mt-4 p-2">
        {(['all', 'critical', 'recommendation'] as Severity[]).map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setSeverityFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-black ${severityFilter === s ? 'bg-[var(--ui-bg-card)] text-[var(--ui-text-primary)]' : 'bg-[var(--ui-bg-panel)] text-[var(--ui-text-secondary)]'}`}
          >
            {s === 'all' ? 'Todos' : s === 'critical' ? 'Críticos' : 'Recomendaciones'}
          </button>
        ))}
      </div>

      {/* Warnings list */}
      <div className="space-y-3 max-h-[36vh] overflow-y-auto pr-1 mt-4">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-[var(--color-status-success-text)] bg-[var(--color-status-success-muted)] border border-[var(--color-status-success-base)] rounded-2xl space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto" />
            <p className="font-black text-sm">Excelente! Tu currículum cumple las pautas ATS.</p>
          </div>
        ) : (
          filtered.map(w => (
            <div key={w.id} className="p-3.5 rounded-2xl bg-[var(--ui-bg-card)] border border-[var(--ui-border)] space-y-1.5">
              <div className="flex items-center gap-2">
                {w.level === 'critical' ? (
                  <AlertCircle className="w-4 h-4 text-[var(--color-status-danger-bright)] flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-[var(--color-status-warning-text)] flex-shrink-0" />
                )}
                <p className="text-xs font-black text-[var(--ui-text-primary)]">{w.title}</p>
              </div>
              <p className="text-[11px] text-[var(--ui-text-secondary)] leading-snug">{w.description}</p>
              <p className="text-[11px] text-[var(--color-status-warning-text)] font-semibold flex items-center gap-1">
                <ArrowRight className="w-3 h-3 flex-shrink-0" />
                <span>{w.recommendation}</span>
              </p>
              {w.fixAction === 'hide_field' && onHideSensitiveData && (
                <button type="button" onClick={() => onHideSensitiveData()} className={`${button.primary} px-2.5 py-1 text-[10px] font-bold h-auto`}>Arreglar</button>
              )}
              {w.fixAction === 'edit_section' && onJumpToSection && (
                <button type="button" onClick={() => onJumpToSection('experience')} className={`${button.primary} px-2.5 py-1 text-[10px] font-bold h-auto`}>Ir a corregir</button>
              )}
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}
