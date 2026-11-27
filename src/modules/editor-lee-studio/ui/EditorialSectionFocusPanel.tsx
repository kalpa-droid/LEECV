import React, { useMemo, useState } from 'react';
import { FilePlus2, Plus, Settings2, SpellCheck, Trash2 } from 'lucide-react';
import { PanelSection } from '../../../shared/core/ui/PanelSection';
import { Field } from '../../../shared/core/ui/Field';
import { VisibilityEyeToggle } from '../../../shared/core/ui/VisibilityEyeToggle';
import { ManualOverrideBadge } from '../../../shared/core/ui/ManualOverrideBadge';
import { useConfirm } from '../../../shared/core/ui/ConfirmDialog';
import { executeAiTask } from '../../../shared/core/ai/aiClient';
import { resolveCanonicalEditorialKey } from '../domain/editorialDockEngine';
import { resolveEditorialSectionCoverState } from '../domain/sanitizeEditorialData';
import {
  createDefaultEditorialRecord,
  insertRecordAt,
  moveRecord,
  reorderRecord,
  splitParagraphRecord,
} from '../domain/editorialBlockOperations';
import {
  BIBLIOGRAPHY_NORM_GUIDES,
  buildInlineCiteToken,
  collectBibliographyFromSections,
  computeCitationAppearanceOrder,
  extractInlineCitationTokens,
  formatInlineCitation,
  normalizeBibliographyStyle,
  syncSectionsBibliographyOrder,
} from '../domain/editorialCitationFormatter';
import {
  buildEditorialCrossRefGraph,
  buildInlineRefToken,
  extractInlineRefTokens,
  resolveAllEditorialInlineTokens,
} from '../domain/editorialCrossRefEngine';
import { CleanBlockCanvas } from './chapter-editor/CleanBlockCanvas';
import {
  SectionProofreadDrawer,
  type ProofreadIssue,
} from './chapter-editor/SectionProofreadDrawer';
import type {
  EditorialBibliographySourceType,
  EditorialRecord,
  EditorialRecordType,
  EditorialSection,
} from '../domain/editorialTypes';
import { radius } from '../../../shared/core/uiDesignSystem';

export interface EditorialSectionFocusPanelProps {
  section: EditorialSection;
  draft?: any;
  badgeLabel?: string;
  updateDraft: (updater: (prev: any) => any) => void;
  setActiveStepTab: (tab: string) => void;
  notify: { success: (msg: string) => void; error: (msg: string) => void };
  onCommitHistoryBoundary?: () => void;
}

const SECTION_WRITING_GUIDES: Record<string, string> = {
  prologo: 'Presentá por qué nace la obra, el contexto o quién invita a leerla.',
  dedicatoria: 'Un párrafo breve, personal o institucional antes de iniciar el contenido.',
  agradecimientos: 'Reconocé a personas, instituciones o colegas que colaboraron en la obra.',
  resumen: 'Resumí objetivo, método y principales hallazgos en 150 a 250 palabras claras.',
  resumen_ejecutivo: 'Resumí en media hoja el problema, la recomendación principal y el impacto esperado.',
  introduccion: 'Explicá qué tema abordás, por qué importa y cuál es el propósito del trabajo.',
  objetivos_alcance: 'Detallá el objetivo general, las metas concretas y qué queda incluido.',
  diagnostico: 'Describí la situación actual, evidencia relevada o línea base.',
  propuesta_tecnica: 'Explicá la solución propuesta, entregables y especificaciones técnicas.',
  cronograma: 'Organizá las etapas, hitos, responsables y plazos en lista o tabla.',
  presupuesto_recursos: 'Desglosá rubros, horas, materiales y costos unitarios en una tabla.',
  riesgos: 'Identificá riesgos probables, nivel de impacto y acción preventiva.',
  marco_teorico: 'Contrastá autores y definiciones clave que respaldan tu desarrollo.',
  metodologia: 'Detallá qué pasos seguiste, con qué instrumentos y en qué fuentes.',
  resultados: 'Mostrá datos, hallazgos y tablas en orden claro sin interpretarlos todavía.',
  resultados_discusion: 'Presentá tus hallazgos y contrastalos con los objetivos planteados.',
  discusion: 'Explicá qué significan tus resultados y cómo dialogan con antecedentes.',
  conclusiones: 'Cerrá respondiendo a tu pregunta inicial con los aportes más firmes.',
  recomendaciones: 'Enumerá los pasos siguientes, prioridades y decisiones sugeridas.',
  epilogo: 'Cierre narrativo posterior al desenlace principal.',
  glosario: 'Definí los términos clave o siglas ordenados alfabéticamente.',
  bibliografia: 'Gestioná todas tus citas desde el paso Bibliografía y Citas para ordenarlas según tu norma.',
  anexo: 'Sumá encuestas, imágenes de respaldo, cuadros extendidos o gráficos complementarios.',
  capitulo: 'Escribí por párrafos continuos; tocá cualquier texto para editarlo o usá "+" entre párrafos para intercalar una imagen, cita o tabla.',
  unidad: 'Organizá la unidad didáctica con subtítulos H2/H3, recuadros clave y ejemplos.',
  desarrollo: 'Desarrollá tus argumentos en bloques claros e intercalá tablas o figuras cuando aporten claridad.',
};

