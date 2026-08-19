import React from 'react';

const STATUS_CONFIG = {
  postulante:  { label: 'Postulante', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  en_proceso:  { label: 'En Proceso', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  contratado:  { label: 'Contratado', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  descartado:  { label: 'Descartado', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
};

export default function CandidateStatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.postulante;

  return (
    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${config.color}`}>
      {config.label}
    </span>
  );
}
