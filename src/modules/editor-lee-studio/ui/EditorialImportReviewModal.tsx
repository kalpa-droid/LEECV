import React, { useMemo, useState } from 'react';
import { AlertTriangle, BookOpen, Check, Columns2, Layers, Merge, Sparkles } from 'lucide-react';
import {
  StructuredImportReviewModal,
  type ReviewFilterTab,
} from '../../../shared/core/ui/StructuredImportReviewModal';
import { Field } from '../../../shared/core/ui/Field';
import { matchesSearchQuery } from '../../../shared/core/ui/SearchFilterBar';
import { button, radius } from '../../../shared/core/uiDesignSystem';
import type { StructureAuditIssue } from '../../../shared/core/document-ast/documentAst';
import type { EditorialPresetRecommendation } from '../domain/editorialPresetDetector';
import type { EditorialSection, EditorialSectionKind } from '../domain/editorialTypes';

export type SectionMergeActionKind = 'new' | 'append_into' | 'overwrite' | 'skip';

export interface SectionMergeDecision {
  action: SectionMergeActionKind;
  targetSectionId?: string;
}

export interface EditorialImportReviewModalProps {
  isOpen: boolean;
  onCancel: () => void;
  sourceChars: number;
  initialMetadata: { title: string; subtitle: string; author: string };
  initialLegalFields?: Record<string, string>;
  initialSections: EditorialSection[];
  existingSections?: EditorialSection[];
  presetRecommendation?: EditorialPresetRecommendation | null;
  auditIssues?: StructureAuditIssue[];
  losslessSummary?: {
    totalBlocks: number;
    recoveredBlocks: number;
    preservedTables: number;
    preservedImages: number;
  } | null;
  warnings?: string[];
  onConfirm: (result: {
    metadata: { title: string; subtitle: string; author: string };
    legalFields?: Record<string, string>;
    sections: EditorialSection[];
    applyMetadata: boolean;
    applyDetectedPreset: boolean;
  }) => void;
}

