import React, { useMemo, useState } from 'react';
import { History, CopyPlus, TriangleAlert, CircleDollarSign, Printer, Trash2, Pencil } from 'lucide-react';
import { SearchFilterBar, matchesSearchQuery } from '../../../shared/core/ui/SearchFilterBar';
import { useConfirm } from '../../../shared/core/ui/ConfirmDialog';
import { FactStepBaseProps } from '../facturadorStepsShared';
import { ComprobanteEstado, SavedInvoice } from '../domain/facturadorTypes';
import {
  describeComprobante,
  formatARS,
  getInvoiceDueStatus,
  isInvoiceDueAlert,
} from '../domain/invoiceMath';

interface FactHistorialStepProps extends FactStepBaseProps {
  onDuplicate: (saved: SavedInvoice) => void;
  onOpenHistorical: (saved: SavedInvoice) => void;
}

const ESTADO_LABEL: Record<ComprobanteEstado, string> = {
  borrador: 'Borrador',
  emitida: 'Emitida',
  cobrada: 'Cobrada',
  anulada: 'Anulada',
};

/** Paso 2 operativo — Historial, cobranzas y reimpresión fiel sin alterar emitidas. */
export const FactHistorialStep: React.FC<FactHistorialStepProps> = ({
  vault,
  updateVault,
  notify,
  onDuplicate,
  onOpenHistorical,
}) => {
  const [query, setQuery] = useState('');
  const { confirm } = useConfirm();

  const comprobantes = useMemo(
    () =>
      [...(Array.isArray(vault?.comprobantes) ? vault.comprobantes : [])]
        .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))
        .filter((comp) =>
          matchesSearchQuery(
            [
              describeComprobante(comp),
              comp.numero,
              comp.cliente?.nombre,
              comp.cliente?.cuit,
              ...(Array.isArray(comp.items) ? comp.items.map((it) => `${it.nombre || ''} ${it.descripcion || ''}`) : []),
            ],
            query,
            3,
          ),
        ),
    [vault.comprobantes, query],
  );

  const pendientes = vault.comprobantes.filter(
    (comp) => comp.estado === 'emitida' && isInvoiceDueAlert(comp.vencimiento),
  );

  const setEstado = (id: string, estado: ComprobanteEstado) => {
    updateVault((prev) => {
      const target = prev.comprobantes.find((c) => c.id === id);
      const shouldDeduct = Boolean(target && target.estado === 'borrador' && estado !== 'borrador' && !target.stockDeducido);
      let nextCatalogo = prev.catalogo;

      if (shouldDeduct && target) {
        nextCatalogo = prev.catalogo.map((item) => {
          const qty = target.items
            .filter((line) => line.catalogItemId === item.id)
            .reduce((acc, line) => acc + (Number(line.cantidad) || 0), 0);
          return qty > 0 ? { ...item, stock: Math.max(0, (Number(item.stock) || 0) - qty) } : item;
        });
      }

      return {
        ...prev,
        catalogo: nextCatalogo,
        comprobantes: prev.comprobantes.map((comp) =>
          comp.id === id
            ? {
                ...comp,
                estado,
                emitidaAt: estado !== 'borrador' && !comp.emitidaAt ? new Date().toISOString() : comp.emitidaAt,
                stockDeducido: shouldDeduct ? true : comp.stockDeducido,
              }
            : comp,
        ),
      };
    });
  };

  const deleteDraftInvoice = async (comp: SavedInvoice) => {
    if (comp.estado !== 'borrador') return;
    const ok = await confirm({
      title: 'Eliminar borrador',
      message: `¿Querés eliminar el borrador ${describeComprobante(comp)}? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar borrador',
      variant: 'danger',
    });
    if (!ok) return;
    updateVault((prev) => ({
      ...prev,
      comprobantes: prev.comprobantes.filter((c) => c.id !== comp.id),
    }));
    notify.info('Borrador eliminado del historial.');
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <History className="w-5 h-5" /> Historial y reimpresión
        </h2>
        <p className="text-xs text-[var(--ui-text-secondary)] mt-1">
          Reimprimí facturas anteriores tal como se emitieron, repetilas como nuevas o seguí los cobros pendientes.
        </p>
      </div>

      {pendientes.length > 0 ? (
        <div className="p-3 rounded-[10px] bg-[var(--color-status-warning-muted)] border border-[var(--color-status-warning-base)] text-[11px] text-[var(--color-status-warning-text)]">
          <div className="flex items-center gap-1.5 font-bold mb-1">
            <TriangleAlert className="w-3.5 h-3.5" /> Cobros pendientes o vencidos
          </div>
          {pendientes.length} comprobante{pendientes.length === 1 ? '' : 's'} emitido{pendientes.length === 1 ? '' : 's'} sin cobrar.
        </div>
      ) : null}

      <SearchFilterBar
        value={query}
        onChange={setQuery}
        placeholder="Buscar por N° de factura, cliente, CUIT o producto (3+ letras)..."
        totalCount={vault.comprobantes.length}
        filteredCount={comprobantes.length}
      />

      {comprobantes.length === 0 ? (
        <p className="text-xs text-[var(--ui-text-secondary)] italic">
          {vault.comprobantes.length === 0
            ? 'Todavía no hay comprobantes guardados. Completá uno en Ítems y tocá “Guardar comprobante”.'
            : 'No hay comprobantes que coincidan con esa búsqueda.'}
        </p>
      ) : null}

      <div className="space-y-3">
        {comprobantes.map((comp) => {
          const dueStatus = getInvoiceDueStatus(comp.vencimiento);
          const isBorrador = comp.estado === 'borrador';
          return (
            <div key={comp.id} className="p-3 bg-[var(--ui-bg-card)] border border-[var(--ui-border)] rounded-[12px] space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-black text-[var(--ui-text-primary)]">{describeComprobante(comp)}</p>
                  <p className="text-[11px] text-[var(--ui-text-secondary)]">
                    {comp.fecha || 'Sin fecha'} · {comp.cliente?.nombre || 'Consumidor Final'}
                  </p>
                </div>
                <span className="text-sm font-black text-[var(--ui-text-primary)]">{formatARS(comp.total)}</span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <select
                  value={comp.estado}
                  onChange={(e) => setEstado(comp.id, e.target.value as ComprobanteEstado)}
                  className="px-2 py-1.5 text-xs rounded-[10px] bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] text-[var(--ui-text-primary)]"
                >
                  {(Object.keys(ESTADO_LABEL) as ComprobanteEstado[]).map((estado) => (
                    <option key={estado} value={estado}>{ESTADO_LABEL[estado]}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => onOpenHistorical(comp)}
                  className="px-2.5 py-1.5 text-xs font-bold rounded-[10px] bg-[var(--color-secondary-muted)] border border-[var(--color-secondary-base)]/40 text-[var(--color-secondary-text)] inline-flex items-center gap-1 cursor-pointer"
                  title={isBorrador ? 'Abrir borrador para seguir editando' : 'Ver y reimprimir PDF original (sin editar)'}
                >
                  {isBorrador ? <Pencil className="w-3.5 h-3.5" /> : <Printer className="w-3.5 h-3.5" />}
                  {isBorrador ? 'Editar' : 'Reimprimir'}
                </button>

                <button
                  type="button"
                  onClick={() => onDuplicate(comp)}
                  className="px-2.5 py-1.5 text-xs font-bold rounded-[10px] bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] text-[var(--color-accent-text)] inline-flex items-center gap-1 cursor-pointer"
                  title="Crear un comprobante nuevo con los mismos ítems"
                >
                  <CopyPlus className="w-3.5 h-3.5" /> Repetir
                </button>

                {isBorrador && (
                  <button
                    type="button"
                    onClick={() => void deleteDraftInvoice(comp)}
                    className="p-1.5 rounded-[10px] text-[var(--color-status-danger-text)] hover:bg-[var(--color-status-danger-muted)] cursor-pointer ml-auto"
                    title="Eliminar borrador"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {comp.estado === 'emitida' || comp.estado === 'cobrada' ? (
                <p className={`text-[10px] font-semibold inline-flex items-center gap-1 ${
                  dueStatus === 'vencida'
                    ? 'text-[var(--color-status-danger-text)]'
                    : dueStatus === 'por_vencer'
                      ? 'text-[var(--color-status-warning-text)]'
                      : 'text-[var(--ui-text-secondary)]'
                }`}>
                  <CircleDollarSign className="w-3 h-3" />
                  {dueStatus === 'sin_vencimiento'
                    ? 'Sin vencimiento'
                    : dueStatus === 'vencida'
                      ? 'Vencido'
                      : dueStatus === 'por_vencer'
                        ? 'Vence pronto'
                        : 'Vigente'}
                  {comp.vencimiento ? ` · ${comp.vencimiento}` : ''}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};
