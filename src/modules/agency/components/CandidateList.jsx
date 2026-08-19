import React, { useState, useEffect } from 'react';
import { listAgencyCandidates, updateCandidateStatus } from '../services/candidatesService';
import CandidateStatusBadge from './CandidateStatusBadge';
import { Users, Search, RefreshCw, FileText } from 'lucide-react';

export default function CandidateList({ onSelectCandidate }) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');

  const loadCandidates = async () => {
    setLoading(true);
    const data = await listAgencyCandidates();
    setCandidates(data);
    setLoading(false);
  };

  useEffect(() => {
    loadCandidates();
  }, []);

  const filtered = candidates.filter(c => 
    filterStatus === 'all' || c.status === filterStatus
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-black text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-400" /> Candidatos de la Agencia ({filtered.length})
        </h2>
        <button 
          onClick={loadCandidates} 
          className="p-2 bg-slate-800 hover:bg-slate-700 text-purple-300 rounded-xl transition cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <select 
          value={filterStatus} 
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-slate-900 border border-slate-700 text-xs text-white p-2.5 rounded-xl font-bold outline-none focus:border-purple-500 cursor-pointer"
        >
          <option value="all">Todos los Estados</option>
          <option value="postulante">Postulante</option>
          <option value="en_proceso">En Proceso</option>
          <option value="contratado">Contratado</option>
          <option value="descartado">Descartado</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8 text-xs text-slate-400">Cargando lista de candidatos...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-xs text-slate-400 bg-slate-900/60 rounded-2xl border border-slate-800">
          No hay candidatos registrados en esta categoría.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <div key={item.cv_id} className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between hover:border-purple-500/50 transition">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-amber-400" />
                <div>
                  <h4 className="text-xs font-bold text-white">{item.cvs?.candidate_name || 'Candidato sin nombre'}</h4>
                  <p className="text-[11px] text-slate-400">{item.cvs?.title}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CandidateStatusBadge status={item.status} />
                <button 
                  onClick={() => onSelectCandidate(item.cv_id)}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition cursor-pointer"
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
