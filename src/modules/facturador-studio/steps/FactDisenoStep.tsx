import React from 'react';
import { Palette, FileText, Smartphone } from 'lucide-react';
import { Field } from '../../../shared/core/ui/Field';
import { PanelSection } from '../../../shared/core/ui/PanelSection';
import { FactStepBaseProps } from '../facturadorStepsShared';
import { INVOICE_PRESETS, getInvoicePreset } from '../pdf/facturadorPresets';
import { PAGE_SIZES } from '../../../shared/core/pdf-engine/layers/page/pageSizes';
import { radius } from '../../../shared/core/uiDesignSystem';

const FACTURA_PAGE_SIZE_IDS = ['a4', 'a5', 'carta', 'legal'];

/** Paso 7 — Estilo del PDF y tamaño de hoja. */
export const FactDisenoStep: React.FC<FactStepBaseProps> = ({ vault, updateVault }) => {
  const design = vault.design;
  const activePreset = getInvoicePreset(design.presetId);

  const patch = (values: Partial<typeof design>) =>
    updateVault((prev) => ({ ...prev, design: { ...prev.design, ...values } }));

  const selectPreset = (presetId: string) => {
    const preset = getInvoicePreset(presetId);
    patch({ presetId: preset.id, pageSizeId: preset.pageSizeId });
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Palette className="w-5 h-5" /> Diseño y hoja
        </h2>
        <p className="text-xs text-[var(--ui-text-secondary)] mt-1">
          Cómo se ve el PDF. El mismo diseño se usa en la vista previa y en la descarga.
        </p>
      </div>

      <PanelSection icon={<Palette className="w-4 h-4" />} title="Plantilla">
        <div className="space-y-2">
          {INVOICE_PRESETS.map((preset) => {
            const selected = preset.id === activePreset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => selectPreset(preset.id)}
                className={`w-full text-left p-3 border transition ${
                  selected
                    ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-muted)]'
                    : 'border-[var(--ui-border)] bg-[var(--ui-bg-card)]'
                }`}
                style={{ borderRadius: radius.card }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-[var(--ui-text-primary)]">{preset.name}</span>
                  <span className="flex gap-1">
                    {[preset.palette.primary, preset.palette.secondary, preset.palette.accent].map((color) => (
                      <span key={color} className="w-3.5 h-3.5 rounded-full border border-[var(--ui-border)]" style={{ backgroundColor: color }} />
                    ))}
                  </span>
                </div>
                <span className="block text-[10px] text-[var(--ui-text-secondary)] mt-0.5">
                  Hoja por defecto: {PAGE_SIZES[preset.pageSizeId]?.appLabel || preset.pageSizeId}
                </span>
              </button>
            );
          })}
        </div>
      </PanelSection>

      <PanelSection icon={<FileText className="w-4 h-4" />} title="Hoja">
        <Field
          as="select"
          label="¿En qué hoja lo vas a imprimir?"
          value={design.pageSizeId}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => patch({ pageSizeId: e.target.value })}
          helperText="El PDF sale exactamente en esa hoja."
        >
          {FACTURA_PAGE_SIZE_IDS.map((id) => (
            <option key={id} value={id}>{PAGE_SIZES[id]?.appLabel || id}</option>
          ))}
        </Field>
      </PanelSection>

      <PanelSection icon={<Smartphone className="w-4 h-4" />} title="Opciones">
        <div className="space-y-3">
          <label className="flex items-start gap-2 text-xs text-[var(--ui-text-primary)] cursor-pointer">
            <input
              type="checkbox"
              checked={design.duplicateHalfSheet}
              onChange={(e) => patch({ duplicateHalfSheet: e.target.checked })}
              className="mt-0.5 w-4 h-4 accent-[var(--color-accent-base)]"
            />
            <span>
              <strong>Dos copias en la misma hoja</strong>
              <span className="block text-[10px] text-[var(--ui-text-secondary)]">
                Pensado para presupuestos cortos en el mostrador: una copia para el cliente y otra para vos.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-2 text-xs text-[var(--ui-text-primary)] cursor-pointer">
            <input
              type="checkbox"
              checked={design.mostrarLogo}
              onChange={(e) => patch({ mostrarLogo: e.target.checked })}
              className="mt-0.5 w-4 h-4 accent-[var(--color-accent-base)]"
            />
            <span>Mostrar el logo del negocio en el comprobante</span>
          </label>

          <label className="flex items-start gap-2 text-xs text-[var(--ui-text-primary)] cursor-pointer">
            <input
              type="checkbox"
              checked={design.mostrarObservaciones}
              onChange={(e) => patch({ mostrarObservaciones: e.target.checked })}
              className="mt-0.5 w-4 h-4 accent-[var(--color-accent-base)]"
            />
            <span>Mostrar las observaciones del comprobante</span>
          </label>
        </div>
      </PanelSection>
    </div>
  );
};
