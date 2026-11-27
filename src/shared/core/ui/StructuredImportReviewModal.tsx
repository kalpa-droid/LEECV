import React from 'react';
import { CheckCircle2, Layers, AlertTriangle, User, Sparkles } from 'lucide-react';
import { Modal } from './Modal';
import { SearchFilterBar } from './SearchFilterBar';
import { elevationSystem } from '../uiDesignSystem';

export type ReviewFilterTab = 'all' | 'scalars' | 'records' | 'conflicts';

export interface StructuredRetentionSummary {
  keptCount: number;
  totalCount: number;
  unitLabel: string;
  warnings?: string[];
}

export interface StructuredImportReviewModalProps {
  isOpen?: boolean;
  title: string;
  subtitle?: string;
  onCancel: () => void;
  footer: React.ReactNode;
  scalarCount: number;
  recordCount: number;
  conflictCount: number;
  activeFilter: ReviewFilterTab;
  onFilterChange: (tab: ReviewFilterTab) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  retentionSummary?: StructuredRetentionSummary;
  quickActions?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Núcleo visual canónico para revisión de datos estructurados por IA o importación
 * (usado por CV App, EditorLee y futuras apps nativas).
 * Diferencia claramente campos individuales (1:1) vs grupos de registros/capítulos
 * con tokens reales compatibles con los 4 temas (Día, Noche, Océano, Ink).
 */
export function StructuredImportReviewModal({
  isOpen = true,
  title,
  subtitle,
  onCancel,
  footer,
  scalarCount,
  recordCount,
  conflictCount,
  activeFilter,
  onFilterChange,
  searchQuery = '',
  onSearchChange,
  retentionSummary,
  quickActions,
  children,
}: StructuredImportReviewModalProps) {
  const retentionPct =
    retentionSummary && retentionSummary.totalCount > 0
      ? Math.min(100, Math.round((retentionSummary.keptCount / retentionSummary.totalCount) * 100))
      : 100;

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} size="4xl" footer={footer} closeOnOverlayClick={false}>
      <div className="space-y-4">
        {subtitle && (
          <p className="text-xs sm:text-sm text-[var(--ui-text-secondary)] leading-relaxed">{subtitle}</p>
        )}

        {/* Banner de integridad (cuando aplica, ej. EditorLee Word Zero-Loss) */}
        {retentionSummary && (
          <div
            className={`p-3 rounded-[12px] border flex flex-col gap-1.5 ${
              retentionPct >= 99
                ? 'bg-[var(--color-status-success-muted)] border-[var(--color-status-success-base)]/40 text-[var(--color-status-success-text)]'
                : 'bg-[var(--color-status-warning-muted)] border-[var(--color-status-warning-base)]/40 text-[var(--color-status-warning-text)]'
            }`}
          >
            <div className="flex items-center justify-between gap-2 text-xs font-black">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {retentionPct}% del contenido conservado ({retentionSummary.keptCount} de {retentionSummary.totalCount}{' '}
                {retentionSummary.unitLabel})
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider">
                <Sparkles className="w-3 h-3" /> Revisión previa
              </span>
            </div>
            {retentionSummary.warnings && retentionSummary.warnings.length > 0 && (
              <ul className="text-[11px] list-disc pl-5 space-y-0.5">
                {retentionSummary.warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Tarjetas KPI clicables que actúan de filtro visual por tipo de entidad */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => onFilterChange(activeFilter === 'scalars' ? 'all' : 'scalars')}
            className={`p-2.5 sm:p-3 rounded-[12px] border text-left transition cursor-pointer ${elevationSystem.raised} ${
              activeFilter === 'scalars'
                ? 'border-[var(--color-secondary-base)] bg-[var(--color-secondary-muted)] ring-2 ring-[var(--color-secondary-base)]/30'
                : 'border-[var(--ui-border-strong)] bg-[var(--ui-bg-card)] hover:border-[var(--color-secondary-base)]'
            }`}
          >
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--color-secondary-text)]">
              <User className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Datos individuales</span>
            </div>
            <p className="text-lg sm:text-xl font-black text-[var(--ui-text-primary)] mt-0.5">{scalarCount}</p>
          </button>

          <button
            type="button"
            onClick={() => onFilterChange(activeFilter === 'records' ? 'all' : 'records')}
            className={`p-2.5 sm:p-3 rounded-[12px] border text-left transition cursor-pointer ${elevationSystem.raised} ${
              activeFilter === 'records'
                ? 'border-[var(--color-accent-purple)] bg-[var(--color-accent-purple-light)] ring-2 ring-[var(--color-accent-purple)]/30'
                : 'border-[var(--ui-border-strong)] bg-[var(--ui-bg-card)] hover:border-[var(--color-accent-purple)]'
            }`}
          >
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--color-accent-purple-text)]">
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Registros / bloques</span>
            </div>
            <p className="text-lg sm:text-xl font-black text-[var(--ui-text-primary)] mt-0.5">{recordCount}</p>
          </button>

          <button
            type="button"
            onClick={() => onFilterChange(activeFilter === 'conflicts' ? 'all' : 'conflicts')}
            className={`p-2.5 sm:p-3 rounded-[12px] border text-left transition cursor-pointer ${elevationSystem.raised} ${
              activeFilter === 'conflicts'
                ? 'border-[var(--color-status-warning-base)] bg-[var(--color-status-warning-muted)] ring-2 ring-[var(--color-status-warning-base)]/30'
                : 'border-[var(--ui-border-strong)] bg-[var(--ui-bg-card)] hover:border-[var(--color-status-warning-base)]'
            }`}
          >
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--color-status-warning-text)]">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Con cambios / dup.</span>
            </div>
            <p className="text-lg sm:text-xl font-black text-[var(--ui-text-primary)] mt-0.5">{conflictCount}</p>
          </button>
        </div>

        {/* Buscador >= 3 letras y acciones rápidas */}
        {(onSearchChange || quickActions) && (
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-[12px] bg-[var(--ui-bg-panel)] border border-[var(--ui-border)]">
            {onSearchChange && (
              <SearchFilterBar
                value={searchQuery}
                onChange={onSearchChange}
                placeholder="Filtrar campos o registros (3+ letras)..."
                className="flex-1 min-w-[200px]"
              />
            )}
            {quickActions && <div className="flex flex-wrap items-center gap-1.5 shrink-0">{quickActions}</div>}
          </div>
        )}

        {/* Contenido diferenciado */}
        <div className="space-y-5">{children}</div>
      </div>
    </Modal>
  );
}

export default StructuredImportReviewModal;
