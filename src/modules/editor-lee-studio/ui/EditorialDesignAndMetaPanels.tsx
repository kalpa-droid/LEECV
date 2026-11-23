import React, { useEffect, useMemo, useState } from 'react';
import { BookText, FileText, History, LayoutGrid, Palette, Settings } from 'lucide-react';
import { PanelSection } from '../../../shared/core/ui/PanelSection';
import { ContextualGuideBox } from '../../../shared/core/ui/ContextualGuideBox';
import { Field } from '../../../shared/core/ui/Field';
import { SectionSwitch } from '../../../shared/core/ui/SectionSwitch';
import { LidioHelpTrigger } from '../../../shared/core/ui/LidioHelpTrigger';
import { ManualOverrideBadge } from '../../../shared/core/ui/ManualOverrideBadge';
import { isManuallyOverridden } from '../../../shared/core/presets/configCascadeEngine';
import { PAGE_SIZES } from '../../../shared/core/pdf-engine/layers/page/pageSizes';
import { generateSectionAnchors } from '../domain/editorialTocResolver';
import { calculateSpineThickness } from '../domain/editorialMath';
import {
  clearEditorialFieldManual,
  EDITORIAL_STRUCTURAL_NORMS,
  EditorialDesignDefaultsFlat,
  markEditorialFieldManual,
  resolveStructuralNormFromDraft,
} from '../domain/editorialNormEngine';
import { getSavedEditorialsList } from '../../../shared/core/storage/documentStorageService';
import { radius } from '../../../shared/core/uiDesignSystem';

interface BasePanelProps {
  draft: any;
  updateDraft: (updater: (prev: any) => any) => void;
  setActiveStepTab: (tab: string) => void;
  onOpenGlobalNormModal?: () => void;
}

