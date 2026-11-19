import React, { useState } from 'react';
import { ReceiptText, UserRound, Hash, TriangleAlert } from 'lucide-react';
import { Field } from '../../../shared/core/ui/Field';
import { PanelSection } from '../../../shared/core/ui/PanelSection';
import { CONDICIONES_IVA, FactStepBaseProps, emptyCliente, nextNumberPreview } from '../facturadorStepsShared';
import { ClienteFactura, ComprobanteLetra, ComprobanteTipo } from '../../../shared/core/facturador-engine/facturadorTypes';
import { formatARS, computeInvoiceTotals, computeLineRow } from '../../../shared/core/facturador-engine/invoiceMath';
import { radius } from '../../../shared/core/uiDesignSystem';

/** Paso 2 — Tipo/letra/número del comprobante y cliente. */
export const FactComprobanteStep: React.FC<FactStepBaseProps> = ({ vault, updateVault, draft, updateDraft, notify }) => {
  const [quickClient, setQuickClient] = useState<ClienteFactura>(() => emptyCliente());

  const rows = draft.items.map(computeLineRow);
  const totals = computeInvoiceTotals(rows, 21, draft.letra);

  const applyLetra = (letra: ComprobanteLetra) => {
    const estado = vault.numeracion[letra];
    updateDraft((prev) => ({
      ...prev,
      letra,
      puntoVenta: estado?.puntoVenta || prev.puntoVenta,
      numero: prev.numero || String((estado?.ultimoNumero || 0) + 1).padStart(8, '0'),
    }));
  };

  const selectCliente = (id: string) => {
    if (!id) {
      updateDraft((prev) => ({ ...prev, cliente: null }));
      return;
    }
    const found = vault.clientes.find((c) => c.id === id) || null;
    updateDraft((prev) => ({ ...prev, cliente: found }));
  };

  const saveQuickClient = () => {
    if (!quickClient.nombre.trim()) {
      notify.error('Poné al menos el nombre del cliente.');
      return;
    }
    const cliente = { ...quickClient, id: `cli_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` };
    updateVault((prev) => ({ ...prev, clientes: [...prev.clientes, cliente] }));
    updateDraft((prev) => ({ ...prev, cliente }));
    setQuickClient(emptyCliente());
    notify.success('Cliente agregado a tu lista.');
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <ReceiptText className="w-5 h-5" /> Comprobante
        </h2>
        <p className="text-xs text-[var(--ui-text-secondary)] mt-1">Elegí qué vas a entregar y a quién.</p>
      </div>

      <div className="p-3 bg-[var(--color-status-warning-muted)] border border-[var(--color-status-warning-base)] text-[11px] text-[var(--color-status-warning-text)]" style={{ borderRadius: radius.control }}>
        <div className="flex items-center gap-1.5 font-bold mb-1">
          <TriangleAlert className="w-3.5 h-3.5" /> Sin CAE no es factura fiscal
        </div>
        FacturLee genera presupuestos y comprobantes internos. Para una factura fiscal necesitás el CAE de ARCA: este documento no lo incluye.
      </div>

      <PanelSection icon={<Hash className="w-4 h-4" />} title="Número y tipo">
        <div className="space-y-3">
          <Field
            as="select"
            label="¿Qué documento es?"
            value={draft.tipo}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              updateDraft((prev) => ({ ...prev, tipo: e.target.value as ComprobanteTipo }))
            }
          >
            <option value="factura">Factura (interna, sin CAE)</option>
            <option value="presupuesto">Presupuesto</option>
            <option value="nota_credito">Nota de Crédito interna</option>
          </Field>

          <div>
            <span className="block text-xs font-bold mb-1.5">Letra</span>
            <div className="grid grid-cols-4 gap-1.5">
              {(['A', 'B', 'C', 'X'] as ComprobanteLetra[]).map((letra) => (
                <button
                  key={letra}
                  type="button"
                  onClick={() => applyLetra(letra)}
                  className={`py-2 text-sm font-black border transition ${
                    draft.letra === letra
                      ? 'bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] border-[var(--color-accent-base)]'
                      : 'bg-[var(--ui-bg-card)] text-[var(--ui-text-primary)] border-[var(--ui-border)]'
                  }`}
                  style={{ borderRadius: radius.control }}
                >
                  {letra}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[var(--ui-text-secondary)] mt-1">
              La letra A discrimina IVA; B, C y X lo muestran incluido en el precio.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field
              label="Punto de venta"
              value={draft.puntoVenta}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                updateDraft((prev) => ({ ...prev, puntoVenta: e.target.value.replace(/\D/g, '').slice(0, 5) }))
              }
              maxLength={5}
            />
            <Field
              label="Número"
              value={draft.numero}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                updateDraft((prev) => ({ ...prev, numero: e.target.value.replace(/\D/g, '').slice(0, 8) }))
              }
              maxLength={8}
              headerAction={
                <button
                  type="button"
                  onClick={() =>
                    updateDraft((prev) => ({ ...prev, numero: nextNumberPreview(vault, prev.letra) }))
                  }
                  className="text-[10px] font-bold text-[var(--color-accent-text)] underline"
                >
                  Usar próximo
                </button>
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field
              type="date"
              label="Fecha"
              value={draft.fecha}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateDraft((prev) => ({ ...prev, fecha: e.target.value }))}
            />
            <Field
              type="date"
              label="Vencimiento"
              value={draft.vencimiento}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateDraft((prev) => ({ ...prev, vencimiento: e.target.value }))}
              helperText="Opcional"
            />
          </div>

          <Field
            as="select"
            label="Estado"
            value={draft.estado}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              updateDraft((prev) => ({ ...prev, estado: e.target.value as any }))
            }
          >
            <option value="borrador">Borrador</option>
            <option value="emitida">Emitida</option>
            <option value="cobrada">Cobrada</option>
            <option value="anulada">Anulada</option>
          </Field>
        </div>
      </PanelSection>

      <PanelSection icon={<UserRound className="w-4 h-4" />} title="Cliente">
        <div className="space-y-3">
          <Field
            as="select"
            label="Cliente guardado"
            value={draft.cliente?.id || ''}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => selectCliente(e.target.value)}
          >
            <option value="">Consumidor Final / sin datos</option>
            {vault.clientes.map((cliente) => (
              <option key={cliente.id} value={cliente.id}>{cliente.nombre}</option>
            ))}
          </Field>

          {draft.cliente ? (
            <div className="text-[11px] text-[var(--ui-text-secondary)] p-2 bg-[var(--ui-bg-panel)] border border-[var(--ui-border)]" style={{ borderRadius: radius.control }}>
              {draft.cliente.cuit ? <div>CUIT: {draft.cliente.cuit}</div> : null}
              {draft.cliente.domicilio ? <div>{draft.cliente.domicilio}</div> : null}
              <div>Total actual: {formatARS(totals.total)}</div>
            </div>
          ) : null}

          <details className="text-xs">
            <summary className="cursor-pointer font-bold text-[var(--color-accent-text)]">
              Cliente nuevo (sin salir del comprobante)
            </summary>
            <div className="space-y-2 mt-2">
              <Field
                label="Nombre"
                value={quickClient.nombre}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuickClient((prev) => ({ ...prev, nombre: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-2">
                <Field
                  label="CUIT"
                  value={quickClient.cuit}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuickClient((prev) => ({ ...prev, cuit: e.target.value }))}
                />
                <Field
                  as="select"
                  label="Condición IVA"
                  value={quickClient.condicionIva}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setQuickClient((prev) => ({ ...prev, condicionIva: e.target.value as ClienteFactura['condicionIva'] }))
                  }
                >
                  {CONDICIONES_IVA.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </Field>
              </div>
              <Field
                label="Domicilio"
                value={quickClient.domicilio}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuickClient((prev) => ({ ...prev, domicilio: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-2">
                <Field
                  label="Teléfono"
                  value={quickClient.telefono}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuickClient((prev) => ({ ...prev, telefono: e.target.value }))}
                />
                <Field
                  label="Email"
                  value={quickClient.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuickClient((prev) => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <button
                type="button"
                onClick={saveQuickClient}
                className="w-full py-2 text-xs font-bold bg-[var(--color-secondary-base)] text-[var(--color-secondary-on-base)]"
                style={{ borderRadius: radius.control }}
              >
                Guardar cliente y usarlo
              </button>
            </div>
          </details>
        </div>
      </PanelSection>
    </div>
  );
};
