import React, { useState, useEffect } from 'react';
import {
  listUsers,
  setUserPlan,
  getBasicStats,
  listPendingClaims, reviewManualClaim,
  listAdminNotifications, markNotificationRead,
  getIntegrationsStatus
} from './adminService';
import { getCurrentProfile, logout } from '../auth/authService';
import AdminLogin from './AdminLogin';
import { StorageDriveTab } from './components/StorageDriveTab';
import { TemplateManagementTab } from './components/TemplateManagementTab';
import { ProcessedPaymentsTab } from './components/ProcessedPaymentsTab';
import { useToast } from '../../shared/core/ui/Toast';
import { useConfirm } from '../../shared/core/ui/ConfirmDialog';
import { withErrorHandling } from '../../shared/core/utils/errorHandler';
import { elevationSystem, radius } from '../../shared/core/uiDesignSystem';
import { PAYMENT_PROVIDER_CATALOG, getPaymentProviderBadge } from '../../shared/core/payments/paymentProviderCatalog';

import { 
  Users, Crown, LogOut, RefreshCw, CreditCard, HardDrive, 
  ShieldCheck, CheckCircle2, AlertCircle, AlertTriangle, XCircle, Sparkles, 
  Search, ChevronLeft, ChevronRight, Bell, Check, Layout as LayoutIcon, Clock 
} from 'lucide-react';

