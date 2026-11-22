import React, { useMemo, useState } from 'react';
import { BookmarkPlus, Edit3, FilePlus2, Plus, Sparkles, Trash2 } from 'lucide-react';
import { PanelSection } from '../../../shared/core/ui/PanelSection';
import { ContextualGuideBox } from '../../../shared/core/ui/ContextualGuideBox';
import { Field } from '../../../shared/core/ui/Field';
import { SectionSwitch } from '../../../shared/core/ui/SectionSwitch';
import { VisibilityEyeToggle } from '../../../shared/core/ui/VisibilityEyeToggle';
import { AIButton } from '../../../shared/core/ui/AIButton';
import { LidioHelpTrigger } from '../../../shared/core/ui/LidioHelpTrigger';
import { useConfirm } from '../../../shared/core/ui/ConfirmDialog';
import { encodeImageFileWithinBudget } from '../../../shared/core/cv-import/pageImageEncoder';
import { executeAiTask } from '../../../shared/core/ai/aiClient';
import { resolveCanonicalEditorialKey } from '../domain/editorialDockEngine';
import {
  BIBLIOGRAPHY_NORM_GUIDES,
  buildInlineCiteToken,
  collectBibliographyFromSections,
  computeCitationAppearanceOrder,
  extractInlineCitationTokens,
  formatInlineCitation,
  normalizeBibliographyStyle,
  resolveInlineCitationsInText,
  syncSectionsBibliographyOrder,
} from '../domain/editorialCitationFormatter';
import type {
  EditorialBibliographySourceType,
  EditorialRecord,
  EditorialSection,
} from '../domain/editorialTypes';

export interface EditorialSectionFocusPanelProps {
  section: EditorialSection;
  draft?: any;
  badgeLabel?: string;
  updateDraft: (updater: (prev: any) => any) => void;
  setActiveStepTab: (tab: string) => void;
  notify: { success: (msg: string) => void; error: (msg: string) => void };
}

const SECTION_WRITING_GUIDES: Record<string, string> = {
  prologo: 'Presentá por qué nace la obra, el contexto o quién invita a leerla.',
  resumen: 'Resumí objetivo, método y principales hallazgos en 150 a 250 palabras claras.',
  introduccion: 'Explicá qué tema abordás, por qué importa y cuál es el propósito del trabajo.',
  marco_teorico: 'Contrastá autores y definiciones clave que respaldan tu desarrollo.',
  metodologia: 'Detallá qué pasos seguiste, con qué instrumentos y en qué grupo o fuentes.',
  resultados: 'Mostrá datos, hallazgos y tablas en orden claro sin interpretarlos todavía.',
  discusion: 'Explicá qué significan tus resultados y cómo dialogan con antecedentes.',
  conclusiones: 'Cerrá respondiendo a tu pregunta inicial con los aportes más firmes.',
  epilogo: 'Cierre narrativo posterior al desenlace principal.',
  bibliografia: 'Gestioná todas tus citas desde el paso 4 (Bibliografía y Normas) para ordenarlas según APA 7 o Vancouver.',
  anexo: 'Sumá encuestas, imágenes de respaldo o gráficos complementarios.',
};

const BLOCK_TYPE_LABELS: Record<string, string> = {
  paragraph: 'Párrafo',
  subtitle: 'Subtítulo',
  quote: 'Cita destacada',
  callout: 'Recuadro',
  list: 'Lista',
  image: 'Imagen',
  table: 'Tabla',
  bibliography_item: 'Referencia',
};

