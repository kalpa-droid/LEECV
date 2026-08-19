import React, { useEffect, useState } from 'react';
import { getCurrentProfile, logout } from '../../services/authService';
import { listUsers, setPremium, getBasicStats } from '../../services/adminService';
import AdminLogin from './AdminLogin';
import { Users, Crown, LogOut, RefreshCw, CreditCard, HardDrive, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function AdminDashboard() {
  const [profile, setProfile] = useState(undefined); // undefined = cargando, null = no logueado
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ totalUsers: 0, premiumUsers: 0 });
  const [loadingData, setLoadingData] = useState(false);
  const [gatewaysStatus, setGatewaysStatus] = useState({
    mercadopago: true,
    lemonsqueezy: true,
    paypal: true,
  });

  async function loadEverything() {
    setLoadingData(true);
    try {
      const [u, s] = await Promise.all([listUsers(), getBasicStats()]);
      setUsers(u);
      setStats(s);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingData(false);
    }
  }

  async function checkSession() {
    const p = await getCurrentProfile();
    setProfile(p);
    if (p?.role === 'admin') loadEverything();
  }

  useEffect(() => { checkSession(); }, []);

  if (profile === undefined) return null; // cargando
  if (!profile) return <AdminLogin onLogin={checkSession} />;
  if (profile.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#2B1B2E] text-white">
        <p className="font-bold">Tu cuenta no tiene permisos de administrador.</p>
      </div>
    );
  }

  async function togglePremium(user) {
    await setPremium(user.id, !user.premium_activo);
    loadEverything();
  }

  return (
    <div className="min-h-screen bg-[#F7F3E9] text-[#2B1B2E]">
      {/* Encabezado */}
      <header className="bg-[#2B1B2E] text-white px-6 py-4 flex items-center justify-between shadow-lg border-b border-[#EFE2C9]/20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FF2E63] flex items-center justify-center font-black text-xs">
            LEE
          </div>
          <h1 className="font-black text-base sm:text-lg tracking-wide">🛠️ Panel de Administración Suprema — LEECV</h1>
        </div>
        <button
          onClick={async () => { await logout(); setProfile(null); }}
          className="flex items-center gap-1.5 text-xs font-extrabold bg-[#FF2E63] px-3.5 py-2 rounded-xl hover:bg-[#E31555] transition shadow-md"
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
              <p className="text-xs text-[#2B1B2E]/60 font-bold">Usuarios registrados</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#EFE2C9] flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 flex items-center justify-center">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-[#2B1B2E]">{stats.premiumUsers}</p>
              <p className="text-xs text-[#2B1B2E]/60 font-bold">Cuentas Premium Activas</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#EFE2C9] flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-600 flex items-center justify-center">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-[#2B1B2E]">500 MB</p>
              <p className="text-xs text-[#2B1B2E]/60 font-bold">Límite Base DB Supabase</p>
            </div>
          </div>
        </div>

        {/* Panel de Gestión de Pasarelas de Pago */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#EFE2C9] space-y-3">
          <div className="flex items-center gap-2 border-b border-[#EFE2C9] pb-3">
            <CreditCard className="w-5 h-5 text-[#00A8A0]" />
            <h2 className="font-extrabold text-sm text-[#2B1B2E]">Estado de Pasarelas de Cobro Integradas</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-emerald-900">Mercado Pago (Argentina)</p>
                <p className="text-[10px] text-emerald-700 font-bold">Cobros en ARS (Suscripción y $1/PDF)</p>
              </div>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>

            <div className="p-3.5 rounded-xl border border-purple-500/30 bg-purple-500/5 flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-purple-900">Lemon Squeezy / Stripe</p>
                <p className="text-[10px] text-purple-700 font-bold">Cobros Globales USD (Merchant of Record)</p>
              </div>
              <CheckCircle2 className="w-4 h-4 text-purple-600" />
            </div>

            <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/5 flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-blue-900">PayPal / Tarjetas Globales</p>
                <p className="text-[10px] text-blue-700 font-bold">Botón de Pago Directo Internacional</p>
              </div>
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Tabla de Gestión de Usuarios */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#EFE2C9] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#EFE2C9]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#FF2E63]" />
              <h2 className="font-extrabold text-sm text-[#2B1B2E]">Lista de Usuarios y Licencias</h2>
            </div>
            <button onClick={loadEverything} className="text-[#00A8A0] p-2 hover:bg-slate-100 rounded-xl transition">
              <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <table className="w-full text-xs">
            <thead className="bg-[#F7F3E9] text-[#2B1B2E]/70 text-left font-extrabold">
              <tr>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Fecha de Alta</th>
                <th className="px-5 py-3">Método de Pago</th>
                <th className="px-5 py-3">Estado Premium</th>
                <th className="px-5 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE2C9]/60">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-[#F7F3E9]/40 transition">
                  <td className="px-5 py-3 font-bold">{u.email}</td>
                  <td className="px-5 py-3 font-medium text-[#2B1B2E]/70">{new Date(u.created_at).toLocaleDateString('es-AR')}</td>
                  <td className="px-5 py-3 font-medium">{u.metodo_pago || '—'}</td>
                  <td className="px-5 py-3">
                    {u.premium_activo
                      ? <span className="inline-flex items-center gap-1 text-[#00A8A0] font-black bg-[#00A8A0]/10 px-2.5 py-1 rounded-full text-[11px]">Activo (Agencia Pro)</span>
                      : <span className="text-[#2B1B2E]/40 font-bold">Gratuito / Estándar</span>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => togglePremium(u)}
                      className={`text-xs font-extrabold px-3 py-1.5 rounded-xl transition shadow-sm ${
                        u.premium_activo
                          ? 'bg-[#FF2E63]/10 text-[#FF2E63] hover:bg-[#FF2E63]/20 border border-[#FF2E63]/30'
                          : 'bg-[#00A8A0]/10 text-[#00A8A0] hover:bg-[#00A8A0]/20 border border-[#00A8A0]/30'
                      }`}
                    >
                      {u.premium_activo ? 'Desactivar Licencia' : 'Activar Premium'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </main>
    </div>
  );
}
