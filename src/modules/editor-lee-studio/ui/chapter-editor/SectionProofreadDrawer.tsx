import React, { useMemo, useState } from 'react';
import { Check, CheckCheck, Globe, SpellCheck, X } from 'lucide-react';
import { executeAiTask } from '../../../../shared/core/ai/aiClient';
import { withErrorHandling } from '../../../../shared/core/utils/errorHandler';
import type { EditorialRecord } from '../../domain/editorialTypes';
import { radius } from '../../../../shared/core/uiDesignSystem';

export type ProofreadCategory = 'ortografia' | 'tipeo' | 'gramatica' | 'idioma_extranjero';

export interface ProofreadIssue {
  id: string;
  blockId: string;
  category: ProofreadCategory;
  originalSnippet: string;
  suggestedSnippet: string;
  explanation: string;
  detectedLanguage?: string;
  isSpelledCorrectlyInLanguage?: boolean;
  editorialRecommendation?: string;
  safeAutoFix?: boolean;
}

export interface SectionProofreadDrawerProps {
  sectionTitle: string;
  records: EditorialRecord[];
  onApplyIssue: (issue: ProofreadIssue) => void;
  onApplyBatchSafe: (issues: ProofreadIssue[]) => void;
  onClose: () => void;
  notify: { success: (msg: string) => void; error: (msg: string) => void };
}

type FilterKey = 'all' | 'spelling' | 'grammar' | 'foreign';

