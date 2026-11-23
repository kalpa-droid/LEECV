import React, { useMemo, useState } from 'react';
import { UserCheck, UserPlus, Users } from 'lucide-react';
import { Modal } from '../../../shared/core/ui/Modal';
import { Field } from '../../../shared/core/ui/Field';
import { SearchFilterBar, matchesSearchQuery } from '../../../shared/core/ui/SearchFilterBar';
import { button } from '../../../shared/core/uiDesignSystem';
import { CONDICIONES_IVA, FactStepBaseProps, emptyCliente, makeId } from '../facturadorStepsShared';
import { ClienteFactura } from '../domain/facturadorTypes';
import { CONDICION_IVA_LABEL } from '../domain/invoiceMath';
import {
  applyClientToDraftWithCascade,
  resolveSuggestedVoucherForClient,
} from '../domain/voucherCascadeEngine';

interface FactClientPickerModalProps extends FactStepBaseProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatTipoShort(tipo: string): string {
  if (tipo === 'presupuesto') return 'Presupuesto';
  if (tipo === 'nota_credito') return 'Nota de Crédito';
  if (tipo === 'remito') return 'Remito';
  if (tipo === 'recibo') return 'Recibo';
  return 'Factura';
}

export const FactClientPickerModal: React.FC<FactClientPickerModalProps> = ({
  isOpen,
  onClose,
  vault,
  updateVault,
  draft,
  updateDraft,
  notify,
}) => {
  const [search, setSearch] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [quickClient, setQuickClient] = useState<ClienteFactura>(() => emptyCliente());

  const filteredClients = useMemo(
    () =>
      vault.clientes.filter((c) =>
        matchesSearchQuery([c.nombre, c.cuit, c.localidad, c.email], search, 3),
      ),
    [vault.clientes, search],
  );

  const handleSelectClient = (cliente: ClienteFactura | null) => {
    const nextDraft = applyClientToDraftWithCascade(draft, vault, cliente);
    updateDraft(() => nextDraft);
    const label = cliente
      ? `${cliente.nombre} (${formatTipoShort(nextDraft.tipo)} ${nextDraft.letra})`
      : 'Consumidor Final';
    notify.success(`Cliente asignado: ${label}`);
    onClose();
  };

  const handleCreateAndUse = () => {
    if (!quickClient.nombre.trim()) {
      notify.error('Ingresá al menos el nombre o razón social del cliente.');
      return;
    }
    const created: ClienteFactura = { ...quickClient, id: makeId('cli') };
    updateVault((prev) => ({ ...prev, clientes: [...prev.clientes, created] }));
    const nextDraft = applyClientToDraftWithCascade(draft, vault, created);
    updateDraft(() => nextDraft);
    setQuickClient(emptyCliente());
    setShowNewForm(false);
    notify.success(`Cliente guardado y asignado (${formatTipoShort(nextDraft.tipo)} ${nextDraft.letra}).`);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Elegir cliente para este comprobante"
      helpText="Al elegir un cliente guardado se sugiere automáticamente el tipo de factura que usaste con él la última vez, sin bloquear un cambio manual en el comprobante."
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-2 w-full">
          <button
            type="button"
            onClick={() => handleSelectClient(null)}
            className={`${button.secondary} text-xs`}
          >
            Facturar a Consumidor Final
          </button>
          <button type="button" onClick={onClose} className={`${button.ghost} text-xs`}>
            Cerrar
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SearchFilterBar
            value={search}
            onChange={setSearch}
            placeholder="Buscar cliente por nombre, CUIT o localidad (3+ letras)..."
            totalCount={vault.clientes.length}
            filteredCount={filteredClients.length}
            className="flex-1 min-w-[220px]"
          />
          <button
            type="button"
            onClick={() => setShowNewForm((prev) => !prev)}
            className={`${button.primary} text-xs inline-flex items-center gap-1.5 shrink-0`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            {showNewForm ? 'Ver lista guardada' : '+ Nuevo cliente'}
          </button>
        </div>

        {showNewForm ? (
          <div className="p-3.5 rounded-[12px] border border-[var(--ui-border-strong)] bg-[var(--ui-bg-panel)] space-y-2.5">
            <p className="text-xs font-bold text-[var(--ui-text-primary)]">
              Crear cliente nuevo en tu cartera y usarlo ahora
            </p>
            <Field
              label="Nombre o razón social"
              value={quickClient.nombre}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setQuickClient({ ...quickClient, nombre: e.target.value })
              }
              placeholder="Ej: Estudio Norte SRL"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Field
                label="CUIT / DNI"
                value={quickClient.cuit}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setQuickClient({ ...quickClient, cuit: e.target.value })
                }
                placeholder="30-71111111-9"
              />
              <Field
                as="select"
                label="Condición frente al IVA"
                value={quickClient.condicionIva}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setQuickClient({
                    ...quickClient,
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Field
                label="Domicilio"
                value={quickClient.domicilio}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setQuickClient({ ...quickClient, domicilio: e.target.value })
                }
              />
              <Field
                label="Localidad"
                value={quickClient.localidad}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setQuickClient({ ...quickClient, localidad: e.target.value })
                }
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowNewForm(false)}
                className={`${button.ghost} text-xs`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateAndUse}
                className={`${button.success} text-xs inline-flex items-center gap-1.5`}
              >
                <UserCheck className="w-3.5 h-3.5" /> Guardar cliente y usar ahora
              </button>
            </div>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="p-6 text-center rounded-[12px] border border-dashed border-[var(--ui-border)] text-xs text-[var(--ui-text-secondary)]">
            <Users className="w-6 h-6 mx-auto mb-1.5 opacity-60" />
            {vault.clientes.length === 0
              ? 'Todavía no guardaste clientes. Podés facturar a Consumidor Final o crear uno con "+ Nuevo cliente".'
              : 'No encontramos clientes con esa búsqueda.'}
          </div>
        ) : (
          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {filteredClients.map((cli) => {
              const isSelected = draft.cliente?.id === cli.id;
              const suggested = resolveSuggestedVoucherForClient(vault.empresa.condicionIva, cli);
              const badgeLabel = cli.ultimaLetraComprobante
                ? `Última vez: ${formatTipoShort(cli.ultimoTipoComprobante || 'factura')} ${cli.ultimaLetraComprobante}`
                : `Sugerido: Factura ${suggested.letra}`;

              return (
                <button
                  key={cli.id}
                  type="button"
                  onClick={() => handleSelectClient(cli)}
                  className={`w-full text-left p-3 rounded-[12px] border transition flex items-center justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-muted)]'
                      : 'border-[var(--ui-border)] bg-[var(--ui-bg-card)] hover:border-[var(--color-accent-base)]/60'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[var(--ui-text-primary)] truncate">
                      {cli.nombre || 'Cliente sin nombre'}
                    </p>
                    <p className="text-[11px] text-[var(--ui-text-secondary)] truncate">
                      {CONDICION_IVA_LABEL[cli.condicionIva]} · {cli.cuit ? `CUIT ${cli.cuit}` : 'Sin CUIT'}
                      {cli.localidad ? ` · ${cli.localidad}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--color-secondary-muted)] text-[var(--color-secondary-text)]">
                      {badgeLabel}
                    </span>
                    {isSelected && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)]">
                        Actual
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default FactClientPickerModal;
