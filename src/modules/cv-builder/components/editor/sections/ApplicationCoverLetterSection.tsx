import React, { useState, useEffect, useCallback } from 'react';
import { Briefcase, Download, Loader2, AlertCircle } from 'lucide-react';
import { Field } from '../../../../../shared/core/ui/Field';
import { LidioHelpTrigger } from '../../../../../shared/core/ui/LidioHelpTrigger';
import { DomSectionIcon } from '../../../../../shared/core/pdf-engine/layers/icons/DomSectionIcon';
import { UI_ICON_IDS } from '../../../../../shared/core/ui/iconCatalog';
import { executeAiTask } from '../../../../../shared/core/ai/aiClient';
import { button } from '../../../../../shared/core/uiDesignSystem';
import { useToast } from '../../../../../shared/core/ui/Toast';
import type { CoverLetterBody } from '../../../../../types/cv';

interface ApplicationCoverLetterSectionProps {
  cvData: any;
  setCvData: React.Dispatch<React.SetStateAction<any>>;
  onExport: () => void;
  /** Vuelve al panel Vacante para editar puesto/empresa/aviso y la vacante se refleja acá. */
  onEditVacante?: () => void;
}

const letterFields: Array<{ key: keyof CoverLetterBody; label: string; rows?: number }> = [
  { key: 'salutation', label: 'Saludo' },
  { key: 'hookParagraph', label: 'Presentación', rows: 4 },
  { key: 'evidenceParagraph', label: 'Experiencia relacionada', rows: 5 },
  { key: 'closingParagraph', label: 'Cierre', rows: 3 },
  { key: 'signoff', label: 'Despedida' },
];

function hasMeaningfulValue(val: unknown, placeholderWord: string): boolean {
  const clean = String(val || '').trim().toLowerCase();
  return Boolean(clean && clean !== placeholderWord);
}

