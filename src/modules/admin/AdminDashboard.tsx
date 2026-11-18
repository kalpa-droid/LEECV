import React, { useState, useEffect, useRef } from 'react';
import {
  setUserPlan,
  setPdfExportAccess,
  getBasicStats,
  getPublishedCvsCount,
  listPendingClaims, reviewManualClaim,
  listAdminNotifications, markNotificationRead, markAllNotificationsRead,
  getIntegrationsStatus, getAiProvidersStatus, listCustomers
} from './adminService';
import { getCurrentProfile, logout } from '../../shared/core/auth/authService';
import AdminLogin from './AdminLogin';
import { StorageDriveTab } from './components/StorageDriveTab';
import { SentryReportsTab } from './components/SentryReportsTab';
import { PaymentsAdminTab } from './components/PaymentsAdminTab';
import { AiTelemetryTab } from './components/AiTelemetryTab';
import { PublishedCvsTab } from './components/PublishedCvsTab';
import { AdminOverviewTab } from './components/AdminOverviewTab';
import { AuditAndErrorsTab } from './components/AuditAndErrorsTab';
import { TemplateManagementTab } from './components/TemplateManagementTab';
import { UsersTab } from './components/UsersTab';
import { useToast } from '../../shared/core/ui/Toast';
import { useConfirm } from '../../shared/core/ui/ConfirmDialog';
import { withErrorHandling } from '../../shared/core/utils/errorHandler';
import { button, elevationSystem, radius } from '../../shared/core/uiDesignSystem';

import {
  Users, Crown, LogOut, CreditCard, HardDrive,
  ShieldCheck, Sparkles, Layout as LayoutIcon, ShieldAlert, Palette, RefreshCw, Globe
} from 'lucide-react';

/** Tiempo máximo de espera para verificar la sesión antes de ofrecer "Reintentar". */
const SESSION_CHECK_TIMEOUT_MS = 15000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Tiempo de espera agotado al verificar la sesión')), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

