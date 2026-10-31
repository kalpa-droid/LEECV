import React, { useState, useEffect } from 'react';
import { ShieldAlert, Filter, RefreshCw } from 'lucide-react';
import { button, radius, elevationSystem } from '../../../shared/core/uiDesignSystem';
import { useToast } from '../../../shared/core/ui/Toast';
import { withErrorHandling } from '../../../shared/core/utils/errorHandler';
import { supabase } from '../../../shared/core/lib/supabaseClient';

export function AuditAndErrorsTab() {
  const { showError } = useToast();
  const [logs, setLogs] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  async function loadLogs() {
    setLoading(true);
    try {
      let query = supabase
        .from('admin_error_logs')
        .select('id, level, source, message, context, user_email, request_path, provider, external_id, fingerprint, resolved_at, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (filter !== 'all') {
        query = query.eq('level', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLogs(data || []);
    } catch (err: any) {
      showError('No se pudo cargar auditoría: ' + (err?.message || 'Error de base'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadLogs(); }, [filter]);

  return (
    <div className={`bg-[var(--ui-bg-card)] p-5 ${elevationSystem.raised} border border-[var(--color-neutral-border)] space-y-4`} style={{ borderRadius: radius.modal }}>
      <div className="flex items-center justify-between border-b border-[var(--color-neutral-border)] pb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-[var(--color-status-danger-text)]" />
          <h2 className="font-extrabold text-sm text-[var(--color-neutral-text-primary)]">Auditoría y Errores Nativos</h2>
        </div>
        <button
          onClick={loadLogs}
          disabled={loading}
          className={`${button.secondary} text-[10px] font-black px-2 py-1 flex items-center gap-1`}
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          Recargar
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', 'critical', 'error', 'warning', 'info'].map((lvl) => (
          <button
            key={lvl}
            onClick={() => setFilter(lvl)}
            className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border transition ${filter === lvl ? 'bg-[var(--color-status-danger-muted)] text-[var(--color-status-danger-text)] border-[var(--color-status-danger-text)]' : 'bg-[var(--ui-bg-card)] text-[var(--ui-text-secondary)] border-[var(--color-neutral-border)] hover:border-[var(--color-neutral-text-secondary)]'}`}
          >
            {lvl === 'all' ? 'Todos' : lvl.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[640px]">
          <thead>
            <tr className="border-b border-[var(--color-neutral-border)] text-[10px] text-[var(--color-neutral-text-secondary)] font-extrabold uppercase tracking-wide">
              <th className="py-2 px-2">Nivel</th>
              <th className="py-2 px-2">Origen</th>
              <th className="py-2 px-2">Mensaje</th>
              <th className="py-2 px-2">Email</th>
              <th className="py-2 px-2">Provider / Ref</th>
              <th className="py-2 px-2">Creado</th>
              <th className="py-2 px-2">Resuelto</th>
            </tr>
          </thead>
          <tbody className="text-[11px] divide-y divide-[var(--color-neutral-border)]">
            {logs.length === 0 ? (
              <tr><td colSpan={7} className="py-4 text-center text-[var(--color-neutral-text-muted)]">No hay registros de auditoría.</td></tr>
            ) : (
              logs.map((row) => (
                <tr key={row.id} className="hover:bg-[var(--color-neutral-surface-muted)]/40 transition">
                  <td className="py-2 px-2">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                      row.level === 'critical' ? 'bg-[var(--color-status-danger-muted)] text-[var(--color-status-danger-text)]' :
                      row.level === 'error' ? 'bg-[var(--color-status-danger-muted)] text-[var(--color-status-danger-text)]' :
                      row.level === 'warning' ? 'bg-[var(--color-status-warning-muted)] text-[var(--color-status-warning-text)]' :
                      'bg-[var(--color-neutral-surface-muted)] text-[var(--color-neutral-text-secondary)]'
                    }`}>
                      {row.level?.toUpperCase() || 'INFO'}
                    </span>
                  </td>
                  <td className="py-2 px-2 font-medium">{row.source}</td>
                  <td className="py-2 px-2 max-w-[260px] truncate" title={row.message}>{row.message?.slice(0, 120) || '-'}</td>
                  <td className="py-2 px-2">{row.user_email || '-'}</td>
                  <td className="py-2 px-2 text-[10px]">{row.provider || '-'} / {row.external_id || '-'}</td>
                  <td className="py-2 px-2">{row.created_at ? new Date(row.created_at).toLocaleString('es-AR', { hour12: false }) : '-'}</td>
                  <td className="py-2 px-2">{row.resolved_at ? '✓ Sí' : '— No'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
