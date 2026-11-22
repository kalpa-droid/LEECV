import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, BookOpen, Check, CheckCircle2, Info, Sparkles } from 'lucide-react';
import { Modal } from '../../../shared/core/ui/Modal';
import { button, radius, selectableCard } from '../../../shared/core/uiDesignSystem';
import { GlobalApplyMode } from '../../../shared/core/presets/configCascadeEngine';
import { EDITORIAL_PRESET_CATALOG, getEditorialPreset } from '../domain/editorialPresetCatalog';
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

export interface EditorialGlobalNormModalProps {
  isOpen: boolean;
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
    setPresetMode('apply-design');
  }, [isOpen, draft]);

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

  const conflicts = useMemo(
    () => detectEditorialDesignConflicts(draft, selectedNorm, selectedPresetId),
    [draft, selectedNorm, selectedPresetId],
  );

  const activeGuide = BIBLIOGRAPHY_NORM_GUIDES[selectedBib];

  const handleApply = (applyMode: GlobalApplyMode) => {
    onApplyGlobalConfig({
      presetId: selectedPresetId,
      presetMode,
      structuralNormId: selectedNorm,
      bibliographyStyle: selectedBib,
      applyMode,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      icon={<BookOpen className="w-4 h-4" />}
      title="Configuración global de obra y normas"
      helpTitle="Estructura vs Bibliografía"
      helpText="Podés combinar normas: por ejemplo, usar estructura de página APA 7 (márgenes 25 mm e interlineado doble) junto con citas Vancouver, IEEE o Harvard. Chicago y MLA suelen mantener su propia estética completa."
    >
      <div className="space-y-4">
        {/* 1. Tipo de obra o trabajo */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--ui-text-secondary)]">
              1. Tipo de obra o trabajo
            </span>
            {hasText && (
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
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {EDITORIAL_PRESET_CATALOG.map((preset) => {
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
                  <span className="text-[10px] font-semibold text-[var(--ui-text-secondary)] block">
                    {preset.audienceTag}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Norma estructural de página */}
        <div className="space-y-2 pt-2 border-t border-[var(--ui-border)]">
          <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--ui-text-secondary)] block">
            2. Norma estructural visual (márgenes, interlineado e inicio de párrafo)
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
        </div>

        {/* 3. Estilo de citas y referencias */}
        <div className="space-y-2 pt-2 border-t border-[var(--ui-border)]">
          <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--ui-text-secondary)] block">
            3. Estilo de citas y referencias bibliográficas (se actualiza solo en tus capítulos)
          </span>
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
            <p className="text-[11px] opacity-90 font-medium">
              {activeGuide.inTextExample}
            </p>
          </div>
        </div>

        {/* 4. Conflictos con ajustes manuales de Nivel 3 */}
        {conflicts.length > 0 && (
          <div
            className={`p-3 rounded-[${radius.control}] bg-[var(--color-status-warning-muted)] border border-[var(--color-status-warning-base)]/40 space-y-1.5`}
          >
            <div className="flex items-start gap-2 text-xs font-bold text-[var(--color-status-warning-text)]">
              <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p>
                  Tenés {conflicts.length} ajuste(s) fino(s) tocado(s) a mano en Diseño que difieren de esta norma:
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
            {conflicts.length > 0 ? 'Aplicar toda la norma nueva' : 'Aplicar configuración global'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
