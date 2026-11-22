import React, { useEffect } from 'react';
import {
  ALargeSmall,
  Check,
  Columns3,
  Layout,
  LayoutTemplate,
  Palette,
  RotateCcw,
  Type,
  X,
} from 'lucide-react';
import {
  getAllPresets,
  PRESET_COLORS,
  PRESET_TYPOGRAPHY,
  resolveActivePreset,
} from '../../../../../shared/core/pdf-engine/layers/presets/presetRegistry';
import { applyPresetLevel } from '../../../../../shared/core/pdf-engine/layers/presets/presetHierarchyEngine';
import { PAGE_SIZES } from '../../../../../shared/core/pdf-engine/layers/page/pageSizes';
import { resolveActiveFormat } from '../../../../../shared/core/formats/cvFormatRegistry';
import { getUiHint } from '../../../../../shared/core/uiTextGlossary';
import { UI_GLOSSARY } from '../../../../../shared/core/ui/uiTextGlossary';
import { PanelSection } from '../../../../../shared/core/ui/PanelSection';
import { LidioHelpTrigger } from '../../../../../shared/core/ui/LidioHelpTrigger';
import { loadGoogleFont } from '../../../../../shared/core/utils/fontLoader';
import { CONTRAST_FACTORS, SECTION_HEADING_FACTORS, SUMMARY_FACTORS } from '../../../../../shared/core/pdf-engine/layers/typography/densityEngine';
import { DomSectionIcon } from '../../../../../shared/core/pdf-engine/layers/icons/DomSectionIcon';
import { UI_ICON_IDS } from '../../../../../shared/core/ui/iconCatalog';
import { elevationSystem } from '../../../../../shared/core/uiDesignSystem';

interface TypographySliderProps {
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  value: number;
  display: string;
  isSet: boolean;
  onChange: (value: number) => void;
  onReset: () => void;
}

