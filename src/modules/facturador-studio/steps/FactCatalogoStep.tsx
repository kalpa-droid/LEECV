import React from 'react';
import { Boxes, Plus, Trash2, TriangleAlert } from 'lucide-react';
import { Field } from '../../../shared/core/ui/Field';
import { PanelSection } from '../../../shared/core/ui/PanelSection';
import { FactStepBaseProps, emptyCatalogItem } from '../facturadorStepsShared';
import { CatalogItem } from '../../../shared/core/facturador-engine/facturadorTypes';
import { formatARS, isLowStock, resolveTierPrice } from '../../../shared/core/facturador-engine/invoiceMath';
import { radius } from '../../../shared/core/uiDesignSystem';

/** Paso 4 — Catálogo de productos, stock y escalones mayoristas. */
export const FactCatalogoStep: React.FC<FactStepBaseProps> = ({ vault, updateVault, notify }) => {
  const updateItem = (id: string, values: Partial<CatalogItem>) =>
    updateVault((prev) => ({
      ...prev,
      catalogo: prev.catalogo.map((item) => (item.id === id ? { ...item, ...values } : item)),
    }));

  const addItem = () => {
    const item = emptyCatalogItem();
    updateVault((prev) => ({ ...prev, catalogo: [...prev.catalogo, item] }));
    notify.info('Producto agregado. Completá nombre y precio.');
  };

  const removeItem = (id: string) =>
    updateVault((prev) => ({ ...prev, catalogo: prev.catalogo.filter((item) => item.id !== id) }));

  const updateTier = (item: CatalogItem, index: number, key: 'minQty' | 'discountPct', value: number) => {
    const escalones = [...(item.escalones || [])];
    while (escalones.length <= index) escalones.push({ minQty: 0, discountPct: 0 });
    escalones[index] = { ...escalones[index], [key]: value };
    updateItem(item.id, { escalones });
  };

  const lowStock = vault.catalogo.filter(isLowStock);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Boxes className="w-5 h-5" /> Catálogo y stock
        </h2>
        <p className="text-xs text-[var(--ui-text-secondary)] mt-1">
          Tus productos con precio y descuentos por cantidad. El stock se descuenta al emitir.
        </p>
      </div>

      {lowStock.length > 0 ? (
        <div className="p-3 bg-[var(--color-status-warning-muted)] border border-[var(--color-status-warning-base)] text-[11px] text-[var(--color-status-warning-text)]" style={{ borderRadius: radius.control }}>
          <div className="flex items-center gap-1.5 font-bold mb-1">
            <TriangleAlert className="w-3.5 h-3.5" /> Stock bajo
          </div>
          {lowStock.map((item) => `${item.nombre}: quedan ${item.stock}`).join(' · ')}
        </div>
      ) : null}

      <button
        type="button"
        onClick={addItem}
        className="w-full py-2 text-xs font-bold bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] inline-flex items-center justify-center gap-1.5"
        style={{ borderRadius: radius.control }}
      >
        <Plus className="w-4 h-4" /> Agregar producto
      </button>

      {vault.catalogo.length === 0 ? (
        <p className="text-xs text-[var(--ui-text-secondary)] italic">
          Catálogo vacío. Agregá tus productos para facturar más rápido.
        </p>
      ) : null}

      {vault.catalogo.map((item) => {
        const tiers = item.escalones || [];
        const preview = resolveTierPrice(item, 10);
        return (
          <PanelSection key={item.id} icon={<Boxes className="w-4 h-4" />} title={item.nombre || 'Producto sin nombre'}>
            <div className="space-y-2">
              <Field
                label="Nombre"
                value={item.nombre}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateItem(item.id, { nombre: e.target.value })}
              />
              <Field
                label="Descripción"
                value={item.descripcion}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateItem(item.id, { descripcion: e.target.value })}
                helperText="Opcional: se usa al agregarlo a un comprobante"
              />
              <div className="grid grid-cols-3 gap-2">
                <Field
                  type="number"
                  label="Precio base"
                  value={item.precioBase}
                  min={0}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateItem(item.id, { precioBase: Number(e.target.value) || 0 })}
                />
                <Field
                  type="number"
                  label="Stock"
                  value={item.stock}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateItem(item.id, { stock: Number(e.target.value) || 0 })}
                />
                <Field
                  type="number"
                  label="Stock mínimo"
                  value={item.stockMinimo}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateItem(item.id, { stockMinimo: Number(e.target.value) || 0 })}
                />
              </div>

              <div className="pt-2 border-t border-[var(--ui-border)] space-y-2">
                <p className="text-[11px] font-bold text-[var(--ui-text-primary)]">Descuentos por cantidad (mayorista)</p>
                {[0, 1, 2].map((index) => {
                  const tier = tiers[index] || { minQty: 0, discountPct: 0 };
                  return (
                    <div key={index} className="grid grid-cols-2 gap-2">
                      <Field
                        type="number"
                        label={`Desde ${index + 1} unidades`}
                        value={tier.minQty || ''}
                        min={0}
                        placeholder="—"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateTier(item, index, 'minQty', Number(e.target.value) || 0)}
                      />
                      <Field
                        type="number"
                        label="Descuento %"
                        value={tier.discountPct || ''}
                        min={0}
                        max={100}
                        placeholder="0"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateTier(item, index, 'discountPct', Number(e.target.value) || 0)}
                      />
                    </div>
                  );
                })}
                {preview.tierIndex >= 0 ? (
                  <p className="text-[10px] text-[var(--color-accent-text)]">
                    A 10 unidades: {formatARS(preview.unitPrice)} c/u ({preview.discountPct}% menos)
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => removeItem(item.id)}
                className="text-xs font-bold text-[var(--color-status-danger-text)] inline-flex items-center gap-1 pt-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Eliminar producto
              </button>
            </div>
          </PanelSection>
        );
      })}
    </div>
  );
};
