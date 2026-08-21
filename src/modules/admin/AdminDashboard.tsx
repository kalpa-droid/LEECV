import React, { useEffect, useState } from 'react';
import { getCurrentProfile, logout } from '../auth/authService';
import { 
  listUsers, 
  setUserPlan,
  setPremium, 
  getBasicStats, 
  listPendingClaims, 
  reviewManualClaim,
  listAdminNotifications, 
  markNotificationRead 
} from './adminService';
import AdminLogin from './AdminLogin';
import { 
  Users, Crown, LogOut, RefreshCw, CreditCard, HardDrive, 
  ShieldCheck, CheckCircle2, MessageSquare, AlertCircle, Sparkles, 
  Search, ChevronLeft, ChevronRight, Bell, Check, X 
} from 'lucide-react';

import { useToast } from '../../shared/core/ui/Toast';
import { useConfirm } from '../../shared/core/ui/ConfirmDialog';
import { TemplateManagementTab } from './components/TemplateManagementTab';
import { Layout as LayoutIcon } from 'lucide-react';

export default function AdminDashboard() {
  const { showSuccess, showError } = useToast();
  const { confirm } = useConfirm();
  const [profile, setProfile] = useState(undefined);
  const [adminTab, setAdminTab] = useState<'users' | 'templates'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ totalUsers: 0, proUsers: 0, enterpriseUsers: 0, activeSubscriptions: 0 });
  const [loadingData, setLoadingData] = useState(false);
  const [claims, setClaims] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 50;

  async function loadEverything() {
    setLoadingData(true);
    try {
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
    } catch (err) {
      console.error(err);
      showError('Inconveniente al cargar datos del servidor.');
    } finally {
      setLoadingData(false);
    }
  }

  async function checkSession() {
    const p = await getCurrentProfile();
    setProfile(p);
    if (p?.role === 'admin') loadEverything();
  }

  useEffect(() => { checkSession(); }, [page, searchQuery]);

  // Live Auto-Refresh Interval (every 45s)
  useEffect(() => {
    if (profile?.role === 'admin') {
      const timer = setInterval(() => {
        loadEverything();
      }, 45000);
      return () => clearInterval(timer);
    }
  }, [profile]);

  if (profile === undefined) return null;
  if (!profile) return <AdminLogin onLogin={checkSession} />;
  if (profile.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#2B1B2E] text-white font-sans">
        <p className="font-bold">Tu cuenta no tiene permisos de administrador supremo.</p>
      </div>
    );
  }

  async function togglePremium(user, targetPlan = 'pro') {
    if (targetPlan === 'free' || user.premium_activo && targetPlan === 'free') {
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
  }

  async function handleReviewClaim(claim, approve) {
    if (!approve) {
      confirm({
        title: `¿Rechazar comprobante de ${claim.email}?`,
        message: 'El comprobante será marcado como rechazado y no se activará el plan.',
        confirmText: 'Rechazar Comprobante',
        variant: 'danger',
        onConfirm: async () => {
          try {
            await reviewManualClaim(claim.id, false);
            showSuccess(`❌ Reclamo rechazado para ${claim.email}.`);
            loadEverything();
          } catch (err) {
            showError(err.message || 'Error al rechazar comprobante');
          }
        }
      });
      return;
    }

    try {
      await reviewManualClaim(claim.id, true);
      showSuccess(`✅ Reclamo aprobado para ${claim.email}. Licencia activada.`);
      loadEverything();
    } catch (err) {
      showError(err.message || 'Error al aprobar comprobante');
    }
  }

  async function handleMarkNotifRead(id) {
    try {
      await markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error(err);
    }
  }

  const unreadNotifCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-[#F7F3E9] text-[#2B1B2E] font-sans">
      {/* Encabezado */}
      <header className="bg-[#2B1B2E] text-white px-6 py-4 flex items-center justify-between shadow-lg border-b border-[#EFE2C9]/20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FF2E63] flex items-center justify-center font-black text-xs">
            LEE
          </div>
          <div>
            <h1 className="font-black text-base sm:text-lg tracking-wide">🛠️ Panel de Administración Suprema — LEECV</h1>
            <p className="text-[10px] text-[#FFE0C7]/70">Control de Licencias, Pagos Automáticos, Webhooks & Reclamos</p>
          </div>
        </div>
        <button
          onClick={async () => { await logout(); setProfile(null); }}
          className="flex items-center gap-1.5 text-xs font-extrabold bg-[#FF2E63] px-3.5 py-2 rounded-xl hover:bg-[#E31555] transition shadow-md cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" /> Salir
        </button>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        
        {/* Métricas Rápidas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#EFE2C9] flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#00A8A0]/10 border border-[#00A8A0]/30 text-[#00A8A0] flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-[#2B1B2E]">{stats.totalUsers}</p>
              <p className="text-xs text-[#2B1B2E]/60 font-bold">Usuarios Registrados</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#EFE2C9] flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 flex items-center justify-center">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-[#2B1B2E]">{stats.proUsers || stats.activeSubscriptions || 0}</p>
              <p className="text-xs text-[#2B1B2E]/60 font-bold">Licencias Premium Activas</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#EFE2C9] flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-600 flex items-center justify-center">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-[#2B1B2E]">500 MB</p>
              <p className="text-xs text-[#2B1B2E]/60 font-bold">Capacidad Base DB Supabase</p>
            </div>
          </div>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-[#EFE2C9] shadow-sm">
          <button
            onClick={() => setAdminTab('users')}
            className={`px-4 py-2 text-xs font-black rounded-xl transition flex items-center gap-2 cursor-pointer ${
              adminTab === 'users' ? 'bg-[#2B1B2E] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Usuarios & Licencias</span>
          </button>

          <button
            onClick={() => setAdminTab('templates')}
            className={`px-4 py-2 text-xs font-black rounded-xl transition flex items-center gap-2 cursor-pointer ${
              adminTab === 'templates' ? 'bg-[#2B1B2E] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <LayoutIcon className="w-4 h-4 text-[#FF2E63]" />
            <span>Gestión de Plantillas y Presets (Capa 5)</span>
          </button>
        </div>

        {adminTab === 'templates' ? (
          <TemplateManagementTab />
        ) : (
          <div className="space-y-6">

        {/* Notificaciones de Administración con Badge visual de campana */}
        {notifications.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#EFE2C9] space-y-3">
            <div className="flex items-center justify-between border-b border-[#EFE2C9] pb-3">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Bell className="w-5 h-5 text-[#FF2E63]" />
                  {unreadNotifCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#FF2E63] text-white font-black text-[9px] rounded-full flex items-center justify-center animate-pulse">
                      {unreadNotifCount}
                    </span>
                  )}
                </div>
                <h2 className="font-extrabold text-sm text-[#2B1B2E]">🔔 Eventos & Notificaciones de Pagos / Sistema</h2>
              </div>
              {unreadNotifCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#FF2E63] text-white text-xs font-black">
                  {unreadNotifCount} nueva{unreadNotifCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs transition ${
                    notif.read ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-amber-50/60 border-amber-200 text-slate-800 font-medium'
                  }`}
                >
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-900">{notif.title || notif.type}</p>
                    <p className="text-[11px] text-slate-600">{notif.detail}</p>
                  </div>
                  {!notif.read && (
                    <button 
                      onClick={() => handleMarkNotifRead(notif.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
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
          <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <h2 className="font-extrabold text-sm text-amber-950">📩 Reclamos de Activación y Comprobantes Pendientes</h2>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-xs font-black">
                {claims.length} Pendiente{claims.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="space-y-2">
              {claims.map((claim) => (
                <div key={claim.id} className="bg-white rounded-xl p-3.5 border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <p className="font-black text-[#2B1B2E]">{claim.email}</p>
                    <p className="text-[11px] text-slate-600">
                      Método: <strong>{claim.method}</strong> ({claim.amount}) — Comprobante: <code>{claim.proof_id || claim.proofId || 'N/A'}</code>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReviewClaim(claim, true)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl transition shadow-sm cursor-pointer"
                    >
                      ✅ Aprobar y Activar
                    </button>
                    <button
                      onClick={() => handleReviewClaim(claim, false)}
                      className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white font-extrabold rounded-xl transition shadow-sm cursor-pointer"
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
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#EFE2C9] space-y-3">
          <div className="flex items-center justify-between border-b border-[#EFE2C9] pb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#00A8A0]" />
              <h2 className="font-extrabold text-sm text-[#2B1B2E]">Pasarelas & Webhooks de Cobro Unificado</h2>
            </div>
            <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Core applyPayment.js Activo
            </span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-emerald-900">Mercado Pago (ARS)</p>
                <p className="text-[10px] text-emerald-700 font-bold">Cobros Webhook Automáticos</p>
              </div>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>

            <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/5 flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-blue-900">PayPal (USD)</p>
                <p className="text-[10px] text-blue-700 font-bold">Firma Webhook Verificada</p>
              </div>
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
            </div>

            <div className="p-3.5 rounded-xl border border-purple-500/30 bg-purple-500/5 flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-purple-900">Lemon Squeezy (USD)</p>
                <p className="text-[10px] text-purple-700 font-bold">Suscripciones Globales</p>
              </div>
              <CheckCircle2 className="w-4 h-4 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Tabla de Usuarios y Licencias con Búsqueda y Paginación */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#EFE2C9] overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-b border-[#EFE2C9]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#FF2E63]" />
              <h2 className="font-extrabold text-sm text-[#2B1B2E]">Gestión de Licencias y Origen de Pago</h2>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por email..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                  className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-xl font-medium outline-none focus:border-[#00A8A0]"
                />
              </div>
              <button onClick={loadEverything} className="text-[#00A8A0] p-2 hover:bg-slate-100 rounded-xl transition cursor-pointer">
                <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <table className="w-full text-xs">
            <thead className="bg-[#F7F3E9] text-[#2B1B2E]/70 text-left font-extrabold">
              <tr>
                <th className="px-5 py-3">Email de Usuario</th>
                <th className="px-5 py-3">Alta</th>
                <th className="px-5 py-3">Origen del Pago</th>
                <th className="px-5 py-3">Estado de Licencia</th>
                <th className="px-5 py-3 text-right">Acción Manual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE2C9]/60">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-[#F7F3E9]/40 transition">
                  <td className="px-5 py-3 font-bold">{u.email}</td>
                  <td className="px-5 py-3 font-medium text-[#2B1B2E]/70">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('es-AR') : '-'}
                  </td>
                  <td className="px-5 py-3 font-medium">
                    {u.metodo_pago === 'mercadopago' ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-800 border border-emerald-500/30 font-bold text-[10px]">
                        🌐 Mercado Pago Automático
                      </span>
                    ) : u.metodo_pago === 'paypal' ? (
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-800 border border-blue-500/30 font-bold text-[10px]">
                        💳 PayPal Automático
                      </span>
                    ) : u.metodo_pago === 'lemonsqueezy' ? (
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-800 border border-purple-500/30 font-bold text-[10px]">
                        🌎 Lemon Squeezy USD
                      </span>
                    ) : u.metodo_pago === 'manual' ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-800 border border-amber-500/30 font-bold text-[10px]">
                        🏦 Transferencia / Manual
                      </span>
                    ) : (
                      <span className="text-[#2B1B2E]/40 font-bold">Gratuito</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {u.premium_activo
                      ? <span className="inline-flex items-center gap-1 text-[#00A8A0] font-black bg-[#00A8A0]/10 px-2.5 py-1 rounded-full text-[11px]">👑 Activa ({u.plan?.toUpperCase() || 'PRO'})</span>
                      : <span className="text-[#2B1B2E]/40 font-bold">Gratuito / Estándar</span>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {u.premium_activo ? (
                      <button
                        onClick={() => togglePremium(u, 'free')}
                        className="text-xs font-extrabold px-3 py-1.5 rounded-xl transition shadow-sm cursor-pointer bg-[#FF2E63]/10 text-[#FF2E63] hover:bg-[#FF2E63]/20 border border-[#FF2E63]/30"
                      >
                        Desactivar Licencia
                      </button>
                    ) : (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => togglePremium(u, 'pro')}
                          className="text-xs font-extrabold px-2.5 py-1.5 rounded-xl transition shadow-sm cursor-pointer bg-[#00A8A0]/10 text-[#00A8A0] hover:bg-[#00A8A0]/20 border border-[#00A8A0]/30"
                        >
                          + Pro
                        </button>
                        <button
                          onClick={() => togglePremium(u, 'enterprise')}
                          className="text-xs font-extrabold px-2.5 py-1.5 rounded-xl transition shadow-sm cursor-pointer bg-purple-500/10 text-purple-700 hover:bg-purple-500/20 border border-purple-500/30"
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
          <div className="px-5 py-3 bg-[#F7F3E9]/50 border-t border-[#EFE2C9] flex items-center justify-between text-xs text-slate-600">
            <span>
              Mostrando {users.length > 0 ? page * pageSize + 1 : 0} a {Math.min((page + 1) * pageSize, totalCount)} de {totalCount} usuarios
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage(p => Math.max(0, p - 1))}
                className="p-1.5 rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-slate-100 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-bold">Página {page + 1}</span>
              <button
                disabled={(page + 1) * pageSize >= totalCount}
                onClick={() => setPage(p => p + 1)}
                className="p-1.5 rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-slate-100 transition"
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
