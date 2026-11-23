import React from 'react';
import { Hash, TriangleAlert, UserPlus } from 'lucide-react';
import { Modal } from '../../../shared/core/ui/Modal';
import { Field } from '../../../shared/core/ui/Field';
import { ManualOverrideBadge } from '../../../shared/core/ui/ManualOverrideBadge';
import { isManuallyOverridden, markManualOverride } from '../../../shared/core/presets/configCascadeEngine';
import { button } from '../../../shared/core/uiDesignSystem';
import { FactStepBaseProps } from '../facturadorStepsShared';
import { ComprobanteLetra, ComprobanteTipo } from '../domain/facturadorTypes';
import { formatCompNro, formatPointOfSale } from '../domain/invoiceMath';
import {
  applyManualVoucherTypeToDraft,
  getNextVoucherNumber,
  hasDuplicateVoucherNumber,
  resetDraftVoucherToClientHabitual,
  resolveSuggestedVoucherForClient,
} from '../domain/voucherCascadeEngine';

interface FactVoucherConfigModalProps extends FactStepBaseProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNewClientPicker: () => void;
  rememberHabitualForClient: boolean;
  onToggleRememberHabitual: (val: boolean) => void;
}

const LETTERS: ComprobanteLetra[] = ['A', 'B', 'C', 'X', 'R'];

