import React, { useState } from 'react';
import {
  Bell, Check, CheckCircle2, AlertTriangle, XCircle, Clock, AlertCircle,
  RefreshCw, CreditCard, Sparkles, Eraser
} from 'lucide-react';
import { button, elevationSystem, radius } from '../../../shared/core/uiDesignSystem';
import { PAYMENT_PROVIDER_CATALOG } from '../../../shared/core/payments/paymentProviderCatalog';
import { useToast } from '../../../shared/core/ui/Toast';
import { withErrorHandling } from '../../../shared/core/utils/errorHandler';
import { clearAiCooldowns } from '../adminService';

/**
 * Tarjeta de estado de un proveedor (pasarela o motor de IA).
 *
 * Movida desde AdminDashboard: el radio se aplica con style={{ borderRadius }}
 * porque el patrón `rounded-[${...}]` dentro de un template string NO genera
 * CSS (Tailwind compila escaneando texto fuente; ver AGENTS.md Regla 2).
 */
function renderGatewayCard(name: string, currency: string, data: any) {
  const status = data?.status || 'checking';
  const label = data?.label || 'Comprobando estado...';

  const isSuccess = status === 'active';
  const isWarning = status === 'missing_vars';
  const isDanger = status === 'invalid_credentials' || status === 'error' || status === 'webhook_not_found';

  const Icon = isSuccess ? CheckCircle2 : isWarning ? AlertTriangle : isDanger ? XCircle : Clock;

  return (
    <div
      className={`p-3.5 border flex flex-col justify-between space-y-2 ${
        isSuccess
          ? 'bg-[var(--color-status-success-muted)] border-[var(--color-status-success-base)]/30 text-[var(--color-status-success-text)]'
          : isWarning
          ? 'bg-[var(--color-status-warning-muted)] border-[var(--color-status-warning-base)]/30 text-[var(--color-status-warning-text)]'
          : isDanger
          ? 'bg-[var(--color-status-danger-muted)] border-[var(--color-status-danger-base)]/30 text-[var(--color-status-danger-text)]'
          : 'bg-[var(--color-neutral-surface-muted)] border-[var(--color-neutral-border)] text-[var(--color-neutral-text-primary)]'
      }`}
      style={{ borderRadius: radius.card }}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-black">{name} ({currency})</p>
          <p className="text-[10px] font-bold opacity-90 leading-snug">{label}</p>
        </div>
        <Icon className="w-4 h-4 shrink-0" />
      </div>
      {data?.missingVars && data.missingVars.length > 0 && (
        <p className="text-[9px] font-mono text-[var(--color-status-warning-text)] bg-[var(--ui-bg-card)] px-1.5 py-0.5 rounded border border-[var(--color-status-warning-base)]/20">
          Falta: {data.missingVars.join(', ')}
        </p>
      )}
    </div>
  );
}

interface AdminOverviewTabProps {
  integrations: any;
  /** Diagnóstico server-side de motores IA: Record<providerId, AiProviderUiStatus>. */
  aiProviders: any;
  loadingIntegrations: boolean;
  onRecheckIntegrations: () => void;
  notifications: any[];
  onMarkNotifRead: (id: string) => void;
  onMarkAllNotifRead: () => void;
  claims: any[];
  onReviewClaim: (claim: any, approve: boolean) => void;
}

/**
 * Pestaña "Resumen y Operaciones" del panel admin.
 *
 * Rescata el bloque muerto que vivía inaccesible en AdminDashboard
 * (la unión adminTab nunca lo renderizaba) y suma el diagnóstico
 * REAL de motores de IA calculado en el servidor.
 */