export const SectionProofreadDrawer: React.FC<SectionProofreadDrawerProps> = ({
  sectionTitle,
  records,
  onApplyIssue,
  onApplyBatchSafe,
  onClose,
  notify,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [issues, setIssues] = useState<ProofreadIssue[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<FilterKey>('all');

  const runScan = async () => {
    const textBlocks = records
      .filter((r) => typeof r.content === 'string' && r.content.trim().length > 0)
      .slice(0, 60)
      .map((r) => ({ blockId: r.id, type: r.type, text: r.content }));

    if (textBlocks.length === 0) {
      notify.error('Agregá algo de texto en este capítulo antes de revisar.');
      return;
    }

    setIsLoading(true);
    await withErrorHandling(
      async () => {
        const res = await executeAiTask<{ issues?: ProofreadIssue[] }>({
          taskId: 'editorial_proofread_section',
          payload: { sectionTitle, blocks: textBlocks },
          maxTokens: 4096,
          temperature: 0.1,
        });
        const list = Array.isArray(res.data?.issues) ? res.data.issues : [];
        setIssues(list);
        setDismissedIds(new Set());
        setAppliedIds(new Set());
        setHasScanned(true);
        if (list.length === 0) {
          notify.success('Excelente: no encontramos errores de ortografía, tipeo ni gramática.');
        }
        return list;
      },
      {
        context: 'Corrector multilingüe EditorLee',
        errorMessage: 'No pudimos completar la revisión del capítulo.',
        notify: (m) => notify.error(m),
      },
    );
    setIsLoading(false);
  };

  const activeIssues = useMemo(
    () => issues.filter((it) => !dismissedIds.has(it.id) && !appliedIds.has(it.id)),
    [issues, dismissedIds, appliedIds],
  );

  const visibleIssues = useMemo(() => {
    if (filter === 'all') return activeIssues;
    if (filter === 'spelling') {
      return activeIssues.filter((i) => i.category === 'ortografia' || i.category === 'tipeo');
    }
    if (filter === 'grammar') return activeIssues.filter((i) => i.category === 'gramatica');
    return activeIssues.filter((i) => i.category === 'idioma_extranjero');
  }, [activeIssues, filter]);

  const safeFixable = useMemo(
    () =>
      activeIssues.filter(
        (i) => i.safeAutoFix || i.category === 'tipeo' || i.category === 'ortografia',
      ),
    [activeIssues],
  );

  return (
    <div
      className="p-3 border border-[var(--color-accent-base)]/40 bg-[var(--ui-bg-card)] space-y-3"
      style={{ borderRadius: radius.card }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <SpellCheck className="w-4 h-4 text-[var(--color-accent-text)] shrink-0" />
          <span className="text-xs font-extrabold text-[var(--ui-text-primary)] truncate">
            Revisión de ortografía, tipeo, gramática e idiomas
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar revisor"
          className="p-1 text-[var(--ui-text-secondary)] hover:text-[var(--ui-text-primary)] cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={isLoading}
          onClick={() => void runScan()}
          className="px-3 py-1.5 bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] text-xs font-bold cursor-pointer disabled:opacity-50"
          style={{ borderRadius: radius.control }}
        >
          {isLoading ? 'Analizando capítulo...' : hasScanned ? 'Volver a revisar' : 'Analizar capítulo ahora'}
        </button>

        {hasScanned && safeFixable.length > 0 && (
          <button
            type="button"
            onClick={() => {
              onApplyBatchSafe(safeFixable);
              setAppliedIds((prev) => new Set([...prev, ...safeFixable.map((i) => i.id)]));
              notify.success(`Se aplicaron ${safeFixable.length} correcciones. Podés deshacer desde arriba.`);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-[var(--color-status-success-base)]/50 bg-[var(--color-status-success-muted)] text-[var(--color-status-success-text)] text-xs font-bold cursor-pointer"
            style={{ borderRadius: radius.control }}
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Aplicar {safeFixable.length} seguras
          </button>
        )}
      </div>

      {hasScanned && (
        <div className="flex flex-wrap gap-1">
          {(
            [
              ['all', `Todos (${activeIssues.length})`],
              ['spelling', 'Ortografía / Tipeo'],
              ['grammar', 'Gramática'],
              ['foreign', 'Otros idiomas'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`px-2 py-0.5 text-[11px] font-bold border rounded-full cursor-pointer ${
                filter === key
                  ? 'bg-[var(--color-accent-muted)] border-[var(--color-accent-base)] text-[var(--color-accent-text)]'
                  : 'bg-[var(--ui-bg-panel)] border-[var(--ui-border)] text-[var(--ui-text-secondary)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {hasScanned && visibleIssues.length === 0 && (
        <p className="text-xs text-[var(--ui-text-secondary)]">
          No quedan observaciones pendientes en esta vista.
        </p>
      )}

      {visibleIssues.length > 0 && (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {visibleIssues.map((issue) => (
            <div
              key={issue.id}
              className="p-2.5 border border-[var(--ui-border)] bg-[var(--ui-bg-panel)] space-y-1.5 text-xs"
              style={{ borderRadius: radius.control }}
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-secondary-text)]">
                  {issue.category === 'idioma_extranjero'
                    ? 'Palabra en otro idioma'
                    : issue.category === 'ortografia'
                      ? 'Ortografía'
                      : issue.category === 'tipeo'
                        ? 'Error de tipeo'
                        : 'Gramática'}
                </span>
                {issue.category === 'idioma_extranjero' && issue.detectedLanguage && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-[10px] font-bold">
                    <Globe className="w-3 h-3" />
                    {issue.detectedLanguage} ·{' '}
                    {issue.isSpelledCorrectlyInLanguage === false ? 'Mal escrita en ese idioma' : 'Bien escrita'}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="line-through opacity-75 text-[var(--color-status-danger-text)]">
                  {issue.originalSnippet}
                </span>
                <span>→</span>
                <span className="font-bold text-[var(--color-status-success-text)]">
                  {issue.suggestedSnippet}
                </span>
              </div>

              <p className="text-[11px] text-[var(--ui-text-secondary)]">
                {issue.editorialRecommendation || issue.explanation}
              </p>

              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    onApplyIssue(issue);
                    setAppliedIds((prev) => new Set([...prev, issue.id]));
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] text-[11px] font-bold cursor-pointer"
                  style={{ borderRadius: radius.control }}
                >
                  <Check className="w-3 h-3" /> Aplicar
                </button>
                <button
                  type="button"
                  onClick={() => setDismissedIds((prev) => new Set([...prev, issue.id]))}
                  className="px-2.5 py-1 border border-[var(--ui-border)] text-[11px] font-semibold text-[var(--ui-text-secondary)] cursor-pointer"
                  style={{ borderRadius: radius.control }}
                >
                  Ignorar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
