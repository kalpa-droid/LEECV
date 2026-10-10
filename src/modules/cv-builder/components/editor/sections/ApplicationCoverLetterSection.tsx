import React, { useState } from 'react';
import { Briefcase, Download, Sparkles } from 'lucide-react';
import { Field } from '../../../../../shared/core/ui/Field';
import { AIButton } from '../../../../../shared/core/ui/AIButton';
import { executeAiTask } from '../../../../../shared/core/ai/aiClient';
import { button } from '../../../../../shared/core/uiDesignSystem';
import type { CoverLetterBody } from '../../../../../types/cv';

interface ApplicationCoverLetterSectionProps {
  cvData: any;
  setCvData: React.Dispatch<React.SetStateAction<any>>;
  onExport: () => void;
}

const letterFields: Array<{ key: keyof CoverLetterBody; label: string; rows?: number }> = [
  { key: 'salutation', label: 'Saludo' },
  { key: 'hookParagraph', label: 'Presentación', rows: 4 },
  { key: 'evidenceParagraph', label: 'Experiencia relacionada', rows: 5 },
  { key: 'closingParagraph', label: 'Cierre', rows: 3 },
  { key: 'signoff', label: 'Despedida' }
];

export const ApplicationCoverLetterSection: React.FC<ApplicationCoverLetterSectionProps> = ({
  cvData,
  setCvData,
  onExport
}) => {
  const [suggestion, setSuggestion] = useState<CoverLetterBody | null>(null);
  const jobTarget = cvData.jobTarget || {};

  const handleGenerate = async () => {
    const jobTargetText = [
      jobTarget.jobTitle && `Puesto: ${jobTarget.jobTitle}`,
      jobTarget.companyName && `Empresa: ${jobTarget.companyName}`,
      jobTarget.recipientName && `Contacto: ${jobTarget.recipientName}`,
      jobTarget.jobDescription
    ].filter(Boolean).join('\n');
    const result = await executeAiTask<CoverLetterBody & { missingDataWarning?: string }>({
      taskId: 'cover_letter',
      payload: { jobTargetText },
      cvData,
      temperature: 0.4
    });
    const body = result.data;
    if (!body.hookParagraph?.trim() || !body.evidenceParagraph?.trim() || !body.closingParagraph?.trim()) {
      throw new Error('La IA no devolvió todos los párrafos necesarios para revisar la carta.');
    }
    return JSON.stringify({
      salutation: body.salutation || '',
      hookParagraph: body.hookParagraph,
      evidenceParagraph: body.evidenceParagraph,
      closingParagraph: body.closingParagraph,
      signoff: body.signoff || ''
    });
  };

  const handleShowSuggestion = (rawSuggestion: string) => {
    const parsed: unknown = JSON.parse(rawSuggestion);
    if (!parsed || typeof parsed !== 'object') throw new Error('La propuesta de carta no tiene un formato válido.');
    setSuggestion(parsed as CoverLetterBody);
  };

  const applySuggestion = () => {
    if (!suggestion) return;
    setCvData((previous) => ({ ...previous, body: suggestion }));
    setSuggestion(null);
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-neutral-border)] pb-4">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--color-neutral-text-primary)]">
            <Briefcase className="h-5 w-5 text-[var(--color-secondary-bright)]" />
            Carta de presentación
          </h2>
          <p className="text-sm text-[var(--color-neutral-text-secondary)]">
            La carta comparte la vacante y los datos de esta versión del CV. Reutiliza sus colores y tipografía con una composición propia.
          </p>
        </div>
        <button type="button" className={`${button.secondary} inline-flex items-center gap-2`} onClick={onExport}>
          <Download className="h-4 w-4" />
          Exportar carta por separado
        </button>
      </header>

      <section className="space-y-2 rounded-[var(--radius-card)] border border-[var(--color-neutral-border)] bg-[var(--ui-bg-panel)] p-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-neutral-text-primary)]">
          <Briefcase className="h-4 w-4" />
          Información de la vacante
        </h3>
        <p className="text-sm text-[var(--color-neutral-text-primary)]">
          {jobTarget.jobTitle || 'Puesto sin especificar'}
          {jobTarget.companyName ? ` · ${jobTarget.companyName}` : ''}
        </p>
        {jobTarget.recipientName && (
          <p className="text-sm text-[var(--color-neutral-text-secondary)]">Contacto: {jobTarget.recipientName}</p>
        )}
        {!jobTarget.jobTitle && !jobTarget.companyName && !jobTarget.jobDescription && (
          <p className="text-sm text-[var(--color-neutral-text-secondary)]">
            Completá la vacante en el panel “Vacante” para orientar la carta.
          </p>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[var(--color-neutral-text-secondary)]">
          La IA propone un borrador que podés revisar antes de aplicarlo.
        </p>
        <AIButton
          label="Proponer carta con IA"
          onGenerate={handleGenerate}
          onSuccess={handleShowSuggestion}
        />
      </div>

      {suggestion && (
        <section className="space-y-3 rounded-[var(--radius-card)] border border-[var(--color-neutral-border)] bg-[var(--ui-bg-panel)] p-4">
          <h3 className="flex items-center gap-2 font-semibold text-[var(--color-neutral-text-primary)]">
            <Sparkles className="h-4 w-4" />
            Propuesta para revisar
          </h3>
          {letterFields.map(({ key, label }) => (
            <div key={key} className="space-y-1">
              <h4 className="text-sm font-medium text-[var(--color-neutral-text-primary)]">{label}</h4>
              <p className="whitespace-pre-wrap text-sm text-[var(--color-neutral-text-secondary)]">{suggestion[key] || ''}</p>
            </div>
          ))}
          <div className="flex flex-wrap gap-2 border-t border-[var(--color-neutral-border)] pt-3">
            <button type="button" className={button.primary} onClick={applySuggestion}>Aplicar borrador</button>
            <button type="button" className={button.ghost} onClick={() => setSuggestion(null)}>Descartar</button>
          </div>
        </section>
      )}

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
              setCvData((previous) => ({
                ...previous,
                body: { ...(previous.body || {}), [key]: value }
              }));
            }}
          />
        ))}
      </section>
    </div>
  );
};
