import React, { useState } from 'react';
import { Users, Search, Filter, FileText, Download, MessageSquare, ArrowLeft } from 'lucide-react';

export default function AgencyCandidateDashboard({ onBackToEditor }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVacant, setSelectedVacant] = useState('all');

  const candidates = [
    { id: '1', name: 'Valeria Medina', title: 'Prof. Lengua & Literatura', vacant: 'Docencia Secundaria', status: 'Preseleccionado', updated: 'Hace 2 horas' },
    { id: '2', name: 'Mónica Burgos', title: 'Bachiller Pedagógico', vacant: 'Preceptora', status: 'En Entrevista', updated: 'Hace 1 día' },
  ];

  const filteredCandidates = candidates.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#2B1B2E] text-white p-6 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Top Bar */}
        <div className="flex items-center justify-between border-b border-purple-500/30 pb-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBackToEditor}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 transition flex items-center gap-2 text-xs font-bold cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Volver al Editor
            </button>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-purple-400" /> Panel de Gestión de Candidatos (Agencia)
            </h1>
          </div>
          <span className="px-3 py-1 bg-purple-900/60 border border-purple-500/50 text-purple-300 text-xs font-extrabold rounded-xl">
            Suscripción Agencia Pro
          </span>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar candidatos por nombre, DNI o título..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-400 outline-none focus:border-purple-500 transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-purple-400" />
            <select 
              value={selectedVacant}
              onChange={(e) => setSelectedVacant(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-purple-500 transition cursor-pointer"
            >
              <option value="all">Todas las vacantes</option>
              <option value="Docencia Secundaria">Docencia Secundaria</option>
              <option value="Preceptora">Preceptora</option>
            </select>
          </div>
        </div>

        {/* Candidates Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-purple-300 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-4">Candidato</th>
                <th className="p-4">Título Principal</th>
                <th className="p-4">Vacante</th>
                <th className="p-4">Estado</th>
                <th className="p-4">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredCandidates.map(candidat => (
                <tr key={candidat.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-4 font-bold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-400" /> {candidat.name}
                  </td>
                  <td className="p-4">{candidat.title}</td>
                  <td className="p-4"><span className="px-2.5 py-1 rounded-lg bg-slate-800 text-purple-300 font-medium">{candidat.vacant}</span></td>
                  <td className="p-4"><span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">{candidat.status}</span></td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button className="p-1.5 bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white rounded-lg transition" title="Enviar WhatsApp">
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition" title="Exportar PDF A4">
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
