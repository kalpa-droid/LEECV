import React, { useState, useEffect } from 'react';
import { listAgencyCandidates } from '../services/candidatesService';
import CandidateStatusBadge from './CandidateStatusBadge';
import { Users, RefreshCw, FileText } from 'lucide-react';

export default function CandidateList({ onSelectCandidate }: { onSelectCandidate: (id: string) => void }) {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');

  const loadCandidates = React.useCallback(async () => {
    setLoading(true);
    const data = await listAgencyCandidates();
    setCandidates(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  const filtered = candidates.filter(c => 
    filterStatus === 'all' || c.status === filterStatus
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-black text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-[var(--ui-accent-purple)]" /> Candidatos de la Agencia ({filtered.length})
        </h2>
        <button 
          onClick={loadCandidates} 
          className="p-2 bg-[var(--ui-bg-dock)] hover:opacity-90 text-[var(--color-accent-purple-bright)] border border-white/10 rounded-xl transition cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <select 
          value={filterStatus} 
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-black/40 border border-white/20 text-xs text-white p-2.5 rounded-xl font-bold outline-none focus:border-[var(--color-accent-purple)] cursor-pointer"
        >
          <option value="all">Todos los Estados</option>
          <option value="postulante">Postulante</option>
          <option value="en_proceso">En Proceso</option>
          <option value="contratado">Contratado</option>
          <option value="descartado">Descartado</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8 text-xs text-white/60">Cargando lista de candidatos...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-xs text-white/60 bg-black/30 rounded-2xl border border-white/10">
          No hay candidatos registrados en esta categoría.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <div key={item.cv_id} className="p-3.5 bg-[var(--ui-bg-dock)] border border-white/10 rounded-2xl flex items-center justify-between hover:border-[var(--color-accent-purple)]/50 transition">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-[var(--color-accent-amber-bright)]" />
                <div>
                  <h4 className="text-xs font-bold text-white">{item.cvs?.candidate_name || 'Candidato sin nombre'}</h4>
                  <p className="text-[11px] text-white/60">{item.cvs?.title}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CandidateStatusBadge status={item.status} />
                <button 
                  onClick={() => onSelectCandidate(item.cv_id)}
                  className="px-3 py-1.5 bg-[var(--color-accent-purple)] hover:opacity-90 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Abrir CV
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
