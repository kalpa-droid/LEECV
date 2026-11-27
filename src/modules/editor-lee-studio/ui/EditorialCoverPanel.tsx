import React from 'react';
import { BookMarked, FileText, Sparkles } from 'lucide-react';
import { PanelSection } from '../../../shared/core/ui/PanelSection';
import { ActionGrid } from '../../../shared/core/ui/ActionGrid';
import { ActionTileButton } from '../../../shared/core/ui/ActionTileButton';
import { Field } from '../../../shared/core/ui/Field';
import { COVER_PRESETS_CATALOG } from '../../../shared/core/pdf-engine/layers/presets/coverPresetCatalog';
import { emitLidioMessage } from '../../../shared/core/assistant/lidioBus';
import type { EditorialCoverMode } from '../domain/editorialTypes';
import { radius } from '../../../shared/core/uiDesignSystem';

export interface EditorialCoverPanelProps {
  draft: any;
  updateDraft: (updater: (prev: any) => any) => void;
  setActiveStepTab: (tab: string) => void;
}

const COVER_MODE_TILES: Array<{ id: EditorialCoverMode; label: string; help: string }> = [
  {
    id: 'libro',
    label: 'Tapa de Libro',
    help: 'Carátula literaria con título protagonista, subtítulo, autor, editorial y año.',
  },
  {
    id: 'academica',
    label: 'Académica / TP',
    help: 'Incluye institución, materia/cátedra, docente, integrantes y matrícula.',
  },
  {
    id: 'ejecutiva',
    label: 'Ejecutiva limpia',
    help: 'Tapa formal orientada a proyectos, informes institucionales o guías.',
  },
  {
    id: 'sin-caratula',
    label: 'Sin carátula',
    help: 'Arranca directo en la página 1 sin tapa exterior, pero conservando los datos de la obra.',
  },
];

