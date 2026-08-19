import React, { useEffect, useState } from 'react';
import { getCurrentProfile, logout } from '../../services/authService';
import { listUsers, setPremium, getBasicStats } from '../../services/adminService';
import AdminLogin from './AdminLogin';
import { Users, Crown, LogOut, RefreshCw } from 'lucide-react';

export default function AdminDashboard() {
  const [profile, setProfile] = useState(undefined); // undefined = cargando, null = no logueado
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ totalUsers: 0, premiumUsers: 0 });
  const [loadingData, setLoadingData] = useState(false);

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
    <div className="min-h-screen bg-[#F7F3E9]">
      <header className="bg-[#2B1B2E] text-white px-6 py-4 flex items-center justify-between">
        <h1 className="font-black text-lg">🛠️ Panel de Administración — LEECV</h1>
        <button
          onClick={async () => { await logout(); setProfile(null); }}
          className="flex items-center gap-1.5 text-xs font-bold bg-[#FF2E63] px-3 py-1.5 rounded-lg hover:bg-[#E31555]"
        >
          <LogOut className="w-3.5 h-3.5" /> Salir
        </button>
      </header>

      <main className="max-w-5xl mx-auto p-6">
        {/* Métricas */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow border border-[#EFE2C9] flex items-center gap-3">
            <Users className="w-8 h-8 text-[#00A8A0]" />
            <div>
              <p className="text-2xl font-black text-[#2B1B2E]">{stats.totalUsers}</p>
              <p className="text-xs text-[#2B1B2E]/60 font-bold">Usuarios registrados</p>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow border border-[#EFE2C9] flex items-center gap-3">
            <Crown className="w-8 h-8 text-[#FFC93C]" />
            <div>
              <p className="text-2xl font-black text-[#2B1B2E]">{stats.premiumUsers}</p>
              <p className="text-xs text-[#2B1B2E]/60 font-bold">Cuentas premium activas</p>
            </div>
          </div>
        </div>

        {/* Tabla de usuarios */}
        <div className="bg-white rounded-xl shadow border border-[#EFE2C9] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#EFE2C9]">
            <h2 className="font-bold text-[#2B1B2E]">Usuarios</h2>
            <button onClick={loadEverything} className="text-[#00A8A0]">
              <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-[#F7F3E9] text-[#2B1B2E]/70 text-left">
              <tr>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Alta</th>
                <th className="px-4 py-2">Método</th>
                <th className="px-4 py-2">Premium</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-[#EFE2C9]/60">
                  <td className="px-4 py-2">{u.email}</td>
                  <td className="px-4 py-2">{new Date(u.created_at).toLocaleDateString('es-AR')}</td>
                  <td className="px-4 py-2">{u.metodo_pago || '—'}</td>
                  <td className="px-4 py-2">
                    {u.premium_activo
                      ? <span className="text-[#00A8A0] font-bold">Activo</span>
                      : <span className="text-[#2B1B2E]/40">Inactivo</span>}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => togglePremium(u)}
                      className={`text-xs font-bold px-3 py-1 rounded-lg ${
                        u.premium_activo
                          ? 'bg-[#FF2E63]/10 text-[#FF2E63] hover:bg-[#FF2E63]/20'
                          : 'bg-[#00A8A0]/10 text-[#00A8A0] hover:bg-[#00A8A0]/20'
                      }`}
                    >
                      {u.premium_activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-[#2B1B2E]/50 mt-4">
          Gestión de plantillas/colores y monitoreo de almacenamiento: quedan como próximos módulos —
          avisame cuando quieras que los sumemos.
        </p>
      </main>
    </div>
  );
}