function normalizeMatchTitle(raw: string): string {
  return String(raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^(?:\d+(?:\.\d+)?|[ivxl]+)[.)]\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function recordHasRealContent(r: any): boolean {
  if (!r || typeof r !== 'object') return false;
  return (
    String(r.content || '').trim().length > 0 ||
    String(r.sourceTitle || r.calloutTitle || '').trim().length > 0 ||
    Boolean(r.imagePath) ||
    (Array.isArray(r.tableRows) && r.tableRows.length > 0) ||
    (Array.isArray(r.calloutItems) && r.calloutItems.some((c: any) => String(c || '').trim().length > 0)) ||
    String(r.footnoteText || '').trim().length > 0 ||
    (Array.isArray(r.authors) && r.authors.length > 0)
  );
}

function isEmptySeedOnlySection(sec: EditorialSection): boolean {
  const recs = Array.isArray(sec?.records) ? sec.records : [];
  if (recs.length === 0) return false;
  return recs.every(
    (r) => String(r?.id || '').startsWith('rec_seed_') && !recordHasRealContent(r),
  );
}

export function buildDefaultMergeDecisions(
  incoming: EditorialSection[],
  existing: EditorialSection[],
): Record<string, SectionMergeDecision> {
  const out: Record<string, SectionMergeDecision> = {};
  const hasExistingContent = existing.some((s) =>
    (s.records || []).some((r) => recordHasRealContent(r)),
  );
  for (const sec of incoming) {
    if (!hasExistingContent) {
      out[sec.id] = { action: 'new' };
      continue;
    }
    const normIn = normalizeMatchTitle(sec.title);
    const match = existing.find((ex) => {
      const normEx = normalizeMatchTitle(ex.title);
      return (normIn && normEx && normIn === normEx) || (sec.sectionKey && sec.sectionKey === ex.sectionKey && sec.sectionKey !== 'capitulo');
    });
    if (match) {
      out[sec.id] = { action: 'append_into', targetSectionId: match.id };
    } else {
      out[sec.id] = { action: 'new' };
    }
  }
  return out;
}

export function applyEditorialImportMergePlan(params: {
  existingSections: EditorialSection[];
  incomingSections: EditorialSection[];
  decisions: Record<string, SectionMergeDecision>;
  replaceAll: boolean;
}): EditorialSection[] {
  const { existingSections, incomingSections, decisions, replaceAll } = params;
  if (replaceAll) {
    return incomingSections.map((s, idx) => ({ ...s, position: idx }));
  }

  const working: EditorialSection[] = existingSections
    .filter((s) => !isEmptySeedOnlySection(s))
    .map((s) => ({
      ...s,
      records: [...(s.records || [])].filter(
        (r) => !(String(r?.id || '').startsWith('rec_seed_') && !recordHasRealContent(r)),
      ),
    }));

  for (const inc of incomingSections) {
    const decision = decisions[inc.id] || { action: 'new' };
    if (decision.action === 'skip') continue;

    if (decision.action === 'append_into' && decision.targetSectionId) {
      const targetIdx = working.findIndex((w) => w.id === decision.targetSectionId);
      if (targetIdx >= 0) {
        working[targetIdx] = {
          ...working[targetIdx],
          records: [...(working[targetIdx].records || []), ...(inc.records || [])],
        };
        continue;
      }
    }

    if (decision.action === 'overwrite' && decision.targetSectionId) {
      const targetIdx = working.findIndex((w) => w.id === decision.targetSectionId);
      if (targetIdx >= 0) {
        working[targetIdx] = {
          ...working[targetIdx],
          title: inc.title || working[targetIdx].title,
          columns: inc.columns ?? working[targetIdx].columns,
          records: [...(inc.records || [])],
        };
        continue;
      }
    }

    working.push({
      ...inc,
      id: working.some((w) => w.id === inc.id) ? `${inc.id}_imp_${working.length}` : inc.id,
    });
  }

  return working.map((s, idx) => ({ ...s, position: idx }));
}

export const EditorialImportReviewModal: React.FC<EditorialImportReviewModalProps> = ({
  isOpen,
  onCancel,
  sourceChars,
  initialMetadata,
  initialLegalFields,
  initialSections,
  existingSections = [],
  presetRecommendation,
  auditIssues = [],
  losslessSummary,
  warnings = [],
  onConfirm,
}) => {
  const hasExistingContent = useMemo(
    () =>
      existingSections.some((s) =>
        (s.records || []).some((r) => recordHasRealContent(r)),
      ),
    [existingSections],
  );

  const [metadata, setMetadata] = useState(initialMetadata);
  const [sections, setSections] = useState<EditorialSection[]>(initialSections);
  const [decisions, setDecisions] = useState<Record<string, SectionMergeDecision>>(() =>
    buildDefaultMergeDecisions(initialSections, existingSections),
  );
  const [replaceAll, setReplaceAll] = useState<boolean>(!hasExistingContent);
  const [applyMetadata, setApplyMetadata] = useState<boolean>(!hasExistingContent);
  const [applyDetectedPreset, setApplyDetectedPreset] = useState<boolean>(Boolean(presetRecommendation));
  const [activeFilter, setActiveFilter] = useState<ReviewFilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const keptChars = useMemo(
    () =>
      sections.reduce(
        (acc, sec) =>
          acc +
          sec.records.reduce((rAcc, rec) => rAcc + String(rec.content || '').replace(/\s+/g, '').length, 0),
        0,
      ),
    [sections],
  );

  const visibleSections = useMemo(() => {
    if (activeFilter === 'scalars') return [];
    return sections.filter((sec) =>
      matchesSearchQuery(
        [sec.title, ...sec.records.slice(0, 3).map((r) => r.content)],
        searchQuery,
        3,
      ),
    );
  }, [sections, activeFilter, searchQuery]);

  const activeImportCount = useMemo(() => {
    if (!hasExistingContent || replaceAll) return sections.length;
    return sections.filter((s) => (decisions[s.id]?.action || 'new') !== 'skip').length;
  }, [sections, decisions, hasExistingContent, replaceAll]);

  const mergeWithPrevious = (idx: number) => {
    if (idx <= 0) return;
    setSections((prev) => {
      const next = [...prev];
      const current = next[idx];
      const target = next[idx - 1];
      if (!current || !target) return prev;
      next[idx - 1] = {
        ...target,
        records: [...target.records, ...current.records],
      };
      next.splice(idx, 1);
      return next.map((s, i) => ({ ...s, position: i }));
    });
  };

  const applyBatchMode = (mode: 'append_all' | 'update_matches' | 'replace_all') => {
    if (mode === 'replace_all') {
      setReplaceAll(true);
      setApplyMetadata(true);
      return;
    }
    setReplaceAll(false);
    const next: Record<string, SectionMergeDecision> = {};
    for (const sec of sections) {
      if (mode === 'append_all') {
        next[sec.id] = { action: 'new' };
      } else {
        const normIn = normalizeMatchTitle(sec.title);
        const match = existingSections.find((ex) => {
          const normEx = normalizeMatchTitle(ex.title);
          return (normIn && normEx && normIn === normEx) || (sec.sectionKey && sec.sectionKey === ex.sectionKey && sec.sectionKey !== 'capitulo');
        });
        next[sec.id] = match ? { action: 'overwrite', targetSectionId: match.id } : { action: 'new' };
      }
    }
    setDecisions(next);
  };

  const mergedPreviewSections = useMemo(
    () =>
      applyEditorialImportMergePlan({
        existingSections,
        incomingSections: sections,
        decisions,
        replaceAll: !hasExistingContent || replaceAll,
      }),
    [existingSections, sections, decisions, hasExistingContent, replaceAll],
  );

  const fidelityLine = losslessSummary
    ? `100% conservado: ${losslessSummary.totalBlocks} bloques · ${losslessSummary.preservedTables} tabla(s) · ${losslessSummary.preservedImages} figura(s)/gráfico(s).`
    : null;

  return (
    <StructuredImportReviewModal
      isOpen={isOpen}
      title="Revisar estructura detectada antes de aplicar"
      subtitle={
        hasExistingContent
          ? 'Tu obra ya tiene contenido: elegí por apartado si querés sumarlo debajo, sobreescribir un capítulo puntual o saltearlo.'
          : 'Verificá el título de la obra, los capítulos detectados y cualquier alerta estructural antes de pasar al editor.'
      }
      onCancel={onCancel}
      scalarCount={3}
      recordCount={sections.length}
      conflictCount={auditIssues.length + warnings.length}
      activeFilter={activeFilter}
      onFilterChange={setActiveFilter}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      retentionSummary={{
        keptCount: Math.max(keptChars, sourceChars > 0 ? keptChars : 1),
        totalCount: Math.max(sourceChars, keptChars, 1),
        unitLabel: 'caracteres',
        warnings: [...(fidelityLine ? [fidelityLine] : []), ...warnings],
      }}
      quickActions={
        hasExistingContent ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => applyBatchMode('append_all')}
              className={`px-2.5 py-1 text-[11px] font-bold border cursor-pointer ${
                !replaceAll
                  ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-muted)] text-[var(--color-accent-text)]'
                  : 'border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-[var(--ui-text-secondary)]'
              }`}
              style={{ borderRadius: radius.control }}
            >
              Agregar debajo
            </button>
            <button
              type="button"
              onClick={() => applyBatchMode('update_matches')}
              className="px-2.5 py-1 text-[11px] font-bold border border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-[var(--ui-text-primary)] cursor-pointer"
              style={{ borderRadius: radius.control }}
            >
              Actualizar coincidentes
            </button>
            <button
              type="button"
              onClick={() => applyBatchMode('replace_all')}
              className={`px-2.5 py-1 text-[11px] font-bold border cursor-pointer ${
                replaceAll
                  ? 'border-[var(--color-status-warning-base)] bg-[var(--color-status-warning-muted)] text-[var(--color-status-warning-text)]'
                  : 'border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-[var(--ui-text-secondary)]'
              }`}
              style={{ borderRadius: radius.control }}
            >
              Reemplazar toda la obra
            </button>
          </div>
        ) : undefined
      }
      footer={
        <>
          <button type="button" className={`${button.base} ${button.secondary}`} onClick={onCancel}>
            Cancelar
          </button>
          <button
            type="button"
            disabled={activeImportCount === 0}
            className={`${button.base} ${button.primary} inline-flex items-center gap-2 disabled:opacity-40`}
            onClick={() =>
              onConfirm({
                metadata,
                legalFields: initialLegalFields,
                sections: mergedPreviewSections,
                applyMetadata,
                applyDetectedPreset,
              })
            }
          >
            <Check className="w-4 h-4" />
            {hasExistingContent && !replaceAll
              ? `Aplicar ${activeImportCount} sección(es) a la obra`
              : `Aplicar ${sections.length} secciones al editor`}
          </button>
        </>
      }
    >
      {presetRecommendation && (
        <label
          className="flex items-center justify-between gap-2 p-3 border border-[var(--color-accent-base)]/40 bg-[var(--color-accent-muted)] cursor-pointer"
          style={{ borderRadius: radius.control }}
        >
          <span className="inline-flex items-center gap-2 text-xs font-bold text-[var(--color-accent-text)]">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>
              Detectamos formato: <strong>{presetRecommendation.detectedLabel}</strong>
              {presetRecommendation.reason ? ` — ${presetRecommendation.reason}` : ''}
            </span>
          </span>
          <input
            type="checkbox"
            checked={applyDetectedPreset}
            onChange={(e) => setApplyDetectedPreset(e.target.checked)}
            className="w-4 h-4 shrink-0 accent-[var(--color-accent-base)]"
          />
        </label>
      )}

      {auditIssues.length > 0 && (
        <div
          className="p-3 border border-[var(--color-status-warning-base)]/40 bg-[var(--color-status-warning-muted)] space-y-1.5"
          style={{ borderRadius: radius.control }}
        >
          <p className="text-xs font-extrabold text-[var(--color-status-warning-text)] inline-flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Observaciones detectadas en la estructura original ({auditIssues.length})
          </p>
          <ul className="text-[11px] text-[var(--ui-text-primary)] space-y-1 list-disc pl-5">
            {auditIssues.slice(0, 6).map((iss, i) => (
              <li key={i}>
                <strong>{iss.title}:</strong> {iss.detail}
              </li>
            ))}
          </ul>
        </div>
      )}

      {activeFilter !== 'records' && (
        <section
          className="space-y-2.5 p-3.5 border border-[var(--ui-border-strong)] bg-[var(--ui-bg-card)]"
          style={{ borderRadius: radius.card }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-[var(--color-secondary-text)] inline-flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Metadatos detectados de la obra
            </h3>
            {hasExistingContent && (
              <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--ui-text-primary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyMetadata}
                  onChange={(e) => setApplyMetadata(e.target.checked)}
                  className="accent-[var(--color-accent-base)]"
                />
                Actualizar título y portada actual
              </label>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            <Field
              label="Título"
              value={metadata.title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setMetadata((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="Título de tu obra"
            />
            <Field
              label="Subtítulo"
              value={metadata.subtitle}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setMetadata((prev) => ({ ...prev, subtitle: e.target.value }))
              }
              placeholder="Opcional"
            />
            <Field
              label="Autor / Institución"
              value={metadata.author}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setMetadata((prev) => ({ ...prev, author: e.target.value }))
              }
              placeholder="Tu nombre"
            />
          </div>
        </section>
      )}

      {visibleSections.length > 0 && (
        <section className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-[var(--color-accent-purple-text)] inline-flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" /> Capítulos y secciones detectadas
            </h3>
            <span className="text-[11px] font-bold text-[var(--ui-text-secondary)]">
              {visibleSections.length} secciones
            </span>
          </div>

          <div className="space-y-2">
            {visibleSections.map((sec, idx) => {
              const tablesCount = sec.records.filter((r) => r.type === 'table').length;
              const imagesCount = sec.records.filter((r) => r.type === 'image').length;
              const firstText = sec.records.find((r) => r.content)?.content || '';
              const decision = decisions[sec.id] || { action: 'new' };
              const isSkipped = hasExistingContent && !replaceAll && decision.action === 'skip';
              const selectValue =
                decision.action === 'skip'
                  ? 'skip'
                  : decision.action === 'append_into' && decision.targetSectionId
                    ? `append:${decision.targetSectionId}`
                    : decision.action === 'overwrite' && decision.targetSectionId
                      ? `overwrite:${decision.targetSectionId}`
                      : 'new';

              return (
                <div
                  key={sec.id}
                  className={`p-3 border border-[var(--ui-border-strong)] border-l-4 border-l-[var(--color-accent-purple)] bg-[var(--ui-bg-card)] space-y-2 ${
                    isSkipped ? 'opacity-50' : ''
                  }`}
                  style={{ borderRadius: radius.card }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex-1 min-w-[180px]">
                      <Field
                        label={`Sección ${idx + 1}`}
                        value={sec.title}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const val = e.target.value;
                          setSections((prev) =>
                            prev.map((item) => (item.id === sec.id ? { ...item, title: val } : item)),
                          );
                        }}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 pt-4">
                      <select
                        value={sec.category || 'cuerpo'}
                        onChange={(e) => {
                          const cat = e.target.value as EditorialSectionKind;
                          setSections((prev) =>
                            prev.map((item) => (item.id === sec.id ? { ...item, category: cat } : item)),
                          );
                        }}
                        className="border border-[var(--ui-border)] bg-[var(--ui-btn-outline-bg)] px-2 py-1.5 text-xs font-bold text-[var(--ui-text-primary)]"
                        style={{ borderRadius: radius.control }}
                      >
                        <option value="preliminares">Preliminares</option>
                        <option value="cuerpo">Capítulo</option>
                        <option value="cierre">Cierre / Bibliografía</option>
                      </select>

                      <button
                        type="button"
                        onClick={() =>
                          setSections((prev) =>
                            prev.map((item) =>
                              item.id === sec.id
                                ? { ...item, columns: item.columns === 2 ? 1 : 2 }
                                : item,
                            ),
                          )
                        }
                        className={`px-2 py-1.5 border text-xs font-bold inline-flex items-center gap-1 cursor-pointer ${
                          sec.columns === 2
                            ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-muted)] text-[var(--color-accent-text)]'
                            : 'border-[var(--ui-border)] bg-[var(--ui-bg-panel)] text-[var(--ui-text-secondary)]'
                        }`}
                        style={{ borderRadius: radius.control }}
                        title="Alternar entre 1 y 2 columnas en este capítulo"
                      >
                        <Columns2 className="w-3.5 h-3.5" />
                        {sec.columns === 2 ? '2 col.' : '1 col.'}
                      </button>

                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => mergeWithPrevious(idx)}
                          className="px-2 py-1.5 border border-[var(--ui-border)] bg-[var(--ui-bg-panel)] text-xs font-bold text-[var(--ui-text-secondary)] hover:text-[var(--ui-text-primary)] inline-flex items-center gap-1 cursor-pointer"
                          style={{ borderRadius: radius.control }}
                          title="Unir con la sección anterior"
                        >
                          <Merge className="w-3.5 h-3.5" /> Unir
                        </button>
                      )}
                    </div>
                  </div>

                  {hasExistingContent && !replaceAll && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-[11px] font-bold text-[var(--ui-text-secondary)]">
                        Destino en tu obra:
                      </span>
                      <select
                        aria-label={`Destino de ${sec.title}`}
                        value={selectValue}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === 'new') {
                            setDecisions((prev) => ({ ...prev, [sec.id]: { action: 'new' } }));
                          } else if (raw === 'skip') {
                            setDecisions((prev) => ({ ...prev, [sec.id]: { action: 'skip' } }));
                          } else if (raw.startsWith('append:')) {
                            setDecisions((prev) => ({
                              ...prev,
                              [sec.id]: { action: 'append_into', targetSectionId: raw.slice(7) },
                            }));
                          } else if (raw.startsWith('overwrite:')) {
                            setDecisions((prev) => ({
                              ...prev,
                              [sec.id]: { action: 'overwrite', targetSectionId: raw.slice(10) },
                            }));
                          }
                        }}
                        className="flex-1 min-w-[200px] border border-[var(--ui-border)] bg-[var(--ui-bg-panel)] px-2.5 py-1 text-xs font-semibold text-[var(--ui-text-primary)]"
                        style={{ borderRadius: radius.control }}
                      >
                        <option value="new">Agregar como sección nueva</option>
                        <option value="skip">No importar esta sección</option>
                        <optgroup label="Sumar debajo de (sin borrar lo actual)">
                          {existingSections.map((ex) => (
                            <option key={`app-${ex.id}`} value={`append:${ex.id}`}>
                              Debajo de: {ex.title || 'Sin título'}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Sobreescribir únicamente">
                          {existingSections.map((ex) => (
                            <option key={`ovr-${ex.id}`} value={`overwrite:${ex.id}`}>
                              Reemplazar: {ex.title || 'Sin título'}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--ui-text-secondary)]">
                    <span className="font-bold text-[var(--ui-text-primary)]">
                      {sec.records.length} bloques
                    </span>
                    {tablesCount > 0 && <span>· {tablesCount} tabla(s)</span>}
                    {imagesCount > 0 && <span>· {imagesCount} imagen(es)/gráfico(s)</span>}
                    {firstText && (
                      <span className="truncate max-w-full italic">
                        — “{firstText.slice(0, 110)}…”
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </StructuredImportReviewModal>
  );
};

export default EditorialImportReviewModal;
