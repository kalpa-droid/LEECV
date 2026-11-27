import React from 'react';
import { Columns2, FileText, Layers, SlidersHorizontal } from 'lucide-react';
import { PanelSection } from '../../../shared/core/ui/PanelSection';
import { Field } from '../../../shared/core/ui/Field';
import { SectionSwitch } from '../../../shared/core/ui/SectionSwitch';
import { LidioHelpTrigger } from '../../../shared/core/ui/LidioHelpTrigger';
import { ManualOverrideBadge } from '../../../shared/core/ui/ManualOverrideBadge';
import { isManuallyOverridden } from '../../../shared/core/presets/configCascadeEngine';
import { PAGE_SIZES } from '../../../shared/core/pdf-engine/layers/page/pageSizes';
import { calculateSpineThickness } from '../domain/editorialMath';
import {
  clearEditorialFieldManual,
  EditorialDesignDefaultsFlat,
  markEditorialFieldManual,
  resolveStructuralNormFromDraft,
} from '../domain/editorialNormEngine';
import { resolveEffectiveEditorialPagination } from '../domain/editorialPaginationEngine';
import { DEFAULT_SECTION_DIVIDER_CONFIG } from '../domain/sanitizeEditorialData';
import { emitLidioMessage } from '../../../shared/core/assistant/lidioBus';
import type { EditorialSectionDividerConfig } from '../domain/editorialTypes';
import { radius } from '../../../shared/core/uiDesignSystem';

export interface EditorialStructurePanelProps {
  draft: any;
  updateDraft: (updater: (prev: any) => any) => void;
  setActiveStepTab: (tab: string) => void;
}

