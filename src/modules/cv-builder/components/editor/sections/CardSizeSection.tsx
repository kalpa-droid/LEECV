import React from 'react';
import { Layout, Sparkles, Check } from 'lucide-react';
import { PanelSection } from '../PanelSection';
import { PAGE_SIZES } from '../../../../../shared/core/pdf-engine/layers/page/pageSizes';
import { getAllPresets } from '../../../../../shared/core/pdf-engine/layers/presets/presetRegistry';
import { triggerPresetTransition } from '../../../../../shared/core/pdf-engine/layers/presets/presetTransitionEngine';
import { applyPresetLevel } from '../../../../../shared/core/pdf-engine/layers/presets/presetHierarchyEngine';
import { elevationSystem, radius } from '../../../../../shared/core/uiDesignSystem';

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
        <PanelSection icon={<Layout className="w-4 h-4" />} title="Tamaño Físico de Tarjeta + Sangrado + Marcas de Corte">
          <div className="p-4 bg-[var(--ui-bg-card)] rounded-[var(--radius-card)] border border-[var(--color-neutral-border)] space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[var(--color-neutral-text-primary)]">Seleccionar Formato Estándar</label>
              <select
                value={cvData?.cardSize || 'tarjeta_estandar'}
                onChange={(e) => handlePaperSizeChange(e.target.value)}
                className="w-full text-xs p-2.5 rounded-[var(--radius-card)] border border-[var(--color-secondary-base)] bg-[var(--ui-bg-card)] text-[var(--color-neutral-text-primary)] font-bold outline-none cursor-pointer"
              >
                {Object.values(PAGE_SIZES).filter(s => s.category === 'tarjeta').map((s) => (
                  <option key={s.id} value={s.id}>
                    📇 {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Slider de Sangrado para Imprenta Profesional (3-5mm) */}
            <div className="space-y-2 pt-3 border-t border-[var(--color-neutral-border)]">
              <div className="flex items-center justify-between text-xs font-bold text-[var(--color-neutral-text-primary)]">
                <span>Sangrado de Imprenta (Bleed)</span>
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
              <span className="text-[10px] text-[var(--color-neutral-text-secondary)] leading-tight block">
                Estándar profesional: 3 mm habitual / 5 mm para guillotina con margen extendido.
              </span>
            </div>
          </div>
        </PanelSection>

        {/* Plantilla Base Predefinida */}
        <PanelSection icon={<Sparkles className="w-4 h-4" />} title="Plantilla base predefinida">
          <div className="grid grid-cols-2 gap-2">
            {getAllPresets().map((preset) => {
              const isSelected = (cvData?.activePresetId || 'tarjeta-personal') === preset.id;
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
                    <span className="text-[11px] font-bold text-[var(--color-neutral-text-primary)] truncate">{preset.name}</span>
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
      </div>
    </div>
  );
}
