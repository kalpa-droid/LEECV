import React, { useState, useEffect } from 'react';
import {
  listUsers,
  setUserPlan,
  getBasicStats,
  listPendingClaims, reviewManualClaim,
  listAdminNotifications, markNotificationRead
} from './adminService';
import { getCurrentProfile, logout } from '../auth/authService';
import AdminLogin from './AdminLogin';
import { StorageDriveTab } from './components/StorageDriveTab';
import { TemplateManagementTab } from './components/TemplateManagementTab';
import { useToast } from '../../shared/core/ui/Toast';
import { useConfirm } from '../../shared/core/ui/ConfirmDialog';
import { withErrorHandling } from '../../shared/core/utils/errorHandler';
import { 
  Users, Crown, LogOut, RefreshCw, CreditCard, HardDrive, 
  ShieldCheck, CheckCircle2, AlertCircle, Sparkles, 
  Search, ChevronLeft, ChevronRight, Bell, Check, Layout as LayoutIcon 
} from 'lucide-react';

export default function AdminDashboard() {
  const { showError, showSuccess } = useToast();
  const { confirm } = useConfirm();

  const [adminTab, setAdminTab] = useState<'users' | 'storage' | 'templates'>('users');
  const [profile, setProfile] = useState<any>(undefined);
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, proUsers: 0, enterpriseUsers: 0, activeSubscriptions: 0 });
  const [loadingData, setLoadingData] = useState(false);
  const [claims, setClaims] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 50;

  async function loadEverything() {
    setLoadingData(true);
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
      <header className="bg-[var(--color-neutral-text-primary)] text-white px-6 py-4 flex items-center justify-between shadow-lg border-b border-[var(--color-neutral-border)]/20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--color-accent-base)] flex items-center justify-center font-black text-xs">
            LEE
          </div>
          <div>
            <h1 className="font-black text-base sm:text-lg tracking-wide">🛠️ Panel de Administración Suprema — LEECV</h1>
            <p className="text-[10px] text-white/70">Control de Licencias, Pagos Automáticos, Webhooks & Reclamos</p>
          </div>
        </div>
        <button
          onClick={async () => { await logout(); setProfile(null); }}
          className="flex items-center gap-1.5 text-xs font-extrabold bg-[var(--color-accent-base)] px-3.5 py-2 rounded-xl hover:bg-[var(--color-accent-brand-hover)] transition shadow-md cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" /> Salir
        </button>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        
        {/* Métricas Rápidas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[var(--color-neutral-border)] flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--color-secondary-muted)] border border-[var(--color-secondary-base)]/30 text-[var(--color-secondary-text)] flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-[var(--color-neutral-text-primary)]">{stats.totalUsers}</p>
              <p className="text-xs text-[var(--color-neutral-text-primary)]/60 font-bold">Usuarios Registrados</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[var(--color-neutral-border)] flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--color-status-warning-muted)] border border-[var(--color-status-warning-base)]/30 text-[var(--color-status-warning-text)] flex items-center justify-center">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-[var(--color-neutral-text-primary)]">{stats.proUsers || stats.activeSubscriptions || 0}</p>
              <p className="text-xs text-[var(--color-neutral-text-primary)]/60 font-bold">Licencias Premium Activas</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[var(--color-neutral-border)] flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--color-accent-purple-light)] border border-[var(--color-accent-purple)]/30 text-[var(--color-accent-purple-text)] flex items-center justify-center">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-[var(--color-neutral-text-primary)]">500 MB</p>
              <p className="text-xs text-[var(--color-neutral-text-primary)]/60 font-bold">Capacidad Base DB Supabase</p>
            </div>
          </div>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-[var(--color-neutral-border)] shadow-sm">
          <button
            onClick={() => setAdminTab('users')}
            className={adminTab === 'users'
              ? 'px-4 py-2 text-xs font-black rounded-xl transition flex items-center gap-2 cursor-pointer bg-[var(--color-neutral-text-primary)] text-white shadow-sm'
              : 'px-4 py-2 text-xs font-black rounded-xl transition flex items-center gap-2 cursor-pointer bg-[var(--color-neutral-surface-muted)] text-[var(--color-neutral-text-primary)] hover:bg-[var(--color-neutral-border)]/50'
            }
          >
            <Users className="w-4 h-4" />
            <span>Usuarios & Licencias</span>
          </button>

          <button
            onClick={() => setAdminTab('templates')}
            className={adminTab === 'templates'
              ? 'px-4 py-2 text-xs font-black rounded-xl transition flex items-center gap-2 cursor-pointer bg-[var(--color-neutral-text-primary)] text-white shadow-sm'
              : 'px-4 py-2 text-xs font-black rounded-xl transition flex items-center gap-2 cursor-pointer bg-[var(--color-neutral-surface-muted)] text-[var(--color-neutral-text-primary)] hover:bg-[var(--color-neutral-border)]/50'
            }
          >
            <LayoutIcon className="w-4 h-4 text-white" />
            <span>Gestión de Plantillas y Presets (Capa 5)</span>
          </button>

          <button
            onClick={() => setAdminTab('storage')}
            className={adminTab === 'storage'
              ? 'px-4 py-2 text-xs font-black rounded-xl transition flex items-center gap-2 cursor-pointer bg-[var(--color-neutral-text-primary)] text-white shadow-sm'
              : 'px-4 py-2 text-xs font-black rounded-xl transition flex items-center gap-2 cursor-pointer bg-[var(--color-neutral-surface-muted)] text-[var(--color-neutral-text-primary)] hover:bg-[var(--color-neutral-border)]/50'
            }
          >
            <HardDrive className="w-4 h-4 text-white" />
            <span>Almacenamiento, Servidores & Drive</span>
          </button>
        </div>

        {adminTab === 'templates' ? (
          <TemplateManagementTab />
        ) : adminTab === 'storage' ? (
          <StorageDriveTab />
        ) : (
          <div className="space-y-6">

        {/* Notificaciones de Administración con Badge visual de campana */}
        {notifications.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[var(--color-neutral-border)] space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--color-neutral-border)] pb-3">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Bell className="w-5 h-5 text-[var(--color-accent-text)]" />
                  {unreadNotifCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[var(--color-accent-base)] text-white font-black text-[9px] rounded-full flex items-center justify-center animate-pulse">
                      {unreadNotifCount}
                    </span>
                  )}
                </div>
                <h2 className="font-extrabold text-sm text-[var(--color-neutral-text-primary)]">🔔 Eventos & Notificaciones de Pagos / Sistema</h2>
              </div>
              {unreadNotifCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-[var(--color-accent-base)] text-white text-xs font-black">
                  {unreadNotifCount} nueva{unreadNotifCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs transition ${
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
                      className="p-1 rounded-lg text-[var(--color-neutral-text-muted)] hover:text-[var(--color-status-success-text)] hover:bg-[var(--color-status-success-muted)] transition cursor-pointer"
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
          <div className="bg-[var(--color-status-warning-muted)] border-2 border-[var(--color-status-warning-base)]/40 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-[var(--color-status-warning-text)]" />
                <h2 className="font-extrabold text-sm text-[var(--color-status-warning-text)]">📩 Reclamos de Activación y Comprobantes Pendientes</h2>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-[var(--color-status-warning-base)] text-white text-xs font-black">
                {claims.length} Pendiente{claims.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="space-y-2">
              {claims.map((claim) => (
                <div key={claim.id} className="bg-white rounded-xl p-3.5 border border-[var(--color-status-warning-base)]/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <p className="font-black text-[var(--color-neutral-text-primary)]">{claim.email}</p>
                    <p className="text-[11px] text-[var(--color-neutral-text-secondary)]">
                      Método: <strong>{claim.method}</strong> ({claim.amount}) — Comprobante: <code>{claim.proof_id || claim.proofId || 'N/A'}</code>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReviewClaim(claim, true)}
                      className="px-3 py-1.5 bg-[var(--color-status-success-base)] hover:opacity-90 text-white font-extrabold rounded-xl transition shadow-sm cursor-pointer"
                    >
                      ✅ Aprobar y Activar
                    </button>
                    <button
                      onClick={() => handleReviewClaim(claim, false)}
                      className="px-3 py-1.5 bg-[var(--color-status-danger-base)] hover:opacity-90 text-white font-extrabold rounded-xl transition shadow-sm cursor-pointer"
                    >
                      ❌ Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Estado de Integraciones de Cobro Automático */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[var(--color-neutral-border)] space-y-3">
          <div className="flex items-center justify-between border-b border-[var(--color-neutral-border)] pb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[var(--color-secondary-text)]" />
              <h2 className="font-extrabold text-sm text-[var(--color-neutral-text-primary)]">Pasarelas & Webhooks de Cobro Unificado</h2>
            </div>
            <span className="text-[11px] text-[var(--color-status-success-text)] font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Core applyPayment.js Activo
            </span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-3.5 rounded-xl border border-[var(--color-status-success-base)]/30 bg-[var(--color-status-success-muted)] flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-[var(--color-status-success-text)]">Mercado Pago (ARS)</p>
                <p className="text-[10px] text-[var(--color-status-success-text)] font-bold">Cobros Webhook Automáticos</p>
              </div>
              <CheckCircle2 className="w-4 h-4 text-[var(--color-status-success-base)]" />
            </div>

            <div className="p-3.5 rounded-xl border border-[var(--color-secondary-base)]/30 bg-[var(--color-secondary-muted)] flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-[var(--color-secondary-text)]">PayPal (USD)</p>
                <p className="text-[10px] text-[var(--color-secondary-text)] font-bold">Firma Webhook Verificada</p>
              </div>
              <CheckCircle2 className="w-4 h-4 text-[var(--color-secondary-base)]" />
            </div>

            <div className="p-3.5 rounded-xl border border-[var(--color-accent-purple)]/30 bg-[var(--color-accent-purple-light)] flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-[var(--color-accent-purple-text)]">Lemon Squeezy (USD)</p>
                <p className="text-[10px] text-[var(--color-accent-purple-text)] font-bold">Suscripciones Globales</p>
              </div>
              <CheckCircle2 className="w-4 h-4 text-[var(--color-accent-purple-text)]" />
            </div>
          </div>
        </div>

        {/* Tabla de Usuarios y Licencias con Búsqueda y Paginación */}
        <div className="bg-white rounded-2xl shadow-sm border border-[var(--color-neutral-border)] overflow-hidden">
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
                  className="w-full text-xs pl-9 pr-3 py-2 border border-[var(--color-neutral-border)] rounded-xl font-medium outline-none focus:border-[var(--color-secondary-base)]"
                />
              </div>
              <button onClick={loadEverything} className="text-[var(--color-secondary-text)] p-2 hover:bg-[var(--color-neutral-surface-muted)] rounded-xl transition cursor-pointer">
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
                    {u.metodo_pago === 'mercadopago' ? (
                      <span className="px-2 py-0.5 rounded-full bg-[var(--color-status-success-muted)] text-[var(--color-status-success-text)] border border-[var(--color-status-success-base)]/30 font-bold text-[10px]">
                        🌐 Mercado Pago Automático
                      </span>
                    ) : u.metodo_pago === 'paypal' ? (
                      <span className="px-2 py-0.5 rounded-full bg-[var(--color-secondary-muted)] text-[var(--color-secondary-text)] border border-[var(--color-secondary-base)]/30 font-bold text-[10px]">
                        💳 PayPal Automático
                      </span>
                    ) : u.metodo_pago === 'lemonsqueezy' ? (
                      <span className="px-2 py-0.5 rounded-full bg-[var(--color-accent-purple-light)] text-[var(--color-accent-purple-text)] border border-[var(--color-accent-purple)]/30 font-bold text-[10px]">
                        🌎 Lemon Squeezy USD
                      </span>
                    ) : u.metodo_pago === 'manual' ? (
                      <span className="px-2 py-0.5 rounded-full bg-[var(--color-status-warning-muted)] text-[var(--color-status-warning-text)] border border-[var(--color-status-warning-base)]/30 font-bold text-[10px]">
                        🏦 Transferencia / Manual
                      </span>
                    ) : (
                      <span className="text-[var(--color-neutral-text-primary)]/40 font-bold">Gratuito</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {u.premium_activo
                      ? <span className="inline-flex items-center gap-1 text-[var(--color-secondary-text)] font-black bg-[var(--color-secondary-muted)] px-2.5 py-1 rounded-full text-[11px]">👑 Activa ({u.plan?.toUpperCase() || 'PRO'})</span>
                      : <span className="text-[var(--color-neutral-text-primary)]/40 font-bold">Gratuito / Estándar</span>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {u.premium_activo ? (
                      <button
                        onClick={() => togglePremium(u, 'free')}
                        className="text-xs font-extrabold px-3 py-1.5 rounded-xl transition shadow-sm cursor-pointer bg-[var(--color-accent-muted)] text-[var(--color-accent-text)] hover:bg-[var(--color-accent-rose-muted)] border border-[var(--color-accent-base)]/30"
                      >
                        Desactivar Licencia
                      </button>
                    ) : (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => togglePremium(u, 'pro')}
                          className="text-xs font-extrabold px-2.5 py-1.5 rounded-xl transition shadow-sm cursor-pointer bg-[var(--color-secondary-muted)] text-[var(--color-secondary-text)] hover:bg-[var(--color-secondary-muted)]/80 border border-[var(--color-secondary-base)]/30"
                        >
                          + Pro
                        </button>
                        <button
                          onClick={() => togglePremium(u, 'enterprise')}
                          className="text-xs font-extrabold px-2.5 py-1.5 rounded-xl transition shadow-sm cursor-pointer bg-[var(--color-accent-purple-light)] text-[var(--color-accent-purple-text)] hover:bg-[var(--color-accent-purple-light)]/80 border border-[var(--color-accent-purple)]/30"
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
                className="p-1.5 rounded-lg border border-[var(--color-neutral-border)] disabled:opacity-40 hover:bg-[var(--color-neutral-surface-muted)] transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-bold">Página {page + 1}</span>
              <button
                disabled={(page + 1) * pageSize >= totalCount}
                onClick={() => setPage(p => p + 1)}
                className="p-1.5 rounded-lg border border-[var(--color-neutral-border)] disabled:opacity-40 hover:bg-[var(--color-neutral-surface-muted)] transition"
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
