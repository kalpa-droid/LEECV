import React from 'react';
import { ALargeSmall, Check, LayoutTemplate, Palette, Ruler } from 'lucide-react';
import { PanelSection } from '../../../shared/core/ui/PanelSection';
import { PAGE_SIZES } from '../../../shared/core/pdf-engine/layers/page/pageSizes';
import {
  PRESET_COLORS,
  PRESET_TYPOGRAPHY,
  getAllPresets,
  resolveActivePreset,
} from '../../../shared/core/pdf-engine/layers/presets/presetRegistry';
import { triggerPresetTransition } from '../../../shared/core/pdf-engine/layers/presets/presetTransitionEngine';
import { applyPresetLevel } from '../../../shared/core/pdf-engine/layers/presets/presetHierarchyEngine';
import { elevationSystem, radius } from '../../../shared/core/uiDesignSystem';

interface Props {
  cvData: any;
  setCvData: React.Dispatch<React.SetStateAction<any>>;
}

export function CardSizeSection({ cvData, setCvData }: Props) {
  const handlePaperSizeChange = (val: string) => {
    setCvData((prev: any) => ({
      ...prev,
      cardSize: val.startsWith('tarjeta_') ? val : prev?.cardSize,
      layout: {
        ...(prev?.layout || {}),
        paperSize: val,
        pageSizeId: val
      }
    }));
  };

  return (
    <div className="space-y-6">
      <div id="card-size-section">
        <PanelSection
          icon={<Ruler className="w-4 h-4" />}
          title="Tamaño y corte"
          helpText="Elegí el formato de tarjeta y el margen extra para el corte (sangrado y marcas de corte, 3-5 mm) para que al recortarla en la imprenta no queden bordes blancos."
        >
          <div className="p-4 bg-[var(--ui-bg-card)] rounded-[var(--radius-card)] border border-[var(--color-neutral-border)] space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[var(--color-neutral-text-primary)]">Elegí el tipo de tarjeta</label>
              <select
                value={cvData?.cardSize || 'tarjeta_estandar'}
                onChange={(e) => handlePaperSizeChange(e.target.value)}
                className="w-full text-xs p-2.5 rounded-[var(--radius-card)] border border-[var(--color-secondary-base)] bg-[var(--ui-bg-card)] text-[var(--color-neutral-text-primary)] font-bold outline-none cursor-pointer"
              >
                {Object.values(PAGE_SIZES).filter(s => s.category === 'tarjeta').map((s) => (
                  <option key={s.id} value={s.id}>
                    📇 {s.appLabel || s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Slider de Sangrado para Imprenta Profesional (3-5mm) */}
            <div className="space-y-2 pt-3 border-t border-[var(--color-neutral-border)]">
              <div className="flex items-center justify-between text-xs font-bold text-[var(--color-neutral-text-primary)]">
                <span>Margen extra para el corte (sangrado)</span>
                <span className="text-[var(--color-secondary-bright)] font-black">{cvData?.cardBleedMm ?? 3} mm</span>
              </div>
              <input
                type="range"
                min={3}
                max={5}
                step={1}
                value={cvData?.cardBleedMm ?? 3}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setCvData((prev: any) => ({
                    ...prev,
                    cardBleedMm: val
                  }));
                }}
                className="w-full h-1.5 bg-[var(--ui-bg-panel)] rounded-[var(--radius-control)] appearance-none cursor-pointer accent-[var(--color-secondary-base)]"
              />
            </div>
          </div>
        </PanelSection>

        {/* Armonía Cromática */}
        <PanelSection icon={<Palette className="w-4 h-4" />} title="Paleta de color armónica">
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
              return (
                <button
                  key={key}
                  type="button"
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
      </div>
    </div>
  );
}
