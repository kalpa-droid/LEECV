import React, { useMemo, useState } from 'react';
import { ArrowDownAZ, BookOpenCheck, Library, Plus, Trash2 } from 'lucide-react';
import { PanelSection } from '../../../shared/core/ui/PanelSection';
import { ContextualGuideBox } from '../../../shared/core/ui/ContextualGuideBox';
import { Field } from '../../../shared/core/ui/Field';
import { AIButton } from '../../../shared/core/ui/AIButton';
import { LidioHelpTrigger } from '../../../shared/core/ui/LidioHelpTrigger';
import { useConfirm } from '../../../shared/core/ui/ConfirmDialog';
import { executeAiTask } from '../../../shared/core/ai/aiClient';
import { radius } from '../../../shared/core/uiDesignSystem';
import {
  BIBLIOGRAPHY_NORM_GUIDES,
  CanonicalCitationStyle,
  formatEditorialCitation,
  normalizeBibliographyStyle,
  sortBibliographyRecords,
  syncSectionsBibliographyOrder,
} from '../domain/editorialCitationFormatter';
import { resolveStructuralNormFromDraft } from '../domain/editorialNormEngine';
import type {
  EditorialBibliographySourceType,
  EditorialRecord,
  EditorialSection,
} from '../domain/editorialTypes';

export interface EditorialBibliographyPanelProps {
  draft: any;
  updateDraft: (updater: (prev: any) => any) => void;
  notify: { success: (msg: string) => void; error: (msg: string) => void };
  onOpenGlobalBibModal?: () => void;
}

function findBibliographySection(sections: EditorialSection[]): EditorialSection | undefined {
  return sections.find(
    (s) =>
      s.sectionKey === 'bibliografia' ||
      s.id?.includes('bibliografia') ||
      s.records?.some((r) => r.type === 'bibliography_item'),
  );
}

