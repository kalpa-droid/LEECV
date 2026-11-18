import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Globe, RefreshCw, Search } from 'lucide-react';
import { listPublishedCvs, setPublishedCvActive } from '../adminService';
import type { PublishedCvModerationRow } from '../adminService';
import { useToast } from '../../../shared/core/ui/Toast';
import { withErrorHandling } from '../../../shared/core/utils/errorHandler';
import { button, radius, elevationSystem } from '../../../shared/core/uiDesignSystem';

const PAGE_SIZE = 20;

/**
 * Moderación de CVs publicados (/c/:slug). Activar/desactivar únicamente:
 * esta pantalla NUNCA borra el CV del usuario ni el archivo respaldado en
 * Drive. La desactivación es reversible y queda auditada en admin_audit_logs.
 */
export function PublishedCvsTab() {
  const { showError, showSuccess } = useToast();
  const [items, setItems] = useState<PublishedCvModerationRow[]>([]);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  async function fetchItems() {
    setLoading(true);
    await withErrorHandling(
      async () => {
        const result = await listPublishedCvs({ page, limit: PAGE_SIZE, q: search });
        setItems(result.items || []);
        setTotalCount(result.totalCount || 0);
      },
      {
        context: 'Carga de CVs publicados',
        errorMessage: 'No se pudieron cargar los CVs publicados.',
        notify: (message) => showError(message),
      }
    );
    setLoading(false);
  }

  useEffect(() => {
    fetchItems();
  }, [page, search]);

  function applySearch() {
    setPage(0);
    setSearch(searchInput.trim());
  }

  async function toggle(row: PublishedCvModerationRow) {
    setTogglingId(row.id);
    await withErrorHandling(
      async () => {
        await setPublishedCvActive(row.id, !row.isActive);
        showSuccess(row.isActive
          ? `Publicación "${row.slug}" desactivada. Ya no es visible en el sitio.`
          : `Publicación "${row.slug}" activada. Volvió a ser visible en el sitio.`);
        await fetchItems();
      },
      {
        context: 'Cambio de estado de publicación',
        errorMessage: 'No se pudo cambiar el estado de la publicación.',
        notify: (message) => showError(message),
      }
    );
    setTogglingId(null);
  }

  return (
    <div
      className={`bg-[var(--ui-bg-card)] ${elevationSystem.raised} border border-[var(--color-neutral-border)] overflow-hidden`}
      style={{ borderRadius: radius.modal }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-[var(--color-neutral-border)]">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-[var(--color-accent-purple-text)]" />
          <div>
            <h2 className="font-extrabold text-sm text-[var(--color-neutral-text-primary)]">CVs publicados en el sitio</h2>
            <p className="text-[10px] text-[var(--color-neutral-text-secondary)]">
              Moderación: desactivar quita la publicación del sitio (/c/:slug) sin borrar nada. Es reversible.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <form
            className="flex items-center gap-1.5"
            onSubmit={(e) => { e.preventDefault(); applySearch(); }}
          >
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar por slug o email."
              className="h-8 px-2.5 text-xs border border-[var(--color-neutral-border)] bg-[var(--ui-bg-card)] text-[var(--color-neutral-text-primary)] placeholder:text-[var(--color-neutral-text-muted)]"
              style={{ borderRadius: radius.control }}
              aria-label="Buscar publicación"
            />
            <button type="submit" className={`${button.secondary} p-2`} title="Buscar" aria-label="Buscar">
              <Search className="w-4 h-4" />
            </button>
          </form>
          <button
            type="button"
            onClick={fetchItems}
            className={`${button.secondary} p-2`}
            title="Actualizar lista"
            aria-label="Actualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[760px]">
          <thead className="bg-[var(--color-neutral-surface-cream)] text-[var(--color-neutral-text-primary)]/70 text-left font-extrabold">
            <tr>
              <th className="px-5 py-3">Publicación</th>
              <th className="px-5 py-3">Dueño</th>
              <th className="px-5 py-3">Estado</th>
              <th className="px-5 py-3">Creada</th>
              <th className="px-5 py-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-neutral-border)]/60">
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-[var(--color-neutral-text-secondary)]">
                  {loading ? 'Cargando publicaciones.' : 'No hay publicaciones que coincidan.'}
                </td>
              </tr>
            ) : items.map((row) => (
              <tr key={row.id}>
                <td className="px-5 py-3">
                  <a
                    href={`/c/${row.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-[var(--color-accent-text)] underline hover:opacity-80 inline-flex items-center gap-1"
                  >
                    /c/{row.slug}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <div className="text-[10px] text-[var(--color-neutral-text-muted)] font-mono mt-0.5">cv: {row.cvId}</div>
                </td>
                <td className="px-5 py-3">
                  {row.ownerEmail
                    ? <span className="font-bold text-[var(--color-neutral-text-primary)]">{row.ownerEmail}</span>
                    : <span className="text-[var(--color-neutral-text-muted)]">—</span>}
                </td>
                <td className="px-5 py-3">
                  <span className={`px-2 py-0.5 rounded-full border font-bold text-[10px] ${
                    row.isActive
                      ? 'bg-[var(--color-status-success-muted)] text-[var(--color-status-success-text)] border-[var(--color-status-success-base)]/30'
                      : 'bg-[var(--color-neutral-surface-muted)] text-[var(--color-neutral-text-secondary)] border-[var(--color-neutral-border)]'
                  }`}>
                    {row.isActive ? 'Activa' : 'Desactivada'}
                  </span>
                </td>
                <td className="px-5 py-3 whitespace-nowrap text-[var(--color-neutral-text-secondary)]">
                  {row.createdAt ? new Date(row.createdAt).toLocaleDateString('es-AR') : '—'}
                </td>
                <td className="px-5 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => toggle(row)}
                    disabled={togglingId === row.id}
                    className={`${row.isActive ? button.secondary : button.primary} px-2.5 py-1 text-[10px] font-black disabled:opacity-50`}
                  >
                    {togglingId === row.id ? 'Guardando.' : row.isActive ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-3 bg-[var(--color-neutral-surface-cream)]/50 border-t border-[var(--color-neutral-border)] flex items-center justify-between text-xs text-[var(--color-neutral-text-secondary)]">
        <span>
          {totalCount === 0 ? '0 publicaciones' : `${page * PAGE_SIZE + 1}-${Math.min((page + 1) * PAGE_SIZE, totalCount)} de ${totalCount}`}
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