export const EditorialSectionFocusPanel: React.FC<EditorialSectionFocusPanelProps> = ({
  section,
  draft,
  badgeLabel,
  updateDraft,
  setActiveStepTab,
  notify,
}) => {
  const { confirm } = useConfirm();
  const [editingRecordId, setEditingRecordId] = useState<string | null>(
    section.records?.[0]?.id || null,
  );
  const [pendingSuggestions, setPendingSuggestions] = useState<
    Record<string, { mode: 'rewrite' | 'refine'; suggestedText: string }>
  >({});
  const [citePickerRecordId, setCitePickerRecordId] = useState<string | null>(null);
  const [showQuickSourceForm, setShowQuickSourceForm] = useState<boolean>(false);
  const [quickLocator, setQuickLocator] = useState<string>('');
  const [quickAuthor, setQuickAuthor] = useState<string>('');
  const [quickYear, setQuickYear] = useState<string>('');
  const [quickTitle, setQuickTitle] = useState<string>('');
  const [quickPub, setQuickPub] = useState<string>('');
  const [quickSourceType, setQuickSourceType] = useState<EditorialBibliographySourceType>('libro');

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
      ...(quickSourceType === 'articulo'
        ? { bibJournal: quickPub.trim() }
        : { bibEditorial: quickPub.trim() }),
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

      const bibSection = withText.find(
        (s) =>
          s.sectionKey === 'bibliografia' ||
          s.id?.includes('bibliografia') ||
          s.records?.some((r) => r.type === 'bibliography_item'),
      );

      const withBib = bibSection
        ? withText.map((s) =>
            s.id === bibSection.id
              ? { ...s, records: [...(s.records || []), newBibRec] }
              : s,
          )
        : [
            ...withText,
            {
              id: `ed_bibliografia_${Date.now()}`,
              title: activeBibStyle === 'apa7' ? 'Referencias' : activeBibStyle === 'mla' ? 'Obras citadas' : 'Bibliografía',
              sectionKey: 'bibliografia',
              category: 'cierre' as const,
              visible: true,
              includeInToc: true,
              startNewPage: true,
              position: withText.length,
              records: [newBibRec],
            },
          ];

      return {
        ...prev,
        sections: syncSectionsBibliographyOrder(withBib, activeBibStyle),
      };
    });

    setQuickAuthor('');
    setQuickYear('');
    setQuickTitle('');
    setQuickPub('');
    setQuickLocator('');
    setShowQuickSourceForm(false);
    setCitePickerRecordId(null);
    notify.success(`Fuente guardada y citada en formato ${BIBLIOGRAPHY_NORM_GUIDES[activeBibStyle].label}.`);
  };

  const { sectionKey } = resolveCanonicalEditorialKey(section);
  const guideBody =
    SECTION_WRITING_GUIDES[sectionKey] ||
    'Redactá por bloques claros (párrafos, subtítulos, citas o imágenes). Podés tocar el ícono de IA en cualquier bloque para que Lidio mejore el estilo antes de aplicarlo.';

  const updateSectionProp = (prop: keyof EditorialSection, val: any) => {
    updateDraft((prev) => ({
      ...prev,
      sections: (prev?.sections || []).map((s: EditorialSection) =>
        s.id === section.id ? { ...s, [prop]: val } : s,
      ),
    }));
  };

  const addRecord = (type: EditorialRecord['type']) => {
    const newId = `rec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newRec: EditorialRecord = {
      id: newId,
      type,
      content: '',
      quoteAttribution: '',
      subtitleLevel: 2,
    };
    updateDraft((prev) => ({
      ...prev,
      sections: (prev?.sections || []).map((s: EditorialSection) =>
        s.id === section.id ? { ...s, records: [...(s.records || []), newRec] } : s,
      ),
    }));
    setEditingRecordId(newId);
  };

  const updateRecord = (recId: string, patch: Partial<EditorialRecord>) => {
    updateDraft((prev) => ({
      ...prev,
      sections: (prev?.sections || []).map((s: EditorialSection) =>
        s.id === section.id
          ? {
              ...s,
              records: (s.records || []).map((r) => (r.id === recId ? { ...r, ...patch } : r)),
            }
          : s,
      ),
    }));
  };

  const removeRecord = (recId: string) => {
    updateDraft((prev) => ({
      ...prev,
      sections: (prev?.sections || []).map((s: EditorialSection) =>
        s.id === section.id
          ? { ...s, records: (s.records || []).filter((r) => r.id !== recId) }
          : s,
      ),
    }));
  };

  const handleDeleteSection = async () => {
    const ok = await confirm({
      title: `¿Eliminar "${section.title || 'esta sección'}"?`,
      message: 'Si solo querés ocultarla sin perder su contenido, usá el ícono del ojo en lugar de eliminar.',
      confirmText: 'Sí, eliminar',
      cancelText: 'Conservar',
    });
    if (!ok) return;
    updateDraft((prev) => ({
      ...prev,
      sections: (prev?.sections || []).filter((s: EditorialSection) => s.id !== section.id),
    }));
    setActiveStepTab('editorial_secciones');
    notify.success('Sección eliminada.');
  };

  const runAiOnRecord = async (rec: EditorialRecord, mode: 'rewrite' | 'refine'): Promise<string> => {
    const text = String(rec.content || '').trim();
    if (!text) {
      throw new Error('Escribí primero algo de texto en este bloque para mejorarlo.');
    }
    if (mode === 'rewrite') {
      const res = await executeAiTask<{ rewrittenText: string }>({
        taskId: 'editorial_rewrite',
        payload: { text, sectionTitle: section.title },
      });
      const out = (res.data?.rewrittenText || '').trim();
      if (!out) throw new Error('No se recibió sugerencia.');
      setPendingSuggestions((prev) => ({ ...prev, [rec.id]: { mode, suggestedText: out } }));
      return out;
    }
    const res = await executeAiTask<{ refinedText: string }>({
      taskId: 'editorial_refine',
      payload: { text, sectionTitle: section.title },
    });
    const out = (res.data?.refinedText || '').trim();
    if (!out) throw new Error('No se recibió corrección.');
    setPendingSuggestions((prev) => ({ ...prev, [rec.id]: { mode, suggestedText: out } }));
    return out;
  };

  const applySuggestion = (recId: string) => {
    const item = pendingSuggestions[recId];
    if (!item) return;
    updateRecord(recId, { content: item.suggestedText });
    setPendingSuggestions((prev) => {
      const copy = { ...prev };
      delete copy[recId];
      return copy;
    });
    notify.success('Sugerencia aplicada al bloque.');
  };

  const dismissSuggestion = (recId: string) => {
    setPendingSuggestions((prev) => {
      const copy = { ...prev };
      delete copy[recId];
      return copy;
    });
  };

  return (
    <div className="space-y-4">
      <PanelSection
        icon={
          <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full text-[11px] font-bold bg-[var(--color-accent-muted)] text-[var(--color-accent-text)] border border-[var(--color-accent-base)]/40">
            {badgeLabel || '§'}
          </span>
        }
        title={section.title || 'Sección'}
        helpTitle="Edición enfocada"
        helpText="Estás editando únicamente este capítulo o apartado. Tocá el lápiz en cualquier bloque para redactar o pedile a Lidio que mejore la redacción."
        headerRight={
          <div className="flex items-center gap-1.5">
            <VisibilityEyeToggle
              visible={section.visible !== false}
              onToggle={(next) => updateSectionProp('visible', next)}
              targetLabel={section.title || 'Esta sección'}
              size="xs"
            />
            <button
              type="button"
              onClick={() => void handleDeleteSection()}
              aria-label="Eliminar sección"
              title="Eliminar sección"
              className="p-1.5 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-[var(--color-status-danger-text)] hover:opacity-80 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        }
      >
        <ContextualGuideBox title="Orientación para esta parte">
          {guideBody}
        </ContextualGuideBox>

        <Field
          label="Título visible en la obra"
          value={section.title || ''}
          onChange={(e: any) => updateSectionProp('title', e.target.value)}
        />

        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-card)]">
            <span className="text-[11px] font-semibold text-[var(--ui-text-primary)]">En índice</span>
            <SectionSwitch
              size="sm"
              checked={section.includeInToc !== false}
              onChange={(next) => updateSectionProp('includeInToc', next)}
              label={`${section.title} en índice`}
            />
          </div>
          <div className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-card)]">
            <span className="text-[11px] font-semibold text-[var(--ui-text-primary)]">Hoja aparte</span>
            <SectionSwitch
              size="sm"
              checked={section.startNewPage !== false}
              onChange={(next) => updateSectionProp('startNewPage', next)}
              label={`${section.title} en página nueva`}
            />
          </div>
        </div>
      </PanelSection>

      {sectionKey === 'bibliografia' && (
        <button
          type="button"
          onClick={() => setActiveStepTab('editorial_bibliografia')}
          className="w-full py-2 px-3 rounded-lg border border-[var(--color-accent-base)]/50 bg-[var(--color-accent-muted)] text-[var(--color-accent-text)] text-xs font-bold cursor-pointer"
        >
          Abrir gestor de Normas APA 7 / Vancouver →
        </button>
      )}

      <PanelSection
        icon={<Edit3 className="w-4 h-4" />}
        title={`Bloques (${section.records?.length || 0})`}
        helpText="Cada bloque es un párrafo, subtítulo, cita, lista o imagen. Tocá el lápiz para enfocarte en ese bloque o el ícono de IA para pulirlo con Lidio."
      >
        <div className="space-y-3">
          {(section.records || []).map((rec, idx) => {
            const isEditing = editingRecordId === rec.id || !String(rec.content || '').trim();
            const suggestion = pendingSuggestions[rec.id];

            return (
              <div
                key={rec.id || idx}
                className="p-3 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg-card)] space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--ui-text-secondary)]">
                    {BLOCK_TYPE_LABELS[rec.type] || 'Bloque'} #{idx + 1}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {rec.type !== 'image' && rec.type !== 'bibliography_item' && (
                      <>
                        <AIButton
                          size="xs"
                          label="Mejorar estilo con IA"
                          onGenerate={() => runAiOnRecord(rec, 'rewrite')}
                          onSuccess={() => {}}
                          helpText="Lidio propone una redacción más fluida sin inventar datos; después elegís si aplicarla."
                        />
                        <button
                          type="button"
                          onClick={() => void runAiOnRecord(rec, 'refine').catch((e) => notify.error(e.message))}
                          className="px-2 py-1 rounded-md border border-[var(--ui-border)] bg-[var(--ui-bg-panel)] text-[10px] font-bold text-[var(--color-secondary-text)] cursor-pointer hover:border-[var(--color-secondary-base)]"
                          title="Corregir ortografía y puntuación con Lidio"
                        >
                          <Sparkles className="w-3 h-3 inline mr-1" />
                          Pulir
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => setEditingRecordId(isEditing ? null : rec.id)}
                      aria-label="Editar texto"
                      title={isEditing ? 'Plegar editor' : 'Editar texto'}
                      className={`p-1.5 rounded-md border cursor-pointer ${
                        isEditing
                          ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-muted)] text-[var(--color-accent-text)]'
                          : 'border-[var(--ui-border)] bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)]'
                      }`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRecord(rec.id)}
                      aria-label="Quitar bloque"
                      className="p-1.5 text-[var(--color-status-danger-text)] hover:opacity-80 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {rec.type === 'image' ? (
                  <div className="space-y-2">
                    {rec.imagePath && (
                      <img
                        src={rec.imagePath}
                        alt={rec.imageCaption || 'Imagen editorial'}
                        className="max-h-40 rounded border border-[var(--ui-border)] object-contain bg-[var(--ui-bg-panel)]"
                      />
                    )}
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] cursor-pointer">
                      <span>{rec.imagePath ? 'Cambiar imagen…' : 'Subir imagen…'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const picked = e.target.files?.[0];
                          e.currentTarget.value = '';
                          if (!picked) return;
                          const encoded = await encodeImageFileWithinBudget(picked);
                          updateRecord(rec.id, {
                            imagePath: `data:${encoded.mimeType};base64,${encoded.base64}`,
                          });
                        }}
                      />
                    </label>
                    <Field
                      label="Epígrafe o descripción"
                      value={rec.imageCaption || ''}
                      onChange={(e: any) => updateRecord(rec.id, { imageCaption: e.target.value })}
                      placeholder="Ej: Figura 1 — Resultados de campo"
                    />
                  </div>
                ) : isEditing ? (
                  <div className="space-y-2">
                    <Field
                      as={rec.type === 'subtitle' ? 'input' : 'textarea'}
                      rows={rec.type === 'subtitle' ? undefined : 4}
                      value={rec.content || ''}
                      onChange={(e: any) => updateRecord(rec.id, { content: e.target.value })}
                      placeholder={
                        rec.type === 'subtitle'
                          ? 'Subtítulo del apartado...'
                          : rec.type === 'list'
                            ? 'Un ítem por línea...'
                            : 'Escribí o pegá el contenido aquí...'
                      }
                    />
                    {rec.type === 'quote' && (
                      <Field
                        label="Autor o referencia de la cita"
                        value={rec.quoteAttribution || ''}
                        onChange={(e: any) =>
                          updateRecord(rec.id, { quoteAttribution: e.target.value })
                        }
                        placeholder="Ej: Cortázar, 1963"
                      />
                    )}

                    {/* Barra rápida de citas bibliográficas en línea (APA 7 / Vancouver / IEEE / Harvard / Chicago / MLA) */}
                    {sectionKey !== 'bibliografia' && (
                      <div className="space-y-2 pt-1 border-t border-[var(--ui-border)]/70">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setCitePickerRecordId(citePickerRecordId === rec.id ? null : rec.id);
                                setShowQuickSourceForm(false);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[var(--color-accent-base)]/50 bg-[var(--color-accent-muted)] text-[var(--color-accent-text)] text-[11px] font-bold cursor-pointer hover:opacity-90"
                            >
                              <BookmarkPlus className="w-3.5 h-3.5" />
                              Citar fuente ({BIBLIOGRAPHY_NORM_GUIDES[activeBibStyle].id.toUpperCase()})
                            </button>
                            <LidioHelpTrigger
                              size="xs"
                              title="Citas automáticas en el texto"
                              text="Insertá referencias directo mientras escribís. Si cambiás la norma arriba (por ej. de APA 7 a Vancouver o IEEE), todas las citas del capítulo y la lista final se actualizan solas."
                            />
                          </div>
                          {extractInlineCitationTokens(rec.content || '').length > 0 && (
                            <span className="text-[10px] font-semibold text-[var(--color-secondary-text)]">
                              En hoja: {resolveInlineCitationsInText(rec.content || '', bibMap, activeBibStyle, appearanceOrderMap).slice(0, 72)}
                              {resolveInlineCitationsInText(rec.content || '', bibMap, activeBibStyle, appearanceOrderMap).length > 72 ? '…' : ''}
                            </span>
                          )}
                        </div>

                        {extractInlineCitationTokens(rec.content || '').length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {extractInlineCitationTokens(rec.content || '').map((tok, ti) => {
                              const targetBib = bibMap.get(tok.bibId);
                              const formattedRef = formatInlineCitation(
                                targetBib,
                                activeBibStyle,
                                appearanceOrderMap.get(tok.bibId),
                                tok.locator,
                              );
                              return (
                                <span
                                  key={`${tok.rawToken}-${ti}`}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-[var(--ui-border)] bg-[var(--ui-bg-panel)] text-[10px] font-semibold text-[var(--ui-text-primary)]"
                                >
                                  <span>{formattedRef}</span>
                                  {targetBib?.bibAuthor && (
                                    <span className="text-[var(--ui-text-secondary)] truncate max-w-[110px]">
                                      · {targetBib.bibAuthor}
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    aria-label="Quitar esta cita del texto"
                                    title="Quitar esta cita del texto"
                                    onClick={() =>
                                      updateRecord(rec.id, {
                                        content: (rec.content || '').replace(tok.rawToken, '').replace(/\s{2,}/g, ' ').trim(),
                                      })
                                    }
                                    className="text-[var(--color-status-danger-text)] hover:opacity-75 cursor-pointer ml-0.5"
                                  >
                                    ×
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        )}

                        {citePickerRecordId === rec.id && (
                          <div className="p-2.5 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-panel)] space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <input
                                type="text"
                                value={quickLocator}
                                onChange={(e) => setQuickLocator(e.target.value)}
                                placeholder="Página opcional (ej: p. 42)"
                                aria-label="Página citada opcional"
                                className="flex-1 min-w-0 px-2 py-1 text-[11px] rounded border border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-[var(--ui-text-primary)]"
                              />
                              <button
                                type="button"
                                onClick={() => setShowQuickSourceForm(!showQuickSourceForm)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold rounded border border-[var(--color-accent-base)]/50 bg-[var(--color-accent-muted)] text-[var(--color-accent-text)] cursor-pointer shrink-0"
                              >
                                <Plus className="w-3 h-3" />
                                Nueva fuente
                              </button>
                            </div>

                            {!showQuickSourceForm ? (
                              bibItems.length === 0 ? (
                                <p className="text-[11px] text-[var(--ui-text-secondary)]">
                                  Todavía no cargaste fuentes en tu bibliografía. Tocá <strong>+ Nueva fuente</strong> para crear la primera sin salir de este capítulo.
                                </p>
                              ) : (
                                <div className="max-h-36 overflow-y-auto space-y-1">
                                  {bibItems.map((bibItem) => {
                                    const previewTag = formatInlineCitation(
                                      bibItem,
                                      activeBibStyle,
                                      appearanceOrderMap.get(bibItem.id) || bibItem.bibOrderNumber,
                                      quickLocator,
                                    );
                                    return (
                                      <button
                                        key={bibItem.id}
                                        type="button"
                                        onClick={() => {
                                          insertTokenIntoRecord(
                                            rec,
                                            buildInlineCiteToken(bibItem.id, quickLocator),
                                          );
                                          setQuickLocator('');
                                          setCitePickerRecordId(null);
                                          notify.success(`Cita ${previewTag} insertada.`);
                                        }}
                                        className="w-full text-left px-2.5 py-1.5 rounded border border-[var(--ui-border)] bg-[var(--ui-bg-card)] hover:border-[var(--color-accent-base)] text-[11px] flex items-center justify-between gap-2 cursor-pointer"
                                      >
                                        <span className="truncate font-medium text-[var(--ui-text-primary)]">
                                          {bibItem.bibAuthor || 'Sin autor'} ({bibItem.bibYear || 's. f.'}) — {bibItem.bibTitle || bibItem.content || 'Sin título'}
                                        </span>
                                        <span className="font-bold text-[var(--color-accent-text)] shrink-0">
                                          {previewTag}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )
                            ) : (
                              <div className="space-y-2 pt-1">
                                <div className="flex flex-wrap gap-1">
                                  {(['libro', 'articulo', 'web'] as const).map((t) => (
                                    <button
                                      key={t}
                                      type="button"
                                      onClick={() => setQuickSourceType(t)}
                                      className={`px-2 py-0.5 text-[10px] font-bold rounded-full border cursor-pointer ${
                                        quickSourceType === t
                                          ? 'bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] border-[var(--color-accent-base)]'
                                          : 'bg-[var(--ui-bg-card)] text-[var(--ui-text-secondary)] border-[var(--ui-border)]'
                                      }`}
                                    >
                                      {t === 'libro' ? 'Libro' : t === 'articulo' ? 'Artículo' : 'Sitio Web'}
                                    </button>
                                  ))}
                                </div>
                                <div className="grid grid-cols-3 gap-1.5">
                                  <input
                                    type="text"
                                    value={quickAuthor}
                                    onChange={(e) => setQuickAuthor(e.target.value)}
                                    placeholder="Autor (ej: Eco, U.)"
                                    className="col-span-2 px-2 py-1 text-[11px] rounded border border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-[var(--ui-text-primary)]"
                                  />
                                  <input
                                    type="text"
                                    value={quickYear}
                                    onChange={(e) => setQuickYear(e.target.value)}
                                    placeholder="Año"
                                    className="px-2 py-1 text-[11px] rounded border border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-[var(--ui-text-primary)]"
                                  />
                                </div>
                                <input
                                  type="text"
                                  value={quickTitle}
                                  onChange={(e) => setQuickTitle(e.target.value)}
                                  placeholder="Título del libro o artículo"
                                  className="w-full px-2 py-1 text-[11px] rounded border border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-[var(--ui-text-primary)]"
                                />
                                <input
                                  type="text"
                                  value={quickPub}
                                  onChange={(e) => setQuickPub(e.target.value)}
                                  placeholder={quickSourceType === 'articulo' ? 'Revista científica' : 'Editorial o sitio web'}
                                  className="w-full px-2 py-1 text-[11px] rounded border border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-[var(--ui-text-primary)]"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleQuickAddAndCite(rec)}
                                  className="w-full py-1.5 px-2.5 text-[11px] font-bold rounded bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] cursor-pointer"
                                >
                                  Guardar en Bibliografía y Citar Aquí
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p
                    onClick={() => setEditingRecordId(rec.id)}
                    className="text-xs leading-relaxed text-[var(--ui-text-primary)] line-clamp-4 cursor-pointer hover:opacity-80"
                  >
                    {resolveInlineCitationsInText(rec.content || '', bibMap, activeBibStyle, appearanceOrderMap) ||
                      'Bloque vacío (tocá el lápiz para escribir)'}
                  </p>
                )}

                {suggestion && (
                  <div className="p-2.5 rounded-lg border border-[var(--color-accent-base)]/45 bg-[var(--color-accent-muted)] space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-[var(--color-accent-text)]">
                        {suggestion.mode === 'rewrite'
                          ? 'Propuesta de redacción (Lidio)'
                          : 'Propuesta ortotipográfica (Lidio)'}
                      </span>
                      <LidioHelpTrigger
                        size="xs"
                        title="Confirmación"
                        text="Compará el borrador sugerido y decidí si reemplazar tu texto actual."
                      />
                    </div>
                    <p className="text-xs text-[var(--ui-text-primary)] leading-relaxed whitespace-pre-wrap">
                      {suggestion.suggestedText}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => applySuggestion(rec.id)}
                        className="flex-1 py-1.5 px-2.5 text-[11px] font-bold rounded bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] cursor-pointer"
                      >
                        Aplicar cambio
                      </button>
                      <button
                        type="button"
                        onClick={() => dismissSuggestion(rec.id)}
                        className="py-1.5 px-2.5 text-[11px] font-bold rounded border border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-[var(--ui-text-secondary)] cursor-pointer"
                      >
                        Descartar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-1.5 pt-2">
          {([
            { type: 'paragraph', label: '+ Párrafo' },
            { type: 'subtitle', label: '+ Subtítulo' },
            { type: 'quote', label: '+ Cita' },
            { type: 'callout', label: '+ Recuadro' },
            { type: 'list', label: '+ Lista' },
            { type: 'image', label: '+ Imagen' },
          ] as const).map((btn) => (
            <button
              key={btn.type}
              type="button"
              onClick={() => addRecord(btn.type)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold rounded-lg bg-[var(--ui-bg-card)] border border-[var(--ui-border)] hover:border-[var(--color-accent-base)] cursor-pointer"
            >
              <FilePlus2 className="w-3 h-3 text-[var(--color-accent-text)]" />
              {btn.label.replace('+ ', '')}
            </button>
          ))}
        </div>
      </PanelSection>
    </div>
  );
};
