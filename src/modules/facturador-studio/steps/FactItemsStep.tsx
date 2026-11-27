import React, { useMemo, useState } from 'react';
import { ListPlus, Plus, Trash2, Copy, Tag, FileText, Lock, Printer } from 'lucide-react';
import { Field } from '../../../shared/core/ui/Field';
import { PanelSection } from '../../../shared/core/ui/PanelSection';
import { LidioHelpTrigger } from '../../../shared/core/ui/LidioHelpTrigger';
import { useConfirm } from '../../../shared/core/ui/ConfirmDialog';
import { SearchFilterBar, matchesSearchQuery } from '../../../shared/core/ui/SearchFilterBar';
import { button } from '../../../shared/core/uiDesignSystem';
import { FactStepBaseProps, lineFromCatalog, makeId } from '../facturadorStepsShared';
import {
  computeInvoiceTotals,
  computeLineRow,
  describeComprobante,
  formatARS,
  nextTierHint,
  resolveTierPrice,
} from '../domain/invoiceMath';

interface FactItemsStepProps extends FactStepBaseProps {
  onSaveComprobante?: () => void;
  onNewDraft?: () => void;
  onExportPDF?: () => void;
}

/** Paso 1 operativo — Ítems del comprobante compacto (2 líneas + ayuda ? para detalle). */
export const FactItemsStep: React.FC<FactItemsStepProps> = ({
  vault,
  draft,
  updateDraft,
  notify,
  onSaveComprobante,
  onNewDraft,
  onExportPDF,
}) => {
  const { confirm } = useConfirm();
  const [catalogSearch, setCatalogSearch] = useState('');
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  const [showObservaciones, setShowObservaciones] = useState(Boolean(draft.observaciones));

  const isReadonly = Boolean(draft.readonlyHistorical);
  const rows = draft.items.map(computeLineRow);
  const totals = computeInvoiceTotals(rows, 21, draft.letra);

  const filteredCatalog = useMemo(() => {
    if (!catalogSearch.trim() || catalogSearch.trim().length < 3) {
      return vault.catalogo.slice(0, 6);
    }
    return vault.catalogo.filter((item) =>
      matchesSearchQuery([item.nombre, item.descripcion, item.precioBase], catalogSearch, 3),
    );
  }, [vault.catalogo, catalogSearch]);

  const updateItem = (id: string, values: Partial<(typeof draft.items)[number]>) => {
    if (isReadonly) return;
    updateDraft((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id ? { ...item, ...values } : item)),
    }));
  };

  const addCatalogItem = (item: (typeof vault.catalogo)[number]) => {
    if (isReadonly) return;
    updateDraft((prev) => ({ ...prev, items: [...prev.items, lineFromCatalog(item)] }));
    notify.success(`Agregado: ${item.nombre}`);
  };

  const addManual = () => {
    if (isReadonly) return;
    updateDraft((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { id: makeId('ln'), nombre: '', descripcion: '', cantidad: 1, precioUnitario: 0, descuentoPct: 0 },
      ],
    }));
  };

  const duplicate = (id: string) => {
    if (isReadonly) return;
    updateDraft((prev) => {
      const found = prev.items.find((item) => item.id === id);
      if (!found) return prev;
      return { ...prev, items: [...prev.items, { ...found, id: makeId('ln') }] };
    });
  };

  const remove = async (id: string) => {
    if (isReadonly) return;
    const target = draft.items.find((item) => item.id === id);
    const hasContent = Boolean(
      target && (String(target.nombre || '').trim() || String(target.descripcion || '').trim() || Number(target.precioUnitario || 0) > 0),
    );
    if (hasContent) {
      const ok = await confirm({
        title: '¿Quitar este ítem del comprobante?',
        message: 'Podés revertirlo con Deshacer si lo quitaste por error.',
        confirmText: 'Sí, quitar',
        cancelText: 'Conservar',
      });
      if (!ok) return;
    }
    updateDraft((prev) => ({ ...prev, items: prev.items.filter((item) => item.id !== id) }));
  };

  const applyTier = (id: string) => {
    if (isReadonly) return;
    const line = draft.items.find((item) => item.id === id);
    if (!line?.catalogItemId) return;
    const catalogItem = vault.catalogo.find((c) => c.id === line.catalogItemId);
    if (!catalogItem) return;
    const tier = resolveTierPrice(catalogItem, line.cantidad);
    updateItem(id, { precioUnitario: Number(tier.unitPrice.toFixed(2)) });
    notify.success(`Precio actualizado con ${tier.discountPct}% de descuento por cantidad.`);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <ListPlus className="w-5 h-5" /> Ítems y precios
        </h2>
        <p className="text-xs text-[var(--ui-text-secondary)] mt-1">
          Agregá productos del catálogo o renglones manuales para este comprobante.
        </p>
      </div>

      {isReadonly && (
        <div className="p-3 rounded-[12px] bg-[var(--color-status-warning-muted)] border border-[var(--color-status-warning-base)]/50 text-xs text-[var(--color-status-warning-text)] space-y-2">
          <div className="flex items-center gap-1.5 font-bold">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>Reimpresión de {describeComprobante(draft)} (solo lectura)</span>
          </div>
          <p className="text-[11px]">
            Los comprobantes emitidos o cobrados no se editan para cuidar tu correlatividad contable.
          </p>
          <div className="flex flex-wrap gap-2">
            {onExportPDF && (
              <button
                type="button"
                onClick={onExportPDF}
                className={`${button.primary} py-1.5 px-3 text-xs inline-flex items-center gap-1.5`}
              >
                <Printer className="w-3.5 h-3.5" /> Descargar PDF original
              </button>
            )}
            {onNewDraft && (
              <button type="button" onClick={onNewDraft} className={`${button.secondary} py-1.5 px-3 text-xs`}>
                Volver a factura nueva
              </button>
            )}
          </div>
        </div>
      )}

      {!isReadonly && (
        <PanelSection icon={<Plus className="w-4 h-4" />} title="Agregar al comprobante">
          <div className="space-y-2.5">
            {vault.catalogo.length > 0 && (
              <>
                <SearchFilterBar
                  value={catalogSearch}
                  onChange={setCatalogSearch}
                  placeholder="Buscar producto o servicio (3+ letras)..."
                  totalCount={vault.catalogo.length}
                  filteredCount={filteredCatalog.length}
                />
                {filteredCatalog.length === 0 ? (
                  <p className="text-[11px] text-[var(--ui-text-secondary)] italic">
                    No hay productos que coincidan con “{catalogSearch}”.
                  </p>
                ) : (
                  <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                    {filteredCatalog.map((cat) => (
                      <div
                        key={cat.id}
                        className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-[10px] border border-[var(--ui-border)] bg-[var(--ui-bg-card)]"
                      >
                        <div className="min-w-0 flex items-center gap-1.5">
                          <span className="text-xs font-bold text-[var(--ui-text-primary)] truncate">
                            {cat.nombre || 'Sin nombre'}
                          </span>
                          {cat.descripcion && (
                            <LidioHelpTrigger
                              size="xs"
                              title={cat.nombre || 'Detalle'}
                              text={cat.descripcion}
                            />
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-bold text-[var(--ui-text-secondary)]">
                            {formatARS(cat.precioBase)}
                          </span>
                          <button
                            type="button"
                            onClick={() => addCatalogItem(cat)}
                            className="px-2 py-1 rounded-[8px] text-[11px] font-bold bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] hover:opacity-90 cursor-pointer"
                          >
                            + Agregar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            <button
              type="button"
              onClick={addManual}
              className={`${button.secondary} w-full py-2 text-xs font-bold inline-flex items-center justify-center gap-1.5`}
            >
              <Plus className="w-3.5 h-3.5" /> + Renglón libre (sin catálogo)
            </button>
          </div>
        </PanelSection>
      )}

      {draft.items.length === 0 ? (
        <p className="text-xs text-[var(--ui-text-secondary)] italic">
          Todavía no hay ítems en este comprobante. Agregá uno arriba para verlo en vivo en la hoja.
        </p>
      ) : null}

      {/* Lista compacta de 2 líneas por ítem */}
      <div className="space-y-2">
        {draft.items.map((item) => {
          const catalogItem = item.catalogItemId ? vault.catalogo.find((c) => c.id === item.catalogItemId) : null;
          const hint = catalogItem ? nextTierHint(catalogItem, item.cantidad) : null;
          const row = computeLineRow(item);
          const itemName = item.nombre !== undefined ? item.nombre : item.descripcion;
          const itemDetail = item.nombre !== undefined ? item.descripcion : '';
          const noteOpen = Boolean(expandedNotes[item.id]);

          return (
            <div
              key={item.id}
              className="p-2.5 bg-[var(--ui-bg-card)] border border-[var(--ui-border)] rounded-[12px] space-y-2"
            >
              {/* Línea 1: Nombre del producto/servicio + ? (descripción) + Cantidad + Acciones */}
              <div className="flex items-center gap-1.5">
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={itemName}
                    disabled={isReadonly}
                    onChange={(e) =>
                      updateItem(
                        item.id,
                        item.nombre !== undefined
                          ? { nombre: e.target.value }
                          : { nombre: e.target.value, descripcion: '' },
                      )
                    }
                    placeholder="Nombre del producto o servicio"
                    aria-label="Nombre del producto o servicio"
                    className="w-full px-2.5 py-1.5 rounded-[8px] border border-[var(--ui-border)] bg-[var(--ui-btn-outline-bg)] text-xs font-bold text-[var(--ui-text-primary)] outline-none focus:border-[var(--color-accent-base)] disabled:opacity-60"
                  />
                </div>

                <LidioHelpTrigger
                  size="xs"
                  title={itemName || 'Descripción del ítem'}
                  text={itemDetail || 'Sin descripción adicional. Tocá el ícono de detalle para agregar una aclaración que saldrá debajo del nombre en el PDF.'}
                />

                {!isReadonly && (
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedNotes((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
                    }
                    title="Editar descripción o detalle"
                    className={`p-1.5 rounded-[8px] border transition cursor-pointer ${
                      noteOpen || itemDetail
                        ? 'border-[var(--color-secondary-base)]/50 bg-[var(--color-secondary-muted)] text-[var(--color-secondary-text)]'
                        : 'border-[var(--ui-border)] text-[var(--ui-text-secondary)] hover:bg-[var(--ui-bg-panel)]'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                  </button>
                )}

                <div className="w-16 shrink-0">
                  <input
                    type="number"
                    value={item.cantidad}
                    min={0}
                    disabled={isReadonly}
                    onChange={(e) => updateItem(item.id, { cantidad: Number(e.target.value) || 0 })}
                    aria-label="Cantidad"
                    title="Cantidad"
                    className="w-full px-2 py-1.5 rounded-[8px] border border-[var(--ui-border)] bg-[var(--ui-btn-outline-bg)] text-xs font-bold text-right text-[var(--ui-text-primary)] outline-none focus:border-[var(--color-accent-base)] disabled:opacity-60"
                  />
                </div>

                {!isReadonly && (
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    title="Quitar ítem"
                    className="p-1.5 text-[var(--color-status-danger-text)] hover:bg-[var(--color-status-danger-muted)] rounded-[8px] cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {noteOpen && !isReadonly && (
                <Field
                  label="Descripción adicional (opcional)"
                  value={itemDetail}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updateItem(item.id, {
                      nombre: itemName,
                      descripcion: e.target.value,
                    })
                  }
                  placeholder="Detalle técnico, medida o aclaración..."
                />
              )}

              {/* Línea 2: Precio unitario + Descuento % + Mayorista + Subtotal */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                <div className="flex items-center gap-1.5">
                  <label className="flex items-center gap-1 text-[10px] font-semibold text-[var(--ui-text-secondary)]">
                    <span>P.Unit $</span>
                    <input
                      type="number"
                      value={item.precioUnitario}
                      min={0}
                      disabled={isReadonly}
                      onChange={(e) => updateItem(item.id, { precioUnitario: Number(e.target.value) || 0 })}
                      className="w-20 px-2 py-1 rounded-[8px] border border-[var(--ui-border)] bg-[var(--ui-btn-outline-bg)] text-xs font-semibold text-right text-[var(--ui-text-primary)] outline-none focus:border-[var(--color-accent-base)] disabled:opacity-60"
                    />
                  </label>

                  <label className="flex items-center gap-1 text-[10px] font-semibold text-[var(--ui-text-secondary)]">
                    <span>Dto %</span>
                    <input
                      type="number"
                      value={item.descuentoPct}
                      min={0}
                      max={100}
                      disabled={isReadonly}
                      onChange={(e) => updateItem(item.id, { descuentoPct: Number(e.target.value) || 0 })}
                      className="w-12 px-1.5 py-1 rounded-[8px] border border-[var(--ui-border)] bg-[var(--ui-btn-outline-bg)] text-xs font-semibold text-right text-[var(--ui-text-primary)] outline-none focus:border-[var(--color-accent-base)] disabled:opacity-60"
                    />
                  </label>

                  {!isReadonly && catalogItem && (
                    <button
                      type="button"
                      onClick={() => applyTier(item.id)}
                      title="Aplicar precio por cantidad"
                      className="p-1 rounded-[6px] text-[var(--color-accent-text)] hover:bg-[var(--color-accent-muted)] cursor-pointer"
                    >
                      <Tag className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {!isReadonly && (
                    <button
                      type="button"
                      onClick={() => duplicate(item.id)}
                      title="Duplicar renglón"
                      className="p-1 rounded-[6px] text-[var(--ui-text-secondary)] hover:bg-[var(--ui-bg-panel)] cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <span className="text-xs font-black text-[var(--ui-text-primary)]">
                  {formatARS(row.subtotal)}
                </span>
              </div>

              {hint ? <p className="text-[10px] text-[var(--color-accent-text)] font-semibold">{hint}</p> : null}
            </div>
          );
        })}
      </div>

      {/* Observaciones colapsables */}
      {!isReadonly && (
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => setShowObservaciones((prev) => !prev)}
            className="text-[11px] font-bold text-[var(--color-secondary-text)] underline cursor-pointer"
          >
            {showObservaciones ? 'Ocultar observaciones' : '+ Agregar observaciones al pie del comprobante'}
          </button>
          {showObservaciones && (
            <Field
              as="textarea"
              rows={2}
              label="Observaciones"
              value={draft.observaciones}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                updateDraft((prev) => ({ ...prev, observaciones: e.target.value }))
              }
              placeholder="Ej: Pago por transferencia · Entrega en 48 hs."
            />
          )}
        </div>
      )}

      {/* Totales */}
      {draft.items.length > 0 ? (
        <div className="p-3 bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] rounded-[12px] space-y-1 text-xs">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatARS(totals.subtotal)}</span>
          </div>
          {totals.descuento > 0 ? (
            <div className="flex justify-between">
              <span>Descuento</span>
              <span>- {formatARS(totals.descuento)}</span>
            </div>
          ) : null}
          <div className="flex justify-between text-[var(--ui-text-secondary)]">
            <span>{draft.letra === 'A' ? 'IVA 21%' : 'IVA 21% (incluido)'}</span>
            <span>{formatARS(totals.iva)}</span>
          </div>
          <div className="flex justify-between font-black text-sm pt-1 border-t border-[var(--ui-border)]">
            <span>TOTAL</span>
            <span>{formatARS(totals.total)}</span>
          </div>
        </div>
      ) : null}

      {/* Acciones de cierre EXCLUSIVAS de Ítems y precios */}
      {!isReadonly && (onSaveComprobante || onNewDraft) && (
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--ui-border)]">
          {onNewDraft && (
            <button type="button" onClick={onNewDraft} className={`${button.secondary} text-xs py-2 px-3`}>
              Comprobante nuevo
            </button>
          )}
          {onSaveComprobante && (
            <button type="button" onClick={onSaveComprobante} className={`${button.primary} text-xs py-2 px-3.5`}>
              Guardar comprobante
            </button>
          )}
        </div>
      )}
    </div>
  );
};