const TypographySlider: React.FC<TypographySliderProps> = ({
  label,
  hint,
  min,
  max,
  step,
  value,
  display,
  isSet,
  onChange,
  onReset,
}) => (
  <div>
    <div className="flex items-center justify-between gap-2 mb-1.5">
      <div className="flex items-center gap-1.5 min-w-0">
        <label className="block text-xs font-bold text-[var(--color-neutral-text-primary)] truncate">
          {label}
        </label>
        <LidioHelpTrigger size="xs" title={label} text={hint} groupKey={`slider-${label}`} />
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-black bg-[var(--ui-bg-panel)] border border-[var(--color-neutral-border)] text-[var(--color-neutral-text-primary)] whitespace-nowrap">
          {display}
        </span>
        {isSet && (
          <button
            type="button"
            title="Volver al valor por defecto"
            onClick={onReset}
            className="p-1 rounded hover:bg-[var(--ui-bg-panel)] text-[var(--color-neutral-text-secondary)] hover:text-[var(--color-accent-text)] transition cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1 bg-[var(--ui-bg-panel)] rounded-[10px] appearance-none cursor-pointer accent-[var(--color-secondary-base)]"
    />
  </div>
);

export const DisenoSection = ({
  cvData,
  setCvData,
  activeTab,
  onOpenRegionFormat,
  updateTheme,
  fontOptions,
  showSuccess,
  triggerPresetTransition,
}: any) => {
  const hasDesignOverrides = Boolean(
    cvData?.colorPresetId || cvData?.typographyPresetId || cvData?.columnLayoutPresetId,
  );
  const activeFormat = resolveActiveFormat(cvData);

  useEffect(() => {
    if (cvData?.theme?.fontFamily) {
      loadGoogleFont(cvData.theme.fontFamily);
    }
  }, [cvData?.theme?.fontFamily]);

  const handlePaperSizeChange = (val: string) => {
    setCvData((prev: any) => ({
      ...prev,
      documentSettings: {
        ...(prev?.documentSettings || {}),
        paperSizeId: val,
      },
      layout: {
        ...(prev?.layout || {}),
        pageSizeId: val,
        paperSize: val,
      },
    }));
  };

  return (
    <div className="space-y-6">
      {/* PESTAÑA 1: ESTILO & COLOR (`diseno`) */}
      {activeTab === 'diseno' && (
        <>
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-[12px] bg-[var(--ui-bg-card)] border border-[var(--color-neutral-border)]">
            <div className="flex items-center gap-2 min-w-0">
              <Palette className="w-4 h-4 text-[var(--color-accent-text)] shrink-0" />
              <span className="text-xs font-extrabold text-[var(--color-neutral-text-primary)] truncate">
                Estilo visual ({activeFormat.shortBadge})
              </span>
              <LidioHelpTrigger
                size="xs"
                title="Jerarquía de diseño"
                text={getUiHint('cascadaDiseno')}
                groupKey="cascada-diseno"
              />
            </div>
            {hasDesignOverrides && (
              <button
                type="button"
                onClick={() => {
                  setCvData((prev: any) => ({
                    ...prev,
                    colorPresetId: undefined,
                    typographyPresetId: undefined,
                    columnLayoutPresetId: undefined,
                  }));
                  showSuccess('Ajustes personalizados reseteados a la plantilla base.');
                }}
                className="px-2 py-0.5 rounded-[8px] bg-[var(--color-status-danger-muted)] text-[var(--color-status-danger-text)] font-black text-[10px] flex items-center gap-1 hover:opacity-80 transition cursor-pointer shrink-0"
                title="Resetear ajustes personalizados"
              >
                <span>{UI_GLOSSARY.labels.customized}</span>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <PanelSection
            icon={<LayoutTemplate className="w-4 h-4" />}
            title="Plantilla base predefinida"
            helpText="Elegí el estilo general de tu CV. Cambiar de plantilla conserva tus secciones encendidas y tu estándar regional activo."
          >
            <div className="grid grid-cols-2 gap-2">
              {getAllPresets()
                .filter((p) => p.id !== 'tarjeta-personal')
                .map((preset) => {
                  const isSelected = (cvData?.activePresetId || 'cv-clasico') === preset.id;
                  const isSingleColumnLocked = activeFormat?.columnLayoutPresetId === 'full-width';
                  const hasOverrides = Boolean(
                    cvData?.colorPresetId || cvData?.typographyPresetId || cvData?.columnLayoutPresetId,
                  );

                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        triggerPresetTransition(preset.name, 'preset');
                        setCvData((prev: any) => applyPresetLevel(prev, 'preset', { presetId: preset.id }));
                      }}
                      className={`p-2.5 rounded-[12px] border text-left transition flex flex-col justify-between cursor-pointer ${
                        isSelected
                          ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-muted)] ring-2 ring-[var(--color-accent-base)]/25'
                          : 'border-[var(--color-neutral-border)] bg-[var(--ui-bg-card)] hover:border-[var(--color-accent-base)]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5 gap-1">
                        <div className="flex items-center gap-1 min-w-0 pr-1">
                          <span className="text-[11px] font-bold text-[var(--color-neutral-text-primary)] truncate">
                            {preset.name}
                          </span>
                          {isSelected && hasOverrides && (
                            <span className="text-[9px] px-1 rounded bg-[var(--color-accent-muted)] text-[var(--color-accent-text)] font-black shrink-0">
                              +
                            </span>
                          )}
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[var(--color-accent-text)] shrink-0" />}
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex gap-1.5 items-center">
                          <div className={`w-4 h-4 rounded-full border border-[var(--ui-border)] ${elevationSystem.raised}`} style={{ backgroundColor: preset.palette.primary }} />
                          <div className={`w-4 h-4 rounded-full border border-[var(--ui-border)] ${elevationSystem.raised}`} style={{ backgroundColor: (preset.palette as any).accent }} />
                          <div className={`w-4 h-4 rounded-full border border-[var(--ui-border)] ${elevationSystem.raised}`} style={{ backgroundColor: (preset.palette as any).secondary }} />
                        </div>
                        {isSingleColumnLocked && preset.columnLayoutPresetId !== 'full-width' && (
                          <span className="text-[9px] font-bold text-[var(--color-neutral-text-secondary)]">
                            1 Col
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
            </div>
          </PanelSection>

          <PanelSection
            icon={<Palette className="w-4 h-4" />}
            title="Paleta de color armónica"
            helpText="Combinación armónica de color para encabezados, detalles e íconos, cuidando contraste al imprimir."
          >
            <div className="grid grid-cols-3 gap-1.5">
              {Object.entries(PRESET_COLORS).map(([key, colorPreset]) => {
                const activePresetObj = resolveActivePreset(cvData);
                const activeColorKey = cvData?.colorPresetId || activePresetObj.colorPresetId || 'clasico';
                const isSelected = activeColorKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      triggerPresetTransition(colorPreset.name, 'color');
                      setCvData((prev: any) => applyPresetLevel(prev, 'override', { colorPresetId: key }));
                    }}
                    className={`p-2 rounded-[12px] border text-left transition flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-muted)] ring-2 ring-[var(--color-accent-base)]/25'
                        : 'border-[var(--color-neutral-border)] bg-[var(--ui-bg-card)] hover:border-[var(--color-accent-base)]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-[var(--color-neutral-text-primary)] truncate pr-0.5" title={colorPreset.name}>
                        {colorPreset.name}
                      </span>
                      {isSelected && <Check className="w-3 h-3 text-[var(--color-accent-text)] shrink-0" />}
                    </div>
                    <div className="flex gap-1 items-center">
                      <div className={`w-3.5 h-3.5 rounded-full border border-[var(--ui-border)] ${elevationSystem.raised}`} style={{ backgroundColor: colorPreset.palette.primary }} />
                      <div className={`w-3.5 h-3.5 rounded-full border border-[var(--ui-border)] ${elevationSystem.raised}`} style={{ backgroundColor: (colorPreset as any).palette.accent }} />
                      <div className={`w-3.5 h-3.5 rounded-full border border-[var(--ui-border)] ${elevationSystem.raised}`} style={{ backgroundColor: (colorPreset as any).palette.secondary }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </PanelSection>
        </>
      )}

      {/* PESTAÑA 2: LETRA & ESPACIO (`diseno_tipografia`) */}
      {activeTab === 'diseno_tipografia' && (
        <>
          <PanelSection
            icon={<Type className="w-4 h-4" />}
            title="Fuente Principal del Documento"
            helpText="Elegí la familia de letra de todo tu CV (Google Fonts) optimizada para lectura en pantalla y PDF."
          >
            <div className="p-3 bg-[var(--ui-bg-card)] rounded-[12px] border border-[var(--color-neutral-border)]">
              <select
                value={cvData?.theme?.fontFamily || "'Outfit', sans-serif"}
                onChange={(e) => updateTheme('fontFamily', e.target.value)}
                aria-label="Fuente Principal del Documento (Google Fonts)"
                className="w-full text-xs p-2.5 rounded-[10px] border border-[var(--color-neutral-border)] bg-[var(--ui-bg-card)] text-[var(--color-neutral-text-primary)] font-bold outline-none cursor-pointer"
              >
                {fontOptions.map((f: any) => (
                  <option key={f.id} value={f.value}>{f.name}</option>
                ))}
              </select>
            </div>
          </PanelSection>

          <PanelSection
            icon={<ALargeSmall className="w-4 h-4" />}
            title="Escala tipográfica armónica"
            helpText="Proporción automática entre tu nombre, los títulos de sección y el cuerpo de texto."
          >
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(PRESET_TYPOGRAPHY).map(([key, typoPreset]) => {
                const activePresetObj = resolveActivePreset(cvData);
                const activeTypoKey = cvData?.typographyPresetId || activePresetObj.typographyPresetId || 'clasica';
                const isSelected = activeTypoKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      triggerPresetTransition((typoPreset as any).name, 'typography');
                      setCvData((prev: any) => applyPresetLevel(prev, 'override', { typographyPresetId: key }));
                    }}
                    className={`p-2.5 rounded-[12px] border text-left transition flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-muted)] ring-2 ring-[var(--color-accent-base)]/25'
                        : 'border-[var(--color-neutral-border)] bg-[var(--ui-bg-card)] hover:border-[var(--color-accent-base)]'
                    }`}
                  >
                    <span className="text-[11px] font-bold text-[var(--color-neutral-text-primary)]">
                      {(typoPreset as any).name}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[var(--color-accent-text)] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </PanelSection>

          <PanelSection
            icon={<Layout className="w-4 h-4" />}
            title="Ajustar tamaños y espacio"
            helpText="Tiradores de precisión para adaptar el CV a 1 o 2 hojas exactas sin borrar información."
          >
            <div className="p-3 bg-[var(--ui-bg-card)] rounded-[12px] border border-[var(--color-neutral-border)] space-y-4">
              {(() => {
                const ov: any = cvData?.typographyOverrides || {};
                const DENSITY_ENUM_TABLE: Record<string, number> = { compact: 0.5, normal: 1.0, relaxed: 1.35 };
                const toNum = (v: any, table: Record<string, number>, fallback: number): number => {
                  if (typeof v === 'number' && Number.isFinite(v)) return v;
                  if (typeof v === 'string' && table && table[v] !== undefined) return table[v];
                  return fallback;
                };
                const setOverride = (key: string, value: number) =>
                  setCvData((prev: any) => ({
                    ...prev,
                    typographyOverrides: { ...(prev?.typographyOverrides || {}), [key]: value },
                  }));
                const clearOverride = (key: string) =>
                  setCvData((prev: any) => {
                    const next = { ...(prev?.typographyOverrides || {}) };
                    delete next[key];
                    return { ...prev, typographyOverrides: next };
                  });
                const bodyPt = toNum(ov.bodyPt, {}, 9.5);
                const contrast = toNum(ov.contrastScheme, CONTRAST_FACTORS, 1.2);
                const sectionScale = toNum(ov.sectionHeadingScale, SECTION_HEADING_FACTORS, 1.0);
                const summaryScale = toNum(ov.summaryScale, SUMMARY_FACTORS, 1.0);
                const densityFactor = toNum(ov.densityMode, DENSITY_ENUM_TABLE, 1.0);
                const hasAnyOverride =
                  ov.bodyPt !== undefined ||
                  ov.contrastScheme !== undefined ||
                  ov.sectionHeadingScale !== undefined ||
                  ov.summaryScale !== undefined ||
                  ov.densityMode !== undefined;
                return (
                  <>
                    <TypographySlider
                      label="Tamaño de lectura"
                      hint="Chico: más contenido por hoja. Equilibrado: estándar. Grande: lectura amplia."
                      min={8}
                      max={11.5}
                      step={0.5}
                      value={bodyPt}
                      display={`${bodyPt.toFixed(1)} pt`}
                      isSet={ov.bodyPt !== undefined}
                      onChange={(v) => setOverride('bodyPt', v)}
                      onReset={() => clearOverride('bodyPt')}
                    />
                    <TypographySlider
                      label="Diferencia títulos / texto"
                      hint="Suave: jerarquía discreta. Equilibrada: contraste clásico. Marcada: títulos protagonistas."
                      min={1.08}
                      max={1.32}
                      step={0.02}
                      value={contrast}
                      display={`${contrast.toFixed(2)}x`}
                      isSet={ov.contrastScheme !== undefined}
                      onChange={(v) => setOverride('contrastScheme', v)}
                      onReset={() => clearOverride('contrastScheme')}
                    />
                    <TypographySlider
                      label="Tamaño títulos de sección"
                      hint="Chico: discreto. Normal: clásico. Destacado: barra de sección más visible."
                      min={0.75}
                      max={1.2}
                      step={0.05}
                      value={sectionScale}
                      display={`${sectionScale.toFixed(2)}x`}
                      isSet={ov.sectionHeadingScale !== undefined}
                      onChange={(v) => setOverride('sectionHeadingScale', v)}
                      onReset={() => clearOverride('sectionHeadingScale')}
                    />
                    <TypographySlider
                      label="Tamaño del Extracto"
                      hint="Compacto: ocupa menos altura. Destacado: da protagonismo a tu perfil."
                      min={0.8}
                      max={1.2}
                      step={0.05}
                      value={summaryScale}
                      display={`${summaryScale.toFixed(2)}x`}
                      isSet={ov.summaryScale !== undefined}
                      onChange={(v) => setOverride('summaryScale', v)}
                      onReset={() => clearOverride('summaryScale')}
                    />
                    <TypographySlider
                      label="Espacio entre bloques"
                      hint="Compacto: aprovecha cada centímetro. Amplio: más aire blanco."
                      min={0.5}
                      max={1.35}
                      step={0.05}
                      value={densityFactor}
                      display={`${densityFactor.toFixed(2)}x`}
                      isSet={ov.densityMode !== undefined}
                      onChange={(v) => setOverride('densityMode', v)}
                      onReset={() => clearOverride('densityMode')}
                    />
                    {hasAnyOverride && (
                      <button
                        type="button"
                        onClick={() =>
                          setCvData((prev: any) => {
                            const { typographyOverrides, ...rest } = prev || {};
                            return rest;
                          })
                        }
                        className="w-full text-[11px] font-semibold text-[var(--color-neutral-text-secondary)] hover:text-[var(--color-accent-text)] transition underline underline-offset-2 cursor-pointer"
                      >
                        Volver al ajuste de la plantilla
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          </PanelSection>
        </>
      )}

      {/* PESTAÑA 3: HOJA & COLUMNAS (`diseno_hoja`) */}
      {activeTab === 'diseno_hoja' && (
        <>
          <PanelSection
            icon={<Layout className="w-4 h-4" />}
            title="¿En qué hoja lo vas a imprimir?"
            helpText="Elegí el papel real de tu impresora o imprenta para ajustar márgenes y saltos de página."
          >
            <div className="p-3 bg-[var(--ui-bg-card)] rounded-[12px] border border-[var(--color-neutral-border)]">
              <select
                value={cvData.layout?.pageSizeId || cvData.layout?.paperSize || cvData.cardSize || 'a4'}
                onChange={(e) => handlePaperSizeChange(e.target.value)}
                aria-label="¿En qué hoja lo vas a imprimir?"
                className="w-full text-xs p-2.5 rounded-[10px] border border-[var(--color-secondary-base)] bg-[var(--ui-bg-card)] text-[var(--color-neutral-text-primary)] font-bold outline-none cursor-pointer"
              >
                {Object.values(PAGE_SIZES)
                  .filter((size: any) => size.category === 'documento' && ['a4', 'carta', 'legal', 'oficio'].includes(size.id))
                  .map((size) => (
                    <option key={size.id} value={size.id}>
                      📄 {size.appLabel || size.label}
                    </option>
                  ))}
              </select>
            </div>
          </PanelSection>

          <PanelSection
            icon={<Columns3 className="w-4 h-4" />}
            title="Disposición de columnas y Ancho"
            helpText="Elegí barra izquierda/derecha o 1 columna completa. Si tenés un estándar estricto de 1 columna (ej. EE.UU.), podés cambiar de región arriba."
          >
            {(() => {
              const activePresetObj = resolveActivePreset(cvData);
              const activeLayoutKey =
                cvData?.columnLayoutPresetId ||
                activePresetObj.columnLayoutPresetId?.replace('layout-', '') ||
                'sidebar-left';
              const sidebarPercent = Math.min(42, Math.max(32, cvData?.layout?.sidebarWidthPercent ?? 40));
              const isSingleColumnFormat = activeFormat?.columnLayoutPresetId === 'full-width';

              return (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    {['sidebar-left', 'sidebar-right'].map((key) => {
                      const isSelected = activeLayoutKey === key;
                      const label = key === 'sidebar-left' ? 'Barra Izquierda (40%)' : 'Barra Derecha (40%)';

                      return (
                        <button
                          key={key}
                          type="button"
                          disabled={isSingleColumnFormat}
                          onClick={() => {
                            triggerPresetTransition(label, 'layout');
                            setCvData((prev: any) => applyPresetLevel(prev, 'override', { columnLayoutPresetId: key }));
                          }}
                          className={`p-2.5 rounded-[12px] border text-left transition flex items-center justify-between gap-1.5 ${
                            isSingleColumnFormat
                              ? 'opacity-40 cursor-not-allowed bg-[var(--ui-bg-panel)] border-[var(--color-neutral-border)]'
                              : isSelected
                                ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-muted)] ring-2 ring-[var(--color-accent-base)]/25 cursor-pointer'
                                : 'border-[var(--color-neutral-border)] bg-[var(--ui-bg-card)] hover:border-[var(--color-accent-base)] cursor-pointer'
                          }`}
                        >
                          <span className="text-[11px] font-black text-[var(--color-neutral-text-primary)] truncate">
                            {label}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[var(--color-accent-text)] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-2 gap-2 items-center">
                    {(() => {
                      const key = 'full-width';
                      const isSelected = activeLayoutKey === key;
                      const label = 'Columna Única (100%)';
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            triggerPresetTransition(label, 'layout');
                            setCvData((prev: any) => applyPresetLevel(prev, 'override', { columnLayoutPresetId: key }));
                          }}
                          className={`p-2.5 rounded-[12px] border text-left transition flex items-center justify-between gap-1.5 h-full cursor-pointer ${
                            isSelected
                              ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-muted)] ring-2 ring-[var(--color-accent-base)]/25'
                              : 'border-[var(--color-neutral-border)] bg-[var(--ui-bg-card)] hover:border-[var(--color-accent-base)]'
                          }`}
                        >
                          <span className="text-[11px] font-black text-[var(--color-neutral-text-primary)] truncate">
                            {label}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[var(--color-accent-text)] shrink-0" />}
                        </button>
                      );
                    })()}

                    {activeLayoutKey !== 'full-width' ? (
                      <div className="p-2 bg-[var(--ui-bg-card)] border border-[var(--color-neutral-border)] rounded-[12px] space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-bold text-[var(--color-neutral-text-primary)]">
                          <span>Ancho Barra</span>
                          <span className="text-[var(--color-secondary-text)] font-black">{sidebarPercent}%</span>
                        </div>
                        <input
                          type="range"
                          min={32}
                          max={42}
                          step={1}
                          value={sidebarPercent}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setCvData((prev: any) => ({
                              ...prev,
                              layout: {
                                ...(prev.layout || {}),
                                sidebarWidthPercent: val,
                              },
                            }));
                          }}
                          className="w-full h-1 bg-[var(--ui-bg-panel)] rounded-[10px] appearance-none cursor-pointer accent-[var(--color-secondary-base)]"
                        />
                      </div>
                    ) : (
                      <div className="p-2 bg-[var(--ui-bg-panel)] border border-[var(--color-neutral-border)] rounded-[12px] text-center text-[10px] font-medium text-[var(--color-neutral-text-secondary)]">
                        Ancho fijo 100%
                      </div>
                    )}
                  </div>

                  {isSingleColumnFormat && typeof onOpenRegionFormat === 'function' && (
                    <button
                      type="button"
                      onClick={onOpenRegionFormat}
                      className="w-full p-2.5 rounded-[12px] border border-[var(--color-accent-base)]/40 bg-[var(--color-accent-muted)] text-[var(--color-accent-text)] text-xs font-bold flex items-center justify-center gap-2 hover:bg-[var(--color-accent-base)] hover:text-[var(--color-accent-on-base)] transition cursor-pointer"
                    >
                      <DomSectionIcon iconId={UI_ICON_IDS.region} size={14} />
                      <span>Estándar {activeFormat.shortBadge} en 1 columna — Cambiar región</span>
                    </button>
                  )}
                </div>
              );
            })()}
          </PanelSection>
        </>
      )}
    </div>
  );
};
