import React, { useEffect, useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { listPendingGrants, resolvePendingGrant } from '../adminService';
import { useToast } from '../../../shared/core/ui/Toast';
import { withErrorHandling } from '../../../shared/core/utils/errorHandler';
import { button, radius, elevationSystem } from '../../../shared/core/uiDesignSystem';
import { Modal } from '../../../shared/core/ui/Modal';
import { Field } from '../../../shared/core/ui/Field';
import { getPaymentProviderBadge, getPaymentProviderDefaultCurrency } from '../../../shared/core/payments/paymentProviderCatalog';

const PAGE_SIZE = 20;

const HOLD_REASON_LABELS: Record<string, string> = {
  provider_pending: 'La pasarela todavía no confirmó el cobro',
  amount_mismatch: 'El importe o la moneda no coinciden',
  missing_profile: 'El pago no tiene una cuenta asociada',
};

export function PendingGrantsTab() {
  const { showError, showSuccess } = useToast();
  const [grants, setGrants] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedGrant, setSelectedGrant] = useState<any>(null);
  const [reason, setReason] = useState('');
  const [approveAmountMismatch, setApproveAmountMismatch] = useState(false);
  const [resolving, setResolving] = useState(false);

  async function fetchGrants() {
    setLoading(true);
    await withErrorHandling(
      async () => {
        const result = await listPendingGrants({ page, limit: PAGE_SIZE });
        setGrants(result.grants || []);
        setTotalCount(result.totalCount || 0);
      },
      {
        context: 'Carga de pagos retenidos',
        errorMessage: 'No se pudieron cargar los pagos retenidos.',
        notify: (message) => showError(message),
      }
    );
    setLoading(false);
  }

  useEffect(() => {
    fetchGrants();
  }, [page]);

  function openResolver(grant: any) {
    setSelectedGrant(grant);
    setReason('');
    setApproveAmountMismatch(false);
  }

  async function submitResolution() {
    if (!selectedGrant || reason.trim().length < 5) {
      showError('Indicá un motivo de al menos 5 caracteres.');
      return;
    }

    setResolving(true);
    await withErrorHandling(
      async () => {
        await resolvePendingGrant({
          grantId: selectedGrant.id,
          targetEmail: selectedGrant.email || '',
          reason: reason.trim(),
          approveAmountMismatch,
        });
        showSuccess(`Pago de ${selectedGrant.email || 'email no disponible'} acreditado y marcado como resuelto.`);
        setSelectedGrant(null);
        await fetchGrants();
      },
      {
        context: 'Resolución de pago retenido',
        errorMessage: 'El pago sigue retenido o no se pudo acreditar.',
        notify: (message) => showError(message),
      }
    );
    setResolving(false);
  }

  return (
    <>
      <div className={`bg-[var(--ui-bg-card)] ${elevationSystem.raised} border border-[var(--color-neutral-border)] overflow-hidden`} style={{ borderRadius: radius.modal }}>
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[var(--color-neutral-border)]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[var(--color-status-warning-text)]" />
            <div>
              <h2 className="font-extrabold text-sm text-[var(--color-neutral-text-primary)]">Pagos retenidos para revisión</h2>
              <p className="text-[10px] text-[var(--color-neutral-text-secondary)]">
                Solo muestra pagos recibidos por webhooks validados que necesitan intervención.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchGrants}
            className={`${button.secondary} p-2`}
            title="Actualizar pagos retenidos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[760px]">
            <thead className="bg-[var(--color-neutral-surface-cream)] text-[var(--color-neutral-text-primary)]/70 text-left font-extrabold">
              <tr>
                <th className="px-5 py-3">Fecha</th>
                <th className="px-5 py-3">Proveedor</th>
                <th className="px-5 py-3">Referencia</th>
                <th className="px-5 py-3">Email del pago</th>
                <th className="px-5 py-3">Paquete / importe</th>
                <th className="px-5 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-neutral-border)]/60">
              {grants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-[var(--color-neutral-text-secondary)]">
                    {loading ? 'Cargando pagos retenidos…' : 'No hay pagos pendientes de resolución.'}
                  </td>
                </tr>
              ) : grants.map((grant) => {
                const badge = getPaymentProviderBadge(grant.provider);
                return (
                  <tr key={grant.id}>
                    <td className="px-5 py-3 whitespace-nowrap text-[var(--color-neutral-text-secondary)]">
                      {grant.created_at ? new Date(grant.created_at).toLocaleString('es-AR') : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full border font-bold text-[10px] ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-[11px]">{grant.external_id || '—'}</td>
                    <td className="px-5 py-3 font-bold">{grant.email || 'No informado'}</td>
                    <td className="px-5 py-3">
                      <div className="font-bold">{grant.plan}</div>
                      <div className="text-[var(--color-neutral-text-secondary)]">
                        {grant.amount !== null && grant.amount !== undefined
                          ? `${grant.currency || getPaymentProviderDefaultCurrency(grant.provider)} ${grant.amount}`
                          : 'Importe no informado'}
                      </div>
                      {grant.hold_reason && (
                        <div className="mt-1 text-[10px] font-bold text-[var(--color-status-warning-text)]">
                          {HOLD_REASON_LABELS[grant.hold_reason] || grant.hold_reason}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openResolver(grant)}
                        disabled={!grant.email && grant.plan !== 'single_pdf'}
                        className={`${button.primary} px-2.5 py-1 text-[10px] font-black disabled:opacity-50`}
                      >
                        Revisar / acreditar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 bg-[var(--color-neutral-surface-cream)]/50 border-t border-[var(--color-neutral-border)] flex items-center justify-between text-xs text-[var(--color-neutral-text-secondary)]">
          <span>
            {totalCount === 0 ? '0 pagos' : `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, totalCount)} de ${totalCount}`}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
              className={`${button.secondary} p-1.5 disabled:opacity-40`}
              aria-label="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold">Página {page + 1}</span>
            <button
              type="button"
              disabled={(page + 1) * PAGE_SIZE >= totalCount}
              onClick={() => setPage((current) => current + 1)}
              className={`${button.secondary} p-1.5 disabled:opacity-40`}
              aria-label="Página siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={Boolean(selectedGrant)}
        onClose={() => !resolving && setSelectedGrant(null)}
        title="Revisar pago retenido"
        size="md"
        closeOnOverlayClick={!resolving}
      >
        {selectedGrant && (
          <div className="space-y-4">
            <div className="rounded-[var(--radius-card)] border border-[var(--color-status-warning-base)]/30 bg-[var(--color-status-warning-muted)] p-3 text-xs">
              <p><strong>Email de pago:</strong> {selectedGrant.email || 'No informado'}</p>
              <p><strong>Referencia:</strong> {selectedGrant.external_id}</p>
              <p><strong>Paquete:</strong> {selectedGrant.plan}</p>
              {selectedGrant.hold_reason && (
                <p><strong>Motivo de la retención:</strong> {HOLD_REASON_LABELS[selectedGrant.hold_reason] || selectedGrant.hold_reason}</p>
              )}
              <p className="mt-2">
                Verificá la operación en la cuenta del proveedor antes de acreditar.
                {selectedGrant.plan === 'single_pdf'
                  ? ' Esta venta individual se activa con el token de exportación guardado al retener el pago.'
                  : ' La cuenta destino debe usar el mismo email.'}
              </p>
            </div>

            <Field
              as="textarea"
              id="pending-grant-reason"
              label="Motivo de resolución"
              value={reason}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setReason(event.target.value)}
              placeholder="Ej.: pago aprobado y titular confirmado en el panel de la pasarela"
              rows={3}
              maxLength={500}
              disabled={resolving}
            />

            <label className="flex items-start gap-2 text-xs ui-text-primary">
              <input
                type="checkbox"
                checked={approveAmountMismatch}
                onChange={(event) => setApproveAmountMismatch(event.target.checked)}
                disabled={resolving}
                className="mt-0.5 accent-[var(--color-accent-base)]"
              />
              <span>Autorizo acreditar este paquete aunque el importe o la moneda no coincidan con el precio esperado.</span>
            </label>

            <div className="flex justify-end gap-2 border-t border-[var(--color-neutral-border)] pt-4">
              <button
                type="button"
                className={button.secondary}
                onClick={() => setSelectedGrant(null)}
                disabled={resolving}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={button.primary}
                onClick={submitResolution}
                disabled={resolving || reason.trim().length < 5}
              >
                {resolving ? 'Procesando…' : 'Acreditar y resolver'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