export const EditorialDisenoPanel: React.FC<BasePanelProps> = ({
  draft,
  updateDraft,
  setActiveStepTab,
  onOpenGlobalNormModal,
}) => {
  const design = draft?.design || {};
  const structuralNorm = resolveStructuralNormFromDraft(draft);
  const normSpec = EDITORIAL_STRUCTURAL_NORMS[structuralNorm];
  const documentPageSizes = Object.values(PAGE_SIZES).filter((p) => p.category === 'documento');

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

  const updateTypography = (field: 'fontFamily' | 'fontSize' | 'lineHeight', val: any) => {
    updateDraft((prev) => {
      const updated = {
        ...prev,
        design: {
          ...(prev?.design || {}),
          typography: { ...(prev?.design?.typography || {}), [field]: val },
        },
      };
      return markEditorialFieldManual(updated, field);
    });
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
      <div
        className="p-3 border border-[var(--ui-border)] bg-[var(--ui-bg-card)] flex items-center justify-between gap-2"
        style={{ borderRadius: radius.card }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Palette className="w-4 h-4 text-[var(--color-accent-text)] shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-extrabold text-[var(--ui-text-primary)] truncate">
              Norma base: {normSpec.shortLabel}
            </p>
            <p className="text-[10px] text-[var(--ui-text-secondary)] truncate">
              Lo que ajustés acá queda protegido como ajuste fino
            </p>
          </div>
        </div>
        {onOpenGlobalNormModal && (
          <button
            type="button"
            onClick={onOpenGlobalNormModal}
            className="px-2.5 py-1 rounded-full border border-[var(--color-accent-base)]/50 bg-[var(--color-accent-muted)] text-[var(--color-accent-text)] text-[11px] font-bold cursor-pointer shrink-0"
          >
            Cambiar norma
          </button>
        )}
      </div>

      <PanelSection
        icon={<FileText className="w-4 h-4" />}
        title="Hoja y márgenes"
        helpText="Elegí el tipo de hoja para imprimir y ajustá los espacios en los bordes o en el lomo de encuadernación. Lo que toques aquí queda marcado como ajuste fino."
      >
        <div>
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <label className="block text-xs font-bold text-[var(--ui-text-primary)]">
              ¿En qué hoja lo vas a imprimir? (Tamaño de hoja) {/* plain-language:allow */}
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
        icon={<BookText className="w-4 h-4" />}
        title="Letra e interlineado"
        helpText="Combiná letra clásica serif (recomendada en impresos y APA) o moderna sans, junto con su tamaño y espacio entre líneas."
      >
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-3 sm:col-span-1">
            <div className="flex items-center gap-1 mb-1 flex-wrap">
              <label className="block text-xs font-bold text-[var(--ui-text-primary)]">
                Tipografía
              </label>
              {renderFieldOverrideBadge('fontFamily')}
            </div>
            <select
              value={design.typography?.fontFamily || 'Times-Roman'}
              onChange={(e) => updateTypography('fontFamily', e.target.value)}
              className="w-full border border-[var(--ui-border)] bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] px-2.5 py-2 text-xs"
              style={{ borderRadius: radius.control }}
            >
              <option value="Times-Roman">Clásica Serif</option>
              <option value="Helvetica">Moderna Sans</option>
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <span className="text-[10px] font-semibold text-[var(--ui-text-secondary)]">Cuerpo (pt)</span>
              {renderFieldOverrideBadge('fontSize')}
            </div>
            <Field
              label=""
              aria-label="Cuerpo (pt)"
              type="number"
              value={design.typography?.fontSize ?? 11}
              onChange={(e: any) => updateTypography('fontSize', Number(e.target.value))}
            />
          </div>
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
              onChange={(e: any) => updateTypography('lineHeight', Number(e.target.value))}
            />
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
                text="Desplaza la primera línea de cada párrafo hacia la derecha, requerido en tesis APA 7 y libros impresos."
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
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold">Numerar páginas abajo</span>
              {renderFieldOverrideBadge('pageNumbers')}
            </div>
            <SectionSwitch
              size="sm"
              checked={design.pageNumbers !== false}
              onChange={(next) => updateDesignField('pageNumbers', next)}
              label="Numeración de páginas"
            />
          </div>
        </div>
      </PanelSection>

      <button
        type="button"
        onClick={() => setActiveStepTab('editorial_toc')}
        className="w-full py-2.5 px-4 bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] text-xs font-bold cursor-pointer"
        style={{ borderRadius: radius.control }}
      >
        Continuar al Índice →
      </button>
    </div>
  );
};

export const EditorialTocPanel: React.FC<BasePanelProps> = ({
  draft,
  updateDraft,
  setActiveStepTab,
}) => {
  const tocConfig = draft?.tocConfig || {
    enabled: true,
    title: 'Índice General',
    showSubtitles: true,
    position: 'tras-caratula',
  };

  const updateToc = (field: string, val: any) => {
    updateDraft((prev) => ({
      ...prev,
      tocConfig: { ...(prev?.tocConfig || {}), [field]: val },
    }));
  };

  const calculatedAnchors = useMemo(
    () => generateSectionAnchors(draft?.sections || [], {}),
    [draft?.sections],
  );

  return (
    <div className="space-y-5">
      <PanelSection
        icon={<LayoutGrid className="w-4 h-4" />}
        title="Índice automático"
        helpText="Calcula los números de página reales de tus capítulos y subtítulos al armar el PDF."
        headerRight={
          <SectionSwitch
            size="sm"
            checked={tocConfig.enabled !== false}
            onChange={(next) => updateToc('enabled', next)}
            label="Índice automático"
          />
        }
      >
        <ContextualGuideBox title="Cómo funciona">
          Activá la perilla superior para incluir la tabla de contenidos al principio de tu trabajo o libro.
        </ContextualGuideBox>

        {tocConfig.enabled !== false && (
          <div className="space-y-3">
            <Field
              label="Título del índice"
              value={tocConfig.title || 'Índice General'}
              onChange={(e: any) => updateToc('title', e.target.value)}
            />
            <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-card)]">
              <span className="text-xs font-semibold">Mostrar subtítulos internos</span>
              <SectionSwitch
                size="sm"
                checked={tocConfig.showSubtitles !== false}
                onChange={(next) => updateToc('showSubtitles', next)}
                label="Incluir subtítulos en índice"
              />
            </div>

            {calculatedAnchors.length > 0 && (
              <div className="divide-y divide-[var(--ui-border)] rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-card)] px-3 text-xs">
                {calculatedAnchors.map((item, i) => (
                  <div key={item.anchorId || i} className="py-1.5 flex items-center justify-between">
                    <span className="font-medium truncate">{item.label}</span>
                    <span className="font-mono text-[var(--ui-text-secondary)]">pág. {item.pageNumber}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </PanelSection>

      <button
        type="button"
        onClick={() => setActiveStepTab('editorial_metadata')}
        className="w-full py-2.5 px-4 bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] rounded-lg text-xs font-bold cursor-pointer"
      >
        Continuar a Metadatos →
      </button>
    </div>
  );
};

export const EditorialMetadataPanel: React.FC<BasePanelProps> = ({
  draft,
  updateDraft,
  setActiveStepTab,
}) => {
  const meta = draft?.metadata || {};
  const updateMeta = (field: string, val: any) => {
    updateDraft((prev) => ({
      ...prev,
      metadata: { ...(prev?.metadata || {}), [field]: val },
    }));
  };

  return (
    <div className="space-y-5">
      <PanelSection
        icon={<Settings className="w-4 h-4" />}
        title="Ficha de edición"
        helpText="Datos legales, año de publicación y registros ISBN si vas a publicar tu libro o informe. El título y el autor se editan en Portada."
      >
        <div
          className="p-3 border border-[var(--ui-border)] bg-[var(--ui-bg-card)] flex items-center justify-between gap-2"
          style={{ borderRadius: radius.control }}
        >
          <div className="min-w-0">
            <p className="text-xs font-bold text-[var(--ui-text-primary)] truncate">
              {meta.title || 'Sin título'}
            </p>
            <p className="text-[11px] text-[var(--ui-text-secondary)] truncate">
              {meta.author ? `Autor: ${meta.author}` : 'Autor pendiente'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveStepTab('editorial_portada')}
            className="px-2.5 py-1 rounded-full border border-[var(--ui-border)] bg-[var(--ui-bg-panel)] text-[var(--color-accent-text)] text-[11px] font-bold cursor-pointer shrink-0"
          >
            Editar en Portada
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <Field
              label="Año"
              type="number"
              value={meta.year || ''}
              onChange={(e: any) => updateMeta('year', Number(e.target.value))}
            />
            <Field
              label="ISBN impreso (opcional)"
              value={meta.isbn || ''}
              onChange={(e: any) => updateMeta('isbn', e.target.value)}
            />
          </div>
          <Field
            as="textarea"
            rows={3}
            label="Nota legal / Derechos"
            value={meta.legalNote || ''}
            onChange={(e: any) => updateMeta('legalNote', e.target.value)}
            placeholder="Ej: Derechos reservados..."
          />
        </div>
      </PanelSection>
    </div>
  );
};

export const EditorialHistorialPanel: React.FC<{
  setActiveStepTab: (tab: string) => void;
  onOpenSaved?: (saved: any) => void;
  onDuplicate?: (saved: any) => void;
}> = ({ setActiveStepTab, onOpenSaved, onDuplicate }) => {
  const [savedList, setSavedList] = useState<any[]>([]);

  useEffect(() => {
    void getSavedEditorialsList()
      .then((list) => setSavedList(list || []))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-4">
      <PanelSection
        icon={<History className="w-4 h-4" />}
        title="Borradores guardados"
        helpText="Obras guardadas localmente en este dispositivo."
      >
        {savedList.length === 0 ? (
          <div className="p-5 text-center rounded-xl border border-dashed border-[var(--ui-border)] text-xs text-[var(--ui-text-secondary)]">
            No tenés documentos guardados todavía.
          </div>
        ) : (
          <div className="space-y-2">
            {savedList.map((doc) => (
              <div
                key={doc.id}
                className="p-3 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg-card)] flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="font-bold text-xs text-[var(--ui-text-primary)] truncate">
                    {doc.title || 'Documento sin título'}
                  </p>
                  <p className="text-[10px] text-[var(--ui-text-secondary)]">
                    {doc.updated_at ? new Date(doc.updated_at).toLocaleDateString() : 'Reciente'}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {onOpenSaved && (
                    <button
                      type="button"
                      onClick={() => onOpenSaved(doc)}
                      className="px-2.5 py-1 text-xs font-bold bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] rounded cursor-pointer"
                    >
                      Abrir
                    </button>
                  )}
                  {onDuplicate && (
                    <button
                      type="button"
                      onClick={() => onDuplicate(doc)}
                      className="px-2.5 py-1 text-xs font-bold bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] rounded cursor-pointer"
                    >
                      Copiar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </PanelSection>

      <button
        type="button"
        onClick={() => setActiveStepTab('editorial_secciones')}
        className="w-full py-2.5 px-4 bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] rounded-lg text-xs font-bold cursor-pointer"
      >
        Volver a editar →
      </button>
    </div>
  );
};
