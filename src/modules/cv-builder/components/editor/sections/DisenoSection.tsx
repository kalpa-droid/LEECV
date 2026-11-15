import { AlertTriangle, Check, ChevronRight, Cloud, Download, Grid, Grid3X3, GripHorizontal, GripVertical, Image as ImageIcon, Info, Layers, Layout, LayoutTemplate, Monitor, Palette, Plus, RotateCcw, Trash2, Type, User, X, ALargeSmall } from 'lucide-react';
import { getAllPresets, PRESET_COLORS, PRESET_TYPOGRAPHY, resolveActivePreset } from '../../../../../shared/core/pdf-engine/layers/presets/presetRegistry';
import { applyPresetLevel } from '../../../../../shared/core/pdf-engine/layers/presets/presetHierarchyEngine';
import { PAGE_SIZES } from '../../../../../shared/core/pdf-engine/layers/page/pageSizes';
import { getUiHint } from '../../../../../shared/core/uiTextGlossary';
import { UI_GLOSSARY } from '../../../../../shared/core/ui/uiTextGlossary';
import { Globe, Columns3 } from 'lucide-react';
import React from 'react';
import { PanelSection } from '../../../../../shared/core/ui/PanelSection';
import { loadGoogleFont } from '../../../../../shared/core/utils/fontLoader';
import { useEffect } from 'react';

import { SectionManualAdjustment } from '../SectionManualAdjustment';
import { GuardadosSection } from './GuardadosSection';

import { 
  radius,
  elevationSystem,
  typeScale as typography,
  shadow as effects,
  button
} from '../../../../../shared/core/uiDesignSystem';
import { 
  COVER_PRESETS,
  } from '../../../../../shared/core/pdf-engine/layers/presets/coverPresetCatalog';
import { getCvFormat, getAllCvFormats, getFormatDefaultVisibility, resolveActiveFormatId, resolveActiveFormat } from '../../../../../shared/core/formats/cvFormatRegistry';
import { CONTRAST_FACTORS, SECTION_HEADING_FACTORS, SUMMARY_FACTORS } from '../../../../../shared/core/pdf-engine/layers/typography/densityEngine';

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

