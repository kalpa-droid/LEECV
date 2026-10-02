import React, { useState, useEffect } from 'react';
import { Users, Search, Filter, FileText, Download, MessageSquare, ArrowLeft, Building } from 'lucide-react';
import { listCandidates, getOrganization } from './services/organizationService';
import { withErrorHandling } from '../../../../shared/core/utils/errorHandler';

import { elevationSystem, radius } from '../../../../shared/core/uiDesignSystem';

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
    <div className="min-h-screen bg-[var(--ui-bg-app)] text-[var(--ui-text-primary)] p-6 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBackToEditor}
              className={`p-2 rounded-[${radius.card}] bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] hover:bg-[var(--ui-bg-card)] text-[var(--ui-text-primary)] transition flex items-center gap-2 text-xs font-bold cursor-pointer`}
            >
              <ArrowLeft className="w-4 h-4" /> Volver al Editor
            </button>
            <h1 className="text-xl font-black text-[var(--ui-text-primary)] flex items-center gap-2">
              <Users className="w-6 h-6 text-[var(--ui-accent-purple)]" /> Panel de Gestión de Candidatos (Agencia)
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsOrgModalOpen(true)}
              className={`px-3.5 py-2 bg-[var(--ui-bg-panel)] border border-[var(--color-accent-purple)] hover:bg-[var(--color-accent-purple-muted)] text-[var(--color-accent-purple-text)] text-xs font-extrabold rounded-[${radius.card}] transition flex items-center gap-2 ${elevationSystem.floating} cursor-pointer`}
            >
              <Building className="w-4 h-4 text-[var(--color-accent-purple-text)]" /> 
              {org ? (org as any).name : 'Gestión de Equipo / Organización'}
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-[var(--ui-text-secondary)] absolute left-3 top-3" />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar candidatos por nombre, DNI o título..."
              className={`w-full bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] rounded-[${radius.card}] pl-9 pr-4 py-2.5 text-xs text-[var(--ui-text-primary)] placeholder-[var(--ui-text-muted)] outline-none focus:border-[var(--color-accent-purple)] transition`}
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[var(--ui-accent-purple)]" />
            <select 
              value={selectedVacant}
              onChange={(e) => setSelectedVacant(e.target.value)}
              className={`w-full bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] rounded-[${radius.card}] px-3 py-2.5 text-xs text-[var(--ui-text-primary)] outline-none focus:border-[var(--color-accent-purple)] transition cursor-pointer`}
            >
              <option value="all">Todas las vacantes</option>
              <option value="Docencia Secundaria">Docencia Secundaria</option>
              <option value="Preceptora">Preceptora</option>
            </select>
          </div>
        </div>

        {/* Candidates Table */}
        <div className={`bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] rounded-[${radius.modal}] overflow-hidden ${elevationSystem.overlay}`}>
          <table className="w-full text-left text-xs text-[var(--ui-text-secondary)]">
            <thead className="bg-[var(--ui-bg-card)] text-[var(--ui-text-primary)] font-extrabold uppercase text-[10px] tracking-wider border-b border-[var(--ui-border)]">
              <tr>
                <th className="p-4">Candidato</th>
                <th className="p-4">Título Principal</th>
                <th className="p-4">Vacante</th>
                <th className="p-4">Estado</th>
                <th className="p-4">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ui-border)]">
              {filteredCandidates.map(candidat => (
                <tr key={candidat.id} className="hover:bg-[var(--ui-bg-card)] transition">
                  <td className="p-4 font-bold text-[var(--ui-text-primary)] flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[var(--ui-text-primary)]" /> {candidat.full_name || candidat.name}
                  </td>
                  <td className="p-4">{candidat.title}</td>
                  <td className="p-4"><span className={`px-2.5 py-1 rounded-[${radius.control}] bg-[var(--ui-bg-card)] border border-[var(--ui-border)] text-[var(--ui-text-primary)] font-medium`}>{candidat.vacant}</span></td>
                  <td className="p-4"><span className={`px-2.5 py-1 rounded-[${radius.control}] bg-[var(--color-status-success-muted)] text-[var(--color-status-success-text)] font-bold border border-[var(--color-status-success-base)]/30`}>{candidat.status}</span></td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button className={`p-1.5 bg-[var(--color-accent-purple-muted)] hover:bg-[var(--color-accent-purple)] text-[var(--color-accent-purple-text)] rounded-[${radius.control}] transition`} title="Enviar WhatsApp">
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                      <button className={`p-1.5 bg-[var(--ui-bg-card)] border border-[var(--ui-border)] hover:bg-[var(--ui-bg-panel)] text-[var(--ui-text-secondary)] rounded-[${radius.control}] transition`} title="Exportar PDF">
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