export const FactVoucherConfigModal: React.FC<FactVoucherConfigModalProps> = ({
  isOpen,
  onClose,
  onOpenNewClientPicker,
  rememberHabitualForClient,
  onToggleRememberHabitual,
  vault,
  draft,
  updateDraft,
}) => {
  const hasManualVoucher = isManuallyOverridden(draft, 'voucherType');
  const suggestedForClient = resolveSuggestedVoucherForClient(
    vault.empresa.condicionIva,
    draft.cliente,
  );
  const isDuplicate = hasDuplicateVoucherNumber(vault, draft);

  const handleTipoChange = (nextTipo: ComprobanteTipo) => {
    const defaultLetter: ComprobanteLetra =
      nextTipo === 'remito' ? 'R' : nextTipo === 'presupuesto' ? 'X' : draft.letra;
    updateDraft((prev) => applyManualVoucherTypeToDraft(prev, vault, nextTipo, defaultLetter));
  };

  const handleLetraChange = (nextLetra: ComprobanteLetra) => {
    updateDraft((prev) => applyManualVoucherTypeToDraft(prev, vault, prev.tipo, nextLetra));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tipo de comprobante y numeración"
      helpText="Cada tipo y letra lleva su propio talonario correlativo automático. Cambiar el comprobante aquí no pisa la configuración habitual de tus clientes."
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-2 w-full">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenNewClientPicker();
            }}
            className={`${button.secondary} text-xs inline-flex items-center gap-1.5`}
          >
            <UserPlus className="w-3.5 h-3.5" /> Nuevo cliente para esta factura
          </button>
          <button type="button" onClick={onClose} className={`${button.primary} text-xs`}>
            Aplicar al comprobante
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="p-3 rounded-[10px] bg-[var(--color-status-warning-muted)] border border-[var(--color-status-warning-base)]/40 text-[11px] text-[var(--color-status-warning-text)] flex items-start gap-2">
          <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Comprobante interno / presupuesto sin CAE de ARCA. La numeración se incrementa automáticamente al emitir.
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-[var(--ui-text-primary)] flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5" /> Documento y letra
          </span>
          {draft.cliente && hasManualVoucher && (
            <ManualOverrideBadge
              isOverridden={true}
              globalLabel={`Habitual: ${suggestedForClient.letra}`}
              hasConflict={draft.letra !== suggestedForClient.letra}
              conflictHelpText={`Solo para este comprobante. No cambia el habitual de ${draft.cliente.nombre}.`}
              onReset={() => updateDraft((prev) => resetDraftVoucherToClientHabitual(prev, vault))}
            />
          )}
        </div>

        <Field
          as="select"
          label="Tipo de comprobante"
          value={draft.tipo}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            handleTipoChange(e.target.value as ComprobanteTipo)
          }
        >
          <option value="factura">Factura (interna, sin CAE)</option>
          <option value="presupuesto">Presupuesto</option>
          <option value="nota_credito">Nota de Crédito interna</option>
          <option value="remito">Remito de entrega</option>
          <option value="recibo">Recibo de cobro</option>
        </Field>

        <div>
          <span className="block text-xs font-bold mb-1.5 text-[var(--ui-text-primary)]">Letra</span>
          <div className="grid grid-cols-5 gap-1.5">
            {LETTERS.map((letra) => (
              <button
                key={letra}
                type="button"
                onClick={() => handleLetraChange(letra)}
                className={`py-2 text-sm font-black rounded-[10px] border transition cursor-pointer ${
                  draft.letra === letra
                    ? 'bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] border-[var(--color-accent-base)]'
                    : 'bg-[var(--ui-bg-card)] text-[var(--ui-text-primary)] border-[var(--ui-border)] hover:border-[var(--color-accent-base)]/60'
                }`}
              >
                {letra}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-[var(--ui-text-secondary)] mt-1">
            Letra A discrimina IVA · B, C, X y R muestran precios finales.
          </p>
        </div>

        {draft.cliente && draft.tipo === 'factura' && hasManualVoucher && (
          <label className="flex items-center gap-2 text-xs text-[var(--ui-text-primary)] cursor-pointer p-2.5 rounded-[10px] bg-[var(--ui-bg-panel)] border border-[var(--ui-border)]">
            <input
              type="checkbox"
              checked={rememberHabitualForClient}
              onChange={(e) => onToggleRememberHabitual(e.target.checked)}
              className="w-4 h-4 accent-[var(--color-accent-base)]"
            />
            <span>Recordar letra {draft.letra} como nuevo tipo habitual para {draft.cliente.nombre}</span>
          </label>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Field
            label="Punto de venta"
            value={draft.puntoVenta}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const pv = e.target.value.replace(/\D/g, '').slice(0, 5);
              updateDraft((prev) => ({
                ...prev,
                puntoVenta: pv,
                numero: getNextVoucherNumber(vault, pv || '00001', prev.tipo, prev.letra),
              }));
            }}
            onBlur={() =>
              updateDraft((prev) => ({ ...prev, puntoVenta: formatPointOfSale(prev.puntoVenta) }))
            }
            maxLength={5}
          />
          <Field
            label="Número correlativo"
            value={draft.numero}
            error={isDuplicate ? 'Este número ya fue emitido en esta serie.' : null}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const clean = e.target.value.replace(/\D/g, '').slice(0, 8);
              updateDraft((prev) => markManualOverride({ ...prev, numero: clean }, 'numero'));
            }}
            onBlur={() =>
              updateDraft((prev) => ({ ...prev, numero: formatCompNro(prev.numero) }))
            }
            maxLength={8}
            headerAction={
              <button
                type="button"
                onClick={() =>
                  updateDraft((prev) => ({
                    ...prev,
                    manualOverrides: { ...(prev.manualOverrides || {}), numero: false },
                    numero: getNextVoucherNumber(vault, prev.puntoVenta, prev.tipo, prev.letra),
                  }))
                }
                className="text-[10px] font-bold text-[var(--color-accent-text)] underline cursor-pointer"
              >
                Auto próximo
              </button>
            }
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Field
            type="date"
            label="Fecha de emisión"
            value={draft.fecha}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              updateDraft((prev) => ({ ...prev, fecha: e.target.value }))
            }
          />
          <Field
            type="date"
            label="Vencimiento (opcional)"
            value={draft.vencimiento}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              updateDraft((prev) => ({ ...prev, vencimiento: e.target.value }))
            }
          />
        </div>
      </div>
    </Modal>
  );
};

export default FactVoucherConfigModal;
