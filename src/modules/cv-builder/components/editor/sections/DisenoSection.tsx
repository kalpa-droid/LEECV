import { AlertTriangle, Check, ChevronRight, Cloud, Download, FileText, Grid, Grid3X3, GripHorizontal, GripVertical, Image as ImageIcon, Layers, Monitor, Palette, Plus, RotateCcw, Sparkles, Trash2, User, X } from 'lucide-react';
import { getAllPresets, PRESET_COLORS, PRESET_TYPOGRAPHY, resolveActivePreset } from '../../../../../shared/core/pdf-engine/layers/presets/presetRegistry';
import { applyPresetLevel } from '../../../../../shared/core/pdf-engine/layers/presets/presetHierarchyEngine';
import { PAGE_SIZES } from '../../../../../shared/core/pdf-engine/layers/page/pageSizes';
import { getUiHint } from '../../../../../shared/core/uiTextGlossary';
import { UI_GLOSSARY } from '../../../../../shared/core/ui/uiTextGlossary';
import { Globe, Columns3, Layout } from 'lucide-react';
import React from 'react';
import { PanelSection } from '../PanelSection';

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
  handleAddCustomSection,
  registerSection
}: any) => {
  const isBusinessCard = docType === 'business_card';
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
                <Sparkles className="w-4 h-4 text-[var(--color-accent-amber-bright)] flex-shrink-0" />
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
              <PanelSection icon={<Layout className="w-4 h-4" />} title={UI_GLOSSARY.labels.paperFormat}>
                <div className={`p-3 bg-[var(--ui-bg-card)] rounded-[${radius.card}] border border-[var(--color-neutral-border)]`}>
                  <label className="block text-xs font-bold text-[var(--color-neutral-text-primary)] mb-1.5">
                    Tamaño de Hoja / Formato de Papel
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
                        📄 {size.label}
                      </option>
                    ))}
                  </select>
                </div>
              </PanelSection>

            {/* Formato Global & Estándares Internacionales (ATS, US Resume, Europass, Tech, LATAM) */}
            {!isBusinessCard && (
              <PanelSection icon={<Globe className="w-4 h-4 text-[var(--color-accent-text)]" />} title="Estándar & Formato Global (Internacional)">
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
            <PanelSection icon={<FileText className="w-4 h-4" />} title="Tipografía">
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
                              className={`w-full h-1 bg-[var(--ui-bg-panel)] rounded-[${radius.control}] appearance-none cursor-pointer accent-[var(--color-secondary-base)]`}
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
            <PanelSection icon={<FileText className="w-4 h-4" />} title="Escala tipográfica armónica">
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
              <PanelSection icon={<Sparkles className="w-4 h-4" />} title="Plantilla base predefinida">
                <div className="grid grid-cols-2 gap-2">
                  {getAllPresets().filter(p => p.id !== 'tarjeta-personal').map((preset) => {
                    const isSelected = (cvData?.activePresetId || 'cv-clasico') === preset.id;
                    const hasOverrides = !!(cvData?.colorPresetId || cvData?.typographyPresetId || cvData?.columnLayoutPresetId);
                    const isBusinessCard = docType === 'business_card';
  return (
                      <button
                        key={preset.id}
                        onClick={() => {
                          triggerPresetTransition(preset.name, 'preset');
                          setCvData((prev: any) => applyPresetLevel(prev, 'preset', { presetId: preset.id }));
                        }}
                        className={`p-2.5 rounded-[${radius.card}] border text-left transition flex flex-col justify-between cursor-pointer ${
                          isSelected
                            ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-rose-muted)]/30 ring-2 ring-[var(--color-accent-base)]/30'
                            : 'border-[var(--color-neutral-border)] bg-[var(--ui-bg-card)] hover:border-[var(--color-accent-base)]'
                        }`}
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
