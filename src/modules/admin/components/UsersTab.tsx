import React from 'react';
import { Search, Crown, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { radius, elevationSystem } from '../../../shared/core/uiDesignSystem';

export function UsersTab({
  users,
  searchQuery,
  setSearchQuery,
  page,
  setPage,
  totalCount,
  pageSize,
  togglePremium
}: any) {
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className={`bg-[var(--ui-bg-card)] rounded-[${radius.modal}] p-5 ${elevationSystem.raised} border border-[var(--color-neutral-border)] space-y-4`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[var(--color-neutral-border)] pb-3 gap-3">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-[var(--color-accent-text)]" />
          <h2 className="font-extrabold text-sm text-[var(--color-neutral-text-primary)]">Gestión de Clientes (listCustomers)</h2>
        </div>
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Buscar por email..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            className={`w-full pl-8 pr-3 py-1.5 text-xs bg-[var(--color-neutral-surface-muted)] text-[var(--color-neutral-text-primary)] border border-[var(--color-neutral-border)] rounded-[${radius.control}] focus:outline-none focus:border-[var(--color-accent-base)] transition`}
          />
          <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-[var(--color-neutral-text-muted)]" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="border-b border-[var(--color-neutral-border)] text-xs text-[var(--color-neutral-text-secondary)]">
              <th className="py-2.5 px-3 font-extrabold">Usuario</th>
              <th className="py-2.5 px-3 font-extrabold">Rol</th>
              <th className="py-2.5 px-3 font-extrabold">Plan</th>
              <th className="py-2.5 px-3 font-extrabold">Créditos</th>
              <th className="py-2.5 px-3 font-extrabold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="text-xs divide-y divide-[var(--color-neutral-border)]">
            {users.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-[var(--color-neutral-text-muted)] font-medium">
                  No se encontraron usuarios.
                </td>
              </tr>
            ) : (
              users.map((user: any) => (
                <tr key={user.id} className="hover:bg-[var(--color-neutral-surface-muted)]/50 transition">
                  <td className="py-3 px-3 font-medium text-[var(--color-neutral-text-primary)]">
                    {user.email}
                  </td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      user.role === 'admin' 
                        ? 'bg-[var(--color-status-danger-muted)] text-[var(--color-status-danger-text)]'
                        : 'bg-[var(--color-neutral-surface-muted)] text-[var(--color-neutral-text-secondary)]'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex items-center gap-1 w-max px-2 py-0.5 rounded text-[10px] font-bold ${
                        user.plan === 'pro'
                          ? 'bg-[var(--color-status-warning-muted)] text-[var(--color-status-warning-text)] border border-[var(--color-status-warning-base)]/20'
                          : 'bg-[var(--color-neutral-surface-muted)] text-[var(--color-neutral-text-secondary)]'
                      }`}>
                        {user.plan === 'pro' && <Crown className="w-3 h-3" />}
                        {user.plan?.toUpperCase() || 'FREE'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex flex-col gap-1 text-[11px] font-medium text-[var(--color-neutral-text-secondary)]">
                      <span>PDF: <strong className="text-[var(--color-neutral-text-primary)]">{user.pdfExportTokens || 0}</strong></span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {user.plan !== 'pro' ? (
                        <button
                          onClick={() => togglePremium(user, 'pro')}
                          className={`px-2.5 py-1 text-[10px] font-black bg-[var(--color-status-warning-base)] text-[var(--color-accent-on-base)] rounded-[${radius.control}] hover:opacity-90 transition flex items-center gap-1`}
                        >
                          <Crown className="w-3 h-3" />
                          Hacer PRO
                        </button>
                      ) : (
                        <button
                          onClick={() => togglePremium(user, 'free')}
                          className={`px-2.5 py-1 text-[10px] font-black bg-[var(--color-neutral-surface)] border border-[var(--color-neutral-border)] text-[var(--color-neutral-text-primary)] rounded-[${radius.control}] hover:bg-[var(--color-neutral-surface-muted)] transition`}
                        >
                          Revocar PRO
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center pt-3 border-t border-[var(--color-neutral-border)]">
          <p className="text-[10px] text-[var(--color-neutral-text-muted)] font-medium">
            Página {page + 1} de {totalPages} ({totalCount} en total)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className={`p-1 text-[var(--color-neutral-text-primary)] disabled:opacity-30 disabled:cursor-not-allowed border border-[var(--color-neutral-border)] rounded bg-[var(--color-neutral-surface-muted)] hover:bg-[var(--color-neutral-border)] transition`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className={`p-1 text-[var(--color-neutral-text-primary)] disabled:opacity-30 disabled:cursor-not-allowed border border-[var(--color-neutral-border)] rounded bg-[var(--color-neutral-surface-muted)] hover:bg-[var(--color-neutral-border)] transition`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
