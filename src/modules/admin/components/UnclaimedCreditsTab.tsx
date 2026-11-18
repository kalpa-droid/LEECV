import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Mail, RefreshCw } from 'lucide-react';
import { listUnclaimedCredits, resendUnclaimedReminder } from '../adminService';
import type { UnclaimedCreditRow } from '../adminService';
import { useToast } from '../../../shared/core/ui/Toast';
import { withErrorHandling } from '../../../shared/core/utils/errorHandler';
import { button, radius, elevationSystem } from '../../../shared/core/uiDesignSystem';
import { getPaymentProviderBadge, getPaymentProviderDefaultCurrency } from '../../../shared/core/payments/paymentProviderCatalog';

const PAGE_SIZE = 20;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysSince(iso: string): number {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.floor((Date.now() - then) / MS_PER_DAY);
}

export function UnclaimedCreditsTab() {
  const { showError, showSuccess } = useToast();
  const [credits, setCredits] = useState<UnclaimedCreditRow[]>([]);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  async function fetchCredits() {
    setLoading(true);
    await withErrorHandling(
      async () => {
        const result = await listUnclaimedCredits({ page, limit: PAGE_SIZE });
        setCredits(result.credits || []);
        setTotalCount(result.totalCount || 0);
      },
      {
        context: 'Carga de créditos sin reclamar',
        errorMessage: 'No se pudieron cargar los créditos sin reclamar.',
        notify: (message) => showError(message),
      }
    );
    setLoading(false);
  }

  useEffect(() => {
    fetchCredits();
  }, [page]);

  async function resend(row: UnclaimedCreditRow) {
    setResendingId(row.id);
    await withErrorHandling(
      async () => {
        await resendUnclaimedReminder(row.id);
        showSuccess(`Recordatorio reenviado a ${row.email}.`);
        await fetchCredits();
      },
      {
        context: 'Reenvío de recordatorio de créditos',
        errorMessage: 'No se pudo reenviar el recordatorio.',
        notify: (message) => showError(message),
      }
    );
    setResendingId(null);
  }

  return (
    <div
      className={`bg-[var(--ui-bg-card)] ${elevationSystem.raised} border border-[var(--color-neutral-border)] overflow-hidden`}
      style={{ borderRadius: radius.modal }}
    >
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[var(--color-neutral-border)]">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-[var(--color-status-warning-text)]" />
          <div>
            <h2 className="font-extrabold text-sm text-[var(--color-neutral-text-primary)]">Créditos comprados sin cuenta</h2>
            <p className="text-[10px] text-[var(--color-neutral-text-secondary)]">
              Se acreditan solos cuando la persona entra con el mismo correo. A los 7 días se envía un aviso; al año sin entrar expiran.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchCredits}
          className={`${button.secondary} p-2`}
          title="Actualizar créditos sin reclamar"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[760px]">
          <thead className="bg-[var(--color-neutral-surface-cream)] text-[var(--color-neutral-text-primary)]/70 text-left font-extrabold">
            <tr>
              <th className="px-5 py-3">Compra</th>
              <th className="px-5 py-3">Proveedor</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Créditos / importe</th>
              <th className="px-5 py-3">Aviso</th>
              <th className="px-5 py-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-neutral-border)]/60">
            {credits.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-[var(--color-neutral-text-secondary)]">
                  {loading ? 'Cargando créditos sin reclamar…' : 'No hay créditos pendientes de reclamo.'}
                </td>
              </tr>
            ) : credits.map((row) => {
              const badge = getPaymentProviderBadge(row.provider || '');
              const age = daysSince(row.created_at);
              return (
                <tr key={row.id}>
                  <td className="px-5 py-3 whitespace-nowrap text-[var(--color-neutral-text-secondary)]">
                    <div>{new Date(row.created_at).toLocaleString('es-AR')}</div>
                    <div className="text-[10px]">hace {age} día{age === 1 ? '' : 's'}</div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full border font-bold text-[10px] ${badge.className}`}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-bold">{row.email}</td>
                  <td className="px-5 py-3">
                    <div className="font-bold">{row.credits} crédito{row.credits === 1 ? '' : 's'}</div>
                    <div className="text-[var(--color-neutral-text-secondary)]">
                      {row.amount !== null && row.amount !== undefined
                        ? `${row.currency || getPaymentProviderDefaultCurrency(row.provider || '')} ${row.amount}`
                        : 'Importe no informado'}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-[var(--color-neutral-text-secondary)]">
                    {row.reminder_sent_at
                      ? `Avisado el ${new Date(row.reminder_sent_at).toLocaleString('es-AR')}`
                      : 'Sin avisar todavía'}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => resend(row)}
                      disabled={resendingId === row.id}
                      className={`${button.primary} px-2.5 py-1 text-[10px] font-black disabled:opacity-50`}
                    >
                      {resendingId === row.id ? 'Enviando…' : 'Reenviar aviso'}
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
          {totalCount === 0 ? '0 compras' : `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, totalCount)} de ${totalCount}`}
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
  );
}
