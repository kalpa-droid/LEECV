import React, { useMemo, useState } from 'react';
import { Boxes, Check, Pencil, Plus, Trash2, TriangleAlert } from 'lucide-react';
import { Field } from '../../../shared/core/ui/Field';
import { PanelSection } from '../../../shared/core/ui/PanelSection';
import { LidioHelpTrigger } from '../../../shared/core/ui/LidioHelpTrigger';
import { SearchFilterBar, matchesSearchQuery } from '../../../shared/core/ui/SearchFilterBar';
import { button } from '../../../shared/core/uiDesignSystem';
import { FactStepBaseProps, emptyCatalogItem } from '../facturadorStepsShared';
import { CatalogItem } from '../domain/facturadorTypes';
import { formatARS, isLowStock, resolveTierPrice } from '../domain/invoiceMath';

/** Paso 3 — Catálogo maestro de productos, stock y escalones mayoristas. */
export const FactCatalogoStep: React.FC<FactStepBaseProps> = ({ vault, updateVault, notify }) => {
  const [search, setSearch] = useState('');
  const [editingDraft, setEditingDraft] = useState<CatalogItem | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  const filteredCatalog = useMemo(
    () =>
      vault.catalogo.filter((item) =>
        matchesSearchQuery([item.nombre, item.descripcion, item.precioBase], search, 3),
      ),
    [vault.catalogo, search],
  );

  const lowStock = vault.catalogo.filter(isLowStock);

  const startNewProduct = () => {
    setIsCreatingNew(true);
    setEditingDraft(emptyCatalogItem());
  };

  const startEditProduct = (item: CatalogItem) => {
    setIsCreatingNew(false);
    setEditingDraft({ ...item, escalones: [...(item.escalones || [])] });
  };

  const saveProduct = () => {
    if (!editingDraft) return;
    if (!editingDraft.nombre.trim()) {
      notify.error('Escribí el nombre del producto o servicio antes de guardarlo.');
      return;
    }

    const cleaned: CatalogItem = {
      ...editingDraft,
      nombre: editingDraft.nombre.trim(),
      descripcion: editingDraft.descripcion.trim(),
      escalones: (editingDraft.escalones || []).filter((e) => Number(e.minQty) > 0 && Number(e.discountPct) > 0),
    };

    updateVault((prev) => {
      const exists = prev.catalogo.some((c) => c.id === cleaned.id);
      return {
        ...prev,
        catalogo: exists
          ? prev.catalogo.map((c) => (c.id === cleaned.id ? cleaned : c))
          : [...prev.catalogo, cleaned],
      };
    });

    notify.success(isCreatingNew ? `Producto "${cleaned.nombre}" guardado en tu catálogo.` : `Cambios guardados en "${cleaned.nombre}".`);
    setEditingDraft(null);
    setIsCreatingNew(false);
  };

  const removeItem = (id: string) => {
    updateVault((prev) => ({ ...prev, catalogo: prev.catalogo.filter((item) => item.id !== id) }));
    if (editingDraft?.id === id) {
      setEditingDraft(null);
      setIsCreatingNew(false);
    }
    notify.info('Producto eliminado del catálogo.');
  };

  const updateDraftTier = (index: number, key: 'minQty' | 'discountPct', value: number) => {
    if (!editingDraft) return;
    const escalones = [...(editingDraft.escalones || [])];
    while (escalones.length <= index) escalones.push({ minQty: 0, discountPct: 0 });
    escalones[index] = { ...escalones[index], [key]: value };
    setEditingDraft({ ...editingDraft, escalones });
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Boxes className="w-5 h-5" /> Catálogo maestro y stock
        </h2>
        <p className="text-xs text-[var(--ui-text-secondary)] mt-1">
          Administrá tus productos fijos y precios por cantidad. Para sumarlos a una factura usá “Ítems y precios”.
        </p>
      </div>

      {lowStock.length > 0 ? (
        <div className="p-3 rounded-[10px] bg-[var(--color-status-warning-muted)] border border-[var(--color-status-warning-base)] text-[11px] text-[var(--color-status-warning-text)]">
          <div className="flex items-center gap-1.5 font-bold mb-1">
            <TriangleAlert className="w-3.5 h-3.5" /> Stock bajo
          </div>
          {lowStock.map((item) => `${item.nombre}: quedan ${item.stock}`).join(' · ')}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <SearchFilterBar
          value={search}
          onChange={setSearch}
          placeholder="Buscar en catálogo (3+ letras)..."
          totalCount={vault.catalogo.length}
          filteredCount={filteredCatalog.length}
          className="flex-1 min-w-[180px]"
        />
        <button
          type="button"
          onClick={startNewProduct}
          className={`${button.primary} py-2 px-3 text-xs font-bold inline-flex items-center gap-1.5 shrink-0`}
        >
          <Plus className="w-4 h-4" /> Nuevo producto
        </button>
      </div>

      {editingDraft && (
        <PanelSection
          icon={<Boxes className="w-4 h-4" />}
          title={isCreatingNew ? 'Nuevo producto en catálogo' : `Editando: ${editingDraft.nombre || 'Producto'}`}
        >
          <div className="space-y-2.5">
            <Field
              label="Nombre del producto o servicio"
              value={editingDraft.nombre}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setEditingDraft({ ...editingDraft, nombre: e.target.value })
              }
              placeholder="Ej: Resma de papel 75g"
            />
            <Field
              label="Descripción (se muestra en el ? de Ítems y debajo del nombre en PDF)"
              value={editingDraft.descripcion}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setEditingDraft({ ...editingDraft, descripcion: e.target.value })
              }
              placeholder="Ej: Caja cerrada por 500 hojas"
            />
            <div className="grid grid-cols-3 gap-2">
              <Field
                type="number"
                label="Precio base"
                value={editingDraft.precioBase}
                min={0}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditingDraft({ ...editingDraft, precioBase: Number(e.target.value) || 0 })
                }
              />
              <Field
                type="number"
                label="Stock"
                value={editingDraft.stock}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditingDraft({ ...editingDraft, stock: Number(e.target.value) || 0 })
                }
              />
              <Field
                type="number"
                label="Stock mínimo"
                value={editingDraft.stockMinimo}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditingDraft({ ...editingDraft, stockMinimo: Number(e.target.value) || 0 })
                }
              />
            </div>

            <div className="pt-2 border-t border-[var(--ui-border)] space-y-2">
              <p className="text-[11px] font-bold text-[var(--ui-text-primary)]">
                Descuentos por cantidad (mayorista)
              </p>
              {[0, 1, 2].map((index) => {
                const tier = (editingDraft.escalones || [])[index] || { minQty: 0, discountPct: 0 };
                return (
                  <div key={index} className="grid grid-cols-2 gap-2">
                    <Field
                      type="number"
                      label={`Escalón ${index + 1} (cant. mín.)`}
                      value={tier.minQty || ''}
                      min={0}
                      placeholder="Ej: 10"
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        updateDraftTier(index, 'minQty', Number(e.target.value) || 0)
                      }
                    />
                    <Field
                      type="number"
                      label="Descuento %"
                      value={tier.discountPct || ''}
                      min={0}
                      max={100}
                      placeholder="0"
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        updateDraftTier(index, 'discountPct', Number(e.target.value) || 0)
                      }
                    />
                  </div>
                );
              })}
              {resolveTierPrice(editingDraft, 10).tierIndex >= 0 && (
                <p className="text-[10px] text-[var(--color-accent-text)]">
                  A 10 unidades: {formatARS(resolveTierPrice(editingDraft, 10).unitPrice)} c/u (
                  {resolveTierPrice(editingDraft, 10).discountPct}% menos)
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setEditingDraft(null);
                  setIsCreatingNew(false);
                }}
                className={`${button.ghost} text-xs py-1.5 px-3`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveProduct}
                className={`${button.success} text-xs py-2 px-4 inline-flex items-center gap-1.5`}
              >
                <Check className="w-3.5 h-3.5" /> Guardar producto
              </button>
            </div>
          </div>
        </PanelSection>
      )}

      {filteredCatalog.length === 0 ? (
        <p className="text-xs text-[var(--ui-text-secondary)] italic">
          {vault.catalogo.length === 0
            ? 'Catálogo vacío. Tocá “Nuevo producto” para cargar tus precios.'
            : 'No encontramos productos con esa búsqueda.'}
        </p>
      ) : (
        <div className="space-y-2">
          {filteredCatalog.map((item) => (
            <div
              key={item.id}
              className="p-2.5 rounded-[12px] border border-[var(--ui-border)] bg-[var(--ui-bg-card)] flex items-center justify-between gap-2"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-[var(--ui-text-primary)] truncate">
                    {item.nombre || 'Producto sin nombre'}
                  </span>
                  {item.descripcion && (
                    <LidioHelpTrigger size="xs" title={item.nombre} text={item.descripcion} />
                  )}
                </div>
                <p className="text-[11px] text-[var(--ui-text-secondary)]">
                  {formatARS(item.precioBase)} · Stock: {item.stock}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => startEditProduct(item)}
                  title="Editar producto"
                  className="p-1.5 rounded-[8px] border border-[var(--ui-border)] text-[var(--ui-text-primary)] hover:bg-[var(--ui-bg-panel)] cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  title="Eliminar producto"
                  className="p-1.5 rounded-[8px] text-[var(--color-status-danger-text)] hover:bg-[var(--color-status-danger-muted)] cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
