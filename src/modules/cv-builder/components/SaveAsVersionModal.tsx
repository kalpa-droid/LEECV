import React, { useState } from 'react';
import { CopyPlus, Briefcase, Tag } from 'lucide-react';
import { Modal } from '../../../shared/core/ui/Modal';
import { radius } from '../../../shared/core/uiDesignSystem';
import { JOB_POSITION_CATALOG } from '../../../shared/core/data/jobPositionCatalog';

export interface SaveAsVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAs: (versionLabel: string) => void;
  isSaving?: boolean;
}

/**
 * SaveAsVersionModal - Modal dedicado exclusivamente a la clonación/versionado de CV
 * para un puesto laboral específico (ej: "Docencia", "Gerente de Operaciones").
 *
 * Desacoplado: No contiene botones redundantes de "Sobrescribir" ni "Descargar JSON".
 */
export default function SaveAsVersionModal({
  isOpen,
  onClose,
  onSaveAs,
  isSaving = false
}: SaveAsVersionModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>(JOB_POSITION_CATALOG[0].category);
  const [selectedPosition, setSelectedPosition] = useState<string>(JOB_POSITION_CATALOG[0].positions[0]);
  const [customPositionInput, setCustomPositionInput] = useState<string>('');

  const currentCategoryObj = JOB_POSITION_CATALOG.find(c => c.category === selectedCategory) || JOB_POSITION_CATALOG[0];
  const effectiveLabel = customPositionInput.trim() || selectedPosition || selectedCategory;

  const handleCategoryChange = (catName: string) => {
    setSelectedCategory(catName);
    const catObj = JOB_POSITION_CATALOG.find(c => c.category === catName);
    if (catObj && catObj.positions.length > 0) {
      setSelectedPosition(catObj.positions[0]);
    }
  };

  const handleExecuteSaveAs = () => {
    if (effectiveLabel) {
      onSaveAs(effectiveLabel);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Guardar como copia para Puesto"
      icon={<CopyPlus className="w-5 h-5 text-[var(--color-secondary-bright)]" />}
      size="md"
      footer={
        <div className="w-full flex items-center justify-between gap-2">
          <span className="text-[11px] text-[var(--ui-text-secondary)] font-bold">
            📋 Crea una versión independiente etiquetada
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 bg-[var(--ui-bg-panel)] hover:bg-[var(--ui-btn-neutral-hover)] text-[var(--ui-text-primary)] border border-[var(--ui-border)] font-bold text-xs rounded-[${radius.card}] transition cursor-pointer`}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleExecuteSaveAs}
              disabled={isSaving || !effectiveLabel}
              className={`px-4 py-2 bg-[var(--color-secondary-base)] hover:opacity-90 text-[var(--color-secondary-on-base)] font-black text-xs rounded-[${radius.card}] transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50`}
            >
              <CopyPlus className="w-4 h-4" />
              <span>{isSaving ? 'Guardando...' : `Guardar copia para "${effectiveLabel}"`}</span>
            </button>
          </div>
        </div>
      }
    >
      <div className={`p-4 bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] rounded-[${radius.modal}] space-y-4 select-none`}>
        <p className="text-xs text-[var(--ui-text-secondary)] leading-relaxed">
          Esta función duplica tu currículum actual asignándole un ID nuevo y una etiqueta de puesto. Tu borrador original permanece intacto.
        </p>

        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-extrabold text-[var(--ui-text-primary)] mb-1 flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5 text-[var(--color-secondary-bright)]" />
                Categoría de Puesto:
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 rounded bg-[var(--ui-bg-card)] text-[var(--ui-text-primary)] border border-[var(--ui-border)] focus:outline-none focus:border-[var(--color-secondary-base)] cursor-pointer"
              >
                {JOB_POSITION_CATALOG.map((cat) => (
                  <option key={cat.category} value={cat.category}>
                    {cat.category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-[var(--ui-text-primary)] mb-1 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-[var(--color-secondary-bright)]" />
                Puesto sugerido:
              </label>
              <select
                value={selectedPosition}
                onChange={(e) => setSelectedPosition(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 rounded bg-[var(--ui-bg-card)] text-[var(--ui-text-primary)] border border-[var(--ui-border)] focus:outline-none focus:border-[var(--color-secondary-base)] cursor-pointer"
              >
                {currentCategoryObj.positions.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-[var(--ui-text-primary)] mb-1">
              O escribe un puesto / etiqueta personalizada:
            </label>
            <input
              type="text"
              value={customPositionInput}
              onChange={(e) => setCustomPositionInput(e.target.value)}
              placeholder={`Ej: ${selectedPosition} - Orientación Tecnológica`}
              className="w-full text-xs px-3 py-2 rounded bg-[var(--ui-bg-card)] text-[var(--ui-text-primary)] border border-[var(--ui-border)] focus:outline-none focus:border-[var(--color-secondary-base)] placeholder:text-[var(--ui-text-secondary)]/60"
            />
          </div>

          <div className="p-3 rounded bg-[var(--color-secondary-muted)]/40 border border-[var(--color-secondary-base)]/30 flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--ui-text-secondary)]">
              Etiqueta de versión a asignar:
            </span>
            <span className="text-xs font-black text-[var(--color-secondary-bright)] bg-[var(--ui-bg-panel)] px-2.5 py-1 rounded border border-[var(--color-secondary-base)]/40">
              "{effectiveLabel}"
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
