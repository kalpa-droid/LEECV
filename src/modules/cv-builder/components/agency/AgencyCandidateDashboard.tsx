import React, { useState, useEffect } from 'react';
import { Users, Search, Filter, FileText, Download, MessageSquare, ArrowLeft, Building } from 'lucide-react';
import { listCandidates, getOrganization } from './services/organizationService';
import EnterpriseOrgModal from './components/EnterpriseOrgModal';
import { withErrorHandling } from '../../../../shared/core/utils/errorHandler';

export default function AgencyCandidateDashboard({ onBackToEditor }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVacant, setSelectedVacant] = useState('all');
  const [candidates, setCandidates] = useState([]);
  const [org, setOrg] = useState(null);
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
  const [, setLoading] = useState(false);

  const fallbackCandidates = [
    { id: '1', full_name: 'Valeria Medina', title: 'Prof. Lengua & Literatura', vacant: 'Docencia Secundaria', status: 'Preseleccionado', updated_at: 'Hace 2 horas' },
    { id: '2', full_name: 'Mónica Burgos', title: 'Bachiller Pedagógico', vacant: 'Preceptora', status: 'En Entrevista', updated_at: 'Hace 1 día' },
  ];

  async function loadData() {
    setLoading(true);
    await withErrorHandling(
      async () => {
        const o = await getOrganization();
        setOrg(o);
        const list = await listCandidates(o?.id || null);
        setCandidates(list.length > 0 ? list : fallbackCandidates);
      },
      {
        context: 'Carga de Candidatos',
        errorMessage: 'Error al obtener candidatos de la organización.',
      }
    );
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  const displayCandidates = candidates.length > 0 ? candidates : fallbackCandidates;

  const filteredCandidates = displayCandidates.filter(c => 
    (c.full_name || c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.title || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[var(--color-neutral-text-primary)] text-white p-6 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBackToEditor}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition flex items-center gap-2 text-xs font-bold cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Volver al Editor
            </button>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-[var(--color-accent-purple-bright)]" /> Panel de Gestión de Candidatos (Agencia)
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsOrgModalOpen(true)}
              className="px-3.5 py-2 bg-[var(--color-accent-purple)] hover:opacity-90 text-white text-xs font-extrabold rounded-xl transition flex items-center gap-2 shadow-lg cursor-pointer"
            >
              <Building className="w-4 h-4 text-white/80" /> 
              {org ? (org as any).name : 'Gestión de Equipo / Organización'}
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-white/60 absolute left-3 top-3" />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar candidatos por nombre, DNI o título..."
              className="w-full bg-black/40 border border-white/20 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-white/40 outline-none focus:border-[var(--color-accent-purple)] transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[var(--color-accent-purple-bright)]" />
            <select 
              value={selectedVacant}
              onChange={(e) => setSelectedVacant(e.target.value)}
              className="w-full bg-black/40 border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-[var(--color-accent-purple)] transition cursor-pointer"
            >
              <option value="all">Todas las vacantes</option>
              <option value="Docencia Secundaria">Docencia Secundaria</option>
              <option value="Preceptora">Preceptora</option>
            </select>
          </div>
        </div>

        {/* Candidates Table */}
        <div className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs text-white/80">
            <thead className="bg-black/60 text-[var(--color-accent-purple-bright)] font-extrabold uppercase text-[10px] tracking-wider border-b border-white/10">
              <tr>
                <th className="p-4">Candidato</th>
                <th className="p-4">Título Principal</th>
                <th className="p-4">Vacante</th>
                <th className="p-4">Estado</th>
                <th className="p-4">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredCandidates.map(candidat => (
                <tr key={candidat.id} className="hover:bg-white/5 transition">
                  <td className="p-4 font-bold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[var(--color-accent-amber-bright)]" /> {candidat.full_name || candidat.name}
                  </td>
                  <td className="p-4">{candidat.title}</td>
                  <td className="p-4"><span className="px-2.5 py-1 rounded-lg bg-white/10 text-white font-medium">{candidat.vacant}</span></td>
                  <td className="p-4"><span className="px-2.5 py-1 rounded-lg bg-[var(--color-status-success-muted)] text-[var(--color-status-success-text)] font-bold border border-[var(--color-status-success-base)]/30">{candidat.status}</span></td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button className="p-1.5 bg-[var(--color-accent-purple)]/30 hover:bg-[var(--color-accent-purple)] text-white rounded-lg transition" title="Enviar WhatsApp">
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-1.5 bg-white/10 hover:bg-white/20 text-white/80 rounded-lg transition" title="Exportar PDF A4">
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

      <EnterpriseOrgModal
        isOpen={isOrgModalOpen}
        onClose={() => setIsOrgModalOpen(false)}
      />
    </div>
  );
}
