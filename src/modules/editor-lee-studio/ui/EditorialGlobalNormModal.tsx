import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, BookOpen, Check, CheckCircle2, Info, Sparkles } from 'lucide-react';
import { Modal } from '../../../shared/core/ui/Modal';
import { button, radius, selectableCard } from '../../../shared/core/uiDesignSystem';
import { GlobalApplyMode } from '../../../shared/core/presets/configCascadeEngine';
import { DomSectionIcon } from '../../../shared/core/pdf-engine/layers/icons/DomSectionIcon';
import { PRODUCT_ICON_IDS, UI_ICON_IDS } from '../../../shared/core/ui/iconCatalog';
import {
  EDITORIAL_PRESET_GROUPS,
  EDITORIAL_PRIMARY_PRESETS,
  getEditorialPreset,
} from '../domain/editorialPresetCatalog';
import {
  BIBLIOGRAPHY_NORM_GUIDES,
  CanonicalCitationStyle,
  normalizeBibliographyStyle,
} from '../domain/editorialCitationFormatter';
import {
  checkEditorialNormCompatibility,
  detectEditorialDesignConflicts,
  EDITORIAL_STRUCTURAL_NORMS,
  resolveStructuralNormFromDraft,
} from '../domain/editorialNormEngine';
import type { EditorialPresetId, EditorialStructuralNormId } from '../domain/editorialTypes';

export type EditorialGlobalAxis = 'preset' | 'structural_norm' | 'bibliography';

export interface EditorialGlobalNormModalProps {
  isOpen: boolean;
  axis?: EditorialGlobalAxis;
  onClose: () => void;
  draft: any;
  onApplyGlobalConfig: (params: {
    presetId: EditorialPresetId;
    presetMode: 'apply-design' | 'replace-structure';
    structuralNormId: EditorialStructuralNormId;
    bibliographyStyle: CanonicalCitationStyle;
    applyMode: GlobalApplyMode;
  }) => void;
}

const CITATION_OPTIONS: Array<{ id: CanonicalCitationStyle; label: string; tag: string }> = [
  { id: 'apa7', label: 'APA 7.ª ed.', tag: '(Autor, Año)' },
  { id: 'vancouver', label: 'Vancouver', tag: '[1], [2]' },
  { id: 'ieee', label: 'IEEE', tag: '[1] Técn.' },
  { id: 'harvard', label: 'Harvard', tag: 'Autor (Año)' },
  { id: 'chicago', label: 'Chicago', tag: 'Hist./Hum.' },
  { id: 'mla', label: 'MLA 9', tag: '(Autor pág)' },
  { id: 'tradicional', label: 'Libre', tag: 'Escolar' },
];

