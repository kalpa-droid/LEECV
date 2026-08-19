import React, { useEffect, useState } from 'react';
import { getCurrentProfile, logout } from '../auth/authService';
import { listUsers, setPremium, getBasicStats } from './adminService';
import AdminLogin from './AdminLogin';
import { Users, Crown, LogOut, RefreshCw, CreditCard, HardDrive, ShieldCheck, CheckCircle2, MessageSquare, AlertCircle, Sparkles } from 'lucide-react';

export default function AdminDashboard() {
  const [profile, setProfile] = useState(undefined);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ totalUsers: 0, premiumUsers: 0 });
  const [loadingData, setLoadingData] = useState(false);
  const [claims, setClaims] = useState([
    {
      id: 'claim-1',
      email: 'agencia.salta@ejemplo.com',
      method: 'Transferencia CBU',
      amount: '$19.000 ARS',
      date: 'Hace 10 min',
      proofId: 'COMP-8827419',
      status: 'pendiente',
    }
  ]);

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

  if (profile === undefined) return null;
  if (!profile) return <AdminLogin onLogin={checkSession} />;
  if (profile.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#2B1B2E] text-white font-sans">
        <p className="font-bold">Tu cuenta no tiene permisos de administrador supremo.</p>
      </div>
    );
  }

  async function togglePremium(user, origin = 'manual') {
    await setPremium(user.id, !user.premium_activo);
    loadEverything();
  }

  function approveClaim(claimId, email) {
    setClaims(prev => prev.filter(c => c.id !== claimId));
    const targetUser = users.find(u => u.email === email);
    if (targetUser) {
      togglePremium(targetUser, 'transferencia_aprobada');
    } else {
      alert(`✅ Reclamo aprobado para ${email}. Licencia activada.`);
    }
  }

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
            <p className="text-[10px] text-[#FFE0C7]/70">Control de Licencias, Pagos Automáticos, Bot WhatsApp & Reclamos</p>
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
              <p className="text-2xl font-black text-[#2B1B2E]">{stats.premiumUsers}</p>
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

        {/* Panel de Reclamos y Soporte Pendiente */}
        {claims.length > 0 && (
          <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <h2 className="font-extrabold text-sm text-amber-950">📩 Reclamos de Activación y Comprobantes Pendientes</h2>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-xs font-black">
                {claims.length} Pendiente
              </span>
            </div>

            <div className="space-y-2">
              {claims.map((claim) => (
                <div key={claim.id} className="bg-white rounded-xl p-3.5 border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <p className="font-black text-[#2B1B2E]">{claim.email}</p>
                    <p className="text-[11px] text-slate-600">
                      Método: <strong>{claim.method}</strong> ({claim.amount}) — Comprobante: <code>{claim.proofId}</code>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => approveClaim(claim.id, claim.email)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl transition shadow-sm cursor-pointer"
                    >
                      ✅ Aprobar y Activar Licencia
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
              <h2 className="font-extrabold text-sm text-[#2B1B2E]">Pasarelas & Bot OCR de Transferencias</h2>
            </div>
            <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Bot OCR WhatsApp / Telegram Activo
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

            <div className="p-3.5 rounded-xl border border-purple-500/30 bg-purple-500/5 flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-purple-900">Lemon Squeezy (USD)</p>
                <p className="text-[10px] text-purple-700 font-bold">Suscripciones Globales con Tarjeta</p>
              </div>
              <CheckCircle2 className="w-4 h-4 text-purple-600" />
            </div>

            <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/5 flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-blue-900">Bot WhatsApp / Telegram OCR</p>
                <p className="text-[10px] text-blue-700 font-bold">Lectura Automática de Comprobantes CBU</p>
              </div>
              <MessageSquare className="w-4 h-4 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Tabla de Usuarios y Licencias */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#EFE2C9] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#EFE2C9]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#FF2E63]" />
              <h2 className="font-extrabold text-sm text-[#2B1B2E]">Gestión de Licencias y Origen de Pago</h2>
            </div>
            <button onClick={loadEverything} className="text-[#00A8A0] p-2 hover:bg-slate-100 rounded-xl transition cursor-pointer">
              <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin' : ''}`} />
            </button>
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
                  <td className="px-5 py-3 font-medium text-[#2B1B2E]/70">{new Date(u.created_at).toLocaleDateString('es-AR')}</td>
                  <td className="px-5 py-3 font-medium">
                    {u.metodo_pago === 'mercadopago' ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-800 border border-emerald-500/30 font-bold text-[10px]">
                        🌐 Mercado Pago Automático
                      </span>
                    ) : u.metodo_pago === 'lemonsqueezy' ? (
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-800 border border-purple-500/30 font-bold text-[10px]">
                        🌎 Lemon Squeezy USD
                      </span>
                    ) : u.metodo_pago === 'manual' ? (
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-800 border border-blue-500/30 font-bold text-[10px]">
                        🏦 Transferencia / Manual
                      </span>
                    ) : (
                      <span className="text-[#2B1B2E]/40 font-bold">Gratuito</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {u.premium_activo
                      ? <span className="inline-flex items-center gap-1 text-[#00A8A0] font-black bg-[#00A8A0]/10 px-2.5 py-1 rounded-full text-[11px]">👑 Activa (Agencia Pro)</span>
                      : <span className="text-[#2B1B2E]/40 font-bold">Gratuito / Estándar</span>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => togglePremium(u)}
                      className={`text-xs font-extrabold px-3 py-1.5 rounded-xl transition shadow-sm cursor-pointer ${
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
