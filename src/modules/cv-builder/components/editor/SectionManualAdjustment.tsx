import React, { useEffect } from 'react';
import { ArrowUp, ArrowDown, Columns, Scissors, Check } from 'lucide-react';
import { getSection } from '../../../../shared/core/sectionRegistry';
import { colorSystem, radius, elevationSystem } from '../../../../shared/core/uiDesignSystem';

interface SectionManualAdjustmentProps {
  sectionId: string;
  cvData: any;
  setCvData: React.Dispatch<React.SetStateAction<any>>;
}

const MOUNTED_MANUAL_ADJUSTMENTS = new Set<string>();

export function getMountedManualAdjustments(): Set<string> {
  return MOUNTED_MANUAL_ADJUSTMENTS;
}

const DEFAULT_SECUNDARIA = ['contacto', 'personales', 'frase', 'informatica', 'competencias', 'ecologia'];
const DEFAULT_PRIMARIA = ['personales', 'formacion', 'profesion', 'experiencia', 'cursos', 'ecologia'];

export function SectionManualAdjustment({ sectionId, cvData, setCvData }: SectionManualAdjustmentProps) {
  useEffect(() => {
    if (import.meta.env.DEV) {
      MOUNTED_MANUAL_ADJUSTMENTS.add(sectionId);
    }
    return () => {
      if (import.meta.env.DEV) {
        MOUNTED_MANUAL_ADJUSTMENTS.delete(sectionId);
      }
    };
  }, [sectionId]);

  if (!cvData || !setCvData) return null;

  const catalogEntry = getSection(sectionId, cvData.customSections || []);
  const assignableToColumns = catalogEntry ? catalogEntry.assignableToColumns !== false : true;

  const assignments = cvData.layout?.columnAssignments || {};
  const currentColumn = typeof assignments[sectionId] === 'string'
    ? assignments[sectionId]
    : (catalogEntry?.defaultSectorRole === 'sidebar' ? 'secundaria' : 'primaria');

  const secOrder: string[] = cvData.layout?.sectionOrders?.secundaria || DEFAULT_SECUNDARIA;
  const primOrder: string[] = cvData.layout?.sectionOrders?.primaria || DEFAULT_PRIMARIA;

  const activeOrderList = currentColumn === 'secundaria' ? secOrder : primOrder;
  const currentIndex = activeOrderList.indexOf(sectionId);
  const currentPos = currentIndex !== -1 ? currentIndex + 1 : undefined;

  const hasPageBreak = !!(cvData.layout?.sectionPageBreaks?.[sectionId] || cvData.sectionPageBreaks?.[sectionId]);

  const handleSetColumn = (targetVal: 'secundaria' | 'primaria') => {
    setCvData((prev: any) => {
      const newAssignments = {
        ...(prev.layout?.columnAssignments || {}),
        [sectionId]: targetVal
      };

      let newSecOrder = [...(prev.layout?.sectionOrders?.secundaria || DEFAULT_SECUNDARIA)];
      let newPrimOrder = [...(prev.layout?.sectionOrders?.primaria || DEFAULT_PRIMARIA)];

      if (targetVal === 'secundaria') {
        if (!newSecOrder.includes(sectionId)) newSecOrder.push(sectionId);
        newPrimOrder = newPrimOrder.filter((id) => id !== sectionId);
      } else {
        if (!newPrimOrder.includes(sectionId)) newPrimOrder.push(sectionId);
        newSecOrder = newSecOrder.filter((id) => id !== sectionId);
      }

      return {
        ...prev,
        layout: {
          ...prev.layout,
          columnAssignments: newAssignments,
          sectionOrders: {
            secundaria: newSecOrder,
            primaria: newPrimOrder
          }
        }
      };
    });
  };

  const handleMove = (direction: 'up' | 'down') => {
    setCvData((prev: any) => {
      const colName = currentColumn;
      const curOrders = [...(prev.layout?.sectionOrders?.[colName] || (colName === 'secundaria' ? DEFAULT_SECUNDARIA : DEFAULT_PRIMARIA))];
      const idx = curOrders.indexOf(sectionId);
      if (idx === -1) return prev;

      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= curOrders.length) return prev;

      const [moved] = curOrders.splice(idx, 1);
      curOrders.splice(targetIdx, 0, moved);

      return {
        ...prev,
        layout: {
          ...prev.layout,
          sectionOrders: {
            ...(prev.layout?.sectionOrders || {}),
            [colName]: curOrders
          }
        }
      };
    });
  };

  const handleTogglePageBreak = () => {
    setCvData((prev: any) => ({
      ...prev,
      layout: {
        ...(prev.layout || {}),
        sectionPageBreaks: {
          ...(prev.layout?.sectionPageBreaks || {}),
          [sectionId]: !hasPageBreak
        }
      }
    }));
  };

  return (
    <div data-section-id={sectionId} className={`p-2.5 rounded-[${radius.card}] bg-[var(--ui-bg-card)] border border-[var(--color-neutral-border)] space-y-2 text-xs`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* Asignación de Columna (Izquierda / Derecha) */}
        {assignableToColumns && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-[var(--color-neutral-text-secondary)] mr-1 flex items-center gap-1">
              <Columns className="w-3 h-3" /> Columna:
            </span>
            <button
              type="button"
              onClick={() => handleSetColumn('secundaria')}
              className={`px-2 py-1 rounded-[${radius.control}] text-[10px] font-extrabold transition cursor-pointer ${
                currentColumn === 'secundaria'
                  ? `bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] ${elevationSystem.raised}`
                  : 'bg-[var(--color-neutral-surface-muted)] text-[var(--color-neutral-text-secondary)] hover:bg-[var(--color-neutral-border)]/60'
              }`}
              title="Asignar a Columna Secundaria / Lateral (Izquierda)"
            >
              Izquierda
            </button>
            <button
              type="button"
              onClick={() => handleSetColumn('primaria')}
              className={`px-2 py-1 rounded-[${radius.control}] text-[10px] font-extrabold transition cursor-pointer ${
                currentColumn === 'primaria'
                  ? `bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] ${elevationSystem.raised}`
                  : 'bg-[var(--color-neutral-surface-muted)] text-[var(--color-neutral-text-secondary)] hover:bg-[var(--color-neutral-border)]/60'
              }`}
              title="Asignar a Columna Principal (Derecha)"
            >
              Derecha
            </button>
          </div>
        )}

        {/* Botones de Ordenación Vertical (Subir / Bajar) - Solo si la sección está en el orden activo */}
        {assignableToColumns && currentIndex !== -1 && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-[var(--color-neutral-text-secondary)] mr-1">
              {currentPos !== undefined ? `Pos: #${currentPos}` : 'Orden:'}
            </span>
            <button
              type="button"
              onClick={() => handleMove('up')}
              disabled={currentIndex <= 0}
              className={`p-1.5 rounded-[${radius.control}] bg-[var(--color-neutral-surface-muted)] hover:bg-[var(--color-neutral-border)] text-[var(--color-neutral-text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer`}
              title="Subir sección en la columna activa"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleMove('down')}
              disabled={currentIndex === -1 || currentIndex >= activeOrderList.length - 1}
              className={`p-1.5 rounded-[${radius.control}] bg-[var(--color-neutral-surface-muted)] hover:bg-[var(--color-neutral-border)] text-[var(--color-neutral-text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer`}
              title="Bajar sección en la columna activa"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Salto de Página Forzado */}
      <div className="pt-1.5 border-t border-[var(--color-neutral-border)]/60 flex items-center justify-between">
        <button
          type="button"
          onClick={handleTogglePageBreak}
          className={`px-2.5 py-1 rounded-[${radius.control}] text-[10px] font-bold transition flex items-center gap-1.5 cursor-pointer ${
            hasPageBreak
              ? `bg-[var(--color-accent-purple)] text-white ${elevationSystem.raised}`
              : 'bg-[var(--color-neutral-surface-muted)] text-[var(--color-neutral-text-secondary)] hover:bg-[var(--color-neutral-border)]'
          }`}
          title="Forzar un salto de página nativo en PDF antes de iniciar esta sección"
        >
          <Scissors className="w-3 h-3" />
          <span>Salto de página en PDF</span>
          {hasPageBreak && <Check className={`w-3 h-3 ml-0.5 ${hasPageBreak ? 'text-white' : 'text-[var(--color-neutral-text-secondary)]'}`} />}
        </button>
        {hasPageBreak && (
          <span className="text-[10px] font-bold text-[var(--color-accent-purple-bright)]">
            Activo (Inicia en nueva hoja)
          </span>
        )}
      </div>
    </div>
  );
}
