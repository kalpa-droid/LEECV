import React from 'react';
import { Users, Plus, Trash2, UserCheck } from 'lucide-react';
import { Field } from '../../../shared/core/ui/Field';
import { PanelSection } from '../../../shared/core/ui/PanelSection';
import { CONDICIONES_IVA, FactStepBaseProps, emptyCliente } from '../facturadorStepsShared';
import { ClienteFactura } from '../../../shared/core/facturador-engine/facturadorTypes';
import { isValidCuit, isValidEmail } from '../../../shared/core/utils/validationEngine';
import { radius } from '../../../shared/core/uiDesignSystem';

/** Paso 5 — Cartera de clientes (cifrada, local). */
export const FactClientesStep: React.FC<FactStepBaseProps> = ({ vault, updateVault, draft, updateDraft, notify }) => {
  const updateCliente = (id: string, values: Partial<ClienteFactura>) =>
    updateVault((prev) => ({
      ...prev,
      clientes: prev.clientes.map((cliente) => (cliente.id === id ? { ...cliente, ...values } : cliente)),
    }));

  const addCliente = () => {
    const cliente = emptyCliente();
    updateVault((prev) => ({ ...prev, clientes: [...prev.clientes, cliente] }));
    notify.info('Cliente agregado. Completá sus datos.');
  };

  const removeCliente = (id: string) => {
    updateVault((prev) => ({ ...prev, clientes: prev.clientes.filter((cliente) => cliente.id !== id) }));
    if (draft.cliente?.id === id) updateDraft((prev) => ({ ...prev, cliente: null }));
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Users className="w-5 h-5" /> Clientes
        </h2>
        <p className="text-xs text-[var(--ui-text-secondary)] mt-1">
          Se guardan solo en tu bóveda cifrada. Al facturar, elegís uno de esta lista.
        </p>
      </div>

      <button
        type="button"
        onClick={addCliente}
        className="w-full py-2 text-xs font-bold bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] inline-flex items-center justify-center gap-1.5"
        style={{ borderRadius: radius.control }}
      >
        <Plus className="w-4 h-4" /> Agregar cliente
      </button>

      {vault.clientes.length === 0 ? (
        <p className="text-xs text-[var(--ui-text-secondary)] italic">
          Todavía no cargaste clientes. Podés facturar a Consumidor Final igual.
        </p>
      ) : null}

      {vault.clientes.map((cliente) => {
        const selected = draft.cliente?.id === cliente.id;
        return (
          <PanelSection key={cliente.id} icon={<Users className="w-4 h-4" />} title={cliente.nombre || 'Cliente sin nombre'}>
            <div className="space-y-2">
              <Field
                label="Nombre o razón social"
                value={cliente.nombre}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateCliente(cliente.id, { nombre: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-2">
                <Field
                  label="CUIT"
                  value={cliente.cuit}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateCliente(cliente.id, { cuit: e.target.value })}
                  error={cliente.cuit && !isValidCuit(cliente.cuit) ? 'CUIT inválido' : null}
                />
                <Field
                  as="select"
                  label="Condición IVA"
                  value={cliente.condicionIva}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    updateCliente(cliente.id, { condicionIva: e.target.value as ClienteFactura['condicionIva'] })
                  }
                >
                  {CONDICIONES_IVA.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </Field>
              </div>
              <Field
                label="Domicilio"
                value={cliente.domicilio}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateCliente(cliente.id, { domicilio: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-2">
                <Field
                  label="Localidad"
                  value={cliente.localidad}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateCliente(cliente.id, { localidad: e.target.value })}
                />
                <Field
                  label="Teléfono"
                  value={cliente.telefono}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateCliente(cliente.id, { telefono: e.target.value })}
                />
              </div>
              <Field
                label="Email"
                value={cliente.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateCliente(cliente.id, { email: e.target.value })}
                error={cliente.email && !isValidEmail(cliente.email) ? 'Email inválido' : null}
              />
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => updateDraft((prev) => ({ ...prev, cliente }))}
                  className={`text-xs font-bold inline-flex items-center gap-1 px-2.5 py-1.5 border ${
                    selected
                      ? 'bg-[var(--color-status-success-base)] text-[var(--color-status-success-on-base)] border-[var(--color-status-success-base)]'
                      : 'bg-[var(--ui-bg-panel)] text-[var(--color-accent-text)] border-[var(--ui-border)]'
                  }`}
                  style={{ borderRadius: radius.control }}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  {selected ? 'Usando en este comprobante' : 'Usar en este comprobante'}
                </button>
                <button
                  type="button"
                  onClick={() => removeCliente(cliente.id)}
                  className="text-xs font-bold text-[var(--color-status-danger-text)] inline-flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Eliminar
                </button>
              </div>
            </div>
          </PanelSection>
        );
      })}
    </div>
  );
};
