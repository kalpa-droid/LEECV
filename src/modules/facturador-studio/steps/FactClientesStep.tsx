import React, { useMemo, useState } from 'react';
import { Check, Pencil, Plus, Trash2, UserCheck, Users } from 'lucide-react';
import { Field } from '../../../shared/core/ui/Field';
import { PanelSection } from '../../../shared/core/ui/PanelSection';
import { useConfirm } from '../../../shared/core/ui/ConfirmDialog';
import { SearchFilterBar, matchesSearchQuery } from '../../../shared/core/ui/SearchFilterBar';
import { button } from '../../../shared/core/uiDesignSystem';
import { CONDICIONES_IVA, FactStepBaseProps, emptyCliente } from '../facturadorStepsShared';
import { ClienteFactura } from '../domain/facturadorTypes';
import { CONDICION_IVA_LABEL } from '../domain/invoiceMath';
import { isValidCuit, isValidEmail } from '../../../shared/core/utils/validationEngine';
import {
  applyClientToDraftWithCascade,
  resolveSuggestedVoucherForClient,
} from '../domain/voucherCascadeEngine';

interface FactClientesStepProps extends FactStepBaseProps {
  onSelectForBilling?: () => void;
}

/** Paso 4 — Cartera maestra de clientes (cifrada, local). */
export const FactClientesStep: React.FC<FactClientesStepProps> = ({
  vault,
  updateVault,
  draft,
  updateDraft,
  notify,
  onSelectForBilling,
}) => {
  const { confirm } = useConfirm();
  const [search, setSearch] = useState('');
  const [editingClient, setEditingClient] = useState<ClienteFactura | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  const filteredClients = useMemo(
    () =>
      vault.clientes.filter((c) =>
        matchesSearchQuery([c.nombre, c.cuit, c.localidad, c.email], search, 3),
      ),
    [vault.clientes, search],
  );

  const startNewClient = () => {
    setIsCreatingNew(true);
    setEditingClient(emptyCliente());
  };

  const startEditClient = (cliente: ClienteFactura) => {
    setIsCreatingNew(false);
    setEditingClient({ ...cliente });
  };

  const saveClient = () => {
    if (!editingClient) return;
    if (!editingClient.nombre.trim()) {
      notify.error('Completá al menos el nombre o razón social del cliente.');
      return;
    }

    const cleaned: ClienteFactura = {
      ...editingClient,
      nombre: editingClient.nombre.trim(),
    };

    updateVault((prev) => {
      const exists = prev.clientes.some((c) => c.id === cleaned.id);
      return {
        ...prev,
        clientes: exists
          ? prev.clientes.map((c) => (c.id === cleaned.id ? cleaned : c))
          : [...prev.clientes, cleaned],
      };
    });

    // Sincronizar automáticamente si es el cliente activo en el borrador actual
    if (draft.cliente?.id === cleaned.id) {
      updateDraft((prev) => ({ ...prev, cliente: cleaned }));
    }

    notify.success(isCreatingNew ? `Cliente "${cleaned.nombre}" guardado.` : `Datos de "${cleaned.nombre}" actualizados.`);
    setEditingClient(null);
    setIsCreatingNew(false);
  };

  const removeCliente = async (id: string) => {
    const target = vault.clientes.find((c) => c.id === id);
    const ok = await confirm({
      title: `¿Eliminar a "${target?.nombre || 'este cliente'}" de tu cartera?`,
      message: 'Si lo necesitas después, podés volver con Deshacer.',
      confirmText: 'Sí, eliminar',
      cancelText: 'Conservar',
    });
    if (!ok) return;
    updateVault((prev) => ({ ...prev, clientes: prev.clientes.filter((cliente) => cliente.id !== id) }));
    if (draft.cliente?.id === id) {
      updateDraft((prev) => ({ ...prev, cliente: null }));
    }
    if (editingClient?.id === id) {
      setEditingClient(null);
      setIsCreatingNew(false);
    }
  };

  const assignToCurrentInvoice = (cliente: ClienteFactura) => {
    const nextDraft = applyClientToDraftWithCascade(draft, vault, cliente);
    updateDraft(() => nextDraft);
    notify.success(`Facturando a ${cliente.nombre} (Factura ${nextDraft.letra}).`);
    onSelectForBilling?.();
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Users className="w-5 h-5" /> Cartera de clientes
        </h2>
        <p className="text-xs text-[var(--ui-text-secondary)] mt-1">
          Guardados localmente en tu bóveda cifrada. Para asignarlos rápido también podés usar la píldora “Cliente” arriba.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchFilterBar
          value={search}
          onChange={setSearch}
          placeholder="Buscar cliente por nombre, CUIT o localidad (3+ letras)..."
          totalCount={vault.clientes.length}
          filteredCount={filteredClients.length}
          className="flex-1 min-w-[180px]"
        />
        <button
          type="button"
          onClick={startNewClient}
          className={`${button.primary} py-2 px-3 text-xs font-bold inline-flex items-center gap-1.5 shrink-0`}
        >
          <Plus className="w-4 h-4" /> Nuevo cliente
        </button>
      </div>

      {editingClient && (
        <PanelSection
          icon={<Users className="w-4 h-4" />}
          title={isCreatingNew ? 'Nuevo cliente' : `Editando: ${editingClient.nombre || 'Cliente'}`}
        >
          <div className="space-y-2.5">
            <Field
              label="Nombre o razón social"
              value={editingClient.nombre}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setEditingClient({ ...editingClient, nombre: e.target.value })
              }
            />
            <div className="grid grid-cols-2 gap-2">
              <Field
                label="CUIT"
                value={editingClient.cuit}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditingClient({ ...editingClient, cuit: e.target.value })
                }
                error={editingClient.cuit && !isValidCuit(editingClient.cuit) ? 'CUIT inválido' : null}
              />
              <Field
                as="select"
                label="Condición IVA"
                value={editingClient.condicionIva}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setEditingClient({
                    ...editingClient,
                    condicionIva: e.target.value as ClienteFactura['condicionIva'],
                  })
                }
              >
                {CONDICIONES_IVA.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Field>
            </div>
            <Field
              label="Domicilio"
              value={editingClient.domicilio}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setEditingClient({ ...editingClient, domicilio: e.target.value })
              }
            />
            <div className="grid grid-cols-2 gap-2">
              <Field
                label="Localidad"
                value={editingClient.localidad}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditingClient({ ...editingClient, localidad: e.target.value })
                }
              />
              <Field
                label="Teléfono"
                value={editingClient.telefono}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditingClient({ ...editingClient, telefono: e.target.value })
                }
              />
            </div>
            <Field
              label="Email"
              value={editingClient.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setEditingClient({ ...editingClient, email: e.target.value })
              }
              error={editingClient.email && !isValidEmail(editingClient.email) ? 'Email inválido' : null}
            />
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setEditingClient(null);
                  setIsCreatingNew(false);
                }}
                className={`${button.ghost} text-xs py-1.5 px-3`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveClient}
                className={`${button.success} text-xs py-2 px-4 inline-flex items-center gap-1.5`}
              >
                <Check className="w-3.5 h-3.5" /> Guardar cliente
              </button>
            </div>
          </div>
        </PanelSection>
      )}

      {filteredClients.length === 0 ? (
        <p className="text-xs text-[var(--ui-text-secondary)] italic">
          {vault.clientes.length === 0
            ? 'Todavía no cargaste clientes. Podés facturar a Consumidor Final igual.'
            : 'No encontramos clientes con esa búsqueda.'}
        </p>
      ) : (
        <div className="space-y-2">
          {filteredClients.map((cliente) => {
            const isActive = draft.cliente?.id === cliente.id;
            const suggested = resolveSuggestedVoucherForClient(vault.empresa.condicionIva, cliente);
            return (
              <div
                key={cliente.id}
                className={`p-2.5 rounded-[12px] border space-y-2 ${
                  isActive
                    ? 'border-[var(--color-status-success-base)] bg-[var(--color-status-success-muted)]/35'
                    : 'border-[var(--ui-border)] bg-[var(--ui-bg-card)]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[var(--ui-text-primary)] truncate">
                      {cliente.nombre || 'Cliente sin nombre'}
                    </p>
                    <p className="text-[11px] text-[var(--ui-text-secondary)]">
                      {CONDICION_IVA_LABEL[cliente.condicionIva]} · {cliente.cuit || 'Sin CUIT'}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--color-secondary-muted)] text-[var(--color-secondary-text)] shrink-0">
                    Habitual: {suggested.letra}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--ui-border)]">
                  {isActive ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-[var(--color-status-success-text)] inline-flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5" /> Activo en comprobante actual
                      </span>
                      <button
                        type="button"
                        onClick={() => updateDraft((prev) => ({ ...prev, cliente: null }))}
                        className="text-[10px] font-bold text-[var(--ui-text-secondary)] underline cursor-pointer"
                      >
                        Quitar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => assignToCurrentInvoice(cliente)}
                      className="text-xs font-bold text-[var(--color-accent-text)] hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5" /> Facturar a este cliente →
                    </button>
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startEditClient(cliente)}
                      title="Editar cliente"
                      className="p-1.5 rounded-[8px] border border-[var(--ui-border)] text-[var(--ui-text-primary)] hover:bg-[var(--ui-bg-panel)] cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeCliente(cliente.id)}
                      title="Eliminar cliente"
                      className="p-1.5 rounded-[8px] text-[var(--color-status-danger-text)] hover:bg-[var(--color-status-danger-muted)] cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