export const EditorialBibliographyPanel: React.FC<EditorialBibliographyPanelProps> = ({
  draft,
  updateDraft,
  notify,
  onOpenGlobalBibModal,
}) => {
  const { confirm: confirmBib } = useConfirm();
  const sections: EditorialSection[] = useMemo(
    () => (Array.isArray(draft?.sections) ? draft.sections : []),
    [draft?.sections],
  );
  const activeStyle = normalizeBibliographyStyle(
    draft?.design?.bibliographyStyle || draft?.design?.normId,
  );
  const guide = BIBLIOGRAPHY_NORM_GUIDES[activeStyle];

  const [sourceType, setSourceType] = useState<EditorialBibliographySourceType>('libro');
  const [bibAuthor, setBibAuthor] = useState('');
  const [bibYear, setBibYear] = useState('');
  const [bibTitle, setBibTitle] = useState('');
  const [bibEditorial, setBibEditorial] = useState('');
  const [bibJournal, setBibJournal] = useState('');
  const [bibVolume, setBibVolume] = useState('');
  const [bibIssue, setBibIssue] = useState('');
  const [bibPages, setBibPages] = useState('');
  const [bibDoiOrUrl, setBibDoiOrUrl] = useState('');
  const [bibAnnotation, setBibAnnotation] = useState('');
  const [rawNotes, setRawNotes] = useState('');
  const [pendingAiCitations, setPendingAiCitations] = useState<EditorialRecord[] | null>(null);

  const bibSection = useMemo(() => findBibliographySection(sections), [sections]);
  const bibRecords = useMemo(
    () => (bibSection?.records || []).filter((r) => r.type === 'bibliography_item'),
    [bibSection],
  );

  const ensureAndMutateBibRecords = (
    mutator: (current: EditorialRecord[], currentSections: EditorialSection[]) => EditorialRecord[],
    nextStyle?: CanonicalCitationStyle,
  ) => {
    updateDraft((prev) => {
      const prevSections: EditorialSection[] = Array.isArray(prev?.sections) ? prev.sections : [];
      const existing = findBibliographySection(prevSections);
      const effectiveStructural = resolveStructuralNormFromDraft(prev);

      if (existing) {
        const autoSectionTitle =
          nextStyle && (existing.title === 'Referencias' || existing.title === 'Bibliografía' || existing.title === 'Obras citadas')
            ? nextStyle === 'apa7'
              ? 'Referencias'
              : nextStyle === 'mla'
                ? 'Obras citadas'
                : 'Bibliografía'
            : existing.title;
        const nextSectionsRaw = prevSections.map((s) =>
          s.id === existing.id
            ? {
                ...s,
                title: autoSectionTitle,
                records: mutator(Array.isArray(s.records) ? s.records : [], prevSections),
              }
            : s,
        );
        const targetBib = nextStyle || activeStyle;
        const syncedSections = syncSectionsBibliographyOrder(nextSectionsRaw, targetBib);
        return {
          ...prev,
          sections: syncedSections,
          ...(nextStyle
            ? {
                design: {
                  ...(prev?.design || {}),
                  structuralNormId: effectiveStructural,
                  bibliographyStyle: nextStyle,
                  normId:
                    nextStyle === 'vancouver' && effectiveStructural === 'apa7'
                      ? 'vancouver'
                      : effectiveStructural,
                  bibliographyHangingIndent: nextStyle !== 'tradicional',
                },
              }
            : {}),
        };
      }

      const newSecId = `ed_bibliografia_${Date.now()}`;
      const seededRecords = mutator([], prevSections);
      const newSec: EditorialSection = {
        id: newSecId,
        title: (nextStyle || activeStyle) === 'apa7' ? 'Referencias' : (nextStyle || activeStyle) === 'mla' ? 'Obras citadas' : 'Bibliografía',
        sectionKey: 'bibliografia',
        category: 'cierre',
        visible: true,
        includeInToc: true,
        startNewPage: true,
        position: prevSections.length,
        records: seededRecords,
      };
      return {
        ...prev,
        sections: [...prevSections, newSec],
        ...(nextStyle
          ? {
              design: {
                ...(prev?.design || {}),
                structuralNormId: effectiveStructural,
                bibliographyStyle: nextStyle,
                bibliographyHangingIndent: nextStyle !== 'tradicional',
              },
            }
          : {}),
      };
    });
  };

  const handleAddCitation = () => {
    if (!bibTitle.trim() && !bibAuthor.trim()) {
      notify.error('Completá al menos el título o autor de la fuente.');
      return;
    }
    const newRec: EditorialRecord = {
      id: `bib_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: 'bibliography_item',
      content: bibTitle.trim(),
      bibStyle: activeStyle,
      bibSourceType: sourceType,
      bibAuthor: bibAuthor.trim(),
      bibYear: bibYear.trim(),
      bibTitle: bibTitle.trim(),
      bibEditorial: bibEditorial.trim(),
      bibJournal: bibJournal.trim(),
      bibVolume: bibVolume.trim(),
      bibIssue: bibIssue.trim(),
      bibPages: bibPages.trim(),
      bibDoiOrUrl: bibDoiOrUrl.trim(),
      ...(bibAnnotation.trim() ? { bibAnnotation: bibAnnotation.trim() } : {}),
      bibOrderNumber: bibRecords.length + 1,
    };
    ensureAndMutateBibRecords((recs) => sortBibliographyRecords([...recs, newRec], activeStyle));
    setBibAuthor('');
    setBibYear('');
    setBibTitle('');
    setBibEditorial('');
    setBibJournal('');
    setBibVolume('');
    setBibIssue('');
    setBibPages('');
    setBibDoiOrUrl('');
    setBibAnnotation('');
    notify.success('Fuente agregada y ordenada según la norma.');
  };

  const handleParseRawWithAi = async () => {
    if (!rawNotes.trim()) {
      notify.error('Pegá primero tus enlaces o referencias sin formato.');
      return '';
    }
    const res = await executeAiTask<{ citations: Array<Record<string, string>> }>({
      taskId: 'editorial_format_citation',
      payload: { rawText: rawNotes, style: activeStyle },
    });
    const list = Array.isArray(res.data?.citations) ? res.data.citations : [];
    if (list.length === 0) throw new Error('No pudimos detectar citas válidas en ese texto.');
    const mapped: EditorialRecord[] = list.map((c, idx) => ({
      id: `bib_ai_${Date.now()}_${idx}`,
      type: 'bibliography_item',
      content: c.title || '',
      bibStyle: activeStyle,
      bibSourceType:
        c.sourceType === 'articulo' || c.sourceType === 'web' || c.sourceType === 'tesis'
          ? c.sourceType
          : 'libro',
      bibAuthor: c.author || '',
      bibYear: c.year || '',
      bibTitle: c.title || '',
      bibEditorial: c.editorial || '',
      bibJournal: c.journal || '',
      bibVolume: c.volume || '',
      bibIssue: c.issue || '',
      bibPages: c.pages || '',
      bibDoiOrUrl: c.doiOrUrl || '',
      bibOrderNumber: bibRecords.length + idx + 1,
    }));
    setPendingAiCitations(mapped);
    return `Se detectaron ${mapped.length} referencia(s).`;
  };

  const handleSortNow = () => {
    ensureAndMutateBibRecords((recs) => sortBibliographyRecords(recs, activeStyle));
    notify.success(
      activeStyle === 'vancouver' || activeStyle === 'ieee'
        ? 'Referencias renumeradas [1..N] correctamente.'
        : 'Referencias ordenadas alfabéticamente.',
    );
  };

  const handleRemoveRecord = async (recId: string) => {
    const ok = await confirmBib({
      title: '¿Eliminar esta referencia bibliográfica?',
      message: 'Si ya la citaste en algún capítulo, la cita quedará sin fuente vinculada hasta deshacer.',
      confirmText: 'Sí, eliminar',
      cancelText: 'Conservar',
    });
    if (!ok) return;
    ensureAndMutateBibRecords((recs) =>
      sortBibliographyRecords(
        recs.filter((r) => r.id !== recId),
        activeStyle,
      ),
    );
  };

  return (
    <div className="space-y-5">
      <div
        className="p-3 border border-[var(--ui-border)] bg-[var(--ui-bg-card)] flex items-center justify-between gap-2"
        style={{ borderRadius: radius.card }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Library className="w-4 h-4 text-[var(--color-accent-text)] shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-extrabold text-[var(--ui-text-primary)] truncate">
              Estilo de citas: {guide.label}
            </p>
            <p className="text-[10px] text-[var(--ui-text-secondary)] truncate">
              Se actualiza en tus capítulos automáticamente
            </p>
          </div>
        </div>
        {onOpenGlobalBibModal && (
          <button
            type="button"
            onClick={onOpenGlobalBibModal}
            className="px-2.5 py-1 rounded-full border border-[var(--color-accent-base)]/50 bg-[var(--color-accent-muted)] text-[var(--color-accent-text)] text-[11px] font-bold cursor-pointer shrink-0"
          >
            Cambiar estilo
          </button>
        )}
      </div>

      <ContextualGuideBox title={`Regla activa: ${guide.label}`} moreHelpText={guide.referenceExample}>
        <p>{guide.shortRule}</p>
        <p className="mt-1 font-semibold text-[var(--color-accent-text)]">{guide.inTextExample}</p>
      </ContextualGuideBox>

      <PanelSection
        icon={<BookOpenCheck className="w-4 h-4" />}
        title="Pegar citas sueltas (con IA)"
        helpText="Si tenés links, libros anotados o apuntes sin ordenar, pegalos acá y tocá el botón con el ícono de IA para convertirlos a la norma activa."
        headerRight={
          <AIButton
            label="Convertir citas con IA"
            onGenerate={handleParseRawWithAi}
            onSuccess={() => {}}
            helpText="Lidio lee tu borrador y propone los campos estructurados antes de agregarlos."
          />
        }
      >
        <Field
          as="textarea"
          rows={3}
          value={rawNotes}
          onChange={(e: any) => setRawNotes(e.target.value)}
          placeholder="Ej: Pérez Juan 2023 Metodología de la investigación editorial kapelusz https://..."
        />

        {pendingAiCitations && (
          <div className="p-3 rounded-lg border border-[var(--color-accent-base)]/40 bg-[var(--color-accent-muted)] space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-[var(--color-accent-text)]">
                Propuesta de {pendingAiCitations.length} fuente(s) lista para revisar
              </span>
              <LidioHelpTrigger
                size="xs"
                title="Confirmación previa"
                text="Verificá autores, años y enlaces antes de guardarlos en tu documento."
              />
            </div>
            <ul className="space-y-1 text-[11px] text-[var(--ui-text-primary)]">
              {pendingAiCitations.map((c, idx) => (
                <li key={c.id} className="border-l-2 border-[var(--color-accent-base)] pl-2">
                  {formatEditorialCitation(c, activeStyle, bibRecords.length + idx).fullText}
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  ensureAndMutateBibRecords((recs) =>
                    sortBibliographyRecords([...recs, ...pendingAiCitations], activeStyle),
                  );
                  setPendingAiCitations(null);
                  setRawNotes('');
                  notify.success('Fuentes aplicadas a la bibliografía.');
                }}
                className="flex-1 py-1.5 px-3 text-xs font-bold rounded bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] cursor-pointer"
              >
                Agregar a bibliografía
              </button>
              <button
                type="button"
                onClick={() => setPendingAiCitations(null)}
                className="py-1.5 px-3 text-xs font-bold rounded border border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-[var(--ui-text-secondary)] cursor-pointer"
              >
                Descartar
              </button>
            </div>
          </div>
        )}
      </PanelSection>

      <PanelSection
        icon={<Plus className="w-4 h-4" />}
        title="Cargar fuente manual"
        helpText="Completá los datos que tengas de cada libro, artículo científico o página web."
      >
        <div className="flex flex-wrap gap-1.5">
          {([
            { id: 'libro', label: 'Libro' },
            { id: 'articulo', label: 'Artículo / Revista' },
            { id: 'web', label: 'Sitio Web' },
            { id: 'tesis', label: 'Tesis / Apunte' },
          ] as const).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSourceType(t.id)}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-full border cursor-pointer ${
                sourceType === t.id
                  ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-muted)] text-[var(--color-accent-text)]'
                  : 'border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-[var(--ui-text-secondary)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <Field
            label="Autor/es (Apellido, N.)"
            value={bibAuthor}
            onChange={(e: any) => setBibAuthor(e.target.value)}
            placeholder="Ej: Eco, U."
          />
          <Field
            label="Año"
            value={bibYear}
            onChange={(e: any) => setBibYear(e.target.value)}
            placeholder="Ej: 2024"
          />
        </div>

        <Field
          label="Título de la obra o artículo"
          value={bibTitle}
          onChange={(e: any) => setBibTitle(e.target.value)}
          placeholder="Ej: Cómo se hace una tesis"
        />

        {sourceType === 'articulo' ? (
          <div className="grid grid-cols-2 gap-2.5">
            <Field
              label="Revista científica"
              value={bibJournal}
              onChange={(e: any) => setBibJournal(e.target.value)}
              placeholder="Ej: Rev Salud Pública"
            />
            <Field
              label="Vol / Nro / Páginas"
              value={[bibVolume, bibIssue ? `(${bibIssue})` : '', bibPages ? `:${bibPages}` : ''].join('')}
              onChange={(e: any) => {
                const raw = String(e.target.value || '');
                const m = raw.match(/^([^(:\s]+)?(?:\(([^)]+)\))?(?::\s*(.+))?$/);
                setBibVolume(m?.[1] || raw);
                setBibIssue(m?.[2] || '');
                setBibPages(m?.[3] || '');
              }}
              placeholder="Ej: 14(2):45-58"
            />
          </div>
        ) : (
          <Field
            label={sourceType === 'web' ? 'Sitio o Institución' : 'Editorial / Universidad'}
            value={bibEditorial}
            onChange={(e: any) => setBibEditorial(e.target.value)}
            placeholder="Ej: Editorial Gedisa"
          />
        )}

        <Field
          label="Enlace Web o DOI (opcional)"
          value={bibDoiOrUrl}
          onChange={(e: any) => setBibDoiOrUrl(e.target.value)}
          placeholder="https://doi.org/..."
        />

        <Field
          as="textarea"
          rows={2}
          label="Nota o resumen comentado (opcional)"
          value={bibAnnotation}
          onChange={(e: any) => setBibAnnotation(e.target.value)}
          placeholder="Para bibliografía anotada: síntesis breve o relevancia de esta fuente..."
        />

        <button
          type="button"
          onClick={handleAddCitation}
          className="w-full py-2 px-3 rounded-lg bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] text-xs font-bold cursor-pointer"
        >
          + Agregar referencia
        </button>
      </PanelSection>

      <PanelSection
        icon={<ArrowDownAZ className="w-4 h-4" />}
        title={`Fuentes cargadas (${bibRecords.length})`}
        helpText="Acá ves cómo quedarán impresas tus referencias. Podés reordenarlas automáticamente cuando cambies de estilo."
        headerRight={
          bibRecords.length > 1 && (
            <button
              type="button"
              onClick={handleSortNow}
              className="px-2 py-1 text-[11px] font-bold rounded border border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-[var(--color-accent-text)] cursor-pointer"
            >
              {activeStyle === 'vancouver' || activeStyle === 'ieee' ? 'Renumerar [1..N]' : 'Ordenar A–Z'}
            </button>
          )
        }
      >
        {bibRecords.length === 0 ? (
          <div className="p-4 text-center rounded-lg border border-dashed border-[var(--ui-border)] text-xs text-[var(--ui-text-secondary)]">
            Todavía no agregaste fuentes. Cargá una arriba o pegá tus apuntes para convertirlos con IA.
          </div>
        ) : (
          <div className="space-y-2">
            {bibRecords.map((rec, idx) => {
              const formatted = formatEditorialCitation(rec, activeStyle, idx);
              return (
                <div
                  key={rec.id}
                  className="p-2.5 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-card)] flex items-start justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs leading-relaxed text-[var(--ui-text-primary)]">
                      {formatted.prefixText}
                      {formatted.italicSegment && <em>{formatted.italicSegment}</em>}
                      {formatted.suffixText
                        ? /^[.,;:)\]]/.test(formatted.suffixText)
                          ? formatted.suffixText
                          : ` ${formatted.suffixText}`
                        : ''}
                    </p>
                    {rec.bibAnnotation && (
                      <p className="mt-1 pl-3 border-l-2 border-[var(--ui-border)] text-[11px] text-[var(--ui-text-secondary)] italic">
                        {rec.bibAnnotation}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveRecord(rec.id)}
                    aria-label="Eliminar referencia"
                    className="p-1 text-[var(--color-status-danger-text)] hover:opacity-80 cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </PanelSection>
    </div>
  );
};