/** Tirador continuo para un ajuste de tipografía/espacio (mismo estilo visual que "Ancho Sidebar"). */
const TypographySlider: React.FC<TypographySliderProps> = ({ label, hint, min, max, step, value, display, isSet, onChange, onReset }) => (
  <div>
    <div className="flex items-start justify-between gap-2 mb-1.5">
      <div className="min-w-0">
        <label className="block text-xs font-bold text-[var(--color-neutral-text-primary)]">{label}</label>
        <p className="text-[10px] text-[var(--color-neutral-text-secondary)] leading-snug">{hint}</p>
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
            className="p-1 rounded hover:bg-[var(--ui-bg-panel)] text-[var(--color-neutral-text-secondary)] hover:text-[var(--color-accent-base)] transition cursor-pointer"
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
  changeActiveTab,
  setPendingFormatId,
  setIsFormatModalOpen,
  updateTheme,
  fontOptions,
  docType,
  showSuccess,
  showWarning,
  triggerPresetTransition,
  getEffectiveCoverFeaturedItems,
  registerSection
}: any) => {
  const isBusinessCard = docType === 'business_card';
  const hasDesignOverrides = Boolean(cvData?.colorPresetId || cvData?.typographyPresetId || cvData?.columnLayoutPresetId);
  
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
        paperSizeId: val
      },
      layout: {
        ...(prev?.layout || {}),
        pageSizeId: val,
        paperSize: val
      },
      cardSize: docType === 'business_card' ? val : prev?.cardSize
    }));
  };
  return (
    <>
      {activeTab === 'diseno' && (
          <div className="space-y-6">
            {/* Encabezado explicativo de Cascada de 3 Niveles */}
            <div className="p-3 bg-[var(--ui-bg-card)] border border-[var(--color-neutral-border)] rounded-[var(--radius-card)] text-xs text-[var(--color-neutral-text-secondary)] font-medium flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-[var(--color-accent-amber-bright)] flex-shrink-0" />
                <span className="font-bold text-[var(--color-neutral-text-primary)]">
                  {getUiHint('cascadaDiseno')}
                </span>
              </div>
              {hasDesignOverrides && (
                  <button
                    type="button"
                    onClick={() => {
                      setCvData((prev: any) => ({
                        ...prev,
                        colorPresetId: undefined,
                        typographyPresetId: undefined,
                        columnLayoutPresetId: undefined
                      }));
                      showSuccess('Ajustes personalizados reseteados a la plantilla base.');
                    }}
                    className="px-2 py-0.5 rounded bg-[var(--color-status-danger-muted)] text-[var(--color-status-danger-text)] font-black text-[10px] flex items-center gap-1 hover:opacity-80 transition cursor-pointer"
                    title="Resetear ajustes personalizados"
                  >
                    <span>{UI_GLOSSARY.labels.customized}</span>
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Formato de Papel */}
              <PanelSection icon={<Layout className="w-4 h-4" />} title="¿En qué hoja lo vas a imprimir?">
                <div className={`p-3 bg-[var(--ui-bg-card)] rounded-[${radius.card}] border border-[var(--color-neutral-border)]`}>
                  <label className="block text-xs font-bold text-[var(--color-neutral-text-primary)] mb-1.5">
                    ¿En qué hoja lo vas a imprimir?
                  </label>
                  <select
                    value={cvData.layout?.pageSizeId || cvData.layout?.paperSize || cvData.cardSize || 'a4'}
                    onChange={(e) => handlePaperSizeChange(e.target.value)}
                    className={`w-full text-xs p-2.5 rounded-[${radius.card}] border border-[var(--color-secondary-base)] bg-[var(--ui-bg-card)] text-[var(--color-neutral-text-primary)] font-bold outline-none cursor-pointer`}
                  >
                    {Object.values(PAGE_SIZES).filter((size: any) => {
                      const isCard = docType === 'business_card';
                      if (isCard) {
                        return size.category === 'tarjeta' && ['tarjeta_estandar', 'tarjeta_europea', 'tarjeta_cuadrada', 'tarjeta_mini'].includes(size.id);
                      }
                      return size.category === 'documento' && ['a4', 'carta', 'legal', 'oficio'].includes(size.id);
                    }).map((size) => (
                      <option key={size.id} value={size.id}>
                        📄 {size.appLabel || size.label}
                      </option>
                    ))}
                  </select>
                </div>
              </PanelSection>

            {/* Formato Global & Estándares Internacionales (ATS, US Resume, Europass, Tech, LATAM) */}
            {!isBusinessCard && (
              <PanelSection icon={<Globe className="w-4 h-4 text-[var(--color-accent-text)]" />} title="¿Para quién es este CV? (Formato y Destino)">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {getAllCvFormats().map((format) => {
                    const isSelected = resolveActiveFormatId(cvData) === format.id;
                    const isBusinessCard = docType === 'business_card';
  return (
                      <button
                        key={format.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) return;
                          setPendingFormatId(format.id);
                          setIsFormatModalOpen(true);
                        }}
                        className={`w-full p-2.5 rounded-[${radius.card}] border text-left transition flex flex-col justify-between gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-rose-muted)]/30 ring-2 ring-[var(--color-accent-base)]/30'
                            : 'border-[var(--color-neutral-border)] bg-[var(--ui-bg-card)] hover:border-[var(--color-accent-base)]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-black text-[var(--color-neutral-text-primary)] flex items-center gap-1.5 truncate">
                            {format.name}
                          </span>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase bg-white border border-[var(--color-neutral-border-strong)] text-[var(--color-neutral-text-secondary)]">
                              {format.columnLayoutPresetId === 'full-width' ? '1 Col' : '2 Col'}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-[var(--ui-text-primary)] flex-shrink-0" />}
                          </div>
                        </div>
                        <p className="text-[10px] text-[var(--color-neutral-text-secondary)] leading-relaxed line-clamp-2">
                          {format.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </PanelSection>
            )}

            {/* Tipografía Principal */}
            <PanelSection icon={<Type className="w-4 h-4" />} title="Tipografía">
              <div className={`p-3 bg-[var(--ui-bg-card)] rounded-[${radius.card}] border border-[var(--color-neutral-border)]`}>
                <label className="block text-xs font-bold text-[var(--color-neutral-text-primary)] mb-1.5">
                  Fuente Principal del Documento (Google Fonts)
                </label>
                <select
                  value={cvData?.theme?.fontFamily || "'Outfit', sans-serif"}
                  onChange={(e) => updateTheme('fontFamily', e.target.value)}
                  className={`w-full text-xs p-2.5 rounded-[${radius.card}] border border-[var(--color-neutral-border)] bg-[var(--ui-bg-card)] text-[var(--color-neutral-text-primary)] font-bold outline-none cursor-pointer`}
                >
                  {fontOptions.map((f) => (
                    <option key={f.id} value={f.value}>{f.name}</option>
                  ))}
                </select>
              </div>
            </PanelSection>

            {/* Ajustar tamaños y espacio en la hoja */}
            <PanelSection icon={<Layout className="w-4 h-4" />} title="Ajustar tamaños y espacio en la hoja">
              <div className="p-3 bg-[var(--ui-bg-card)] rounded-[var(--radius-card)] border border-[var(--color-neutral-border)] space-y-4">
                {(() => {
                  const ov: any = cvData?.typographyOverrides || {};
                  const DENSITY_ENUM_TABLE: Record<string, number> = { compact: 0.5, normal: 1.0, relaxed: 1.35 };
                  const toNum = (v: any, table: Record<string, number>, fallback: number): number => {
                    if (typeof v === 'number' && Number.isFinite(v)) return v;
                    if (typeof v === 'string' && table && table[v] !== undefined) return table[v];
                    return fallback;
                  };
                  const setOverride = (key: string, value: number) => setCvData((prev: any) => ({
                    ...prev,
                    typographyOverrides: { ...(prev?.typographyOverrides || {}), [key]: value }
                  }));
                  const clearOverride = (key: string) => setCvData((prev: any) => {
                    const next = { ...(prev?.typographyOverrides || {}) };
                    delete next[key];
                    return { ...prev, typographyOverrides: next };
                  });
                  const bodyPt = toNum(ov.bodyPt, {}, 9.5);
                  const contrast = toNum(ov.contrastScheme, CONTRAST_FACTORS, 1.2);
                  const sectionScale = toNum(ov.sectionHeadingScale, SECTION_HEADING_FACTORS, 1.0);
                  const summaryScale = toNum(ov.summaryScale, SUMMARY_FACTORS, 1.0);
                  const densityFactor = toNum(ov.densityMode, DENSITY_ENUM_TABLE, 1.0);
                  const hasAnyOverride = ov.bodyPt !== undefined || ov.contrastScheme !== undefined || ov.sectionHeadingScale !== undefined || ov.summaryScale !== undefined || ov.densityMode !== undefined;
                  return (
                    <>
                      {/* Tamaño de lectura */}
                      <TypographySlider
                        label="Tamaño de lectura"
                        hint="Chico: más contenido por hoja. Equilibrado: valor por defecto. Grande: más aire y legible."
                        min={8}
                        max={11.5}
                        step={0.5}
                        value={bodyPt}
                        display={`${bodyPt.toFixed(1)} pt · ${bodyPt < 9 ? 'Chico' : bodyPt <= 10 ? 'Equilibrado' : 'Grande'}`}
                        isSet={ov.bodyPt !== undefined}
                        onChange={(v) => setOverride('bodyPt', v)}
                        onReset={() => clearOverride('bodyPt')}
                      />

                      {/* Diferencia entre títulos y texto */}
                      <TypographySlider
                        label="Diferencia entre títulos y texto"
                        hint="Suave: jerarquía discreta. Equilibrada: contraste clásico. Marcada: títulos bien protagonistas."
                        min={1.08}
                        max={1.32}
                        step={0.02}
                        value={contrast}
                        display={`${contrast.toFixed(2)}x · ${contrast <= 1.16 ? 'Suave' : contrast <= 1.24 ? 'Equilibrada' : 'Marcada'}`}
                        isSet={ov.contrastScheme !== undefined}
                        onChange={(v) => setOverride('contrastScheme', v)}
                        onReset={() => clearOverride('contrastScheme')}
                      />

                      {/* Tamaño de títulos de sección */}
                      <TypographySlider
                        label="Tamaño de títulos de sección"
                        hint="Chico: EXPERIENCIA LABORAL discreto. Normal: ajuste clásico. Destacado: banner más presente."
                        min={0.75}
                        max={1.2}
                        step={0.05}
                        value={sectionScale}
                        display={`${sectionScale.toFixed(2)}x · ${sectionScale <= 0.925 ? 'Chico' : sectionScale <= 1.075 ? 'Normal' : 'Destacado'}`}
                        isSet={ov.sectionHeadingScale !== undefined}
                        onChange={(v) => setOverride('sectionHeadingScale', v)}
                        onReset={() => clearOverride('sectionHeadingScale')}
                      />

                      {/* Tamaño del Extracto / Resumen */}
                      <TypographySlider
                        label="Tamaño del Extracto / Resumen"
                        hint="Compacto: menos aire. Igual al texto: como el cuerpo del documento. Destacado: perfil más visible."
                        min={0.8}
                        max={1.2}
                        step={0.05}
                        value={summaryScale}
                        display={`${summaryScale.toFixed(2)}x · ${summaryScale <= 0.95 ? 'Compacto' : summaryScale <= 1.075 ? 'Igual al texto' : 'Destacado'}`}
                        isSet={ov.summaryScale !== undefined}
                        onChange={(v) => setOverride('summaryScale', v)}
                        onReset={() => clearOverride('summaryScale')}
                      />

                      {/* Espacio entre bloques */}
                      <TypographySlider
                        label="Espacio entre bloques"
                        hint="Compacto: entra más contenido. Equilibrado: ajuste clásico. Amplio: presentación o papel extra."
                        min={0.5}
                        max={1.35}
                        step={0.05}
                        value={densityFactor}
                        display={`${densityFactor.toFixed(2)}x · ${densityFactor <= 0.75 ? 'Compacto' : densityFactor <= 1.15 ? 'Equilibrado' : 'Amplio'}`}
                        isSet={ov.densityMode !== undefined}
                        onChange={(v) => setOverride('densityMode', v)}
                        onReset={() => clearOverride('densityMode')}
                      />

                      {/* Resetear overrides */}
                      {hasAnyOverride && (
                        <button
                          onClick={() => setCvData((prev: any) => {
                            const { typographyOverrides, ...rest } = prev || {};
                            return rest;
                          })}
                          className="w-full text-[11px] text-[var(--color-neutral-text-secondary)] hover:text-[var(--color-accent-base)] transition underline underline-offset-2 cursor-pointer"
                        >
                          Volver al ajuste de la plantilla
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>
            </PanelSection>

            {/* Estructura de Columnas (Layout) y Tirador de Ancho */}
            {!isBusinessCard && (
              <PanelSection icon={<Columns3 className="w-4 h-4" />} title="Disposición de columnas y Ancho">
                {(() => {
                  const activePresetObj = resolveActivePreset(cvData);
                  const activeLayoutKey = cvData?.columnLayoutPresetId || (activePresetObj.columnLayoutPresetId?.replace('layout-', '') || 'sidebar-left');
                  const sidebarPercent = Math.min(42, Math.max(32, cvData?.layout?.sidebarWidthPercent ?? 40));

                  const isBusinessCard = docType === 'business_card';
  return (
                    <div className="space-y-2.5">
                      {/* Fila 1: Barra Izquierda (40%) / Barra Derecha (40%) */}
                      <div className="grid grid-cols-2 gap-2">
                        {['sidebar-left', 'sidebar-right'].map((key) => {
                          const activeFormat = resolveActiveFormat(cvData);
                          const isSingleColumnFormat = activeFormat?.columnLayoutPresetId === 'full-width';
                          const isSelected = activeLayoutKey === key;
                          const label = key === 'sidebar-left' ? 'Barra Izquierda (40%)' : 'Barra Derecha (40%)';

                          const isBusinessCard = docType === 'business_card';
  return (
                            <button
                              key={key}
                              disabled={isSingleColumnFormat}
                              onClick={() => {
                                triggerPresetTransition(label, 'layout');
                                setCvData((prev: any) => applyPresetLevel(prev, 'override', { columnLayoutPresetId: key }));
                              }}
                              className={`p-2.5 rounded-[var(--radius-card)] border text-left transition flex items-center justify-between gap-1.5 ${
                                isSingleColumnFormat
                                  ? 'opacity-40 cursor-not-allowed bg-[var(--ui-bg-panel)] border-[var(--color-neutral-border)]'
                                  : isSelected
                                    ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-rose-muted)]/30 ring-2 ring-[var(--color-accent-base)]/30 cursor-pointer'
                                    : 'border-[var(--color-neutral-border)] bg-[var(--ui-bg-card)] hover:border-[var(--color-accent-base)] cursor-pointer'
                              }`}
                            >
                              <span className="text-[11px] font-black text-[var(--color-neutral-text-primary)] truncate">{label}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-[var(--ui-text-primary)] flex-shrink-0" />}
                            </button>
                          );
                        })}
                      </div>

                      {/* Fila 2: Columna Única Completa (100%) / Ancho de Barra Lateral */}
                      <div className="grid grid-cols-2 gap-2 items-center">
                        {(() => {
                          const key = 'full-width';
                          const isSelected = activeLayoutKey === key;
                          const label = 'Columna Única (100%)';
                          const isBusinessCard = docType === 'business_card';
  return (
                            <button
                              key={key}
                              onClick={() => {
                                triggerPresetTransition(label, 'layout');
                                setCvData((prev: any) => applyPresetLevel(prev, 'override', { columnLayoutPresetId: key }));
                              }}
                              className={`p-2.5 rounded-[var(--radius-card)] border text-left transition flex items-center justify-between gap-1.5 h-full ${
                                isSelected
                                  ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-rose-muted)]/30 ring-2 ring-[var(--color-accent-base)]/30 cursor-pointer'
                                  : 'border-[var(--color-neutral-border)] bg-[var(--ui-bg-card)] hover:border-[var(--color-accent-base)] cursor-pointer'
                              }`}
                            >
                              <span className="text-[11px] font-black text-[var(--color-neutral-text-primary)] truncate">{label}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-[var(--ui-text-primary)] flex-shrink-0" />}
                            </button>
                          );
                        })()}

                        {activeLayoutKey !== 'full-width' ? (
                          <div className="p-2 bg-[var(--ui-bg-card)] border border-[var(--color-neutral-border)] rounded-[var(--radius-card)] space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-bold text-[var(--color-neutral-text-primary)]">
                              <span>Ancho Sidebar</span>
                              <span className="text-[var(--color-secondary-bright)] font-black">{sidebarPercent}%</span>
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
                                    sidebarWidthPercent: val
                                  }
                                }));
                              }}
                              className="w-full h-1 bg-[var(--ui-bg-panel)] rounded-[10px] appearance-none cursor-pointer accent-[var(--color-secondary-base)]"
                            />
                          </div>
                        ) : (
                          <div className="p-2 bg-[var(--ui-bg-panel)] border border-[var(--color-neutral-border)]/40 rounded-[var(--radius-card)] text-center text-[10px] font-medium text-[var(--color-neutral-text-secondary)]">
                            Ancho fijo 100%
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </PanelSection>
            )}

            {/* Armonía Cromática */}
            <PanelSection icon={<Palette className="w-4 h-4" />} title="Paleta de color armónica">
              <div className="grid grid-cols-3 gap-1.5">
                {Object.entries(PRESET_COLORS).map(([key, colorPreset]) => {
                  const activePresetObj = resolveActivePreset(cvData);
                  const activeColorKey = cvData?.colorPresetId || activePresetObj.colorPresetId || 'clasico';
                  const isSelected = activeColorKey === key;
                  const isBusinessCard = docType === 'business_card';
  return (
                    <button
                      key={key}
                      onClick={() => {
                        triggerPresetTransition(colorPreset.name, 'color');
                        setCvData((prev: any) => applyPresetLevel(prev, 'override', { colorPresetId: key }));
                      }}
                      className={`p-2 rounded-[${radius.card}] border text-left transition flex flex-col justify-between cursor-pointer ${
                        isSelected
                          ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-rose-muted)]/30 ring-2 ring-[var(--color-accent-base)]/30'
                          : 'border-[var(--color-neutral-border)] bg-[var(--ui-bg-card)] hover:border-[var(--color-accent-base)]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-[var(--color-neutral-text-primary)] truncate pr-0.5" title={colorPreset.name}>{colorPreset.name}</span>
                        {isSelected && <Check className="w-3 h-3 text-[var(--ui-text-primary)] flex-shrink-0" />}
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

            {/* Escala Tipográfica */}
            <PanelSection icon={<ALargeSmall className="w-4 h-4" />} title="Escala tipográfica armónica">
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(PRESET_TYPOGRAPHY).map(([key, typoPreset]) => {
                  const activePresetObj = resolveActivePreset(cvData);
                  const activeTypoKey = cvData?.typographyPresetId || activePresetObj.typographyPresetId || 'clasica';
                  const isSelected = activeTypoKey === key;
                  const isBusinessCard = docType === 'business_card';
  return (
                    <button
                      key={key}
                      onClick={() => {
                        triggerPresetTransition((typoPreset as any).name, 'typography');
                        setCvData((prev: any) => applyPresetLevel(prev, 'override', { typographyPresetId: key }));
                      }}
                      className={`p-2.5 rounded-[${radius.card}] border text-left transition flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-rose-muted)]/30 ring-2 ring-[var(--color-accent-base)]/30'
                          : 'border-[var(--color-neutral-border)] bg-[var(--ui-bg-card)] hover:border-[var(--color-accent-base)]'
                      }`}
                    >
                      <span className="text-[11px] font-bold text-[var(--color-neutral-text-primary)]">{(typoPreset as any).name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[var(--ui-text-primary)] flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </PanelSection>

            {/* Plantilla Base Predefinida */}
            {!isBusinessCard && (
              <PanelSection icon={<LayoutTemplate className="w-4 h-4" />} title="Plantilla base predefinida">
                <div className="grid grid-cols-2 gap-2">
                  {getAllPresets().filter(p => p.id !== 'tarjeta-personal').map((preset) => {
                    const isSelected = (cvData?.activePresetId || 'cv-clasico') === preset.id;
                    const hasOverrides = !!(cvData?.colorPresetId || cvData?.typographyPresetId || cvData?.columnLayoutPresetId);
                    const isBusinessCard = docType === 'business_card';
                    
                    const activeFormat = resolveActiveFormat(cvData);
                    const isSingleColumnFormat = activeFormat?.columnLayoutPresetId === 'full-width';
                    const isPresetIncompatible = isSingleColumnFormat && preset.columnLayoutPresetId !== 'full-width';

                    return (
                      <button
                        key={preset.id}
                        onClick={() => {
                          if (isPresetIncompatible) {
                            showWarning(`La plantilla "${preset.name}" tiene 2 columnas y no es compatible con el formato ${activeFormat?.name}. Cambiá el formato primero.`);
                            return;
                          }
                          triggerPresetTransition(preset.name, 'preset');
                          setCvData((prev: any) => applyPresetLevel(prev, 'preset', { presetId: preset.id }));
                        }}
                        className={`p-2.5 rounded-[${radius.card}] border text-left transition flex flex-col justify-between ${
                          isPresetIncompatible
                            ? 'opacity-40 cursor-not-allowed bg-[var(--ui-bg-panel)] border-[var(--color-neutral-border)]'
                            : isSelected
                              ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-rose-muted)]/30 ring-2 ring-[var(--color-accent-base)]/30 cursor-pointer'
                              : 'border-[var(--color-neutral-border)] bg-[var(--ui-bg-card)] hover:border-[var(--color-accent-base)] cursor-pointer'
                        }`}
                        title={isPresetIncompatible ? `No compatible con ${activeFormat?.name}` : preset.name}
                      >
                        <div className="flex items-center justify-between mb-1.5 gap-1">
                          <div className="flex items-center gap-1 min-w-0 pr-1">
                            <span className="text-[11px] font-bold text-[var(--color-neutral-text-primary)] truncate">{preset.name}</span>
                            {isSelected && hasOverrides && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-[var(--color-accent-muted)] text-[var(--color-accent-text)] font-black flex-shrink-0">
                                + personalizado
                              </span>
                            )}
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[var(--ui-text-primary)] flex-shrink-0" />}
                        </div>
                        <div className="flex gap-1.5 items-center">
                          <div className={`w-4 h-4 rounded-full border border-[var(--ui-border)] ${elevationSystem.raised}`} style={{ backgroundColor: preset.palette.primary }} />
                          <div className={`w-4 h-4 rounded-full border border-[var(--ui-border)] ${elevationSystem.raised}`} style={{ backgroundColor: preset.palette.accent }} />
                          <div className={`w-4 h-4 rounded-full border border-[var(--ui-border)] ${elevationSystem.raised}`} style={{ backgroundColor: preset.palette.secondary }} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </PanelSection>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: PORTADA (NUEVA PESTAÑA DEDICADA) */}
    </>
  );
};