export function AdminOverviewTab({
  integrations,
  aiProviders,
  loadingIntegrations,
  onRecheckIntegrations,
  notifications,
  onMarkNotifRead,
  onMarkAllNotifRead,
  claims,
  onReviewClaim,
}: AdminOverviewTabProps) {
  const { showError, showSuccess } = useToast();
  const [notifFilter, setNotifFilter] = useState<'unread' | 'all'>('unread');
  const [clearingCooldowns, setClearingCooldowns] = useState(false);

  const unreadNotifCount = notifications.filter(n => !n.read).length;
  const visibleNotifs = notifFilter === 'unread' ? notifications.filter(n => !n.read) : notifications;

  const providerList: any[] = Object.values(aiProviders || {});
  const totalConfiguredKeys = providerList.reduce((sum, p: any) => sum + (p?.configuredKeys || 0), 0);
  const totalPausedKeys = providerList.reduce((sum, p: any) => sum + (p?.pausedKeys || 0), 0);

  async function handleClearCooldowns() {
    setClearingCooldowns(true);
    await withErrorHandling(
      async () => {
        await clearAiCooldowns();
        showSuccess('Pausas de claves ya expiradas limpiadas.');
        onRecheckIntegrations();
      },
      {
        context: 'Limpieza de pausas de claves de IA',
        errorMessage: 'No se pudieron limpiar las pausas de claves.',
        notify: (msg) => showError(msg),
      }
    );
    setClearingCooldowns(false);
  }

  return (
    <div className="space-y-6">

      {/* Diagnóstico Real de Pasarelas, Webhooks y Motores IA (server-side) */}
      <div className={`bg-[var(--ui-bg-card)] p-5 ${elevationSystem.raised} border border-[var(--color-neutral-border)] space-y-3`} style={{ borderRadius: radius.modal }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[var(--color-neutral-border)] pb-3 gap-2">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[var(--color-secondary-text)]" />
            <div>
              <h2 className="font-extrabold text-sm text-[var(--color-neutral-text-primary)]">Diagnóstico de Pasarelas & Webhooks en Tiempo Real</h2>
              <p className="text-[10px] text-[var(--color-neutral-text-secondary)] font-medium">
                {integrations?.lastCheckedAt
                  ? `Última comprobación: ${new Date(integrations.lastCheckedAt).toLocaleTimeString('es-AR')}`
                  : 'Comprobación en vivo del estado de API keys y webhooks'}
              </p>
            </div>
          </div>

          <button
            onClick={onRecheckIntegrations}
            disabled={loadingIntegrations}
            className={`px-3 py-1.5 text-xs font-bold bg-[var(--color-neutral-surface-muted)] hover:bg-[var(--color-neutral-border)] text-[var(--color-neutral-text-primary)] border border-[var(--color-neutral-border)] flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50`} style={{ borderRadius: radius.card }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingIntegrations ? 'animate-spin' : ''}`} />
            <span>{loadingIntegrations ? 'Verificando...' : 'Re-comprobar'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {PAYMENT_PROVIDER_CATALOG.map((p) => (
            <React.Fragment key={p.id}>
              {renderGatewayCard(p.name, p.defaultCurrency, integrations?.[p.id])}
            </React.Fragment>
          ))}
        </div>

        {/* Motores de IA: ping + pausas de claves calculados en el servidor */}
        <div className="pt-3 border-t border-[var(--color-neutral-border)]/50 mt-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent-text)]" />
            <p className="text-[11px] font-extrabold text-[var(--color-neutral-text-primary)]">Motores de Inteligencia Artificial (Créditos & Redacción) — diagnóstico en el servidor</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {renderGatewayCard('Groq Cloud (GPT-OSS 120B + Visión)', 'IA', aiProviders?.groq)}
            {renderGatewayCard('Google AI Studio (Gemini)', 'IA', aiProviders?.gemini)}
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2">
            <p className="text-[11px] font-bold text-[var(--color-neutral-text-secondary)]">
              Claves configuradas: {totalConfiguredKeys} · Claves pausadas (cooldowns): {totalPausedKeys}
            </p>
            <button
              onClick={handleClearCooldowns}
              disabled={clearingCooldowns}
              className={`px-3 py-1.5 text-[11px] font-bold bg-[var(--color-neutral-surface-muted)] hover:bg-[var(--color-neutral-border)] text-[var(--color-neutral-text-primary)] border border-[var(--color-neutral-border)] flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50`} style={{ borderRadius: radius.card }}
              title="Borra solo las filas de pausas que ya expiraron; una pausa activa de límite de uso no se cancela desde el panel"
            >
              <Eraser className={`w-3.5 h-3.5 ${clearingCooldowns ? 'animate-pulse' : ''}`} />
              <span>{clearingCooldowns ? 'Limpiando...' : 'Limpiar pausas de claves ya expiradas'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notificaciones de Administración con filtro y acción global */}
      {notifications.length > 0 && (
        <div className={`bg-[var(--ui-bg-card)] p-5 ${elevationSystem.raised} border border-[var(--color-neutral-border)] space-y-3`} style={{ borderRadius: radius.modal }}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[var(--color-neutral-border)] pb-3 gap-2">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Bell className="w-5 h-5 text-[var(--color-accent-text)]" />
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] font-black text-[9px] rounded-full flex items-center justify-center animate-pulse">
                    {unreadNotifCount}
                  </span>
                )}
              </div>
              <h2 className="font-extrabold text-sm text-[var(--color-neutral-text-primary)]">🔔 Eventos & Notificaciones de Pagos / Sistema</h2>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {(['unread', 'all'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setNotifFilter(mode)}
                    className={`text-[10px] font-black px-2.5 py-1 rounded-full border transition cursor-pointer ${
                      notifFilter === mode
                        ? 'bg-[var(--color-status-warning-muted)] text-[var(--color-status-warning-text)] border-[var(--color-status-warning-text)]'
                        : 'bg-[var(--ui-bg-card)] text-[var(--color-neutral-text-secondary)] border-[var(--color-neutral-border)]'
                    }`}
                  >
                    {mode === 'unread' ? `No leídas (${unreadNotifCount})` : 'Todas'}
                  </button>
                ))}
              </div>
              {unreadNotifCount > 0 && (
                <button
                  onClick={onMarkAllNotifRead}
                  className={`${button.secondary} text-[10px] font-black px-2.5 py-1 flex items-center gap-1 cursor-pointer`}
                >
                  <Check className="w-3 h-3" />
                  Marcar todas
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {visibleNotifs.length === 0 ? (
              <p className="py-3 text-center text-[11px] font-bold text-[var(--color-neutral-text-muted)]">
                Sin notificaciones sin leer. ✓
              </p>
            ) : (
              visibleNotifs.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3 border flex items-center justify-between gap-3 text-xs transition ${
                    notif.read ? 'bg-[var(--color-neutral-surface-muted)] border-[var(--color-neutral-border)] text-[var(--ui-text-secondary)]' : 'bg-[var(--color-status-warning-muted)] border-[var(--color-status-warning-base)]/30 text-[var(--ui-text-primary)] font-medium'
                  }`} style={{ borderRadius: radius.card }}
                >
                  <div className="space-y-0.5">
                    <p className="font-bold text-[var(--color-neutral-text-primary)]">{notif.title || notif.type}</p>
                    <p className="text-[11px] text-[var(--color-neutral-text-secondary)]">{notif.detail}</p>
                  </div>
                  {!notif.read && (
                    <button
                      onClick={() => onMarkNotifRead(notif.id)}
                      className={`p-1 border text-[var(--color-neutral-text-muted)] hover:text-[var(--color-status-success-text)] hover:bg-[var(--color-status-success-muted)] transition cursor-pointer`} style={{ borderRadius: radius.control }}
                      title="Marcar como leída"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Panel de Reclamos y Soporte Pendiente */}
      {claims.length > 0 && (
        <div className={`bg-[var(--color-status-warning-muted)] border-2 border-[var(--color-status-warning-base)]/40 p-5 ${elevationSystem.raised} space-y-3`} style={{ borderRadius: radius.modal }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-[var(--color-status-warning-text)]" />
              <h2 className="font-extrabold text-sm text-[var(--color-status-warning-text)]">📩 Reclamos de Activación y Comprobantes Pendientes</h2>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-[var(--color-status-warning-base)] text-[var(--color-accent-on-base)] text-xs font-black">
              {claims.length} Pendiente{claims.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="space-y-2">
            {claims.map((claim) => (
              <div key={claim.id} className={`bg-[var(--ui-bg-card)] p-3.5 border border-[var(--color-status-warning-base)]/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs`} style={{ borderRadius: radius.card }}>
                <div className="space-y-0.5">
                  <p className="font-black text-[var(--color-neutral-text-primary)]">{claim.email}</p>
                  <p className="text-[11px] text-[var(--color-neutral-text-secondary)]">
                    Método: <strong>{claim.method}</strong> ({claim.amount}) — Comprobante: <code>{claim.proof_id || claim.proofId || 'N/A'}</code>
                    {claim.proof_url && String(claim.proof_url).startsWith('http') && (
                      <> — <a href={String(claim.proof_url)} target="_blank" rel="noopener noreferrer" className="underline font-bold hover:opacity-80">Ver comprobante</a></>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onReviewClaim(claim, true)}
                    className={`px-3 py-1.5 bg-[var(--color-status-success-base)] hover:opacity-90 text-[var(--color-status-success-on-base)] font-extrabold transition ${elevationSystem.raised} cursor-pointer`} style={{ borderRadius: radius.card }}
                  >
                    ✅ Aprobar y Activar
                  </button>
                  <button
                    onClick={() => onReviewClaim(claim, false)}
                    className={`px-3 py-1.5 bg-[var(--color-status-danger-base)] hover:opacity-90 text-[var(--color-status-danger-on-base)] font-extrabold transition ${elevationSystem.raised} cursor-pointer`} style={{ borderRadius: radius.card }}
                  >
                    ❌ Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
