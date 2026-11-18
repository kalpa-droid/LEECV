import React, { useState, useEffect } from 'react';
import { ShieldAlert, RefreshCw, ChevronDown, ChevronRight, ListChecks, Bug } from 'lucide-react';
import { button, radius, elevationSystem } from '../../../shared/core/uiDesignSystem';
import { useToast } from '../../../shared/core/ui/Toast';
import { withErrorHandling } from '../../../shared/core/utils/errorHandler';
import { supabase } from '../../../shared/core/lib/supabaseClient';
import { dal } from '../../../shared/core/storage/dataAccessLayer';
import { listAuditLogs } from '../adminService';

/** Fuentes válidas según el check constraint de admin_error_logs (migración 20261030). */
const ERROR_SOURCES = ['all', 'frontend', 'webhook', 'api', 'database', 'pdf', 'auth', 'other'] as const;
const LEVEL_FILTERS = ['all', 'critical', 'error', 'warning', 'info'] as const;

/**
 * Pestaña "Auditoría y Errores" del panel admin.
 *
 * - admin_error_logs: registro nativo de errores (con filtro por nivel y fuente,
 *   visor del contexto JSON, huella para agrupar repetidos y resolución).
 * - admin_audit_logs: acciones realizadas por administradores (sub-vista).
 *
 * La policy UPDATE de admin_error_logs (migración 20261030) permite a un admin
 * autenticado marcar un error como resuelto. La resolución pasa por el DAL
 * (`dal.adminErrorLogs.markResolved`), que hace la actualización con la policy.
 * auth.getUser() se sigue usando solo para completar resolved_by.
 */
