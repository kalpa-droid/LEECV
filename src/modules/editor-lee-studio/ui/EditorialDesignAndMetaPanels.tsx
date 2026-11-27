import React, { useMemo } from 'react';
import { LayoutGrid } from 'lucide-react';
import { PanelSection } from '../../../shared/core/ui/PanelSection';
import { Field } from '../../../shared/core/ui/Field';
import { SectionSwitch } from '../../../shared/core/ui/SectionSwitch';
import { VisibilityEyeToggle } from '../../../shared/core/ui/VisibilityEyeToggle';
import { generateSectionAnchors } from '../domain/editorialTocResolver';
import type { EditorialSection } from '../domain/editorialTypes';
import { radius } from '../../../shared/core/uiDesignSystem';

export interface EditorialTocPanelProps {
  draft: any;
  updateDraft: (updater: (prev: any) => any) => void;
  setActiveStepTab?: (tab: string) => void;
  resolvedTocMap?: Record<string, string>;
}

export const EditorialTocPanel: React.FC<EditorialTocPanelProps> = ({
  draft,
  updateDraft,
  resolvedTocMap,
}) => {
  const tocConfig = draft?.tocConfig || {
    enabled: true,
    title: 'Índice General',
    showSubtitles: true,
    position: 'tras-caratula',
  };

  const sections: EditorialSection[] = Array.isArray(draft?.sections) ? draft.sections : [];

  const updateToc = (field: string, val: any) => {
    updateDraft((prev) => ({
      ...prev,
      tocConfig: { ...(prev?.tocConfig || {}), [field]: val },
    }));
  };

  const toggleSectionInToc = (secId: string, includeInToc: boolean) => {
    updateDraft((prev) => ({
      ...prev,
      sections: (prev?.sections || []).map((s: EditorialSection) =>
        s.id === secId ? { ...s, includeInToc } : s,
      ),
    }));
  };

  const calculatedAnchors = useMemo(
    () => generateSectionAnchors(sections, {}, draft?.design, draft?.cover),
    [sections, draft?.design, draft?.cover],
  );

  return (
    <div className="space-y-5">
      <PanelSection
        icon={<LayoutGrid className="w-4 h-4" />}
        title="Índice General automático"
        helpText="Recalcula los números de página reales de tus capítulos y subtítulos según la modalidad de impresión elegida (1 cara, doble faz o inicio en página impar)."
        headerRight={
          <SectionSwitch
            size="sm"
            checked={tocConfig.enabled !== false}
            onChange={(next) => updateToc('enabled', next)}
            label="Índice automático"
          />
        }
      >
        {tocConfig.enabled !== false && (
          <div className="space-y-3">
            <Field
              label="Título del índice"
              value={tocConfig.title || 'Índice General'}
              onChange={(e: any) => updateToc('title', e.target.value)}
            />
            <div>
              <label className="block text-[11px] font-bold text-[var(--ui-text-secondary)] mb-1">
                Ubicación del índice
              </label>
              <select
                value={tocConfig.position || 'tras-caratula'}
                onChange={(e) => updateToc('position', e.target.value)}
                className="w-full border border-[var(--ui-border)] bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] px-2.5 py-2 text-xs"
                style={{ borderRadius: radius.control }}
              >
                <option value="tras-caratula">Al inicio (justo después de la carátula)</option>
                <option value="tras-preliminares">Después de prólogo / resumen preliminar</option>
              </select>
            </div>
            <div
              className="flex items-center justify-between px-3 py-2 border border-[var(--ui-border)] bg-[var(--ui-bg-card)]"
              style={{ borderRadius: radius.control }}
            >
              <span className="text-xs font-semibold">Mostrar subtítulos internos</span>
              <SectionSwitch
                size="sm"
                checked={tocConfig.showSubtitles !== false}
                onChange={(next) => updateToc('showSubtitles', next)}
                label="Incluir subtítulos en índice"
              />
            </div>

            {sections.length > 0 && (
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-[var(--ui-text-secondary)]">
                  Qué partes figuran en el índice
                </p>
                <div
                  className="divide-y divide-[var(--ui-border)] border border-[var(--ui-border)] bg-[var(--ui-bg-card)] px-3 text-xs"
                  style={{ borderRadius: radius.control }}
                >
                  {sections
                    .filter((s) => s.visible !== false)
                    .map((sec, idx) => {
                      const anchorMatch = calculatedAnchors.find((a) => a.anchorId === sec.id);
                      const realLabel = resolvedTocMap?.[sec.id] ?? anchorMatch?.pageNumber;
                      const included = sec.includeInToc !== false;
                      return (
                        <div key={sec.id} className="py-1.5 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <VisibilityEyeToggle
                              size="xs"
                              visible={included}
                              onToggle={(next) => toggleSectionInToc(sec.id, next)}
                              targetLabel={sec.title || `Sección ${idx + 1}`}
                            />
                            <span
                              className={`font-medium truncate ${
                                included ? 'text-[var(--ui-text-primary)]' : 'opacity-45 line-through'
                              }`}
                            >
                              {sec.title || `Sección ${idx + 1}`}
                            </span>
                          </div>
                          {included && realLabel !== undefined && (
                            <span className="font-mono text-[var(--ui-text-secondary)] shrink-0">
                              pág. {realLabel}
                            </span>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}
      </PanelSection>
    </div>
  );
};
