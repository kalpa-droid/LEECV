import React from 'react';

import { radius } from '../../../../../shared/core/uiDesignSystem';

const STATUS_CONFIG = {
  postulante:  { label: 'Postulante', color: 'bg-[var(--color-secondary-muted)] text-[var(--color-secondary-text)] border-[var(--color-secondary-base)]/30' },
  en_proceso:  { label: 'En Proceso', color: 'bg-[var(--color-status-warning-muted)] text-[var(--color-status-warning-text)] border-[var(--color-status-warning-base)]/30' },
  contratado:  { label: 'Contratado', color: 'bg-[var(--color-status-success-muted)] text-[var(--color-status-success-text)] border-[var(--color-status-success-base)]/30' },
  descartado:  { label: 'Descartado', color: 'bg-[var(--color-status-danger-muted)] text-[var(--color-status-danger-text)] border-[var(--color-status-danger-base)]/30' },
};

export default function CandidateStatusBadge({ status }: { status: keyof typeof STATUS_CONFIG | string }) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.postulante;

  return (
    <span className={`px-2.5 py-1 rounded-[${radius.control}] text-xs font-bold border ${config.color}`}>
      {config.label}
    </span>
  );
}
