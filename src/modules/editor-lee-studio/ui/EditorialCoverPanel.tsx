import React from 'react';
import { BookMarked, Palette, Sparkles } from 'lucide-react';
import { PanelSection } from '../../../shared/core/ui/PanelSection';
import { ActionGrid } from '../../../shared/core/ui/ActionGrid';
import { ActionTileButton } from '../../../shared/core/ui/ActionTileButton';
import { ContextualGuideBox } from '../../../shared/core/ui/ContextualGuideBox';
import { Field } from '../../../shared/core/ui/Field';
import { LidioHelpTrigger } from '../../../shared/core/ui/LidioHelpTrigger';
import { COVER_PRESETS_CATALOG } from '../../../shared/core/pdf-engine/layers/presets/coverPresetCatalog';
import { PRESET_COLORS } from '../../../shared/core/pdf-engine/layers/presets/presetRegistry';
import { emitLidioMessage } from '../../../shared/core/assistant/lidioBus';
import type { EditorialCoverMode } from '../domain/editorialTypes';

export interface EditorialCoverPanelProps {
  draft: any;
  updateDraft: (updater: (prev: any) => any) => void;
  setActiveStepTab: (tab: string) => void;
}

const CURATED_COVER_PALETTE_KEYS = [
  'sobrio',
  'marino',
  'clasico',
  'elegante',
  'borgona',
  'amatista',
  'navy-consul',
  'verde-oliva',
  'marron-tabaco',
  'gris-granito',
];

const COVER_MODE_TILES: Array<{ id: EditorialCoverMode; label: string; help: string }> = [
  {
    id: 'libro',
    label: 'Tapa de Libro',
    help: 'Carátula literaria con título protagonista, subtítulo, autor, editorial y año.',
  },
  {
    id: 'academica',
    label: 'Académica / TP',
    help: 'Incluye institución, materia/cátedra, docente, integrantes y matrícula para escuela, terciario o facultad.',
  },
  {
    id: 'ejecutiva',
    label: 'Ejecutiva limpia',
    help: 'Tapa formal orientada a proyectos, informes institucionales o guías.',
  },
  {
    id: 'sin-caratula',
    label: 'Sin carátula',
    help: 'Arranca directo con el índice o primer capítulo en la página 1.',
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
  const coverPaletteKey: string = cover.coverPaletteKey || design.coverPaletteKey || 'sobrio';

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
        icon={<BookMarked className="w-4 h-4" />}
        title="Tipo de carátula"
        helpText="Define qué datos se muestran en la primera página: literaria, escolar/universitaria, ejecutiva o sin portada."
      >
        <ActionGrid columns={2}>
          {COVER_MODE_TILES.map((mode) => (
            <ActionTileButton
              key={mode.id}
              label={mode.label}
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
                    body: 'Tus datos de título y autor no se borran: si luego elegís otra carátula vuelven a mostrarse.',
                  });
                }
              }}
            />
          ))}
        </ActionGrid>
      </PanelSection>

      {coverMode !== 'sin-caratula' && (
        <>
          <PanelSection
            icon={<Sparkles className="w-4 h-4" />}
            title="Diseño visual de portada"
            helpTitle="Portadas diseñadas"
            helpText="Elegí la composición gráfica de tu carátula entre 6 estilos editoriales equilibrados."
          >
            <ActionGrid columns={2}>
              {COVER_PRESETS_CATALOG.map((stylePreset) => (
                <ActionTileButton
                  key={stylePreset.id}
                  label={stylePreset.name.split('&')[0].trim()}
                  badge={stylePreset.badgeLabel}
                  active={coverStyleId === stylePreset.id}
                  variant={coverStyleId === stylePreset.id ? 'accent' : 'default'}
                  helpText={`${stylePreset.name}: ${stylePreset.description}`}
                  helpGroupKey={`cover-style-${stylePreset.id}`}
                  onClick={() => setCoverPatch({ coverStyleId: stylePreset.id })}
                />
              ))}
            </ActionGrid>
          </PanelSection>

          <PanelSection
            icon={<Palette className="w-4 h-4" />}
            title="Paleta de color"
            helpText="Combiná el diseño elegido con una paleta armónica de alto contraste lista para imprimir."
          >
            <div className="flex flex-wrap gap-2">
              {CURATED_COVER_PALETTE_KEYS.map((key) => {
                const entry = PRESET_COLORS[key];
                if (!entry) return null;
                const isSelected = coverPaletteKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCoverPatch({ coverPaletteKey: key })}
                    title={entry.name}
                    aria-label={entry.name}
                    aria-pressed={isSelected}
                    className={`w-7 h-7 rounded-full border-2 transition cursor-pointer flex items-center justify-center ${
                      isSelected
                        ? 'scale-110 ring-2 ring-[var(--color-accent-base)] ring-offset-1 border-white'
                        : 'border-[var(--ui-border)] hover:scale-105'
                    }`}
                    style={{ backgroundColor: entry.seedHex }}
                  />
                );
              })}
            </div>
          </PanelSection>

          <PanelSection
            icon={<BookMarked className="w-4 h-4" />}
            title="Datos de la portada"
            helpText="Completá título, autoría y datos académicos según el tipo de carátula activo."
          >
            <ContextualGuideBox title="Qué conviene completar">
              Escribí un título claro y verificá el nombre del autor o integrantes para que quede prolijo tanto en la portada como en el pie de página.
            </ContextualGuideBox>

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

              {coverMode === 'libro' && (
                <Field
                  label="Editorial o Sello"
                  value={draft?.metadata?.editorial || ''}
                  onChange={(e: any) => updateMeta('editorial', e.target.value)}
                  placeholder="Ej: Ediciones del Sur"
                />
              )}

              {coverMode === 'academica' && (
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
            </div>
          </PanelSection>
        </>
      )}

      <div className="flex items-center justify-between gap-2 pt-2">
        <LidioHelpTrigger
          title="Vista de portada"
          text="Podés ver cómo queda la tapa en tiempo real en la hoja de la derecha antes de pasar a redactar tus capítulos."
        />
        <button
          type="button"
          onClick={() => setActiveStepTab('editorial_secciones')}
          className="flex-1 py-2.5 px-4 bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] rounded-lg text-xs font-bold cursor-pointer"
        >
          Continuar a Secciones →
        </button>
      </div>
    </div>
  );
};
