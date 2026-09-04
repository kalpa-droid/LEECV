import React, { useState, useEffect } from 'react';
import { listProcessedPayments } from '../adminService';
import { useToast } from '../../../shared/core/ui/Toast';
import { withErrorHandling } from '../../../shared/core/utils/errorHandler';
import { elevationSystem, radius } from '../../../shared/core/uiDesignSystem';
import { CreditCard, Search, RefreshCw, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

export function ProcessedPaymentsTab() {
  const { showError } = useToast();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [providerFilter, setProviderFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const pageSize = 20;

  async function fetchPayments() {
    setLoading(true);
    await withErrorHandling(
      async () => {
        const res = await listProcessedPayments({
          page,
          limit: pageSize,
          provider: providerFilter,
          q: searchQuery,
        });
        setPayments(res?.payments || []);
        setTotalCount(res?.totalCount || 0);
      },
      {
        context: 'Carga de Historial de Pagos',
        errorMessage: 'Inconveniente al obtener pagos procesados.',
        notify: (msg) => showError(msg),
      }
    );
    setLoading(false);
  }

  useEffect(() => {
    fetchPayments();
  }, [page, providerFilter]);

  return (
    <div className="space-y-4">
      <div className={`bg-[var(--ui-bg-card)] rounded-[${radius.modal}] ${elevationSystem.raised} border border-[var(--color-neutral-border)] overflow-hidden`}>
        {/* Cabecera y Controles */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-b border-[var(--color-neutral-border)]">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[var(--color-secondary-text)]" />
            <div>
              <h2 className="font-extrabold text-sm text-[var(--color-neutral-text-primary)]">Historial de Pagos Procesados (Ledger Canónico)</h2>
              <p className="text-[10px] text-[var(--color-neutral-text-secondary)]">Registro idempotente de pasarelas automáticas y activaciones manuales</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            {/* Filtro por Proveedor */}
            <div className={`flex items-center gap-1 bg-[var(--color-neutral-surface-cream)] px-2.5 py-1.5 rounded-[${radius.card}] border border-[var(--color-neutral-border)] text-xs font-bold w-full sm:w-auto`}>
              <Filter className="w-3.5 h-3.5 text-[var(--color-neutral-text-secondary)]" />
              <select
                value={providerFilter}
                onChange={(e) => { setProviderFilter(e.target.value); setPage(0); }}
                className="bg-transparent text-xs font-bold text-[var(--color-neutral-text-primary)] outline-none cursor-pointer"
              >
                <option value="all">Todos los Proveedores</option>
                <option value="mercadopago">Mercado Pago</option>
                <option value="paypal">PayPal</option>
                <option value="lemonsqueezy">Lemon Squeezy</option>
                <option value="manual">Manual / Transferencia</option>
              </select>
            </div>

            {/* Búsqueda por Email o Ref Externa */}
            <div className="relative flex-1 sm:w-56 w-full">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-neutral-text-muted)]" />
              <input
                type="text"
                placeholder="Buscar por email o ID ref..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { setPage(0); fetchPayments(); } }}
                className={`w-full text-xs pl-9 pr-3 py-1.5 border border-[var(--color-neutral-border)] rounded-[${radius.card}] font-medium outline-none focus:border-[var(--color-secondary-base)]`}
              />
            </div>

            <button
              onClick={() => { setPage(0); fetchPayments(); }}
              className={`p-2 text-[var(--color-secondary-text)] hover:bg-[var(--color-neutral-surface-muted)] rounded-[${radius.card}] transition cursor-pointer`}
              title="Actualizar tabla"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[var(--color-neutral-surface-cream)] text-[var(--color-neutral-text-primary)]/70 text-left font-extrabold">
              <tr>
                <th className="px-5 py-3">Fecha / Hora</th>
                <th className="px-5 py-3">Proveedor</th>
                <th className="px-5 py-3">Ref. Externa / ID</th>
                <th className="px-5 py-3">Usuario / Email</th>
                <th className="px-5 py-3">Plan / Paquete</th>
                <th className="px-5 py-3 text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-neutral-border)]/60">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-xs text-[var(--color-neutral-text-secondary)] font-medium">
                    {loading ? 'Cargando transacciones de pagos...' : 'No se encontraron pagos registrados con los filtros aplicados.'}
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-[var(--color-neutral-surface-cream)]/40 transition">
                    <td className="px-5 py-3 font-medium text-[var(--color-neutral-text-secondary)] whitespace-nowrap">
                      {p.created_at || p.processed_at ? new Date(p.created_at || p.processed_at).toLocaleString('es-AR') : '-'}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      {p.provider === 'mercadopago' ? (
                        <span className="px-2 py-0.5 rounded-full bg-[var(--color-status-success-muted)] text-[var(--color-status-success-text)] border border-[var(--color-status-success-base)]/30 font-bold text-[10px]">
                          Mercado Pago
                        </span>
                      ) : p.provider === 'paypal' ? (
                        <span className="px-2 py-0.5 rounded-full bg-[var(--color-secondary-muted)] text-[var(--color-secondary-text)] border border-[var(--color-secondary-base)]/30 font-bold text-[10px]">
                          PayPal
                        </span>
                      ) : p.provider === 'lemonsqueezy' ? (
                        <span className="px-2 py-0.5 rounded-full bg-[var(--color-accent-purple-light)] text-[var(--color-accent-purple-text)] border border-[var(--color-accent-purple)]/30 font-bold text-[10px]">
                          Lemon Squeezy
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-[var(--color-status-warning-muted)] text-[var(--color-status-warning-text)] border border-[var(--color-status-warning-base)]/30 font-bold text-[10px]">
                          Manual / Transferencia
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 font-mono text-[11px] text-[var(--color-neutral-text-primary)]">
                      {p.external_id || '-'}
                    </td>
                    <td className="px-5 py-3 font-bold text-[var(--color-neutral-text-primary)]">
                      {p.user_email || p.user_id || 'Usuario registrado'}
                    </td>
                    <td className="px-5 py-3 font-extrabold text-[var(--color-neutral-text-primary)]">
                      <span className="uppercase text-[10px] tracking-wide px-2 py-0.5 rounded bg-[var(--color-neutral-surface-muted)] border border-[var(--color-neutral-border)]">
                        {p.plan || 'pro'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-black text-[var(--color-neutral-text-primary)] whitespace-nowrap">
                      {p.amount !== undefined && p.amount !== null
                        ? `${p.currency || (p.provider === 'mercadopago' ? 'ARS' : 'USD')} $${p.amount}`
                        : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="px-5 py-3 bg-[var(--color-neutral-surface-cream)]/50 border-t border-[var(--color-neutral-border)] flex items-center justify-between text-xs text-[var(--color-neutral-text-secondary)]">
          <span>
            Mostrando {payments.length > 0 ? page * pageSize + 1 : 0} a {Math.min((page + 1) * pageSize, totalCount)} de {totalCount} transacciones
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage(p => Math.max(0, p - 1))}
              className={`p-1.5 rounded-[${radius.control}] border border-[var(--color-neutral-border)] disabled:opacity-40 hover:bg-[var(--color-neutral-surface-muted)] transition`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold">Página {page + 1}</span>
            <button
              disabled={(page + 1) * pageSize >= totalCount}
              onClick={() => setPage(p => p + 1)}
              className={`p-1.5 rounded-[${radius.control}] border border-[var(--color-neutral-border)] disabled:opacity-40 hover:bg-[var(--color-neutral-surface-muted)] transition`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