function renderGatewayCard(name: string, currency: string, data: any) {
  const status = data?.status || 'checking';
  const label = data?.label || 'Comprobando estado...';

  const isSuccess = status === 'active';
  const isWarning = status === 'missing_vars';
  const isDanger = status === 'invalid_credentials' || status === 'error' || status === 'webhook_not_found';

  const Icon = isSuccess ? CheckCircle2 : isWarning ? AlertTriangle : isDanger ? XCircle : Clock;

  return (
    <div className={`p-3.5 rounded-[${radius.card}] border flex flex-col justify-between space-y-2 ${
      isSuccess
        ? 'bg-[var(--color-status-success-muted)] border-[var(--color-status-success-base)]/30 text-[var(--color-status-success-text)]'
        : isWarning
        ? 'bg-[var(--color-status-warning-muted)] border-[var(--color-status-warning-base)]/30 text-[var(--color-status-warning-text)]'
        : isDanger
        ? 'bg-[var(--color-status-danger-muted)] border-[var(--color-status-danger-base)]/30 text-[var(--color-status-danger-text)]'
        : 'bg-[var(--color-neutral-surface-muted)] border-[var(--color-neutral-border)] text-[var(--color-neutral-text-primary)]'
    }`}>
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

export default function AdminDashboard() {
  const { showError, showSuccess } = useToast();
  const { confirm } = useConfirm();

  const [adminTab, setAdminTab] = useState<'users' | 'payments' | 'storage' | 'templates'>('users');
  const [profile, setProfile] = useState<any>(undefined);
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, proUsers: 0, enterpriseUsers: 0, activeSubscriptions: 0 });
  const [loadingData, setLoadingData] = useState(false);
  const [claims, setClaims] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [integrations, setIntegrations] = useState<any>(null);
  const [loadingIntegrations, setLoadingIntegrations] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 50;

  async function fetchIntegrations(forcePing = false) {
    setLoadingIntegrations(true);
    await withErrorHandling(
      async () => {
        const status = await getIntegrationsStatus(forcePing);
        setIntegrations(status);
      },
      {
        context: 'Diagnóstico de Pasarelas',
        errorMessage: 'Error al consultar estado de pasarelas.',
        notify: (msg) => showError(msg),
      }
    );
    setLoadingIntegrations(false);
  }

  async function loadEverything() {
    setLoadingData(true);
    fetchIntegrations(false);
    await withErrorHandling(
      async () => {
        const [userList, s, claimList, notifList] = await Promise.all([
          listUsers(searchQuery),
          getBasicStats(),
          listPendingClaims(),
          listAdminNotifications()
        ]);
        setUsers(userList || []);
        setTotalCount(userList?.length || 0);
        setStats(s || { totalUsers: 0, proUsers: 0, enterpriseUsers: 0, activeSubscriptions: 0 });
        setClaims(claimList || []);
        setNotifications(notifList || []);
      },
      {
        context: 'Carga del Panel de Administración',
        errorMessage: 'Inconveniente al cargar datos del servidor.',
        notify: (msg) => showError(msg)
      }
    );
    setLoadingData(false);
  }

  async function checkSession() {
    const p = await getCurrentProfile();
    setProfile(p);
    if (p?.role === 'admin') loadEverything();
  }

  useEffect(() => { checkSession(); }, [page, searchQuery]);

  useEffect(() => {
    if (profile?.role === 'admin') {
      const timer = setInterval(loadEverything, 45000);
      return () => clearInterval(timer);
    }
  }, [profile]);

  if (profile === undefined) return null;
  if (!profile) return <AdminLogin onLogin={checkSession} />;
  if (profile.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-neutral-text-primary)] text-white font-sans">
        <p className="font-bold">Tu cuenta no tiene permisos de administrador supremo.</p>
      </div>
    );
  }

  async function togglePremium(user: any, targetPlan = 'pro') {
    await withErrorHandling(
      async () => {
        if (targetPlan === 'free' || (user.premium_activo && targetPlan === 'free')) {
          confirm({
            title: `¿Desactivar licencia de ${user.email}?`,
            message: 'Esta acción removerá el acceso a las funciones Pro/Enterprise de este usuario.',
            confirmText: 'Desactivar Licencia',
            variant: 'danger',
            onConfirm: async () => {
              await setUserPlan(user.id, 'free');
              showSuccess(`Licencia desactivada para ${user.email}`);
              loadEverything();
            }
          });
        } else {
          await setUserPlan(user.id, targetPlan as any);
          showSuccess(`Plan ${targetPlan.toUpperCase()} (30 días) asignado a ${user.email}`);
          loadEverything();
        }
      },
      {
        context: 'Modificación de Plan de Usuario',
        errorMessage: 'No se pudo actualizar el plan del usuario.',
        notify: (msg) => showError(msg)
      }
    );
  }

  async function handleReviewClaim(claim: any, approve: boolean) {
    if (!approve) {
      confirm({
        title: `¿Rechazar comprobante de ${claim.email}?`,
        message: 'El comprobante será marcado como rechazado y no se activará el plan.',
        confirmText: 'Rechazar Comprobante',
        variant: 'danger',
        onConfirm: async () => {
          await withErrorHandling(
            async () => {
              await reviewManualClaim(claim.id, false);
              showSuccess(`❌ Reclamo rechazado para ${claim.email}.`);
              loadEverything();
            },
            {
              context: 'Rechazo de Comprobante Manual',
              errorMessage: 'Error al rechazar comprobante.',
              notify: (msg) => showError(msg)
            }
          );
        }
      });
      return;
    }

    await withErrorHandling(
      async () => {
        await reviewManualClaim(claim.id, true);
        showSuccess(`✅ Reclamo aprobado para ${claim.email}. Licencia activada.`);
        loadEverything();
      },
      {
        context: 'Aprobación de Comprobante Manual',
        errorMessage: 'Error al aprobar comprobante.',
        notify: (msg) => showError(msg)
      }
    );
  }

  async function handleMarkNotifRead(id: string) {
    await withErrorHandling(
      async () => {
        await markNotificationRead(id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      },
      {
        context: 'Marcar Notificación como Leída',
        errorMessage: 'No se pudo actualizar la notificación.',
        notify: (msg) => showError(msg)
      }
    );
  }

  const unreadNotifCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-[var(--color-neutral-surface-cream)] text-[var(--color-neutral-text-primary)] font-sans">
      {/* Encabezado */}
      <header className={`bg-[var(--ui-preview-bg)] text-white px-6 py-4 flex items-center justify-between ${elevationSystem.floating} border-b border-[var(--color-neutral-border)]/20`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-[${radius.card}] bg-[var(--color-accent-base)] flex items-center justify-center font-black text-xs`}>
            LEE
          </div>
          <div>
            <h1 className="font-black text-base sm:text-lg tracking-wide">🛠️ Panel de Administración Suprema — LEECV</h1>
            <p className="text-[10px] text-[var(--color-neutral-surface)]/80">Control de Licencias, Pagos Automáticos, Webhooks & Reclamos</p>
          </div>
        </div>
        <button
          onClick={async () => { await logout(); setProfile(null); }}
          className={`flex items-center gap-1.5 text-xs font-extrabold bg-[var(--color-accent-base)] px-3.5 py-2 rounded-[${radius.card}] hover:bg-[var(--color-accent-brand-hover)] transition ${elevationSystem.raised} cursor-pointer`}
        >
          <LogOut className="w-3.5 h-3.5" /> Salir
        </button>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        
        {/* Métricas Rápidas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className={`bg-[var(--ui-bg-card)] rounded-[${radius.modal}] p-5 ${elevationSystem.raised} border border-[var(--color-neutral-border)] flex items-center gap-4`}>
            <div className={`w-12 h-12 rounded-[${radius.card}] bg-[var(--color-secondary-muted)] border border-[var(--color-secondary-base)]/30 text-[var(--color-secondary-text)] flex items-center justify-center`}>
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-[var(--color-neutral-text-primary)]">{stats.totalUsers}</p>
              <p className="text-xs text-[var(--color-neutral-text-secondary)] font-bold">Usuarios Registrados</p>
            </div>
          </div>

          <div className={`bg-[var(--ui-bg-card)] rounded-[${radius.modal}] p-5 ${elevationSystem.raised} border border-[var(--color-neutral-border)] flex items-center gap-4`}>
            <div className={`w-12 h-12 rounded-[${radius.card}] bg-[var(--color-status-warning-muted)] border border-[var(--color-status-warning-base)]/30 text-[var(--color-status-warning-text)] flex items-center justify-center`}>
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-[var(--color-neutral-text-primary)]">{stats.proUsers || stats.activeSubscriptions || 0}</p>
              <p className="text-xs text-[var(--color-neutral-text-secondary)] font-bold">Licencias Premium Activas</p>
            </div>
          </div>

          <div className={`bg-[var(--ui-bg-card)] rounded-[${radius.modal}] p-5 ${elevationSystem.raised} border border-[var(--color-neutral-border)] flex items-center gap-4`}>
            <div className={`w-12 h-12 rounded-[${radius.card}] bg-[var(--color-accent-purple-light)] border border-[var(--color-accent-purple)]/30 text-[var(--color-accent-purple-text)] flex items-center justify-center`}>
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-[var(--color-neutral-text-primary)]">500 MB</p>
              <p className="text-xs text-[var(--color-neutral-text-secondary)] font-bold">Capacidad Base DB Supabase</p>
            </div>
          </div>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className={`flex items-center gap-2 bg-[var(--ui-bg-card)] p-1.5 rounded-[${radius.modal}] border border-[var(--color-neutral-border)] ${elevationSystem.raised}`}>
          <button
            onClick={() => setAdminTab('users')}
            className={adminTab === 'users'
              ? `px-4 py-2 text-xs font-black rounded-[${radius.card}] transition flex items-center gap-2 cursor-pointer bg-[var(--color-secondary-base)] text-[var(--color-secondary-on-base)] ${elevationSystem.raised}` : `px-4 py-2 text-xs font-black rounded-[${radius.card}] transition flex items-center gap-2 cursor-pointer bg-[var(--color-neutral-surface-muted)] text-[var(--color-neutral-text-primary)] hover:bg-[var(--color-neutral-border)]/50`}
          >
            <Users className="w-4 h-4" />
            <span>Usuarios & Licencias</span>
          </button>

          <button
            onClick={() => setAdminTab('templates')}
            className={adminTab === 'templates'
              ? `px-4 py-2 text-xs font-black rounded-[${radius.card}] transition flex items-center gap-2 cursor-pointer bg-[var(--color-secondary-base)] text-[var(--color-secondary-on-base)] ${elevationSystem.raised}` : `px-4 py-2 text-xs font-black rounded-[${radius.card}] transition flex items-center gap-2 cursor-pointer bg-[var(--color-neutral-surface-muted)] text-[var(--color-neutral-text-primary)] hover:bg-[var(--color-neutral-border)]/50`}
          >
            <LayoutIcon className="w-4 h-4" />
            <span>Gestión de Plantillas y Presets</span>
          </button>

          <button
            onClick={() => setAdminTab('payments')}
            className={adminTab === 'payments'
              ? `px-4 py-2 text-xs font-black rounded-[${radius.card}] transition flex items-center gap-2 cursor-pointer bg-[var(--color-secondary-base)] text-[var(--color-secondary-on-base)] ${elevationSystem.raised}` : `px-4 py-2 text-xs font-black rounded-[${radius.card}] transition flex items-center gap-2 cursor-pointer bg-[var(--color-neutral-surface-muted)] text-[var(--color-neutral-text-primary)] hover:bg-[var(--color-neutral-border)]/50`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Historial de Pagos</span>
          </button>

          <button
            onClick={() => setAdminTab('storage')}
            className={adminTab === 'storage'
              ? `px-4 py-2 text-xs font-black rounded-[${radius.card}] transition flex items-center gap-2 cursor-pointer bg-[var(--color-secondary-base)] text-[var(--color-secondary-on-base)] ${elevationSystem.raised}` : `px-4 py-2 text-xs font-black rounded-[${radius.card}] transition flex items-center gap-2 cursor-pointer bg-[var(--color-neutral-surface-muted)] text-[var(--color-neutral-text-primary)] hover:bg-[var(--color-neutral-border)]/50`}
          >
            <HardDrive className="w-4 h-4" />
            <span>Almacenamiento, Servidores & Drive</span>
          </button>
        </div>

        {adminTab === 'templates' ? (
          <TemplateManagementTab />
        ) : adminTab === 'payments' ? (
          <ProcessedPaymentsTab />
        ) : adminTab === 'storage' ? (
          <StorageDriveTab />
        ) : (
          <div className="space-y-6">

        {/* Notificaciones de Administración con Badge visual de campana */}
        {notifications.length > 0 && (
          <div className={`bg-[var(--ui-bg-card)] rounded-[${radius.modal}] p-5 ${elevationSystem.raised} border border-[var(--color-neutral-border)] space-y-3`}>
            <div className="flex items-center justify-between border-b border-[var(--color-neutral-border)] pb-3">
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
              {unreadNotifCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] text-xs font-black">
                  {unreadNotifCount} nueva{unreadNotifCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`p-3 rounded-[${radius.card}] border flex items-center justify-between gap-3 text-xs transition ${
                    notif.read ? 'bg-[var(--color-neutral-surface-muted)] border-[var(--color-neutral-border)] text-[var(--color-neutral-text-muted)]' : 'bg-[var(--color-status-warning-muted)] border-[var(--color-status-warning-base)]/30 text-[var(--color-neutral-text-primary)] font-medium'
                  }`}
                >
                  <div className="space-y-0.5">
                    <p className="font-bold text-[var(--color-neutral-text-primary)]">{notif.title || notif.type}</p>
                    <p className="text-[11px] text-[var(--color-neutral-text-secondary)]">{notif.detail}</p>
                  </div>
                  {!notif.read && (
                    <button 
                      onClick={() => handleMarkNotifRead(notif.id)}
                      className={`p-1 rounded-[${radius.control}] text-[var(--color-neutral-text-muted)] hover:text-[var(--color-status-success-text)] hover:bg-[var(--color-status-success-muted)] transition cursor-pointer`}
                      title="Marcar como leída"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Panel de Reclamos y Soporte Pendiente */}
        {claims.length > 0 && (
          <div className={`bg-[var(--color-status-warning-muted)] border-2 border-[var(--color-status-warning-base)]/40 rounded-[${radius.modal}] p-5 ${elevationSystem.raised} space-y-3`}>
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
                <div key={claim.id} className={`bg-[var(--ui-bg-card)] rounded-[${radius.card}] p-3.5 border border-[var(--color-status-warning-base)]/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs`}>
                  <div className="space-y-0.5">
                    <p className="font-black text-[var(--color-neutral-text-primary)]">{claim.email}</p>
                    <p className="text-[11px] text-[var(--color-neutral-text-secondary)]">
                      Método: <strong>{claim.method}</strong> ({claim.amount}) — Comprobante: <code>{claim.proof_id || claim.proofId || 'N/A'}</code>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReviewClaim(claim, true)}
                      className={`px-3 py-1.5 bg-[var(--color-status-success-base)] hover:opacity-90 text-[var(--color-status-success-on-base)] font-extrabold rounded-[${radius.card}] transition ${elevationSystem.raised} cursor-pointer`}
                    >
                      ✅ Aprobar y Activar
                    </button>
                    <button
                      onClick={() => handleReviewClaim(claim, false)}
                      className={`px-3 py-1.5 bg-[var(--color-status-danger-base)] hover:opacity-90 text-black font-extrabold rounded-[${radius.card}] transition ${elevationSystem.raised} cursor-pointer`}
                    >
                      ❌ Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Diagnóstico Real de Pasarelas & Webhooks */}
        <div className={`bg-[var(--ui-bg-card)] rounded-[${radius.modal}] p-5 ${elevationSystem.raised} border border-[var(--color-neutral-border)] space-y-3`}>
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
              onClick={() => fetchIntegrations(true)}
              disabled={loadingIntegrations}
              className={`px-3 py-1.5 text-xs font-bold bg-[var(--color-neutral-surface-muted)] hover:bg-[var(--color-neutral-border)] text-[var(--color-neutral-text-primary)] rounded-[${radius.card}] border border-[var(--color-neutral-border)] flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingIntegrations ? 'animate-spin' : ''}`} />
              <span>{loadingIntegrations ? 'Verificando...' : 'Re-comprobar'}</span>
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {PAYMENT_PROVIDER_CATALOG.map((p) => (
              <React.Fragment key={p.id}>
                {renderGatewayCard(p.name, p.defaultCurrency, integrations?.[p.id])}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Tabla de Usuarios y Licencias con Búsqueda y Paginación */}
        <div className={`bg-[var(--ui-bg-card)] rounded-[${radius.modal}] ${elevationSystem.raised} border border-[var(--color-neutral-border)] overflow-hidden`}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-b border-[var(--color-neutral-border)]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[var(--color-accent-text)]" />
              <h2 className="font-extrabold text-sm text-[var(--color-neutral-text-primary)]">Gestión de Licencias y Origen de Pago</h2>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-neutral-text-muted)]" />
                <input
                  type="text"
                  placeholder="Buscar por email..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                  className={`w-full text-xs pl-9 pr-3 py-2 border border-[var(--color-neutral-border)] rounded-[${radius.card}] font-medium outline-none focus:border-[var(--color-secondary-base)]`}
                />
              </div>
              <button onClick={loadEverything} className={`text-[var(--color-secondary-text)] p-2 hover:bg-[var(--color-neutral-surface-muted)] rounded-[${radius.card}] transition cursor-pointer`}>
                <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <table className="w-full text-xs">
            <thead className="bg-[var(--color-neutral-surface-cream)] text-[var(--color-neutral-text-primary)]/70 text-left font-extrabold">
              <tr>
                <th className="px-5 py-3">Email de Usuario</th>
                <th className="px-5 py-3">Alta</th>
                <th className="px-5 py-3">Origen del Pago</th>
                <th className="px-5 py-3">Estado de Licencia</th>
                <th className="px-5 py-3 text-right">Acción Manual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-neutral-border)]/60">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-[var(--color-neutral-surface-cream)]/40 transition">
                  <td className="px-5 py-3 font-bold">{u.email}</td>
                  <td className="px-5 py-3 font-medium text-[var(--color-neutral-text-primary)]/70">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('es-AR') : '-'}
                  </td>
                  <td className="px-5 py-3">
                    {(() => {
                      if (!u.metodo_pago) {
                        return <span className="text-[var(--color-neutral-text-secondary)] font-bold">Gratuito</span>;
                      }
                      const badge = getPaymentProviderBadge(u.metodo_pago);
                      return (
                        <span className={`px-2 py-0.5 rounded-full border font-bold text-[10px] ${badge.className}`}>
                          {badge.emoji} {badge.label}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-5 py-3">
                    {u.premium_activo
                      ? <span className="inline-flex items-center gap-1 text-[var(--color-secondary-text)] font-black bg-[var(--color-secondary-muted)] px-2.5 py-1 rounded-full text-[11px]">👑 Activa ({u.plan?.toUpperCase() || 'PRO'})</span>
                      : <span className="text-[var(--color-neutral-text-secondary)] font-bold">Gratuito / Estándar</span>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {u.premium_activo ? (
                      <button
                        onClick={() => togglePremium(u, 'free')}
                        className={`text-xs font-extrabold px-3 py-1.5 rounded-[${radius.card}] transition ${elevationSystem.raised} cursor-pointer bg-[var(--color-accent-muted)] text-[var(--color-accent-text)] hover:bg-[var(--color-accent-rose-muted)] border border-[var(--color-accent-base)]/30`}
                      >
                        Desactivar Licencia
                      </button>
                    ) : (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => togglePremium(u, 'pro')}
                          className={`text-xs font-extrabold px-2.5 py-1.5 rounded-[${radius.card}] transition ${elevationSystem.raised} cursor-pointer bg-[var(--color-secondary-muted)] text-[var(--color-secondary-text)] hover:bg-[var(--color-secondary-muted)]/80 border border-[var(--color-secondary-base)]/30`}
                        >
                          + Pro
                        </button>
                        <button
                          onClick={() => togglePremium(u, 'enterprise')}
                          className={`text-xs font-extrabold px-2.5 py-1.5 rounded-[${radius.card}] transition ${elevationSystem.raised} cursor-pointer bg-[var(--color-accent-purple-light)] text-[var(--color-accent-purple-text)] hover:bg-[var(--color-accent-purple-light)]/80 border border-[var(--color-accent-purple)]/30`}
                        >
                          + Enterprise
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination Controls */}
          <div className="px-5 py-3 bg-[var(--color-neutral-surface-cream)]/50 border-t border-[var(--color-neutral-border)] flex items-center justify-between text-xs text-[var(--color-neutral-text-secondary)]">
            <span>
              Mostrando {users.length > 0 ? page * pageSize + 1 : 0} a {Math.min((page + 1) * pageSize, totalCount)} de {totalCount} usuarios
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
        )}

      </main>
    </div>
  );
}