export const EditorialGlobalNormModal: React.FC<EditorialGlobalNormModalProps> = ({
  isOpen,
  axis = 'preset',
  onClose,
  draft,
  onApplyGlobalConfig,
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<EditorialPresetId>(
    (draft?.design?.presetId as EditorialPresetId) || 'libro-ensayo-novela',
  );
  const [selectedNorm, setSelectedNorm] = useState<EditorialStructuralNormId>(
    resolveStructuralNormFromDraft(draft),
  );
  const [selectedBib, setSelectedBib] = useState<CanonicalCitationStyle>(
    normalizeBibliographyStyle(draft?.design?.bibliographyStyle || draft?.design?.normId),
  );
  const [presetMode, setPresetMode] = useState<'apply-design' | 'replace-structure'>('apply-design');

  const hasText = useMemo(
    () =>
      Array.isArray(draft?.sections) &&
      draft.sections.some(
        (s: any) =>
          Array.isArray(s?.records) &&
          s.records.some((r: any) => String(r?.content || '').trim().length > 0),
      ),
    [draft?.sections],
  );

  useEffect(() => {
    if (!isOpen) return;
    setSelectedPresetId((draft?.design?.presetId as EditorialPresetId) || 'libro-ensayo-novela');
    setSelectedNorm(resolveStructuralNormFromDraft(draft));
    setSelectedBib(
      normalizeBibliographyStyle(draft?.design?.bibliographyStyle || draft?.design?.normId),
    );
    setPresetMode(hasText ? 'apply-design' : 'replace-structure');
  }, [isOpen, draft, hasText]);

  const handleSelectPresetCard = (presetId: EditorialPresetId) => {
    setSelectedPresetId(presetId);
    const preset = getEditorialPreset(presetId);
    if (preset) {
      setSelectedNorm(preset.structuralNormId);
      setSelectedBib(normalizeBibliographyStyle(preset.bibliographyStyle));
    }
  };

  const compatibility = useMemo(
    () => checkEditorialNormCompatibility(selectedNorm, selectedBib),
    [selectedNorm, selectedBib],
  );

  const conflicts = useMemo(() => {
    if (axis === 'bibliography') return [];
    return detectEditorialDesignConflicts(draft, selectedNorm, selectedPresetId);
  }, [axis, draft, selectedNorm, selectedPresetId]);

  const activeGuide = BIBLIOGRAPHY_NORM_GUIDES[selectedBib];

  const handleApply = (applyMode: GlobalApplyMode) => {
    const currentPresetId = (draft?.design?.presetId as EditorialPresetId) || 'libro-ensayo-novela';
    const currentNorm = resolveStructuralNormFromDraft(draft);
    const currentBib = normalizeBibliographyStyle(draft?.design?.bibliographyStyle || draft?.design?.normId);

    onApplyGlobalConfig({
      presetId: axis === 'preset' ? selectedPresetId : currentPresetId,
      presetMode: axis === 'preset' ? presetMode : 'apply-design',
      structuralNormId: axis === 'bibliography' ? currentNorm : selectedNorm,
      bibliographyStyle: axis === 'structural_norm' ? currentBib : selectedBib,
      applyMode,
    });
    onClose();
  };

  const modalMeta =
    axis === 'preset'
      ? {
          title: 'Tipo de obra o trabajo',
          icon: <DomSectionIcon iconId={PRODUCT_ICON_IDS.editor} size={18} />,
          helpTitle: 'Plantilla base de obra',
          helpText:
            'Cada plantilla arma las partes recomendadas (escolar, terciario, tesis APA 7, científico Vancouver, libro o manual), carátula y hoja inicial.',
        }
      : axis === 'structural_norm'
        ? {
            title: 'Norma visual de página',
            icon: <DomSectionIcon iconId={UI_ICON_IDS.editorialNorm} size={18} />,
            helpTitle: 'Estructura de página',
            helpText:
              'Define márgenes, interlineado y espacio inicial de párrafo para toda la obra sin alterar tus textos ni tu estilo de citas.',
          }
        : {
            title: 'Estilo de citas y bibliografía',
            icon: <DomSectionIcon iconId={UI_ICON_IDS.editorialCitations} size={18} />,
            helpTitle: 'Citas independientes',
            helpText:
              'Podés usar estructura de página APA 7 junto con citas Vancouver, IEEE o Harvard sin cambiar tus textos.',
          };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      icon={modalMeta.icon}
      title={modalMeta.title}
      helpTitle={modalMeta.helpTitle}
      helpText={modalMeta.helpText}
    >
      <div className="space-y-4">
        {axis === 'preset' && (
          <div className="space-y-3">
            {hasText && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-[var(--ui-text-secondary)]">
                  Ya tenés texto escrito:
                </span>
                <div className="inline-flex rounded-full border border-[var(--ui-border)] p-0.5 bg-[var(--ui-bg-surface)] text-[11px]">
                  <button
                    type="button"
                    onClick={() => setPresetMode('apply-design')}
                    className={`px-2.5 py-0.5 rounded-full font-semibold cursor-pointer ${
                      presetMode === 'apply-design'
                        ? 'bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)]'
                        : 'text-[var(--ui-text-secondary)]'
                    }`}
                  >
                    Solo formato (conservar texto)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetMode('replace-structure')}
                    className={`px-2.5 py-0.5 rounded-full font-semibold cursor-pointer ${
                      presetMode === 'replace-structure'
                        ? 'bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)]'
                        : 'text-[var(--ui-text-secondary)]'
                    }`}
                  >
                    Reemplazar capítulos base
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3 max-h-[54vh] overflow-y-auto pr-1">
              {EDITORIAL_PRESET_GROUPS.map((group) => {
                const groupPresets = EDITORIAL_PRIMARY_PRESETS.filter((p) => p.group === group.id);
                if (groupPresets.length === 0) return null;
                return (
                  <div key={group.id} className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--ui-text-primary)]">
                        {group.title}
                      </span>
                      <span className="text-[10px] text-[var(--ui-text-secondary)] truncate">
                        {group.subtitle}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {groupPresets.map((preset) => {
                        const selected = selectedPresetId === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => handleSelectPresetCard(preset.id)}
                            aria-pressed={selected}
                            className={`${selectableCard.base} ${
                              selected ? selectableCard.selected : selectableCard.unselected
                            } p-2.5 text-left cursor-pointer`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-bold text-[var(--ui-text-primary)] truncate">
                                {preset.shortLabel}
                              </span>
                              {selected && <Check className="w-3.5 h-3.5 text-[var(--color-accent-text)] shrink-0" />}
                            </div>
                            <span className="text-[10px] font-semibold text-[var(--ui-text-secondary)] block truncate">
                              {preset.audienceTag}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {(() => {
                const activeObj = getEditorialPreset(selectedPresetId);
                if (!activeObj?.isLegacyAlias) return null;
                return (
                  <div
                    className="p-2 border border-[var(--ui-border)] bg-[var(--ui-bg-surface)] text-[11px] text-[var(--ui-text-secondary)]"
                    style={{ borderRadius: radius.control }}
                  >
                    Plantilla heredada activa: <strong className="text-[var(--ui-text-primary)]">{activeObj.label}</strong>. Podés mantenerla o elegir una de las 12 opciones actuales arriba.
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {axis === 'structural_norm' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {(['libre', 'apa7', 'chicago', 'mla'] as EditorialStructuralNormId[]).map((normId) => {
              const norm = EDITORIAL_STRUCTURAL_NORMS[normId];
              const selected = selectedNorm === normId;
              return (
                <button
                  key={normId}
                  type="button"
                  onClick={() => setSelectedNorm(normId)}
                  aria-pressed={selected}
                  className={`${selectableCard.base} ${
                    selected ? selectableCard.selected : selectableCard.unselected
                  } p-3 text-left cursor-pointer space-y-1`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[var(--ui-text-primary)]">{norm.shortLabel}</span>
                    {selected && <Check className="w-3.5 h-3.5 text-[var(--color-accent-text)] shrink-0" />}
                  </div>
                  <p className="text-[11px] text-[var(--ui-text-secondary)] leading-snug">{norm.summary}</p>
                </button>
              );
            })}
          </div>
        )}

        {axis === 'bibliography' && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {CITATION_OPTIONS.map((opt) => {
                const selected = selectedBib === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedBib(opt.id)}
                    aria-pressed={selected}
                    className={`px-3 py-1.5 rounded-full border text-xs font-bold cursor-pointer transition-colors ${
                      selected
                        ? 'bg-[var(--color-accent-base)] border-[var(--color-accent-base)] text-[var(--color-accent-on-base)]'
                        : 'bg-[var(--ui-bg-surface)] border-[var(--ui-border)] text-[var(--ui-text-primary)] hover:border-[var(--color-accent-base)]'
                    }`}
                  >
                    {opt.label}{' '}
                    <span className="opacity-80 font-normal text-[10px]">{opt.tag}</span>
                  </button>
                );
              })}
            </div>

            <div
              className={`p-3 rounded-[${radius.control}] border text-xs space-y-1 ${
                compatibility.level === 'advisory'
                  ? 'bg-[var(--color-status-warning-muted)] border-[var(--color-status-warning-base)]/40 text-[var(--color-status-warning-text)]'
                  : compatibility.level === 'optimal'
                    ? 'bg-[var(--color-status-success-muted)] border-[var(--color-status-success-base)]/40 text-[var(--color-status-success-text)]'
                    : 'bg-[var(--ui-bg-surface)] border-[var(--ui-border)] text-[var(--ui-text-primary)]'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold">
                {compatibility.level === 'advisory' ? (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                ) : compatibility.level === 'optimal' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <Info className="w-4 h-4 shrink-0" />
                )}
                <span>{compatibility.badge}</span>
              </div>
              <p className="text-[11px] leading-relaxed">{compatibility.message}</p>
              <p className="text-[11px] opacity-90 font-medium">{activeGuide.inTextExample}</p>
            </div>
          </div>
        )}

        {conflicts.length > 0 && (
          <div
            className={`p-3 rounded-[${radius.control}] bg-[var(--color-status-warning-muted)] border border-[var(--color-status-warning-base)]/40 space-y-1.5`}
          >
            <div className="flex items-start gap-2 text-xs font-bold text-[var(--color-status-warning-text)]">
              <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p>
                  Tenés {conflicts.length} ajuste(s) fino(s) tocado(s) a mano en Diseño que difieren de esta configuración:
                </p>
                <ul className="mt-1 list-disc list-inside text-[11px] font-normal">
                  {conflicts.slice(0, 4).map((c) => (
                    <li key={c.fieldKey}>{c.label}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-[var(--ui-border)]">
          <button
            type="button"
            onClick={onClose}
            className={`${button.base} ${button.secondary}`}
          >
            Cancelar
          </button>

          {conflicts.length > 0 && (
            <button
              type="button"
              onClick={() => handleApply('preserve-manual')}
              className={`${button.base} border border-[var(--color-accent-base)] text-[var(--color-accent-text)] bg-[var(--ui-bg-surface)] hover:bg-[var(--color-accent-muted)]`}
            >
              Conservar mis ajustes finos
            </button>
          )}

          <button
            type="button"
            onClick={() => handleApply('apply-all')}
            className={`${button.base} ${button.primary}`}
          >
            {conflicts.length > 0 ? 'Aplicar todo el cambio' : 'Aplicar'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export { BookOpen };