export const EditorialStructurePanel: React.FC<EditorialStructurePanelProps> = ({
  draft,
  updateDraft,
  setActiveStepTab,
}) => {
  const design = draft?.design || {};
  const structuralNorm = resolveStructuralNormFromDraft(draft);
  const pagination = resolveEffectiveEditorialPagination(draft);
  const documentPageSizes = Object.values(PAGE_SIZES).filter((p) => p.category === 'documento');

  const sectionDividers: EditorialSectionDividerConfig = {
    ...DEFAULT_SECTION_DIVIDER_CONFIG,
    ...(design.sectionDividers && typeof design.sectionDividers === 'object'
      ? design.sectionDividers
      : {}),
  };

  const updateDesignField = (field: keyof EditorialDesignDefaultsFlat, val: any) => {
    updateDraft((prev) => {
      const updated = {
        ...prev,
        design: {
          ...(prev?.design || {}),
          [field]: val,
          ...(field === 'gutter' ? { marginLeft: val } : {}),
        },
      };
      return markEditorialFieldManual(updated, field);
    });
  };

  const updateLineHeight = (val: number) => {
    updateDraft((prev) => {
      const updated = {
        ...prev,
        design: {
          ...(prev?.design || {}),
          typography: { ...(prev?.design?.typography || {}), lineHeight: val },
        },
      };
      return markEditorialFieldManual(updated, 'lineHeight');
    });
  };

  const updateDesignOption = (key: string, val: any) => {
    updateDraft((prev) => ({
      ...prev,
      design: {
        ...(prev?.design || {}),
        [key]: val,
      },
    }));
  };

  const setSectionDividersPatch = (patch: Partial<EditorialSectionDividerConfig>) => {
    updateDraft((prev) => ({
      ...prev,
      design: {
        ...(prev?.design || {}),
        sectionDividers: {
          ...DEFAULT_SECTION_DIVIDER_CONFIG,
          ...(prev?.design?.sectionDividers || {}),
          ...patch,
        },
      },
    }));
  };

  const renderFieldOverrideBadge = (field: keyof EditorialDesignDefaultsFlat) => (
    <ManualOverrideBadge
      isOverridden={isManuallyOverridden(design, field)}
      globalLabel={structuralNorm.toUpperCase()}
      onReset={() => updateDraft((prev) => clearEditorialFieldManual(prev, field))}
    />
  );

  const estimatedPages = Math.max(8, (draft?.sections?.length || 1) * 4);
  const estSpine = calculateSpineThickness(estimatedPages, 'bookcel-80');

  return (
    <div className="space-y-5">
      <PanelSection
        icon={<FileText className="w-4 h-4" />}
        title="Hoja y márgenes"
        helpText="Define el soporte físico de impresión y sus márgenes automáticos. Para alternar entre simple faz o doble faz y el salto de capítulos, usá el botón Impresión de la barra superior."
      >
        <div>
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <label className="block text-xs font-bold text-[var(--ui-text-primary)]">
              ¿En qué hoja lo vas a imprimir?
            </label>
            {renderFieldOverrideBadge('pageSizeId')}
          </div>
          <select
            value={design.pageSizeId || 'a4'}
            onChange={(e) => updateDesignField('pageSizeId', e.target.value)}
            className="w-full border border-[var(--ui-border)] bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] px-3 py-2 text-xs"
            style={{ borderRadius: radius.control }}
          >
            {documentPageSizes.map((ps) => (
              <option key={ps.id} value={ps.id}>
                {ps.appLabel}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <span className="text-[10px] font-semibold text-[var(--ui-text-secondary)]">Superior</span>
              {renderFieldOverrideBadge('marginTop')}
            </div>
            <Field
              label=""
              aria-label="Margen superior"
              type="number"
              value={design.marginTop ?? 20}
              onChange={(e: any) => updateDesignField('marginTop', Number(e.target.value))}
            />
          </div>
          <div>
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <span className="text-[10px] font-semibold text-[var(--ui-text-secondary)]">Inferior</span>
              {renderFieldOverrideBadge('marginBottom')}
            </div>
            <Field
              label=""
              aria-label="Margen inferior"
              type="number"
              value={design.marginBottom ?? 20}
              onChange={(e: any) => updateDesignField('marginBottom', Number(e.target.value))}
            />
          </div>
          <div>
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <span className="text-[10px] font-semibold text-[var(--ui-text-secondary)]">Exterior</span>
              {renderFieldOverrideBadge('marginRight')}
            </div>
            <Field
              label=""
              aria-label="Margen exterior"
              type="number"
              value={design.marginRight ?? 20}
              onChange={(e: any) => updateDesignField('marginRight', Number(e.target.value))}
            />
          </div>
          <div>
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <span className="text-[10px] font-semibold text-[var(--ui-text-secondary)]">Lomo</span>
              {renderFieldOverrideBadge('gutter')}
            </div>
            <Field
              label=""
              aria-label="Lomo encuadernado"
              type="number"
              value={design.gutter ?? 20}
              onChange={(e: any) => updateDesignField('gutter', Number(e.target.value))}
            />
          </div>
        </div>

        <p className="text-[11px] text-[var(--ui-text-secondary)]">
          Grosor estimado de encuadernación: ~{estSpine} ({estimatedPages}+ páginas).
        </p>
      </PanelSection>

      <PanelSection
        icon={<SlidersHorizontal className="w-4 h-4" />}
        title="Distribución, interlineado y columnas"
        helpText="Controla el espacio entre líneas, el desplazamiento inicial de los párrafos y si todo el cuerpo de la obra se organiza en 1 o 2 columnas."
      >
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <span className="text-[10px] font-semibold text-[var(--ui-text-secondary)]">Interlineado</span>
              {renderFieldOverrideBadge('lineHeight')}
            </div>
            <Field
              label=""
              aria-label="Interlineado"
              type="number"
              step="0.1"
              value={design.typography?.lineHeight ?? 1.5}
              onChange={(e: any) => updateLineHeight(Number(e.target.value))}
            />
          </div>
          <div>
            <div className="flex items-center gap-1 mb-0.5">
              <Columns2 className="w-3 h-3 text-[var(--ui-text-secondary)]" />
              <span className="text-[10px] font-semibold text-[var(--ui-text-secondary)]">Columnas del cuerpo</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => updateDesignOption('bodyColumns', 1)}
                className={`py-2 px-2 border text-xs font-bold cursor-pointer ${
                  design.bodyColumns !== 2
                    ? 'bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] border-[var(--color-accent-base)]'
                    : 'bg-[var(--ui-bg-card)] text-[var(--ui-text-secondary)] border-[var(--ui-border)]'
                }`}
                style={{ borderRadius: radius.control }}
              >
                1 col.
              </button>
              <button
                type="button"
                onClick={() => updateDesignOption('bodyColumns', 2)}
                className={`py-2 px-2 border text-xs font-bold cursor-pointer ${
                  design.bodyColumns === 2
                    ? 'bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] border-[var(--color-accent-base)]'
                    : 'bg-[var(--ui-bg-card)] text-[var(--ui-text-secondary)] border-[var(--ui-border)]'
                }`}
                style={{ borderRadius: radius.control }}
              >
                2 cols.
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-2 pt-1">
          <div
            className="flex items-center justify-between px-3 py-2 border border-[var(--ui-border)] bg-[var(--ui-bg-card)]"
            style={{ borderRadius: radius.control }}
          >
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold">Inicio de párrafo desplazado</span>
              <LidioHelpTrigger
                size="xs"
                title="Espacio al iniciar párrafo"
                text="Desplaza la primera línea de cada párrafo hacia la derecha, usado en tesis APA 7 y libros impresos."
              />
              {renderFieldOverrideBadge('firstLineIndent')}
            </div>
            <SectionSwitch
              size="sm"
              checked={Boolean(design.firstLineIndent)}
              onChange={(next) => updateDesignField('firstLineIndent', next)}
              label="Inicio de párrafo desplazado"
            />
          </div>

          <div
            className="flex items-center justify-between px-3 py-2 border border-[var(--ui-border)] bg-[var(--ui-bg-card)]"
            style={{ borderRadius: radius.control }}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold">Evitar líneas sueltas al cierre</span>
              <LidioHelpTrigger
                size="xs"
                title="Cierre limpio de párrafos"
                text="Une automáticamente las dos últimas palabras de cada párrafo para evitar que quede una palabra sola al final."
              />
            </div>
            <SectionSwitch
              size="sm"
              checked={design.preventRunts !== false}
              onChange={(next) => updateDesignOption('preventRunts', next)}
              label="Evitar palabras sueltas al cierre"
            />
          </div>
        </div>
      </PanelSection>

      <PanelSection
        icon={<Layers className="w-4 h-4" />}
        title="Carátulas separadoras y folios"
        helpText="Configurá portadillas automáticas al iniciar cada capítulo y cómo se muestran los encabezados y números de página."
      >
        <div
          className="flex items-center justify-between gap-2 p-2.5 border border-[var(--ui-border)] bg-[var(--ui-bg-card)]"
          style={{ borderRadius: radius.control }}
        >
          <span className="text-xs font-bold text-[var(--ui-text-primary)]">
            Carátula separadora antes de capítulos
          </span>
          <SectionSwitch
            size="sm"
            checked={sectionDividers.enabled}
            onChange={(checked) => {
              setSectionDividersPatch({ enabled: checked });
              emitLidioMessage({
                kind: 'state',
                groupKey: 'ed-sec-dividers',
                title: checked ? 'Carátulas de capítulos activadas' : 'Carátulas de capítulos desactivadas',
                body: checked
                  ? 'Cada capítulo abre con su portadilla separadora usando el estilo y color de la obra.'
                  : 'Los capítulos arrancan directo con su contenido.',
              });
            }}
            label="Carátula separadora en capítulos"
          />
        </div>

        {sectionDividers.enabled && (
          <div className="space-y-2">
            <div
              className="flex items-center justify-between gap-2 p-2.5 border border-[var(--ui-border)] bg-[var(--ui-bg-card)]"
              style={{ borderRadius: radius.control }}
            >
              <span className="text-xs font-semibold">Hoja en blanco detrás (doble faz)</span>
              <SectionSwitch
                size="sm"
                checked={sectionDividers.blankBackPage}
                onChange={(checked) => setSectionDividersPatch({ blankBackPage: checked })}
                label="Hoja en blanco detrás"
              />
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => setSectionDividersPatch({ scope: 'body-chapters' })}
                className={`py-1.5 px-2.5 border font-bold cursor-pointer ${
                  sectionDividers.scope !== 'all-sections'
                    ? 'bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] border-[var(--color-accent-base)]'
                    : 'bg-[var(--ui-bg-card)] text-[var(--ui-text-secondary)] border-[var(--ui-border)]'
                }`}
                style={{ borderRadius: radius.control }}
              >
                Solo cuerpo principal
              </button>
              <button
                type="button"
                onClick={() => setSectionDividersPatch({ scope: 'all-sections' })}
                className={`py-1.5 px-2.5 border font-bold cursor-pointer ${
                  sectionDividers.scope === 'all-sections'
                    ? 'bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] border-[var(--color-accent-base)]'
                    : 'bg-[var(--ui-bg-card)] text-[var(--ui-text-secondary)] border-[var(--ui-border)]'
                }`}
                style={{ borderRadius: radius.control }}
              >
                Todas las secciones
              </button>
            </div>
          </div>
        )}

        <div
          className="flex items-center justify-between px-3 py-2 border border-[var(--ui-border)] bg-[var(--ui-bg-card)]"
          style={{ borderRadius: radius.control }}
        >
          <span className="text-xs font-semibold">Numerar páginas</span>
          <SectionSwitch
            size="sm"
            checked={design.pageNumbers !== false}
            onChange={(next) => updateDesignOption('pageNumbers', next)}
            label="Numerar páginas"
          />
        </div>

        <div
          className="flex items-center justify-between px-3 py-2 border border-[var(--ui-border)] bg-[var(--ui-bg-card)]"
          style={{ borderRadius: radius.control }}
        >
          <span className="text-xs font-semibold">Preliminares en romanos (i, ii, iii)</span>
          <SectionSwitch
            size="sm"
            checked={Boolean(design.preliminaryRomanNumerals)}
            onChange={(next) => updateDesignOption('preliminaryRomanNumerals', next)}
            label="Numeración romana en preliminares"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-[11px] font-bold text-[var(--ui-text-secondary)]">
            Encabezado superior automático
          </label>
          <select
            value={design.headerMode || 'auto'}
            onChange={(e) => updateDesignOption('headerMode', e.target.value)}
            className="w-full border border-[var(--ui-border)] bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] px-2.5 py-2 text-xs"
            style={{ borderRadius: radius.control }}
          >
            <option value="auto">Automático según formato de obra</option>
            <option value="none">Sin encabezado</option>
            <option value="book_title">Título de la obra</option>
            <option value="chapter_title">Nombre del capítulo actual</option>
            <option value="mirror_book_chapter">Alternado (par: Obra · impar: Capítulo)</option>
            <option value="custom">Texto propio</option>
          </select>
        </div>

        {design.headerMode === 'custom' && (
          <Field
            label="Texto del encabezado"
            value={design.headerCustomText || ''}
            onChange={(e: any) => updateDesignOption('headerCustomText', e.target.value)}
            placeholder="Ej: Ministerio de Planificación · Informe Anual"
          />
        )}

        <div className="space-y-1">
          <label className="block text-[11px] font-bold text-[var(--ui-text-secondary)]">
            Pie de página
          </label>
          <select
            value={pagination.footerMode || 'auto'}
            onChange={(e) => updateDesignOption('footerMode', e.target.value)}
            className="w-full border border-[var(--ui-border)] bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] px-2.5 py-2 text-xs"
            style={{ borderRadius: radius.control }}
          >
            <option value="auto">Automático del formato elegido</option>
            <option value="folio_only">Solo número de página (1, 2, 3…)</option>
            <option value="page_x_of_y">Página X de Y (ideal informes)</option>
            <option value="book_and_folio">Título de la obra · Página</option>
            <option value="custom_and_folio">Texto propio · Página</option>
            <option value="none">Sin pie de página</option>
          </select>
        </div>

        {pagination.footerMode === 'custom_and_folio' && (
          <Field
            label="Texto junto al número de página"
            value={design.footerCustomText || ''}
            onChange={(e: any) => updateDesignOption('footerCustomText', e.target.value)}
            placeholder="Ej: Dirección Técnica · Confidencial"
          />
        )}
      </PanelSection>

      <button
        type="button"
        onClick={() => setActiveStepTab('editorial_diseño')}
        className="w-full py-2.5 px-4 bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] text-xs font-bold cursor-pointer"
        style={{ borderRadius: radius.control }}
      >
        Continuar a Estilo y Tipografía →
      </button>
    </div>
  );
};