export function AuditAndErrorsTab() {
  const { showError, showSuccess } = useToast();
  const [view, setView] = useState<'errors' | 'audit'>('errors');
  const [logs, setLogs] = useState<any[]>([]);
  const [levelFilter, setLevelFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  async function loadLogs() {
    setLoading(true);
    try {
      const rows = await dal.adminErrorLogs.list({
        level: levelFilter === 'all' ? undefined : levelFilter,
        source: sourceFilter === 'all' ? undefined : sourceFilter,
      });
      setLogs(rows);
    } catch (err: any) {
      showError('No se pudo cargar auditoría: ' + (err?.message || 'Error de base'));
    } finally {
      setLoading(false);
    }
  }

  async function loadAuditLogs() {
    setAuditLoading(true);
    try {
      const rows = await listAuditLogs();
      setAuditLogs(rows || []);
    } catch (err: any) {
      showError('No se pudieron cargar las acciones de administradores.');
    } finally {
      setAuditLoading(false);
    }
  }

  useEffect(() => { loadLogs(); }, [levelFilter, sourceFilter]);
  useEffect(() => { if (view === 'audit') loadAuditLogs(); }, [view]);

  async function handleResolve(row: any) {
    setResolvingId(row.id);
    await withErrorHandling(
      async () => {
        const { data: userData } = await supabase.auth.getUser();
        const ok = await dal.adminErrorLogs.markResolved(row.id, userData?.user?.id || null);
        if (!ok) throw new Error('No se pudo actualizar el registro en la base de datos');
        showSuccess('Registro marcado como resuelto.');
        await loadLogs();
      },
      {
        context: 'Marcar error como resuelto',
        errorMessage: 'No se pudo marcar el registro como resuelto.',
        notify: (msg) => showError(msg),
      }
    );
    setResolvingId(null);
  }

  function toggleExpanded(id: string) {
    setExpandedId(prev => (prev === id ? null : id));
  }

  return (
    <div className={`bg-[var(--ui-bg-card)] p-5 ${elevationSystem.raised} border border-[var(--color-neutral-border)] space-y-4`} style={{ borderRadius: radius.modal }}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[var(--color-neutral-border)] pb-3 gap-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-[var(--color-status-danger-text)]" />
          <h2 className="font-extrabold text-sm text-[var(--color-neutral-text-primary)]">Auditoría, Errores Nativos y Acciones de Administradores</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {(['errors', 'audit'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`text-[10px] font-black px-2.5 py-1 rounded-full border transition cursor-pointer flex items-center gap-1 ${
                  view === v
                    ? 'bg-[var(--color-status-danger-muted)] text-[var(--color-status-danger-text)] border-[var(--color-status-danger-text)]'
                    : 'bg-[var(--ui-bg-card)] text-[var(--ui-text-secondary)] border-[var(--color-neutral-border)]'
                }`}
              >
                {v === 'errors' ? <Bug className="w-3 h-3" /> : <ListChecks className="w-3 h-3" />}
                {v === 'errors' ? 'Errores' : 'Acciones admin'}
              </button>
            ))}
          </div>
          <button
            onClick={view === 'errors' ? loadLogs : loadAuditLogs}
            disabled={view === 'errors' ? loading : auditLoading}
            className={`${button.secondary} text-[10px] font-black px-2 py-1 flex items-center gap-1`}
          >
            <RefreshCw className={`w-3 h-3 ${(view === 'errors' ? loading : auditLoading) ? 'animate-spin' : ''}`} />
            Recargar
          </button>
        </div>
      </div>

      {view === 'errors' ? (
        <>
          {/* Filtros: nivel + fuente */}
          <div className="space-y-2">
            <div className="flex gap-2 flex-wrap items-center">
              <span className="text-[10px] font-black text-[var(--color-neutral-text-secondary)] uppercase">Nivel:</span>
              {LEVEL_FILTERS.map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setLevelFilter(lvl)}
                  className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border transition cursor-pointer ${levelFilter === lvl ? 'bg-[var(--color-status-danger-muted)] text-[var(--color-status-danger-text)] border-[var(--color-status-danger-text)]' : 'bg-[var(--ui-bg-card)] text-[var(--ui-text-secondary)] border-[var(--color-neutral-border)] hover:border-[var(--color-neutral-text-secondary)]'}`}
                >
                  {lvl === 'all' ? 'Todos' : lvl.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <span className="text-[10px] font-black text-[var(--color-neutral-text-secondary)] uppercase">Fuente:</span>
              {ERROR_SOURCES.map((src) => (
                <button
                  key={src}
                  onClick={() => setSourceFilter(src)}
                  className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border transition cursor-pointer ${sourceFilter === src ? 'bg-[var(--color-secondary-muted)] text-[var(--color-secondary-text)] border-[var(--color-secondary-text)]' : 'bg-[var(--ui-bg-card)] text-[var(--ui-text-secondary)] border-[var(--color-neutral-border)] hover:border-[var(--color-neutral-text-secondary)]'}`}
                >
                  {src === 'all' ? 'Todas' : src}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[820px]">
              <thead>
                <tr className="border-b border-[var(--color-neutral-border)] text-[10px] text-[var(--color-neutral-text-secondary)] font-extrabold uppercase tracking-wide">
                  <th className="py-2 px-2">Nivel</th>
                  <th className="py-2 px-2">Origen</th>
                  <th className="py-2 px-2">Mensaje</th>
                  <th className="py-2 px-2">Email</th>
                  <th className="py-2 px-2">Provider / Ref</th>
                  <th className="py-2 px-2">Huella</th>
                  <th className="py-2 px-2">Creado</th>
                  <th className="py-2 px-2">Resuelto</th>
                </tr>
              </thead>
              <tbody className="text-[11px] divide-y divide-[var(--color-neutral-border)]">
                {logs.length === 0 ? (
                  <tr><td colSpan={8} className="py-4 text-center text-[var(--color-neutral-text-muted)]">No hay registros de auditoría con estos filtros.</td></tr>
                ) : (
                  logs.map((row) => (
                    <React.Fragment key={row.id}>
                      <tr className="hover:bg-[var(--color-neutral-surface-muted)]/40 transition">
                        <td className="py-2 px-2">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                            row.level === 'critical' || row.level === 'error' ? 'bg-[var(--color-status-danger-muted)] text-[var(--color-status-danger-text)]' :
                            row.level === 'warning' ? 'bg-[var(--color-status-warning-muted)] text-[var(--color-status-warning-text)]' :
                            'bg-[var(--color-neutral-surface-muted)] text-[var(--color-neutral-text-secondary)]'
                          }`}>
                            {row.level?.toUpperCase() || 'INFO'}
                          </span>
                        </td>
                        <td className="py-2 px-2 font-medium">{row.source}</td>
                        <td
                          className="py-2 px-2 max-w-[260px] cursor-pointer"
                          onClick={() => toggleExpanded(row.id)}
                          title="Clic para ver el detalle y el contexto"
                        >
                          <div className="flex items-center gap-1">
                            {expandedId === row.id
                              ? <ChevronDown className="w-3 h-3 shrink-0 text-[var(--color-neutral-text-secondary)]" />
                              : <ChevronRight className="w-3 h-3 shrink-0 text-[var(--color-neutral-text-secondary)]" />}
                            <span className="truncate" title={row.message}>{row.message?.slice(0, 110) || '-'}</span>
                          </div>
                        </td>
                        <td className="py-2 px-2">{row.user_email || '-'}</td>
                        <td className="py-2 px-2 text-[10px]">{row.provider || '-'} / {row.external_id || '-'}</td>
                        <td className="py-2 px-2 max-w-[140px] truncate text-[10px] font-mono text-[var(--color-neutral-text-secondary)]" title={row.fingerprint || ''}>
                          {row.fingerprint || '-'}
                        </td>
                        <td className="py-2 px-2">{row.created_at ? new Date(row.created_at).toLocaleString('es-AR', { hour12: false }) : '-'}</td>
                        <td className="py-2 px-2">
                          {row.resolved_at ? (
                            <span className="text-[10px] font-black text-[var(--color-status-success-text)]">✓ Resuelto</span>
                          ) : (
                            <button
                              onClick={() => handleResolve(row)}
                              disabled={resolvingId === row.id}
                              className="text-[10px] font-black px-2 py-0.5 rounded-full border border-[var(--color-status-success-text)] text-[var(--color-status-success-text)] hover:bg-[var(--color-status-success-muted)] transition cursor-pointer disabled:opacity-50"
                            >
                              {resolvingId === row.id ? '...' : 'Marcar resuelto'}
                            </button>
                          )}
                        </td>
                      </tr>
                      {expandedId === row.id && (
                        <tr>
                          <td colSpan={8} className="px-3 pb-3">
                            <div className="bg-[var(--color-neutral-surface-muted)]/50 border border-[var(--color-neutral-border)] p-3 space-y-2" style={{ borderRadius: radius.card }}>
                              {row.request_path && (
                                <p className="text-[10px] font-mono text-[var(--color-neutral-text-secondary)]">Ruta: {row.request_path}</p>
                              )}
                              <pre className="text-[10px] font-mono text-[var(--color-neutral-text-secondary)] overflow-x-auto max-h-48 whitespace-pre-wrap break-words bg-[var(--ui-bg-card)] p-2 border border-[var(--color-neutral-border)]">
                                {JSON.stringify(row.context ?? {}, null, 2)}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        /* Sub-vista: acciones realizadas por administradores (admin_audit_logs) */
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead>
              <tr className="border-b border-[var(--color-neutral-border)] text-[10px] text-[var(--color-neutral-text-secondary)] font-extrabold uppercase tracking-wide">
                <th className="py-2 px-2">Acción</th>
                <th className="py-2 px-2">Admin</th>
                <th className="py-2 px-2">Usuario objetivo</th>
                <th className="py-2 px-2">Detalles</th>
                <th className="py-2 px-2">Fecha</th>
              </tr>
            </thead>
            <tbody className="text-[11px] divide-y divide-[var(--color-neutral-border)]">
              {auditLoading ? (
                <tr><td colSpan={5} className="py-4 text-center text-[var(--color-neutral-text-muted)]">Cargando acciones...</td></tr>
              ) : auditLogs.length === 0 ? (
                <tr><td colSpan={5} className="py-4 text-center text-[var(--color-neutral-text-muted)]">No hay acciones registradas de administradores.</td></tr>
              ) : (
                auditLogs.map((row: any) => (
                  <React.Fragment key={row.id}>
                    <tr className="hover:bg-[var(--color-neutral-surface-muted)]/40 transition">
                      <td className="py-2 px-2 font-black">{row.action_type || '-'}</td>
                      <td className="py-2 px-2 max-w-[110px] truncate text-[10px] font-mono" title={row.admin_id || ''}>{row.admin_id || '-'}</td>
                      <td className="py-2 px-2 max-w-[110px] truncate text-[10px] font-mono" title={row.target_user_id || ''}>{row.target_user_id || '-'}</td>
                      <td
                        className="py-2 px-2 max-w-[240px] truncate cursor-pointer text-[10px] text-[var(--color-neutral-text-secondary)]"
                        onClick={() => toggleExpanded(row.id)}
                        title="Clic para ver el detalle completo"
                      >
                        <div className="flex items-center gap-1">
                          {expandedId === row.id
                            ? <ChevronDown className="w-3 h-3 shrink-0" />
                            : <ChevronRight className="w-3 h-3 shrink-0" />}
                          <span className="truncate">{JSON.stringify(row.details ?? {})}</span>
                        </div>
                      </td>
                      <td className="py-2 px-2">{row.created_at ? new Date(row.created_at).toLocaleString('es-AR', { hour12: false }) : '-'}</td>
                    </tr>
                    {expandedId === row.id && (
                      <tr>
                        <td colSpan={5} className="px-3 pb-3">
                          <pre className="text-[10px] font-mono text-[var(--color-neutral-text-secondary)] overflow-x-auto max-h-48 whitespace-pre-wrap break-words bg-[var(--color-neutral-surface-muted)]/50 p-2 border border-[var(--color-neutral-border)]">
                            {JSON.stringify(row.details ?? {}, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