export const EditorialCoverPanel: React.FC<EditorialCoverPanelProps> = ({
  draft,
  updateDraft,
  setActiveStepTab,
}) => {
  const cover = draft?.cover || {};
  const design = draft?.design || {};
  const coverMode: EditorialCoverMode = cover.mode || 'libro';
  const coverStyleId: string = cover.coverStyleId || design.coverStyleId || 'monica-classic';

  const setCoverPatch = (patch: Record<string, any>) => {
    updateDraft((prev) => ({
      ...prev,
      cover: { ...(prev?.cover || {}), ...patch },
    }));
  };

  const updateMeta = (field: string, val: string) => {
    updateDraft((prev) => ({
      ...prev,
      metadata: { ...(prev?.metadata || {}), [field]: val },
    }));
  };

  const updateLegal = (field: string, val: string) => {
    updateDraft((prev) => ({
      ...prev,
      legalFields: { ...(prev?.legalFields || {}), [field]: val },
    }));
  };

  return (
    <div className="space-y-5">
      <PanelSection
        icon={<FileText className="w-4 h-4" />}
        title="Datos de la obra"
        helpText="Esta ficha identifica el título, subtítulo, autoría, institución y datos legales de la obra (para portada, encabezados y pie editorial). Siempre podés editarlos aunque elijas no mostrar carátula exterior."
      >
        <div className="space-y-3">
          <Field
            label="Título principal"
            value={draft?.metadata?.title || ''}
            onChange={(e: any) => updateMeta('title', e.target.value)}
            placeholder="Ej: Historia del Arte Contemporáneo"
          />
          <Field
            label="Subtítulo (opcional)"
            value={draft?.metadata?.subtitle || ''}
            onChange={(e: any) => updateMeta('subtitle', e.target.value)}
            placeholder="Ej: Trabajo de investigación final"
          />
          <Field
            label="Autor o Autores"
            value={draft?.metadata?.author || ''}
            onChange={(e: any) => updateMeta('author', e.target.value)}
            placeholder="Ej: Lucía Fernández"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Field
              label="Editorial o Sello"
              value={draft?.metadata?.editorial || ''}
              onChange={(e: any) => updateMeta('editorial', e.target.value)}
              placeholder="Ej: Ediciones del Sur"
            />
            <Field
              label="Año"
              value={draft?.metadata?.year || ''}
              onChange={(e: any) => updateMeta('year', e.target.value)}
              placeholder="2026"
            />
          </div>

          {(coverMode === 'academica' ||
            draft?.legalFields?.institucion ||
            draft?.legalFields?.catedra ||
            draft?.legalFields?.docente) && (
            <>
              <Field
                label="Escuela / Instituto / Universidad"
                value={draft?.legalFields?.institucion || ''}
                onChange={(e: any) => updateLegal('institucion', e.target.value)}
                placeholder="Ej: Universidad Nacional de Córdoba"
              />
              <Field
                label="Materia, Carrera o Cátedra"
                value={draft?.legalFields?.catedra || ''}
                onChange={(e: any) => updateLegal('catedra', e.target.value)}
                placeholder="Ej: Metodología de la Investigación"
              />
              <Field
                label="Docente / Tutor (opcional)"
                value={draft?.legalFields?.docente || ''}
                onChange={(e: any) => updateLegal('docente', e.target.value)}
                placeholder="Ej: Prof. Laura Morales"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Field
                  label="Integrantes (opcional)"
                  value={draft?.legalFields?.integrantes || ''}
                  onChange={(e: any) => updateLegal('integrantes', e.target.value)}
                  placeholder="Nombres..."
                />
                <Field
                  label="Legajo / Matrícula"
                  value={draft?.legalFields?.legajo || ''}
                  onChange={(e: any) => updateLegal('legajo', e.target.value)}
                  placeholder="Ej: 41298"
                />
              </div>
            </>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Field
              label="ISBN / Registro (opcional)"
              value={draft?.metadata?.isbn || ''}
              onChange={(e: any) => updateMeta('isbn', e.target.value)}
              placeholder="978-987-..."
            />
            <Field
              label="Nota de edición / Copyright"
              value={draft?.legalFields?.copyrightNotice || ''}
              onChange={(e: any) => updateLegal('copyrightNotice', e.target.value)}
              placeholder="Primera edición..."
            />
          </div>
        </div>
      </PanelSection>

      <PanelSection
        icon={<BookMarked className="w-4 h-4" />}
        title="Tipo de carátula"
        helpText="Elegí si querés portada exterior literaria, académica, ejecutiva o arrancar directo sin carátula."
      >
        <ActionGrid columns={2}>
          {COVER_MODE_TILES.map((mode) => (
            <ActionTileButton
              key={mode.id}
              label={mode.label}
              role="preset"
              active={coverMode === mode.id}
              variant={coverMode === mode.id ? 'accent' : 'default'}
              helpText={mode.help}
              helpGroupKey={`cover-mode-${mode.id}`}
              onClick={() => {
                setCoverPatch({ mode: mode.id });
                if (mode.id === 'sin-caratula') {
                  emitLidioMessage({
                    kind: 'state',
                    groupKey: 'cover-hidden',
                    title: 'Carátula oculta',
                    body: 'Tus datos de título y autor siguen guardados y podés seguir editándolos arriba.',
                  });
                }
              }}
            />
          ))}
        </ActionGrid>
      </PanelSection>

      {coverMode !== 'sin-caratula' && (
        <PanelSection
          icon={<Sparkles className="w-4 h-4" />}
          title="Diseño visual de portada"
          helpTitle="Portadas diseñadas"
          helpText="Elegí la composición gráfica de tu carátula. El color general se configura en Estilo y Tipografía."
        >
          <ActionGrid columns={2}>
            {COVER_PRESETS_CATALOG.map((stylePreset) => (
              <ActionTileButton
                key={stylePreset.id}
                label={stylePreset.name.split('&')[0].trim()}
                badge={stylePreset.badgeLabel}
                role="preset"
                active={coverStyleId === stylePreset.id}
                variant={coverStyleId === stylePreset.id ? 'accent' : 'default'}
                helpText={`${stylePreset.name}: ${stylePreset.description}`}
                helpGroupKey={`cover-style-${stylePreset.id}`}
                onClick={() => setCoverPatch({ coverStyleId: stylePreset.id })}
              />
            ))}
          </ActionGrid>
        </PanelSection>
      )}

      <button
        type="button"
        onClick={() => setActiveStepTab('editorial_estructura')}
        className="w-full py-2.5 px-4 bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] text-xs font-bold cursor-pointer"
        style={{ borderRadius: radius.control }}
      >
        Continuar a Estructura y Hoja →
      </button>
    </div>
  );
};
