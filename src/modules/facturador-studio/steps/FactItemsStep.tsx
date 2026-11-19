import React, { useState } from 'react';
import { ListPlus, Plus, Trash2, Copy, Tag } from 'lucide-react';
import { Field } from '../../../shared/core/ui/Field';
import { PanelSection } from '../../../shared/core/ui/PanelSection';
import { FactStepBaseProps, lineFromCatalog, makeId } from '../facturadorStepsShared';
import {
  computeInvoiceTotals,
  computeLineRow,
  formatARS,
  nextTierHint,
  resolveTierPrice,
} from '../../../shared/core/facturador-engine/invoiceMath';
import { radius } from '../../../shared/core/uiDesignSystem';

/** Paso 3 — Ítems del comprobante con precios mayoristas del catálogo. */
export const FactItemsStep: React.FC<FactStepBaseProps> = ({ vault, draft, updateDraft, notify }) => {
  const [catalogPick, setCatalogPick] = useState('');

  const rows = draft.items.map(computeLineRow);
  const totals = computeInvoiceTotals(rows, 21, draft.letra);

  const updateItem = (id: string, values: Partial<(typeof draft.items)[number]>) =>
    updateDraft((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id ? { ...item, ...values } : item)),
    }));

  const addFromCatalog = () => {
    const item = vault.catalogo.find((c) => c.id === catalogPick);
    if (!item) {
      notify.info('Elegí un producto del catálogo primero.');
      return;
    }
    updateDraft((prev) => ({ ...prev, items: [...prev.items, lineFromCatalog(item)] }));
    setCatalogPick('');
  };

  const addManual = () =>
    updateDraft((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { id: makeId('ln'), descripcion: '', cantidad: 1, precioUnitario: 0, descuentoPct: 0 },
      ],
    }));

  const duplicate = (id: string) =>
    updateDraft((prev) => {
      const found = prev.items.find((item) => item.id === id);
      if (!found) return prev;
      return { ...prev, items: [...prev.items, { ...found, id: makeId('ln') }] };
    });

  const remove = (id: string) =>
    updateDraft((prev) => ({ ...prev, items: prev.items.filter((item) => item.id !== id) }));

  const applyTier = (id: string) => {
    const line = draft.items.find((item) => item.id === id);
    if (!line?.catalogItemId) return;
    const catalogItem = vault.catalogo.find((c) => c.id === line.catalogItemId);
    if (!catalogItem) return;
    const tier = resolveTierPrice(catalogItem, line.cantidad);
    updateItem(id, { precioUnitario: Number(tier.unitPrice.toFixed(2)) });
    notify.success(`Precio actualizado con ${tier.discountPct}% de descuento por cantidad.`);
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <ListPlus className="w-5 h-5" /> Ítems y precios
        </h2>
        <p className="text-xs text-[var(--ui-text-secondary)] mt-1">Qué estás cobrando, cuánto y a qué precio.</p>
      </div>

      <PanelSection icon={<Plus className="w-4 h-4" />} title="Agregar">
        <div className="space-y-2">
          <Field
            as="select"
            label="Desde tu catálogo"
            value={catalogPick}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCatalogPick(e.target.value)}
          >
            <option value="">Elegí un producto…</option>
            {vault.catalogo.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nombre} — {formatARS(item.precioBase)}
              </option>
            ))}
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={addFromCatalog}
              disabled={!catalogPick}
              className="py-2 text-xs font-bold bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] disabled:opacity-40"
              style={{ borderRadius: radius.control }}
            >
              Agregar del catálogo
            </button>
            <button
              type="button"
              onClick={addManual}
              className="py-2 text-xs font-bold bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] text-[var(--ui-text-primary)]"
              style={{ borderRadius: radius.control }}
            >
              + Ítem manual
            </button>
          </div>
        </div>
      </PanelSection>

      {draft.items.length === 0 ? (
        <p className="text-xs text-[var(--ui-text-secondary)] italic">Todavía no hay ítems. Agregá el primero arriba.</p>
      ) : null}

      <div className="space-y-3">
        {draft.items.map((item) => {
          const catalogItem = item.catalogItemId ? vault.catalogo.find((c) => c.id === item.catalogItemId) : null;
          const hint = catalogItem ? nextTierHint(catalogItem, item.cantidad) : null;
          const row = computeLineRow(item);
          return (
            <div key={item.id} className="p-3 bg-[var(--ui-bg-card)] border border-[var(--ui-border)] space-y-2" style={{ borderRadius: radius.card }}>
              <Field
                label="Descripción"
                value={item.descripcion}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateItem(item.id, { descripcion: e.target.value })}
                placeholder="Ej: Pan de campo 1 kg"
              />
              <div className="grid grid-cols-3 gap-2">
                <Field
                  type="number"
                  label="Cantidad"
                  value={item.cantidad}
                  min={0}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateItem(item.id, { cantidad: Number(e.target.value) || 0 })}
                />
                <Field
                  type="number"
                  label="Precio unit."
                  value={item.precioUnitario}
                  min={0}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateItem(item.id, { precioUnitario: Number(e.target.value) || 0 })}
                />
                <Field
                  type="number"
                  label="Descuento %"
                  value={item.descuentoPct}
                  min={0}
                  max={100}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateItem(item.id, { descuentoPct: Number(e.target.value) || 0 })}
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-[var(--ui-text-primary)]">Subtotal: {formatARS(row.subtotal)}</span>
                <div className="flex items-center gap-1">
                  {catalogItem ? (
                    <button type="button" onClick={() => applyTier(item.id)} title="Aplicar precio por cantidad" className="p-1.5 text-[var(--color-accent-text)]">
                      <Tag className="w-3.5 h-3.5" />
                    </button>
                  ) : null}
                  <button type="button" onClick={() => duplicate(item.id)} title="Duplicar ítem" className="p-1.5 text-[var(--ui-text-secondary)]">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => remove(item.id)} title="Eliminar ítem" className="p-1.5 text-[var(--color-status-danger-text)]">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {hint ? <p className="text-[10px] text-[var(--color-accent-text)] font-semibold">{hint}</p> : null}
            </div>
          );
        })}
      </div>

      {draft.items.length > 0 ? (
        <div className="p-3 bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] space-y-1 text-xs" style={{ borderRadius: radius.card }}>
          <div className="flex justify-between"><span>Subtotal</span><span>{formatARS(totals.subtotal)}</span></div>
          {totals.descuento > 0 ? (
            <div className="flex justify-between"><span>Descuento</span><span>- {formatARS(totals.descuento)}</span></div>
          ) : null}
          <div className="flex justify-between"><span>IVA 21%</span><span>{formatARS(totals.iva)}</span></div>
          <div className="flex justify-between font-black text-sm pt-1 border-t border-[var(--ui-border)]">
            <span>TOTAL</span><span>{formatARS(totals.total)}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
};