export default function AdminDashboard() {
  const { showError, showSuccess } = useToast();
  const { confirm } = useConfirm();

  const [adminTab, setAdminTab] = useState<'overview' | 'users' | 'payments' | 'storage' | 'sentry' | 'aiTelemetry' | 'audit' | 'templates' | 'publishedCvs'>('overview');
  const [profile, setProfile] = useState<any>(undefined);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, proUsers: 0, activeSubscriptions: 0 });
  const [loadingData, setLoadingData] = useState(false);
  const [claims, setClaims] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [integrations, setIntegrations] = useState<any>(null);
  const [aiProviders, setAiProviders] = useState<any>(null);
  const [loadingIntegrations, setLoadingIntegrations] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 50;
  const [publishedCount, setPublishedCount] = useState<number | null>(null);
  // El input pinta el valor inmediato, pero la consulta a la red espera
  // 350ms de inactividad para no disparar una request por tecla.
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  async function fetchIntegrations(forcePing = false) {
    setLoadingIntegrations(true);
    await withErrorHandling(
      async () => {
        const [status, aiStatus] = await Promise.all([
          getIntegrationsStatus(forcePing),
          getAiProvidersStatus(forcePing)
        ]);
        setIntegrations(status);
        setAiProviders(aiStatus);
      },
      {
        context: 'Diagnóstico de Integraciones',
        errorMessage: 'Error al consultar estado de integraciones.',
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
        const [customersData, s, claimList, notifList, published] = await Promise.all([
          listCustomers({ page, limit: pageSize, q: debouncedSearchQuery }),
          getBasicStats(),
          listPendingClaims(),
          listAdminNotifications(),
          getPublishedCvsCount(),
        ]);
        setUsers(customersData.customers || []);
        setTotalCount(customersData.totalCount || 0);
        setStats(s || { totalUsers: 0, proUsers: 0, activeSubscriptions: 0 });
        setClaims(claimList || []);
        setNotifications(notifList || []);
        setPublishedCount(typeof published === 'number' ? published : null);
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
    setSessionError(null);
    setProfile(undefined); // vuelve a "Verificando sesión…" en vez de flashear el login
    try {
      const p = await withTimeout(getCurrentProfile(), SESSION_CHECK_TIMEOUT_MS);
      setProfile(p);
    } catch (error) {
      // Nunca dejar profile en undefined: mostrar pantalla de error con
      // reintento en vez de pantalla en blanco permanente.
      console.error('Error verificando sesión de administrador:', error);
      setProfile(null);
      setSessionError('No pudimos verificar tu sesión. Revisá tu conexión a internet e intentá de nuevo.');
    }
  }

  // Referencia siempre fresca a loadEverything: evita que el polling de 45s
  // capture una versión vieja con page=0 y búsqueda vacía.
  const loadEverythingRef = useRef(loadEverything);
  loadEverythingRef.current = loadEverything;

  // La verificación de sesión corre UNA sola vez al montar (no en cada
  // cambio de página/búsqueda).
  useEffect(() => { checkSession(); }, []);

  // La carga de datos corre cuando ya se confirmó el rol admin y cambia la
  // página o la búsqueda (y al confirmarse el admin por primera vez).
  useEffect(() => {
    if (profile?.role === 'admin') {
      loadEverything();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.role, page, debouncedSearchQuery]);

  useEffect(() => {
    if (profile?.role === 'admin') {
      const timer = setInterval(() => { loadEverythingRef.current(); }, 45000);
      return () => clearInterval(timer);
    }
  }, [profile?.role]);

  if (sessionError && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] font-sans px-6">
        <div role="alert" className="max-w-md w-full text-center space-y-4 bg-[var(--ui-bg-card)] border border-[var(--color-neutral-border)] rounded-2xl p-6">
          <p className="font-black text-lg">No pudimos verificar tu sesión</p>
          <p className="text-sm text-[var(--color-neutral-text-secondary)] font-medium">{sessionError}</p>
          <button
            onClick={checkSession}
            className={`${button.primary} inline-flex items-center gap-2 px-4 py-2 text-sm font-extrabold`}
          >
            <RefreshCw className="w-4 h-4" /> Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (profile === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] font-sans" role="status">
        <p className="font-bold">Verificando sesión de administrador…</p>
      </div>
    );
  }

  if (!profile) return <AdminLogin onLogin={checkSession} />;
  if (profile.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] font-sans">
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
            message: 'Esta acción removerá el acceso a las funciones Pro de este usuario.',
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

  async function handleMarkAllNotifRead() {
    await withErrorHandling(
      async () => {
        await markAllNotificationsRead();
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      },
      {
        context: 'Marcar todas las Notificaciones como Leídas',
        errorMessage: 'No se pudieron marcar las notificaciones.',
        notify: (msg) => showError(msg)
      }
    );
  }

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
          className={`${button.primary} flex items-center gap-1.5 text-xs font-extrabold px-3.5 py-2`}
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
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-[var(--color-neutral-text-primary)]">{publishedCount ?? '—'}</p>
              <p className="text-xs text-[var(--color-neutral-text-secondary)] font-bold">CVs Publicados</p>
            </div>
          </div>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className={`flex items-center gap-2 bg-[var(--ui-bg-card)] p-1.5 rounded-[${radius.modal}] border border-[var(--color-neutral-border)] ${elevationSystem.raised} overflow-x-auto whitespace-nowrap`}>

          <button
            onClick={() => setAdminTab('overview')}
            className={adminTab === 'overview'
              ? `${button.primary} px-4 py-2 text-xs font-black flex items-center gap-2`
              : `${button.secondary} px-4 py-2 text-xs font-black flex items-center gap-2`}
          >
            <LayoutIcon className="w-4 h-4" />
            <span>Resumen y Operaciones</span>
          </button>

          <button
            onClick={() => setAdminTab('users')}
            className={adminTab === 'users'
              ? `${button.primary} px-4 py-2 text-xs font-black flex items-center gap-2`
              : `${button.secondary} px-4 py-2 text-xs font-black flex items-center gap-2`}
          >
            <Users className="w-4 h-4" />
            <span>Gestión de Clientes</span>
          </button>

          <button
            onClick={() => setAdminTab('sentry')}
            className={adminTab === 'sentry'
              ? `${button.primary} px-4 py-2 text-xs font-black flex items-center gap-2`
              : `${button.secondary} px-4 py-2 text-xs font-black flex items-center gap-2`}
          >
            <ShieldCheck className="w-4 h-4 text-[var(--color-accent-purple-text)]" />
            <span>Monitoreo & Telemetría Sentry</span>
          </button>

          <button
            onClick={() => setAdminTab('payments')}
            className={adminTab === 'payments'
              ? `${button.primary} px-4 py-2 text-xs font-black flex items-center gap-2`
              : `${button.secondary} px-4 py-2 text-xs font-black flex items-center gap-2`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Historial de Pagos</span>
          </button>

          <button
            onClick={() => setAdminTab('audit')}
            className={adminTab === 'audit'
              ? `${button.primary} px-4 py-2 text-xs font-black flex items-center gap-2`
              : `${button.secondary} px-4 py-2 text-xs font-black flex items-center gap-2`}
          >
            <ShieldAlert className="w-4 h-4 text-[var(--color-status-danger-text)]" />
            <span>Auditoría y Errores</span>
          </button>

          <button
            onClick={() => setAdminTab('storage')}
            className={adminTab === 'storage'
              ? `${button.primary} px-4 py-2 text-xs font-black flex items-center gap-2`
              : `${button.secondary} px-4 py-2 text-xs font-black flex items-center gap-2`}
          >
            <HardDrive className="w-4 h-4" />
            <span>Almacenamiento, Servidores & Drive</span>
          </button>

          <button
            onClick={() => setAdminTab('templates')}
            className={adminTab === 'templates'
              ? `${button.primary} px-4 py-2 text-xs font-black flex items-center gap-2`
              : `${button.secondary} px-4 py-2 text-xs font-black flex items-center gap-2`}
          >
            <Palette className="w-4 h-4 text-[var(--color-accent-purple-text)]" />
            <span>Plantillas de CV</span>
          </button>

          <button
            onClick={() => setAdminTab('aiTelemetry')}
            className={adminTab === 'aiTelemetry'
              ? `${button.primary} px-4 py-2 text-xs font-black flex items-center gap-2`
              : `${button.secondary} px-4 py-2 text-xs font-black flex items-center gap-2`}
          >
            <Sparkles className="w-4 h-4 text-[var(--color-accent-text)]" />
            <span>Costos y Telemetría IA</span>
          </button>

          <button
            onClick={() => setAdminTab('publishedCvs')}
            className={adminTab === 'publishedCvs'
              ? `${button.primary} px-4 py-2 text-xs font-black flex items-center gap-2`
              : `${button.secondary} px-4 py-2 text-xs font-black flex items-center gap-2`}
          >
            <Globe className="w-4 h-4 text-[var(--color-accent-purple-text)]" />
            <span>CVs Publicados</span>
          </button>
        </div>

        {adminTab === 'overview' ? (
          <AdminOverviewTab
            integrations={integrations}
            aiProviders={aiProviders}
            loadingIntegrations={loadingIntegrations}
            onRecheckIntegrations={() => fetchIntegrations(true)}
            notifications={notifications}
            onMarkNotifRead={handleMarkNotifRead}
            onMarkAllNotifRead={handleMarkAllNotifRead}
            claims={claims}
            onReviewClaim={handleReviewClaim}
          />
        ) : adminTab === 'users' ? (
          <UsersTab
            users={users}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            page={page}
            setPage={setPage}
            totalCount={totalCount}
            pageSize={pageSize}
            togglePremium={togglePremium}
            setPdfExportAccess={setPdfExportAccess}
            onPdfExportAccessUpdated={loadEverything}
          />
        ) : adminTab === 'sentry' ? (
          <SentryReportsTab />
        ) : adminTab === 'payments' ? (
          <PaymentsAdminTab />
        ) : adminTab === 'audit' ? (
          <AuditAndErrorsTab />
        ) : adminTab === 'storage' ? (
          <StorageDriveTab />
        ) : adminTab === 'templates' ? (
          <TemplateManagementTab />
        ) : adminTab === 'aiTelemetry' ? (
          <AiTelemetryTab />
        ) : adminTab === 'publishedCvs' ? (
          <PublishedCvsTab />
        ) : null}

      </main>
    </div>
  );
}