export const ApplicationCoverLetterSection: React.FC<ApplicationCoverLetterSectionProps> = ({
  cvData,
  setCvData,
  onExport,
  onEditVacante,
}) => {
  const { showSuccess, showError, showWarning } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const jobTarget = cvData?.jobTarget || {};

  const hasValidJobTarget =
    hasMeaningfulValue(jobTarget.jobTitle, 'ninguno') &&
    hasMeaningfulValue(jobTarget.companyName, 'ninguna');

  const updateJobTargetField = (field: 'jobTitle' | 'companyName', val: string) => {
    setCvData((previous: any) => ({
      ...previous,
      jobTarget: {
        ...(previous?.jobTarget || {}),
        [field]: val,
      },
    }));
  };

  const handleGenerateAndFill = useCallback(async () => {
    const currentJobTarget = cvData?.jobTarget || {};
    const validNow =
      hasMeaningfulValue(currentJobTarget.jobTitle, 'ninguno') &&
      hasMeaningfulValue(currentJobTarget.companyName, 'ninguna');

    if (!validNow) {
      showWarning('Completá primero Puesto y Empresa en Vacante Objetivo para redactar la carta (tu CV Base no se modificará).');
      return;
    }

    setIsGenerating(true);
    try {
      const jobTargetText = [
        currentJobTarget.jobTitle && `Puesto: ${currentJobTarget.jobTitle}`,
        currentJobTarget.companyName && `Empresa: ${currentJobTarget.companyName}`,
        currentJobTarget.recipientName && `Contacto: ${currentJobTarget.recipientName}`,
        currentJobTarget.jobDescription,
      ]
        .filter(Boolean)
        .join('\n');

      const result = await executeAiTask<CoverLetterBody & { missingDataWarning?: string }>({
        taskId: 'cover_letter',
        payload: { jobTargetText },
        cvData,
        temperature: 0.4,
      });

      const body = result.data;
      if (!body.hookParagraph?.trim() || !body.evidenceParagraph?.trim() || !body.closingParagraph?.trim()) {
        throw new Error('La IA no devolvió todos los párrafos necesarios para completar la carta.');
      }

      const filledBody: CoverLetterBody = {
        salutation: body.salutation || 'Estimado/a responsable de selección,',
        hookParagraph: body.hookParagraph,
        evidenceParagraph: body.evidenceParagraph,
        closingParagraph: body.closingParagraph,
        signoff: body.signoff || 'Atentamente,',
      };

      setCvData((previous: any) => ({
        ...previous,
        body: filledBody,
      }));
      showSuccess('Carta de presentación completada con todos los datos de tu CV.');
    } catch (err: any) {
      showError(err?.message || 'No pudimos redactar la carta en este momento.');
    } finally {
      setIsGenerating(false);
    }
  }, [cvData, setCvData, showError, showSuccess, showWarning]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const rawTs = window.sessionStorage.getItem('leecv_auto_generate_cover_letter');
      if (!rawTs) return;
      window.sessionStorage.removeItem('leecv_auto_generate_cover_letter');
      const ageMs = Date.now() - Number(rawTs);
      if (ageMs >= 0 && ageMs < 15000 && hasValidJobTarget) {
        void handleGenerateAndFill();
      }
    } catch {}
  }, [hasValidJobTarget, handleGenerateAndFill]);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-neutral-border)] pb-4">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--color-neutral-text-primary)]">
            <Briefcase className="h-5 w-5 text-[var(--color-secondary-bright)]" />
            Carta de presentación
          </h2>
          <p className="text-sm text-[var(--color-neutral-text-secondary)]">
            Toma todo el contenido de tu CV y la vacante elegida para completar la carta. <strong>No consume créditos</strong> y siempre se exporta por separado del CV.
          </p>
        </div>
        <button
          type="button"
          className={`${button.base} ${button.secondary} inline-flex items-center gap-2`}
          onClick={onExport}
        >
          <Download className="h-4 w-4" />
          Exportar carta por separado (Gratis)
        </button>
      </header>

      <section className="space-y-3 rounded-[var(--radius-card)] border border-[var(--color-neutral-border)] bg-[var(--ui-bg-panel)] p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-neutral-text-primary)]">
            <Briefcase className="h-4 w-4" />
            Vacante de esta carta
          </h3>
          {onEditVacante && (
            <button
              type="button"
              onClick={onEditVacante}
              className="cursor-pointer text-xs font-bold text-[var(--color-accent-text)] hover:text-[var(--ui-text-primary)] transition-colors"
            >
              Ir a Vacante Objetivo
            </button>
          )}
        </div>

        {!hasValidJobTarget ? (
          <div className="space-y-3 rounded-[var(--ui-radius-control)] border border-[var(--color-status-warning-base)]/50 bg-[var(--color-status-warning-muted)]/40 p-3">
            <div className="flex items-start gap-2 text-xs text-[var(--color-status-warning-text)]">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Para generar una carta desde el CV Base, indicá primero el <strong>Puesto</strong> y la <strong>Empresa</strong> a la que dirigís la carta (esto no modifica tu CV Base).
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <Field
                label="Puesto"
                value={jobTarget.jobTitle || ''}
                onChange={(e: any) => updateJobTargetField('jobTitle', e.target.value)}
                placeholder="Ej: Diseñadora Instruccional"
              />
              <Field
                label="Empresa"
                value={jobTarget.companyName || ''}
                onChange={(e: any) => updateJobTargetField('companyName', e.target.value)}
                placeholder="Ej: EdTech.IA"
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--color-neutral-text-primary)] font-medium">
            {jobTarget.jobTitle} · {jobTarget.companyName}
          </p>
        )}

        {jobTarget.recipientName && (
          <p className="text-xs text-[var(--color-neutral-text-secondary)]">Contacto: {jobTarget.recipientName}</p>
        )}
      </section>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={isGenerating}
            onClick={handleGenerateAndFill}
            className={`${button.base} ${button.primary} inline-flex items-center gap-2 text-xs px-4 py-2 cursor-pointer ${
              !hasValidJobTarget ? 'opacity-80' : ''
            }`}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <span className="ui-ai-sparkle-loop">
                <DomSectionIcon iconId={UI_ICON_IDS.ia} size={15} strokeWidth={2.1} />
              </span>
            )}
            {isGenerating ? 'Redactando…' : 'Completar carta con IA'}
          </button>
          <LidioHelpTrigger
            size="xs"
            title="Completar carta con IA"
            text="La IA analiza todas las secciones de tu CV y rellena automáticamente el saludo, los 3 párrafos y la despedida sin consumir créditos."
            groupKey="cover-letter-ai"
          />
        </div>
      </div>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-[var(--color-neutral-text-primary)]">Texto editable</h3>
        {letterFields.map(({ key, label, rows = 2 }) => (
          <Field
            key={key}
            id={`cover-letter-${key}`}
            as={rows > 2 ? 'textarea' : 'input'}
            rows={rows}
            label={label}
            value={cvData.body?.[key] || ''}
            onChange={(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
              const value = event.target.value;
              setCvData((previous: any) => ({
                ...previous,
                body: { ...(previous.body || {}), [key]: value },
              }));
            }}
          />
        ))}
      </section>
    </div>
  );
};