const QUICK_ADD_TYPES: Array<{ type: EditorialRecordType; label: string }> = [
  { type: 'paragraph', label: '+ Párrafo' },
  { type: 'subtitle', label: '+ Subtítulo' },
  { type: 'image', label: '+ Imagen' },
  { type: 'table', label: '+ Tabla' },
  { type: 'quote', label: '+ Cita' },
  { type: 'list', label: '+ Lista' },
  { type: 'callout', label: '+ Recuadro' },
  { type: 'poem', label: '+ Poema' },
  { type: 'epigraph', label: '+ Epígrafe' },
  { type: 'figure_placeholder', label: '+ Figura' },
];

export const EditorialSectionFocusPanel: React.FC<EditorialSectionFocusPanelProps> = ({
  section,
  draft,
  badgeLabel,
  updateDraft,
  setActiveStepTab,
  notify,
  onCommitHistoryBoundary,
}) => {
  const { confirm } = useConfirm();
  const [focusedRecordId, setFocusedRecordId] = useState<string | null>(
    section.records?.[0]?.id || null,
  );
  const [showProofread, setShowProofread] = useState(false);
  const [showParticularSettings, setShowParticularSettings] = useState(false);
  const [pendingSuggestions, setPendingSuggestions] = useState<Record<string, string>>({});
  const [citePickerRecordId, setCitePickerRecordId] = useState<string | null>(null);
  const [citePickerMode, setCitePickerMode] = useState<'sources' | 'elements'>('sources');
  const [showQuickSourceForm, setShowQuickSourceForm] = useState(false);
  const [quickLocator, setQuickLocator] = useState('');
  const [quickAuthor, setQuickAuthor] = useState('');
  const [quickYear, setQuickYear] = useState('');
  const [quickTitle, setQuickTitle] = useState('');
  const [quickPub, setQuickPub] = useState('');
  const [quickSourceType, setQuickSourceType] = useState<EditorialBibliographySourceType>('libro');

  const { sectionKey } = resolveCanonicalEditorialKey(section);
  const guideBody =
    SECTION_WRITING_GUIDES[sectionKey] ||
    'Tocá cualquier párrafo para editarlo, dividilo con el ícono de tijera o intercalá imágenes, citas y tablas entre bloques.';

  const activeBibStyle = normalizeBibliographyStyle(
    draft?.design?.bibliographyStyle || draft?.design?.normId,
  );
  const allSections: EditorialSection[] = useMemo(
    () => (Array.isArray(draft?.sections) ? draft.sections : [section]),
    [draft?.sections, section],
  );
  const { items: bibItems, map: bibMap } = useMemo(
    () => collectBibliographyFromSections(allSections),
    [allSections],
  );
  const appearanceOrderMap = useMemo(
    () => computeCitationAppearanceOrder(allSections),
    [allSections],
  );
  const crossRefGraph = useMemo(
    () => buildEditorialCrossRefGraph(allSections),
    [allSections],
  );

  const sectionCoverState = resolveEditorialSectionCoverState(
    section,
    draft?.design,
    draft?.cover,
  );
  const globalColumns: 1 | 2 = draft?.design?.bodyColumns === 2 ? 2 : 1;
  const effectiveColumns: 1 | 2 =
    section.columnsOverride ?? section.columnCount ?? section.columns ?? globalColumns;

  const particularOverrideCount = [
    typeof section.startNewPageOverride === 'boolean',
    typeof section.columnsOverride === 'number' ||
      (typeof section.columns === 'number' && section.columns !== globalColumns),
    section.sectionCover?.mode === 'on' || section.sectionCover?.mode === 'off',
    Boolean(section.kickerLabel?.trim()),
    section.includeInToc === false,
    Boolean(section.masterPageMode && section.masterPageMode !== 'auto'),
  ].filter(Boolean).length;

  const updateSection = (mutator: (s: EditorialSection) => EditorialSection) => {
    updateDraft((prev) => ({
      ...prev,
      sections: (prev?.sections || []).map((s: EditorialSection) =>
        s.id === section.id ? mutator(s) : s,
      ),
    }));
  };

  const resetAllParticularOverrides = () => {
    onCommitHistoryBoundary?.();
    updateSection((s) => ({
      ...s,
      kickerLabel: undefined,
      startNewPageOverride: undefined,
      columnsOverride: undefined,
      columns: undefined,
      columnCount: undefined,
      includeInToc: true,
      masterPageMode: 'auto',
      sectionCover: {
        ...(s.sectionCover || {}),
        mode: 'inherit',
        enabled: undefined,
        kicker: undefined,
        subtitle: undefined,
      },
    }));
    notify.success('Este capítulo vuelve a seguir las reglas globales de la obra.');
  };

  const handleInsertAt = (index: number, type: EditorialRecordType) => {
    onCommitHistoryBoundary?.();
    const created = createDefaultEditorialRecord(type);
    updateSection((s) => ({
      ...s,
      records: insertRecordAt(s.records || [], index, created),
    }));
    setFocusedRecordId(created.id);
  };

  const handleMoveRecord = (index: number, delta: -1 | 1) => {
    onCommitHistoryBoundary?.();
    updateSection((s) => ({
      ...s,
      records: moveRecord(s.records || [], index, delta),
    }));
  };

  const handleReorderRecord = (fromIndex: number, toIndex: number) => {
    onCommitHistoryBoundary?.();
    updateSection((s) => ({
      ...s,
      records: reorderRecord(s.records || [], fromIndex, toIndex),
    }));
  };

  const handleSplitRecord = (recordId: string, cursorOffset?: number) => {
    onCommitHistoryBoundary?.();
    const res = splitParagraphRecord(section.records || [], recordId, cursorOffset);
    updateSection((s) => ({ ...s, records: res.records }));
    if (res.createdId) setFocusedRecordId(res.createdId);
  };

  const handleUpdateRecord = (recId: string, patch: Partial<EditorialRecord>) => {
    updateSection((s) => ({
      ...s,
      records: (s.records || []).map((r) => (r.id === recId ? { ...r, ...patch } : r)),
    }));
  };

  const handleRemoveRecord = async (recId: string) => {
    const target = (section.records || []).find((r) => r.id === recId);
    const hasPayload = Boolean(
      target &&
        (String(target.content || '').trim() ||
          target.imagePath ||
          (Array.isArray(target.tableRows) && target.tableRows.length > 0)),
    );
    if (hasPayload) {
      const ok = await confirm({
        title: '¿Quitar este bloque del capítulo?',
        message: 'Podés volver a recuperarlo con Deshacer en la barra superior.',
        confirmText: 'Sí, quitar',
        cancelText: 'Conservar',
      });
      if (!ok) return;
    }
    onCommitHistoryBoundary?.();
    updateSection((s) => ({
      ...s,
      records: (s.records || []).filter((r) => r.id !== recId),
    }));
  };

  const handleDeleteSection = async () => {
    const ok = await confirm({
      title: `¿Eliminar "${section.title || 'esta sección'}"?`,
      message: 'Si solo querés ocultarla sin perder su contenido, usá el ícono del ojo.',
      confirmText: 'Sí, eliminar',
      cancelText: 'Conservar',
    });
    if (!ok) return;
    onCommitHistoryBoundary?.();
    updateDraft((prev) => ({
      ...prev,
      sections: (prev?.sections || []).filter((s: EditorialSection) => s.id !== section.id),
    }));
    setActiveStepTab('editorial_secciones');
    notify.success('Sección eliminada.');
  };

  const handleAiImproveRecord = async (rec: EditorialRecord): Promise<string> => {
    const text = String(rec.content || '').trim();
    if (!text) throw new Error('Escribí primero algo de texto en este bloque para mejorarlo.');
    const records = section.records || [];
    const idx = records.findIndex((r) => r.id === rec.id);
    const prevParagraph = idx > 0 ? records[idx - 1]?.content : undefined;
    const nextParagraph = idx >= 0 && idx + 1 < records.length ? records[idx + 1]?.content : undefined;
    const res = await executeAiTask<{ improvedText?: string; rewrittenText?: string }>({
      taskId: 'editorial_rewrite',
      payload: {
        text,
        sectionTitle: section.title,
        prevParagraph,
        nextParagraph,
        mode: 'improve',
      },
      cvData: draft,
      maxTokens: 1600,
    });
    const out = String(res.data?.improvedText || res.data?.rewrittenText || '').trim();
    if (!out) throw new Error('No se recibió sugerencia de mejora.');
    setPendingSuggestions((prev) => ({ ...prev, [rec.id]: out }));
    return out;
  };

  const applySingleProofreadIssue = (issue: ProofreadIssue) => {
    onCommitHistoryBoundary?.();
    updateSection((s) => ({
      ...s,
      records: (s.records || []).map((r) => {
        if (r.id !== issue.blockId || typeof r.content !== 'string') return r;
        if (!issue.originalSnippet || !r.content.includes(issue.originalSnippet)) return r;
        return {
          ...r,
          content: r.content.replace(issue.originalSnippet, issue.suggestedSnippet),
        };
      }),
    }));
  };

  const applyBatchProofreadIssues = (list: ProofreadIssue[]) => {
    onCommitHistoryBoundary?.();
    updateSection((s) => ({
      ...s,
      records: (s.records || []).map((r) => {
        if (typeof r.content !== 'string') return r;
        let text = r.content;
        for (const issue of list) {
          if (issue.blockId === r.id && issue.originalSnippet && text.includes(issue.originalSnippet)) {
            text = text.replace(issue.originalSnippet, issue.suggestedSnippet);
          }
        }
        return text === r.content ? r : { ...r, content: text };
      }),
    }));
  };

  const insertTokenIntoRecord = (rec: EditorialRecord, token: string) => {
    const currentText = String(rec.content || '');
    const needsSpace = currentText.length > 0 && !/\s$/.test(currentText);
    const nextContent = `${currentText}${needsSpace ? ' ' : ''}${token}`;
    updateDraft((prev) => {
      const prevSections: EditorialSection[] = Array.isArray(prev?.sections) ? prev.sections : [];
      const withInserted = prevSections.map((s) =>
        s.id === section.id
          ? {
              ...s,
              records: (s.records || []).map((r) =>
                r.id === rec.id ? { ...r, content: nextContent } : r,
              ),
            }
          : s,
      );
      return {
        ...prev,
        sections: syncSectionsBibliographyOrder(withInserted, activeBibStyle),
      };
    });
  };

  const handleQuickAddAndCite = (targetRec: EditorialRecord) => {
    if (!quickAuthor.trim() && !quickTitle.trim()) {
      notify.error('Escribí al menos el autor o el título de la fuente.');
      return;
    }
    const newBibId = `bib_inline_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newBibRec: EditorialRecord = {
      id: newBibId,
      type: 'bibliography_item',
      content: quickTitle.trim(),
      bibStyle: activeBibStyle,
      bibSourceType: quickSourceType,
      bibAuthor: quickAuthor.trim(),
      bibYear: quickYear.trim(),
      bibTitle: quickTitle.trim(),
      ...(quickSourceType === 'articulo' ? { bibJournal: quickPub.trim() } : { bibEditorial: quickPub.trim() }),
      bibOrderNumber: bibItems.length + 1,
    };
    const token = buildInlineCiteToken(newBibId, quickLocator);
    const currentText = String(targetRec.content || '');
    const needsSpace = currentText.length > 0 && !/\s$/.test(currentText);
    const nextContent = `${currentText}${needsSpace ? ' ' : ''}${token}`;

    updateDraft((prev) => {
      const prevSections: EditorialSection[] = Array.isArray(prev?.sections) ? prev.sections : [];
      const withText = prevSections.map((s) =>
        s.id === section.id
          ? {
              ...s,
              records: (s.records || []).map((r) =>
                r.id === targetRec.id ? { ...r, content: nextContent } : r,
              ),
            }
          : s,
      );
      const bibSec = withText.find((s) => s.sectionKey === 'bibliografia' || s.id?.includes('bibliografia'));
      const withBib = bibSec
        ? withText.map((s) => (s.id === bibSec.id ? { ...s, records: [...(s.records || []), newBibRec] } : s))
        : [
            ...withText,
            {
              id: `ed_bibliografia_${Date.now()}`,
              title: activeBibStyle === 'apa7' ? 'Referencias' : 'Bibliografía',
              sectionKey: 'bibliografia',
              category: 'cierre' as const,
              visible: true,
              includeInToc: true,
              startNewPage: true,
              position: withText.length,
              records: [newBibRec],
            },
          ];
      return { ...prev, sections: syncSectionsBibliographyOrder(withBib, activeBibStyle) };
    });

    setQuickAuthor('');
    setQuickYear('');
    setQuickTitle('');
    setQuickPub('');
    setQuickLocator('');
    setShowQuickSourceForm(false);
    setCitePickerRecordId(null);
    notify.success(`Fuente guardada y citada (${BIBLIOGRAPHY_NORM_GUIDES[activeBibStyle].label}).`);
  };

  const renderCitePickerForRecord = (rec: EditorialRecord) => {
    const tokens = extractInlineCitationTokens(rec.content || '');
    const refTokens = extractInlineRefTokens(rec.content || '');
    const crossRefItems = [
      ...crossRefGraph.tables,
      ...crossRefGraph.figures,
      ...crossRefGraph.annexes,
    ];
    if (sectionKey === 'bibliografia') return null;

    return (
      <div className="space-y-1.5">
        {(tokens.length > 0 || refTokens.length > 0) && (
          <div className="flex flex-wrap items-center gap-1">
            {tokens.map((tok, ti) => {
              const targetBib = bibMap.get(tok.bibId);
              const tag = formatInlineCitation(targetBib, activeBibStyle, appearanceOrderMap.get(tok.bibId), tok.locator);
              return (
                <span
                  key={`${tok.rawToken}-${ti}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-[var(--ui-border)] bg-[var(--ui-bg-panel)] text-[10px] font-semibold"
                >
                  <span>{tag}</span>
                  <button
                    type="button"
                    aria-label="Quitar esta cita del texto"
                    onClick={async () => {
                      const ok = await confirm({
                        title: '¿Quitar esta cita del párrafo?',
                        message: 'La fuente seguirá guardada en Bibliografía.',
                        confirmText: 'Sí, quitar',
                        cancelText: 'Cancelar',
                      });
                      if (!ok) return;
                      handleUpdateRecord(rec.id, {
                        content: (rec.content || '').replace(tok.rawToken, '').replace(/\s{2,}/g, ' ').trim(),
                      });
                    }}
                    className="text-[var(--color-status-danger-text)] cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              );
            })}
            {refTokens.map((rt, rti) => {
              const target = crossRefGraph.byTargetId.get(rt.targetId);
              const label = target ? target.label : '[Ref. pendiente]';
              return (
                <span
                  key={`${rt.rawToken}-${rti}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-[var(--color-accent-base)]/40 bg-[var(--color-accent-muted)] text-[10px] font-semibold text-[var(--color-accent-text)]"
                >
                  <span>{label}</span>
                  <button
                    type="button"
                    aria-label="Quitar esta referencia cruzada del texto"
                    onClick={() => {
                      handleUpdateRecord(rec.id, {
                        content: (rec.content || '').replace(rt.rawToken, '').replace(/\s{2,}/g, ' ').trim(),
                      });
                    }}
                    className="text-[var(--color-status-danger-text)] cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              );
            })}
            <span className="text-[10px] text-[var(--ui-text-secondary)] truncate max-w-[200px]">
              {resolveAllEditorialInlineTokens(rec.content || '', {
                bibMap,
                bibStyle: activeBibStyle,
                appearanceOrderMap,
                crossRefGraph,
              }).slice(0, 56)}
            </span>
          </div>
        )}

        {citePickerRecordId === rec.id && (
          <div
            className="p-2.5 border border-[var(--ui-border)] bg-[var(--ui-bg-panel)] space-y-2"
            style={{ borderRadius: radius.control }}
          >
            <div className="flex flex-wrap items-center gap-1.5 pb-1 border-b border-[var(--ui-border)]">
              <button
                type="button"
                onClick={() => setCitePickerMode('sources')}
                className={`px-2 py-1 text-[11px] font-bold border cursor-pointer ${
                  citePickerMode === 'sources'
                    ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-muted)] text-[var(--color-accent-text)]'
                    : 'border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-[var(--ui-text-secondary)]'
                }`}
                style={{ borderRadius: radius.control }}
              >
                Fuentes ({bibItems.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setCitePickerMode('elements');
                  setShowQuickSourceForm(false);
                }}
                className={`px-2 py-1 text-[11px] font-bold border cursor-pointer ${
                  citePickerMode === 'elements'
                    ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-muted)] text-[var(--color-accent-text)]'
                    : 'border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-[var(--ui-text-secondary)]'
                }`}
                style={{ borderRadius: radius.control }}
              >
                Tablas, Figuras y Anexos ({crossRefItems.length})
              </button>
            </div>

            {citePickerMode === 'elements' ? (
              <div className="max-h-36 overflow-y-auto space-y-1">
                {crossRefItems.length === 0 ? (
                  <p className="text-[11px] text-[var(--ui-text-secondary)]">
                    Todavía no hay tablas, imágenes o anexos en los capítulos.
                  </p>
                ) : (
                  crossRefItems.map((target) => (
                    <button
                      key={`${target.kind}-${target.targetId}`}
                      type="button"
                      onClick={() => {
                        insertTokenIntoRecord(rec, buildInlineRefToken(target.targetId));
                        setCitePickerRecordId(null);
                      }}
                      className="w-full text-left px-2 py-1 border border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-[11px] flex justify-between gap-2 cursor-pointer hover:border-[var(--color-accent-base)]"
                      style={{ borderRadius: radius.control }}
                    >
                      <span className="font-bold text-[var(--color-accent-text)]">{target.label}</span>
                      <span className="truncate text-[var(--ui-text-secondary)]">
                        {target.cleanTitle || target.sectionTitle}
                      </span>
                    </button>
                  ))
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={quickLocator}
                    onChange={(e) => setQuickLocator(e.target.value)}
                    placeholder="Página opcional (ej: p. 42)"
                    className="flex-1 min-w-0 px-2 py-1 text-[11px] border border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-[var(--ui-text-primary)]"
                    style={{ borderRadius: radius.control }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowQuickSourceForm((v) => !v)}
                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold border border-[var(--color-accent-base)]/50 bg-[var(--color-accent-muted)] text-[var(--color-accent-text)] cursor-pointer"
                    style={{ borderRadius: radius.control }}
                  >
                    <Plus className="w-3 h-3" /> Nueva fuente
                  </button>
                </div>

                {!showQuickSourceForm ? (
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {bibItems.length === 0 ? (
                      <p className="text-[11px] text-[var(--ui-text-secondary)]">
                        No hay fuentes cargadas aún. Tocá <strong>+ Nueva fuente</strong> arriba.
                      </p>
                    ) : (
                      bibItems.map((bibItem) => (
                        <button
                          key={bibItem.id}
                          type="button"
                          onClick={() => {
                            insertTokenIntoRecord(rec, buildInlineCiteToken(bibItem.id, quickLocator));
                            setQuickLocator('');
                            setCitePickerRecordId(null);
                          }}
                          className="w-full text-left px-2 py-1 border border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-[11px] flex justify-between gap-2 cursor-pointer"
                          style={{ borderRadius: radius.control }}
                        >
                          <span className="truncate">{bibItem.bibAuthor || 'Autor'} ({bibItem.bibYear || 's. f.'})</span>
                          <span className="font-bold text-[var(--color-accent-text)]">
                            {formatInlineCitation(bibItem, activeBibStyle, appearanceOrderMap.get(bibItem.id), quickLocator)}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-3 gap-1.5">
                      <input
                        type="text"
                        value={quickAuthor}
                        onChange={(e) => setQuickAuthor(e.target.value)}
                        placeholder="Autor"
                        className="col-span-2 px-2 py-1 text-[11px] border border-[var(--ui-border)] bg-[var(--ui-bg-card)]"
                        style={{ borderRadius: radius.control }}
                      />
                      <input
                        type="text"
                        value={quickYear}
                        onChange={(e) => setQuickYear(e.target.value)}
                        placeholder="Año"
                        className="px-2 py-1 text-[11px] border border-[var(--ui-border)] bg-[var(--ui-bg-card)]"
                        style={{ borderRadius: radius.control }}
                      />
                    </div>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={quickTitle}
                        onChange={(e) => setQuickTitle(e.target.value)}
                        placeholder="Título del libro o artículo"
                        className="flex-1 px-2 py-1 text-[11px] border border-[var(--ui-border)] bg-[var(--ui-bg-card)]"
                        style={{ borderRadius: radius.control }}
                      />
                      <select
                        value={quickSourceType}
                        onChange={(e) => setQuickSourceType(e.target.value as any)}
                        className="px-2 py-1 text-[11px] border border-[var(--ui-border)] bg-[var(--ui-bg-card)]"
                        style={{ borderRadius: radius.control }}
                      >
                        <option value="libro">Libro</option>
                        <option value="articulo">Artículo</option>
                        <option value="web">Web</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleQuickAddAndCite(rec)}
                      className="px-2.5 py-1 bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] text-[11px] font-bold cursor-pointer"
                      style={{ borderRadius: radius.control }}
                    >
                      Guardar y citar
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <PanelSection
        icon={
          <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full text-xs font-extrabold bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)]">
            {badgeLabel || '§'}
          </span>
        }
        title="Identidad y ajustes del apartado"
        helpTitle="Edición enfocada"
        helpText={guideBody}
        headerRight={
          <div className="flex items-center gap-1.5">
            <VisibilityEyeToggle
              size="xs"
              visible={section.visible !== false}
              onToggle={(next) => updateSection((s) => ({ ...s, visible: next }))}
              targetLabel={section.title || 'esta sección'}
            />
            <button
              type="button"
              onClick={() => void handleDeleteSection()}
              aria-label="Eliminar sección"
              title="Eliminar esta sección"
              className="p-1.5 bg-[var(--ui-bg-panel)] text-[var(--color-status-danger-text)] hover:opacity-80 cursor-pointer"
              style={{ borderRadius: radius.control }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        }
      >
        <Field
          label="Título visible en la obra"
          value={section.title || ''}
          onChange={(e: any) => updateSection((s) => ({ ...s, title: e.target.value }))}
          placeholder="Ej: Capítulo 1 · Introducción"
        />

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => setShowProofread((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 border text-xs font-bold cursor-pointer ${
              showProofread
                ? 'bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] border-[var(--color-accent-base)]'
                : 'bg-[var(--color-accent-muted)] border-[var(--color-accent-base)]/40 text-[var(--color-accent-text)]'
            }`}
            style={{ borderRadius: radius.control }}
          >
            <SpellCheck className="w-3.5 h-3.5" />
            Revisar ortografía, gramática e idiomas
          </button>

          <button
            type="button"
            onClick={() => setShowParticularSettings((v) => !v)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-xs font-bold text-[var(--ui-text-secondary)] cursor-pointer"
            style={{ borderRadius: radius.control }}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Ajustes particulares</span>
            {particularOverrideCount > 0 && (
              <ManualOverrideBadge
                isOverridden={true}
                globalLabel="Obra"
                onReset={resetAllParticularOverrides}
              />
            )}
          </button>
        </div>

        {showProofread && (
          <SectionProofreadDrawer
            sectionTitle={section.title || 'Capítulo'}
            records={section.records || []}
            draft={draft}
            onApplyIssue={applySingleProofreadIssue}
            onApplyBatchSafe={applyBatchProofreadIssues}
            onClose={() => setShowProofread(false)}
            notify={notify}
          />
        )}

        {showParticularSettings && (
          <div
            className="p-3 border border-[var(--ui-border)] bg-[var(--ui-bg-card)] space-y-2.5"
            style={{ borderRadius: radius.control }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-extrabold text-[var(--ui-text-primary)]">
                Excepciones solo para este apartado
              </span>
              {particularOverrideCount > 0 && (
                <button
                  type="button"
                  onClick={resetAllParticularOverrides}
                  className="text-[11px] font-bold text-[var(--color-accent-text)] underline cursor-pointer"
                >
                  Volver a regla global
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Field
                label="Cintillo superior (opcional)"
                value={section.kickerLabel || section.sectionCover?.kicker || ''}
                onChange={(e: any) =>
                  updateSection((s) => ({
                    ...s,
                    kickerLabel: e.target.value,
                    sectionCover: { ...(s.sectionCover || {}), kicker: e.target.value },
                  }))
                }
                placeholder="Ej: PARTE I · CAPÍTULO 1"
              />
              <div>
                <label className="block text-[11px] font-bold text-[var(--ui-text-secondary)] mb-1">
                  Salto de página
                </label>
                <select
                  value={
                    typeof section.startNewPageOverride === 'boolean'
                      ? section.startNewPageOverride
                        ? 'break'
                        : 'continuous'
                      : 'inherit'
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    updateSection((s) => ({
                      ...s,
                      startNewPageOverride: v === 'inherit' ? undefined : v === 'break',
                    }));
                  }}
                  className="w-full border border-[var(--ui-border)] bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] px-2.5 py-2 text-xs"
                  style={{ borderRadius: radius.control }}
                >
                  <option value="inherit">Seguir regla de Impresión global</option>
                  <option value="break">Forzar inicio en hoja nueva</option>
                  <option value="continuous">Seguir corrido sin corte</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[var(--ui-text-secondary)] mb-1">
                  Columnas en este apartado
                </label>
                <select
                  value={section.columnsOverride ?? 'inherit'}
                  onChange={(e) => {
                    const v = e.target.value;
                    updateSection((s) => ({
                      ...s,
                      columnsOverride: v === 'inherit' ? undefined : (Number(v) as 1 | 2),
                      columns: undefined,
                      columnCount: undefined,
                    }));
                  }}
                  className="w-full border border-[var(--ui-border)] bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] px-2.5 py-2 text-xs"
                  style={{ borderRadius: radius.control }}
                >
                  <option value="inherit">Seguir obra ({globalColumns} col.)</option>
                  <option value="1">1 columna</option>
                  <option value="2">2 columnas</option>
                </select>
              </div>
              {sectionKey !== 'bibliografia' && (
                <div>
                  <label className="block text-[11px] font-bold text-[var(--ui-text-secondary)] mb-1">
                    Carátula separadora previa
                  </label>
                  <select
                    value={section.sectionCover?.mode || 'inherit'}
                    onChange={(e) => {
                      const mode = e.target.value as 'inherit' | 'on' | 'off';
                      updateSection((s) => ({
                        ...s,
                        sectionCover: {
                          ...(s.sectionCover || {}),
                          mode,
                          enabled: mode === 'inherit' ? undefined : mode === 'on',
                        },
                      }));
                    }}
                    className="w-full border border-[var(--ui-border)] bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] px-2.5 py-2 text-xs"
                    style={{ borderRadius: radius.control }}
                  >
                    <option value="inherit">Seguir Estructura global</option>
                    <option value="on">Con carátula en este capítulo</option>
                    <option value="off">Sin carátula en este capítulo</option>
                  </select>
                </div>
              )}
            </div>

            {sectionCoverState.enabled && sectionKey !== 'bibliografia' && (
              <Field
                label="Subtítulo en carátula separadora (opcional)"
                value={section.sectionCover?.subtitle || ''}
                onChange={(e: any) =>
                  updateSection((s) => ({
                    ...s,
                    sectionCover: { ...(s.sectionCover || {}), subtitle: e.target.value },
                  }))
                }
                placeholder="Resumen o epígrafe de este capítulo..."
              />
            )}
          </div>
        )}
      </PanelSection>

      <PanelSection
        icon={<FilePlus2 className="w-4 h-4" />}
        title="Contenido del capítulo"
        helpText="Leé corrido como un borrador limpio. Tocá cualquier párrafo para editarlo, ordenarlo con ↑/↓ o usar '+' entre bloques para intercalar imágenes, tablas o citas."
      >
        {(section.records || []).filter((r) => r.type !== 'bibliography_item').length === 0 ? (
          <p className="text-xs bg-[var(--ui-bg-card)] text-[var(--ui-text-secondary)] py-2">
            Este apartado todavía no tiene párrafos. Agregá el primero abajo.
          </p>
        ) : (
          <CleanBlockCanvas
            records={section.records || []}
            focusedRecordId={focusedRecordId}
            sectionColumns={effectiveColumns}
            showCitationsAction={sectionKey !== 'bibliografia'}
            bibMap={bibMap}
            activeBibStyle={activeBibStyle}
            appearanceOrderMap={appearanceOrderMap}
            crossRefGraph={crossRefGraph}
            pendingSuggestions={pendingSuggestions}
            onFocusRecord={setFocusedRecordId}
            onUpdateRecord={handleUpdateRecord}
            onRemoveRecord={(id) => void handleRemoveRecord(id)}
            onMoveRecord={handleMoveRecord}
            onReorderRecord={handleReorderRecord}
            onSplitRecord={handleSplitRecord}
            onInsertAt={handleInsertAt}
            onAiImproveRecord={handleAiImproveRecord}
            onApplyAiSuggestion={(id) => {
              const txt = pendingSuggestions[id];
              if (!txt) return;
              onCommitHistoryBoundary?.();
              handleUpdateRecord(id, { content: txt });
              setPendingSuggestions((prev) => {
                const copy = { ...prev };
                delete copy[id];
                return copy;
              });
              notify.success('Cambio aplicado.');
            }}
            onDiscardAiSuggestion={(id) => {
              setPendingSuggestions((prev) => {
                const copy = { ...prev };
                delete copy[id];
                return copy;
              });
            }}
            onOpenCitePicker={(recId) => {
              setCitePickerRecordId((curr) => (curr === recId ? null : recId));
              setCitePickerMode('sources');
              setShowQuickSourceForm(false);
            }}
            renderCitePickerForRecord={renderCitePickerForRecord}
            notify={notify}
          />
        )}

        <div className="flex flex-wrap gap-1.5 pt-2">
          {QUICK_ADD_TYPES.map((btn) => (
            <button
              key={btn.type}
              type="button"
              onClick={() => handleInsertAt((section.records || []).length, btn.type)}
              className="px-2.5 py-1.5 text-xs font-bold border border-[var(--ui-border)] bg-[var(--ui-bg-card)] hover:border-[var(--color-accent-base)] text-[var(--ui-text-primary)] cursor-pointer"
              style={{ borderRadius: radius.control }}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </PanelSection>
    </div>
  );
};
