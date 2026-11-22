import React, { useMemo, useState } from 'react';
import { History, CopyPlus, TriangleAlert, CircleDollarSign } from 'lucide-react';
import { Field } from '../../../shared/core/ui/Field';
import { FactStepBaseProps } from '../facturadorStepsShared';
import { ComprobanteEstado, SavedInvoice } from '../domain/facturadorTypes';
import {
  describeComprobante,
  formatARS,
  getInvoiceDueStatus,
  isInvoiceDueAlert,
} from '../domain/invoiceMath';
import { radius } from '../../../shared/core/uiDesignSystem';

interface FactHistorialStepProps extends FactStepBaseProps {
  onDuplicate: (saved: SavedInvoice) => void;
}

const ESTADO_LABEL: Record<ComprobanteEstado, string> = {
  borrador: 'Borrador',
  emitida: 'Emitida',
  cobrada: 'Cobrada',
  anulada: 'Anulada',
};

/** Paso 6 — Historial de comprobantes, cobranzas y vencimientos. */
export const FactHistorialStep: React.FC<FactHistorialStepProps> = ({ vault, updateVault, onDuplicate }) => {
  const [query, setQuery] = useState('');

  const comprobantes = useMemo(
    () =>
      [...vault.comprobantes]
        .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))
        .filter((comp) => {
          if (!query.trim()) return true;
          const target = `${describeComprobante(comp)} ${comp.cliente?.nombre || ''}`.toLowerCase();
          return target.includes(query.toLowerCase());
        }),
    [vault.comprobantes, query]
  );

  const pendientes = vault.comprobantes.filter(
    (comp) => comp.estado === 'emitida' && isInvoiceDueAlert(comp.vencimiento)
  );

  const setEstado = (id: string, estado: ComprobanteEstado) =>
    updateVault((prev) => ({
      ...prev,
      comprobantes: prev.comprobantes.map((comp) => (comp.id === id ? { ...comp, estado } : comp)),
    }));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <History className="w-5 h-5" /> Historial y cobranzas
        </h2>
        <p className="text-xs text-[var(--ui-text-secondary)] mt-1">
          Todo lo que emitiste, con su estado de cobro. Nada de esto sale de tu computadora.
        </p>
      </div>

      {pendientes.length > 0 ? (
        <div className="p-3 bg-[var(--color-status-warning-muted)] border border-[var(--color-status-warning-base)] text-[11px] text-[var(--color-status-warning-text)]" style={{ borderRadius: radius.control }}>
          <div className="flex items-center gap-1.5 font-bold mb-1">
            <TriangleAlert className="w-3.5 h-3.5" /> Cobros pendientes o vencidos
          </div>
          {pendientes.length} comprobante{pendientes.length === 1 ? '' : 's'} emitido{pendientes.length === 1 ? '' : 's'} sin cobrar.
        </div>
      ) : null}

      <Field
        label="Buscar"
        value={query}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
        placeholder="Número, cliente o letra"
      />

      {comprobantes.length === 0 ? (
        <p className="text-xs text-[var(--ui-text-secondary)] italic">
          Todavía no hay comprobantes guardados. Completá uno y tocá “Guardar comprobante”.
        </p>
      ) : null}

      <div className="space-y-3">
        {comprobantes.map((comp) => {
          const dueStatus = getInvoiceDueStatus(comp.vencimiento);
          return (
            <div key={comp.id} className="p-3 bg-[var(--ui-bg-card)] border border-[var(--ui-border)] space-y-2" style={{ borderRadius: radius.card }}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-black text-[var(--ui-text-primary)]">{describeComprobante(comp)}</p>
                  <p className="text-[11px] text-[var(--ui-text-secondary)]">
                    {comp.fecha || 'Sin fecha'} · {comp.cliente?.nombre || 'Consumidor Final'}
                  </p>
                </div>
                <span className="text-sm font-black text-[var(--ui-text-primary)]">{formatARS(comp.total)}</span>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={comp.estado}
                  onChange={(e) => setEstado(comp.id, e.target.value as ComprobanteEstado)}
                  className="flex-1 px-2 py-1.5 text-xs bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] text-[var(--ui-text-primary)]"
                  style={{ borderRadius: radius.control }}
                >
                  {(Object.keys(ESTADO_LABEL) as ComprobanteEstado[]).map((estado) => (
                    <option key={estado} value={estado}>{ESTADO_LABEL[estado]}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => onDuplicate(comp)}
                  className="px-2 py-1.5 text-xs font-bold bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] text-[var(--color-accent-text)] inline-flex items-center gap-1"
                  style={{ borderRadius: radius.control }}
                  title="Crear un comprobante nuevo con los mismos ítems"
                >
                  <CopyPlus className="w-3.5 h-3.5" /> Repetir
                </button>
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
