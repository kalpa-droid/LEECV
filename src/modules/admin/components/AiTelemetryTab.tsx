import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, RefreshCw, BarChart, KeyRound } from 'lucide-react';
import { listAiTelemetry, getAiTelemetryStats, listAiCooldowns } from '../adminService';
import type { AiCooldownRow } from '../adminService';
import { useToast } from '../../../shared/core/ui/Toast';
import { elevationSystem, radius } from '../../../shared/core/uiDesignSystem';
import { withErrorHandling } from '../../../shared/core/utils/errorHandler';

export function AiTelemetryTab() {
  const { showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalCost: 0, totalTokens: 0 });

  const [dateFrom, setDateFrom] = useState('');
  const [endpointFilter, setEndpointFilter] = useState('');

  async function loadData() {
    setLoading(true);
    await withErrorHandling(
      async () => {
        const [telemetryLogs, telemetryStats] = await Promise.all([
          listAiTelemetry(100, { from: dateFrom || undefined, endpoint: endpointFilter || undefined }),
          getAiTelemetryStats()
        ]);
        setLogs(telemetryLogs);
        setStats(telemetryStats);
      },
      {
        context: 'Carga de Telemetría IA',
        errorMessage: 'Error al cargar los registros de IA',
        notify: (msg) => showError(msg)
      }
    );
    setLoading(false);
  }

  const [cooldowns, setCooldowns] = useState<AiCooldownRow[]>([]);
  const [loadingCooldowns, setLoadingCooldowns] = useState(false);

  /**
   * Desglose agregado sobre las filas cargadas (máx 100, con los filtros
   * aplicados). Honesto por construcción: es una muestra, no un total
   * histórico. La telemetría actual NO registra errores ni fallbacks, por
   * lo que la tasa de error no se muestra (requeriría instrumentación nueva).
   */
  const breakdown = useMemo(() => {
    const aggregate = (key: 'provider' | 'endpoint') => {
      const map = new Map<string, { label: string; calls: number; promptTokens: number; completionTokens: number; cost: number }>();
      for (const log of logs) {
        const label = String(log?.[key] || 'desconocido');
        const cur = map.get(label) || { label, calls: 0, promptTokens: 0, completionTokens: 0, cost: 0 };
        cur.calls += 1;
        cur.promptTokens += Number(log?.prompt_tokens) || 0;
        cur.completionTokens += Number(log?.completion_tokens) || 0;
        cur.cost += Number(log?.estimated_cost_usd) || 0;
        map.set(label, cur);
      }
      return [...map.values()].sort((a, b) => b.cost - a.cost);
    };
    return { byProvider: aggregate('provider'), byEndpoint: aggregate('endpoint') };
  }, [logs]);

  async function loadCooldowns() {
    setLoadingCooldowns(true);
    const rows = await listAiCooldowns();
    setCooldowns(rows);
    setLoadingCooldowns(false);
  }

  function renderBreakdownRows(rows: typeof breakdown.byProvider) {
    if (rows.length === 0) {
      return <p className="text-[11px] text-[var(--color-neutral-text-muted)]">Sin datos con los filtros actuales.</p>;
    }
    return (
      <div className="space-y-1">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 text-[11px] border-b border-[var(--color-neutral-border)]/40 pb-1">
            <div className="min-w-0">
              <p className="font-bold text-[var(--color-neutral-text-primary)] truncate">{row.label}</p>
              <p className="text-[10px] text-[var(--color-neutral-text-secondary)]">
                {row.calls} llamada{row.calls === 1 ? '' : 's'} · {(row.promptTokens + row.completionTokens).toLocaleString('es-AR')} tokens
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-black text-[var(--color-neutral-text-primary)]">${row.cost.toFixed(4)}</p>
              <p className="text-[10px] text-[var(--color-neutral-text-muted)]">${(row.calls > 0 ? row.cost / row.calls : 0).toFixed(5)} / llamada</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, endpointFilter]);

  useEffect(() => {
    loadCooldowns();
  }, []);

  return (
    <div className="space-y-6">
      <div className={`bg-[var(--ui-bg-card)] p-5 border border-[var(--color-neutral-border)] ${elevationSystem.raised} flex flex-col md:flex-row items-start md:items-center justify-between gap-4`} style={{ borderRadius: radius.modal }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--color-accent-purple-light)] border border-[var(--color-accent-purple)]/40 text-[var(--color-accent-purple-text)] flex items-center justify-center" style={{ borderRadius: radius.card }}>
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-base text-[var(--color-neutral-text-primary)]">Telemetría de IA y Costos</h2>
            <p className="text-xs text-[var(--color-neutral-text-secondary)]">Consumo de tokens y estimación de costos en USD de llamadas a modelos de IA</p>
          </div>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="px-4 py-2 bg-[var(--color-neutral-surface-muted)] hover:bg-[var(--color-neutral-border)] text-[var(--color-neutral-text-primary)] text-xs font-black border border-[var(--color-neutral-border)] transition flex items-center gap-2 cursor-pointer disabled:opacity-50" style={{ borderRadius: radius.card }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className={`bg-[var(--ui-bg-card)] p-5 ${elevationSystem.raised} border border-[var(--color-neutral-border)] flex items-center gap-4`} style={{ borderRadius: radius.modal }}>
          <div className="w-12 h-12 bg-[var(--color-status-success-muted)] border border-[var(--color-status-success-base)]/30 text-[var(--color-status-success-text)] flex items-center justify-center" style={{ borderRadius: radius.card }}>
            <BarChart className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-[var(--color-neutral-text-primary)]">${stats.totalCost.toFixed(4)}</p>
            <p className="text-xs text-[var(--color-neutral-text-secondary)] font-bold">Costo Total Estimado (USD)</p>
          </div>
        </div>

        <div className={`bg-[var(--ui-bg-card)] p-5 ${elevationSystem.raised} border border-[var(--color-neutral-border)] flex items-center gap-4`} style={{ borderRadius: radius.modal }}>
          <div className="w-12 h-12 bg-[var(--color-secondary-muted)] border border-[var(--color-secondary-base)]/30 text-[var(--color-secondary-text)] flex items-center justify-center" style={{ borderRadius: radius.card }}>
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-[var(--color-neutral-text-primary)]">{stats.totalTokens.toLocaleString('es-AR')}</p>
            <p className="text-xs text-[var(--color-neutral-text-secondary)] font-bold">Tokens Procesados Totales</p>
          </div>
        </div>
      </div>

      {/* Desglose por proveedor y por endpoint (según las filas cargadas) */}
      <div className={`bg-[var(--ui-bg-card)] p-5 ${elevationSystem.raised} border border-[var(--color-neutral-border)] space-y-3`} style={{ borderRadius: radius.modal }}>
        <div className="flex items-center gap-2 border-b border-[var(--color-neutral-border)] pb-3">
          <BarChart className="w-5 h-5 text-[var(--color-accent-text)]" />
          <div>
            <h3 className="font-extrabold text-sm text-[var(--color-neutral-text-primary)]">Desglose por proveedor y endpoint</h3>
            <p className="text-[10px] text-[var(--color-neutral-text-secondary)] font-medium">
              Según las últimas {logs.length} llamadas cargadas con los filtros aplicados. La telemetría actual no registra errores ni fallbacks.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--color-neutral-text-secondary)]">Por proveedor</p>
            {renderBreakdownRows(breakdown.byProvider)}
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--color-neutral-text-secondary)]">Por endpoint</p>
            {renderBreakdownRows(breakdown.byEndpoint)}
          </div>
        </div>
      </div>

      {/* Claves de IA en pausa (cooldowns activos, server-side) */}
      <div className={`bg-[var(--ui-bg-card)] p-5 ${elevationSystem.raised} border border-[var(--color-neutral-border)] space-y-3`} style={{ borderRadius: radius.modal }}>
        <div className="flex items-center justify-between gap-3 border-b border-[var(--color-neutral-border)] pb-3">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-[var(--color-status-warning-text)]" />
            <div>
              <h3 className="font-extrabold text-sm text-[var(--color-neutral-text-primary)]">Claves en pausa ahora</h3>
              <p className="text-[10px] text-[var(--color-neutral-text-secondary)] font-medium">
                Claves de IA con cooldown activo por límite de uso. Se identifica la clave por hash, nunca se muestra.
              </p>
            </div>
          </div>
          <button
            onClick={loadCooldowns}
            disabled={loadingCooldowns}
            className="p-2 bg-[var(--color-neutral-surface-muted)] hover:bg-[var(--color-neutral-border)] text-[var(--color-neutral-text-primary)] border border-[var(--color-neutral-border)] transition cursor-pointer disabled:opacity-50" style={{ borderRadius: radius.card }}
            title="Actualizar pausas"
            aria-label="Actualizar pausas"
          >
            <RefreshCw className={`w-4 h-4 ${loadingCooldowns ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {cooldowns.length === 0 ? (
          <p className="text-[11px] font-bold text-[var(--color-neutral-text-muted)]">
            {loadingCooldowns ? 'Consultando pausas...' : 'No hay claves pausadas en este momento.'}
          </p>
        ) : (
          <div className="space-y-1">
            {cooldowns.map((row) => (
              <div key={`${row.provider}:${row.keyHashPrefix}`} className="flex items-center justify-between gap-3 text-[11px] border-b border-[var(--color-neutral-border)]/40 pb-1">
                <div className="min-w-0">
                  <p className="font-bold text-[var(--color-neutral-text-primary)] capitalize">{row.provider}</p>
                  <p className="text-[10px] font-mono text-[var(--color-neutral-text-secondary)]">clave #{row.keyHashPrefix}…</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-black text-[var(--color-status-warning-text)]">
                    hasta {new Date(row.pausedUntil).toLocaleString('es-AR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={`bg-[var(--ui-bg-card)] p-4 ${elevationSystem.raised} border border-[var(--color-neutral-border)] flex flex-wrap items-center gap-3`} style={{ borderRadius: radius.modal }}>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-[var(--color-neutral-text-secondary)]">Desde:</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-1.5 text-xs bg-[var(--ui-bg-card)] border border-[var(--color-neutral-border)] text-[var(--color-neutral-text-primary)] focus:outline-none focus:border-[var(--color-accent-purple)]" style={{ borderRadius: radius.card }}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-[var(--color-neutral-text-secondary)]">Endpoint:</label>
          <select
            value={endpointFilter}
            onChange={(e) => setEndpointFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-[var(--ui-bg-card)] border border-[var(--color-neutral-border)] text-[var(--color-neutral-text-primary)] focus:outline-none focus:border-[var(--color-accent-purple)]" style={{ borderRadius: radius.card }}
          >
            <option value="">Todos los endpoints</option>
            <option value="cv-import">cv-import</option>
            <option value="ai-generate">ai-generate</option>
          </select>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="px-4 py-1.5 bg-[var(--color-accent-purple-light)] hover:bg-[var(--color-accent-purple)]/20 text-[var(--color-accent-purple-text)] text-xs font-bold border border-[var(--color-accent-purple)]/30 transition cursor-pointer disabled:opacity-50" style={{ borderRadius: radius.card }}
        >
          Filtrar
        </button>
      </div>

      <div className={`bg-[var(--ui-bg-card)] ${elevationSystem.raised} border border-[var(--color-neutral-border)] overflow-hidden`} style={{ borderRadius: radius.modal }}>
        <div className="px-5 py-4 border-b border-[var(--color-neutral-border)]">
          <h3 className="font-extrabold text-sm text-[var(--color-neutral-text-primary)]">Últimas Llamadas a IA (Top 100)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[var(--color-neutral-surface-cream)] text-[var(--color-neutral-text-primary)]/70 text-left font-extrabold">
              <tr>
                <th className="px-5 py-3">Fecha</th>
                <th className="px-5 py-3">Usuario</th>
                <th className="px-5 py-3">Proveedor / Modelo</th>
                <th className="px-5 py-3">Endpoint</th>
                <th className="px-5 py-3 text-right">Tokens (Prompt / Comp)</th>
                <th className="px-5 py-3 text-right">Costo Est. (USD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-neutral-border)]/60">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-[var(--color-neutral-surface-cream)]/40 transition">
                  <td className="px-5 py-3 font-medium text-[var(--color-neutral-text-secondary)]">
                    {new Date(log.created_at).toLocaleString('es-AR')}
                  </td>
                  <td className="px-5 py-3 font-bold">{log.profiles?.email || 'Usuario Desconocido'}</td>
                  <td className="px-5 py-3">
                    <div className="flex flex-col">
                      <span className="font-bold text-[var(--color-neutral-text-primary)]">{log.provider}</span>
                      <span className="text-[10px] text-[var(--color-neutral-text-secondary)]">{log.model}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 font-mono text-[10px] text-[var(--color-accent-text)]">{log.endpoint}</td>
                  <td className="px-5 py-3 text-right">
                    <span className="font-medium">{log.prompt_tokens}</span> / <span className="font-bold">{log.completion_tokens}</span>
                  </td>
                  <td className="px-5 py-3 text-right font-black text-[var(--color-status-success-text)]">
                    ${Number(log.estimated_cost_usd).toFixed(5)}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-[var(--color-neutral-text-secondary)] font-medium">
                    No hay registros de telemetría de IA todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
