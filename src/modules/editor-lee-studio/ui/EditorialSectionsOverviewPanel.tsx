import React from 'react';
import { ArrowDown, ArrowUp, Edit3, Layers, Plus } from 'lucide-react';
import { PanelSection } from '../../../shared/core/ui/PanelSection';
import { ActionGrid } from '../../../shared/core/ui/ActionGrid';
import { ActionTileButton } from '../../../shared/core/ui/ActionTileButton';
import { VisibilityEyeToggle } from '../../../shared/core/ui/VisibilityEyeToggle';
import { radius } from '../../../shared/core/uiDesignSystem';
import {
  EDITORIAL_SECTION_CATALOG,
  createSectionFromDefinition,
  type EditorialSectionDefinition,
} from '../domain/editorialSectionCatalog';
import { resolveSectionBadgeLabel } from '../domain/editorialDockEngine';
import type { EditorialSection } from '../domain/editorialTypes';

export interface EditorialSectionsOverviewPanelProps {
  draft: any;
  updateDraft: (updater: (prev: any) => any) => void;
  setActiveStepTab: (tab: string) => void;
  onFocusSection?: (sectionId: string) => void;
}

export const EditorialSectionsOverviewPanel: React.FC<EditorialSectionsOverviewPanelProps> = ({
  draft,
  updateDraft,
  setActiveStepTab,
  onFocusSection,
}) => {
  const sections: EditorialSection[] = Array.isArray(draft?.sections) ? draft.sections : [];

  const handleOpenSectionEditor = (secId: string) => {
    setActiveStepTab(secId);
    onFocusSection?.(secId);
  };

  const handleToggleVisible = (secId: string, visible: boolean) => {
    updateDraft((prev) => ({
      ...prev,
      sections: (prev?.sections || []).map((s: EditorialSection) =>
        s.id === secId ? { ...s, visible } : s,
      ),
    }));
  };

  const handleMove = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= sections.length) return;
    updateDraft((prev) => {
      const copy = [...(prev?.sections || [])];
      const [item] = copy.splice(index, 1);
      copy.splice(target, 0, item);
      return {
        ...prev,
        sections: copy.map((s: EditorialSection, idx: number) => ({ ...s, position: idx })),
      };
    });
  };

  const handleAddFromCatalog = (def: EditorialSectionDefinition) => {
    const repeatCount = sections.filter(
      (s) => s.sectionKey === def.id || s.id?.startsWith(`ed_${def.id}_`),
    ).length;
    const created = createSectionFromDefinition(
      def,
      sections.length,
      def.repeatable ? repeatCount : undefined,
    );
    const fullSection: EditorialSection = {
      ...created,
      records: [
        {
          id: `rec_${Date.now()}_init`,
          type: def.id === 'bibliografia' ? 'bibliography_item' : 'paragraph',
          content: '',
        },
      ],
    };
    updateDraft((prev) => ({
      ...prev,
      sections: [...(prev?.sections || []), fullSection],
    }));
    handleOpenSectionEditor(fullSection.id);
  };

  const counters = { prelim: 0, body: 0, annex: 0 };

  return (
    <div className="space-y-5">
      <PanelSection
        icon={<Layers className="w-4 h-4" />}
        title="Capítulos y apartados"
        helpTitle="Estructura viva en la barra"
        helpText="Cada parte tiene su botón numerado en la barra lateral (i, ii para preliminares, 1, 2 para capítulos y A, B para anexos). Tocá cualquier capítulo para redactar o revisarlo, usá las flechas para ordenar o el ojo para ocultarlo."
      >
        {sections.length === 0 ? (
          <div className="p-5 text-center rounded-xl border border-dashed border-[var(--ui-border)] text-xs text-[var(--ui-text-secondary)]">
            Todavía no hay capítulos cargados. Elegí una plantilla en Inicio o agregá secciones desde abajo.
          </div>
        ) : (
          <div className="space-y-2">
            {sections.map((sec, idx) => {
              const { badgeLabel } = resolveSectionBadgeLabel(sec, counters);
              return (
                <div
                  key={sec.id}
                  className="p-2.5 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg-card)] flex items-center justify-between gap-2"
                >
                  <button
                    type="button"
                    onClick={() => handleOpenSectionEditor(sec.id)}
                    className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer group"
                  >
                    <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full text-[11px] font-bold bg-[var(--color-accent-muted)] text-[var(--color-accent-text)] border border-[var(--color-accent-base)]/40 shrink-0">
                      {badgeLabel}
                    </span>
                    <div className="min-w-0 bg-[var(--ui-bg-card)]">
                      <p className="text-xs font-bold text-[var(--ui-text-primary)] truncate group-hover:text-[var(--color-accent-text)]">
                        {sec.title || `Sección ${idx + 1}`}
                      </p>
                      <p className="text-[10px] text-[var(--ui-text-secondary)]">
                        {sec.records?.length || 0} bloque(s)
                      </p>
                    </div>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleMove(idx, -1)}
                      disabled={idx === 0}
                      aria-label="Subir"
                      className="p-1 rounded border border-[var(--ui-border)] disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(idx, 1)}
                      disabled={idx === sections.length - 1}
                      aria-label="Bajar"
                      className="p-1 rounded border border-[var(--ui-border)] disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <VisibilityEyeToggle
                      size="xs"
                      visible={sec.visible !== false}
                      onToggle={(next) => handleToggleVisible(sec.id, next)}
                      targetLabel={sec.title || 'Sección'}
                    />
                    <button
                      type="button"
                      onClick={() => handleOpenSectionEditor(sec.id)}
                      aria-label={`Editar ${sec.title}`}
                      className="p-1.5 rounded-lg bg-[var(--color-accent-muted)] text-[var(--color-accent-text)] cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PanelSection>

      <PanelSection
        icon={<Plus className="w-4 h-4" />}
        title="Agregar apartado"
        helpText="Sumá preliminares (Prólogo, Resumen), partes centrales (Capítulo, Metodología, Resultados, Discusión) o cierres (Conclusiones, Bibliografía, Anexos)."
      >
        <ActionGrid columns={2}>
          {EDITORIAL_SECTION_CATALOG.filter((item) => item.id !== 'portada').map((cat) => (
            <ActionTileButton
              key={cat.id}
              label={cat.defaultValues.title}
              badge={cat.category === 'preliminares' ? 'i' : cat.category === 'cierre' ? 'Fin' : '#'}
              helpText={cat.description}
              helpGroupKey={`add-sec-${cat.id}`}
              onClick={() => handleAddFromCatalog(cat)}
            />
          ))}
        </ActionGrid>
      </PanelSection>

      <button
        type="button"
        onClick={() => setActiveStepTab('editorial_bibliografia')}
        className="w-full py-2.5 px-4 bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] text-xs font-bold cursor-pointer"
        style={{ borderRadius: radius.control }}
      >
        Continuar a Bibliografía y Citas →
      </button>
    </div>
  );
};
