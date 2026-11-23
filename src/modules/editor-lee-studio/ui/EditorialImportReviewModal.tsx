import React, { useMemo, useState } from 'react';
import { BookOpen, Check, Columns2, Layers, Merge } from 'lucide-react';
import {
  StructuredImportReviewModal,
  type ReviewFilterTab,
} from '../../../shared/core/ui/StructuredImportReviewModal';
import { Field } from '../../../shared/core/ui/Field';
import { matchesSearchQuery } from '../../../shared/core/ui/SearchFilterBar';
import { button } from '../../../shared/core/uiDesignSystem';
import type { EditorialSection, EditorialSectionKind } from '../domain/editorialTypes';

export interface EditorialImportReviewModalProps {
  isOpen: boolean;
  onCancel: () => void;
  sourceChars: number;
  initialMetadata: { title: string; subtitle: string; author: string };
  initialSections: EditorialSection[];
  warnings?: string[];
  onConfirm: (result: {
    metadata: { title: string; subtitle: string; author: string };
    sections: EditorialSection[];
  }) => void;
}

export const EditorialImportReviewModal: React.FC<EditorialImportReviewModalProps> = ({
  isOpen,
  onCancel,
  sourceChars,
  initialMetadata,
  initialSections,
  warnings = [],
  onConfirm,
}) => {
  const [metadata, setMetadata] = useState(initialMetadata);
  const [sections, setSections] = useState<EditorialSection[]>(initialSections);
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

  return (
    <StructuredImportReviewModal
      isOpen={isOpen}
      title="Revisar capítulos y bloques antes de aplicar"
      subtitle="Verificá el título de la obra, cómo se dividieron los capítulos que aparecerán en tu barra lateral izquierda y si alguno lleva 2 columnas."
      onCancel={onCancel}
      scalarCount={3}
      recordCount={sections.length}
      conflictCount={warnings.length}
      activeFilter={activeFilter}
      onFilterChange={setActiveFilter}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      retentionSummary={{
        keptCount: Math.max(keptChars, sourceChars > 0 ? keptChars : 1),
        totalCount: Math.max(sourceChars, keptChars, 1),
        unitLabel: 'caracteres',
        warnings,
      }}
      footer={
        <>
          <button type="button" className={`${button.base} ${button.secondary}`} onClick={onCancel}>
            Cancelar
          </button>
          <button
            type="button"
            className={`${button.base} ${button.primary} inline-flex items-center gap-2`}
            onClick={() => onConfirm({ metadata, sections })}
          >
            <Check className="w-4 h-4" />
            Crear {sections.length} secciones en el editor
          </button>
        </>
      }
    >
      {activeFilter !== 'records' && (
        <section className="space-y-2.5 p-3.5 rounded-[12px] border border-[var(--ui-border-strong)] bg-[var(--ui-bg-card)]">
          <h3 className="text-xs font-black uppercase tracking-wider text-[var(--color-secondary-text)] inline-flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" /> Metadatos de la obra (campos individuales)
          </h3>
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
              <Layers className="w-3.5 h-3.5" /> Capítulos y secciones que se crearán en el Dock
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
              return (
                <div
                  key={sec.id}
                  className="p-3 rounded-[12px] border border-[var(--ui-border-strong)] border-l-4 border-l-[var(--color-accent-purple)] bg-[var(--ui-bg-card)] space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex-1 min-w-[200px]">
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
                        className="rounded-[10px] border border-[var(--ui-border)] bg-[var(--ui-btn-outline-bg)] px-2 py-1.5 text-xs font-bold text-[var(--ui-text-primary)]"
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
                        className={`px-2 py-1.5 rounded-[10px] border text-xs font-bold inline-flex items-center gap-1 cursor-pointer ${
                          sec.columns === 2
                            ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-muted)] text-[var(--color-accent-text)]'
                            : 'border-[var(--ui-border)] bg-[var(--ui-bg-panel)] text-[var(--ui-text-secondary)]'
                        }`}
                        title="Alternar entre 1 y 2 columnas en este capítulo"
                      >
                        <Columns2 className="w-3.5 h-3.5" />
                        {sec.columns === 2 ? '2 col.' : '1 col.'}
                      </button>

                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => mergeWithPrevious(idx)}
                          className="px-2 py-1.5 rounded-[10px] border border-[var(--ui-border)] bg-[var(--ui-bg-panel)] text-xs font-bold text-[var(--ui-text-secondary)] hover:text-[var(--ui-text-primary)] inline-flex items-center gap-1 cursor-pointer"
                          title="Unir con la sección anterior"
                        >
                          <Merge className="w-3.5 h-3.5" /> Unir
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--ui-text-secondary)]">
                    <span className="font-bold text-[var(--ui-text-primary)]">
                      {sec.records.length} bloques
                    </span>
                    {tablesCount > 0 && <span>· {tablesCount} tabla(s)</span>}
                    {imagesCount > 0 && <span>· {imagesCount} imagen(es)/gráfico(s)</span>}
                    {firstText && (
                      <span className="truncate max-w-full italic">
                        — “{firstText.slice(0, 120)}…”
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
