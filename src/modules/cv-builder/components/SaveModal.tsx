import React, { useState } from 'react';
import { Save, Download, Cloud, ShieldCheck, HardDrive, CopyPlus, Tag, Briefcase } from 'lucide-react';
import { checkStorageStatus } from '../services/cvStorageService';
import { Modal } from '../../../shared/core/ui/Modal';
import { radius } from '../../../shared/core/uiDesignSystem';
import { JOB_POSITION_CATALOG } from '../../../shared/core/data/jobPositionCatalog';

export interface SaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveStorage: () => void;
  onExportJson: () => void;
  onOpenCloudStatus?: () => void;
  isSaving?: boolean;
  onSaveAs?: (versionLabel: string) => void;
}

export default function SaveModal({
  isOpen,
  onClose,
  onSaveStorage,
  onExportJson,
  onOpenCloudStatus,
  isSaving = false,
  onSaveAs
}: SaveModalProps) {
  const storageStatus = checkStorageStatus();

  // State for "Guardar como Nueva Versión"
  const [selectedCategory, setSelectedCategory] = useState<string>(JOB_POSITION_CATALOG[0].category);
  const [selectedPosition, setSelectedPosition] = useState<string>(JOB_POSITION_CATALOG[0].positions[0]);
  const [customPositionInput, setCustomPositionInput] = useState<string>('');
  const [isSaveAsActive, setIsSaveAsActive] = useState<boolean>(false);

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
    if (onSaveAs && effectiveLabel) {
      onSaveAs(effectiveLabel);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Guardar Documento"
      icon={<Save className="w-5 h-5 text-[var(--ui-accent-purple)]" />}
      size="lg"
      footer={
        <div className="w-full flex items-center justify-between text-xs text-[var(--ui-text-secondary)]">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-[var(--ui-accent-purple)]" />
            <span className="text-xs font-bold text-[var(--ui-text-primary)]">{storageStatus.label}</span>
          </div>
          <button
            onClick={onClose}
            className={`px-4 py-2 bg-[var(--ui-bg-panel)] hover:bg-[var(--ui-btn-neutral-hover)] text-[var(--ui-text-primary)] border border-[var(--ui-border)] font-bold rounded-[${radius.card}] transition cursor-pointer`}
          >
            Cerrar
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        {/* Option 1: Guardar en Almacenamiento Local / Nube */}
        <button
          onClick={() => {
            onSaveStorage();
            onClose();
          }}
          disabled={isSaving}
          className={`w-full text-left p-3.5 rounded-[${radius.modal}] bg-[var(--color-accent-purple-light)]/40 hover:bg-[var(--color-accent-purple-light)]/60 border border-[var(--color-accent-purple)]/40 hover:border-[var(--color-accent-purple)]/60 transition group flex items-start gap-3 cursor-pointer disabled:opacity-50`}
        >
          <div className={`p-2.5 rounded-[${radius.card}] bg-[var(--color-accent-purple-light)] border border-[var(--color-accent-purple)]/40 text-[var(--color-accent-purple-text)] group-hover:scale-110 transition flex-shrink-0`}>
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-0.5 min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs sm:text-sm text-[var(--ui-text-primary)]">Guardar en Almacenamiento</span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[var(--color-accent-purple-light)] text-[var(--color-accent-purple-text)] border border-[var(--color-accent-purple)]/50">
                {isSaving ? 'Guardando...' : 'Sobrescribir Activo'}
              </span>
            </div>
            <p className="text-[11px] text-[var(--ui-text-secondary)]">
              Actualiza el documento activo en tu navegador e IndexedDB con compresión WebP.
            </p>
          </div>
        </button>

        {/* Option 2: Guardar como Nueva Versión (por Puesto / Etiqueta) */}
        {onSaveAs && (
          <div className={`p-3.5 rounded-[${radius.modal}] bg-[var(--color-secondary-muted)]/50 border border-[var(--color-secondary-base)]/40 space-y-3`}>
            <button
              type="button"
              onClick={() => setIsSaveAsActive(!isSaveAsActive)}
              className="w-full text-left flex items-start gap-3 cursor-pointer group"
            >
              <div className={`p-2.5 rounded-[${radius.card}] bg-[var(--color-secondary-base)] text-[var(--color-secondary-on-base)] group-hover:scale-110 transition flex-shrink-0`}>
                <CopyPlus className="w-5 h-5" />
              </div>
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs sm:text-sm text-[var(--ui-text-primary)]">Guardar como Nueva Versión</span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[var(--color-secondary-base)] text-[var(--color-secondary-on-base)]">
                    Versión Independiente
                  </span>
                </div>
                <p className="text-[11px] text-[var(--ui-text-secondary)]">
                  Crea una nueva copia con ID único etiquetada para un puesto de trabajo específico (ej. "Docencia", "Administrativo").
                </p>
              </div>
            </button>

            {/* Expandable Job Position Form */}
            {isSaveAsActive && (
              <div className="pt-2 border-t border-[var(--color-secondary-base)]/20 space-y-3 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-extrabold text-[var(--ui-text-primary)] mb-1 flex items-center gap-1">
                      <Briefcase className="w-3 h-3 text-[var(--color-secondary-bright)]" />
                      Categoría de Puesto:
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="w-full text-xs font-semibold px-2.5 py-1.5 rounded bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] border border-[var(--ui-border)] focus:outline-none focus:border-[var(--color-secondary-base)]"
                    >
                      {JOB_POSITION_CATALOG.map((cat) => (
                        <option key={cat.category} value={cat.category}>
                          {cat.category}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-[var(--ui-text-primary)] mb-1 flex items-center gap-1">
                      <Tag className="w-3 h-3 text-[var(--color-secondary-bright)]" />
                      Puesto sugerido:
                    </label>
                    <select
                      value={selectedPosition}
                      onChange={(e) => setSelectedPosition(e.target.value)}
                      className="w-full text-xs font-semibold px-2.5 py-1.5 rounded bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] border border-[var(--ui-border)] focus:outline-none focus:border-[var(--color-secondary-base)]"
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
                  <label className="block text-[10px] font-extrabold text-[var(--ui-text-primary)] mb-1">
                    O escribe un puesto / etiqueta personalizada:
                  </label>
                  <input
                    type="text"
                    value={customPositionInput}
                    onChange={(e) => setCustomPositionInput(e.target.value)}
                    placeholder={`Ej: ${selectedPosition} - Universidad...`}
                    className="w-full text-xs px-3 py-1.5 rounded bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] border border-[var(--ui-border)] focus:outline-none focus:border-[var(--color-secondary-base)] placeholder:text-[var(--ui-text-secondary)]/60"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] font-extrabold text-[var(--color-secondary-bright)]">
                    Etiqueta resultante: <strong className="text-[var(--ui-text-primary)]">"{effectiveLabel}"</strong>
                  </span>

                  <button
                    type="button"
                    onClick={handleExecuteSaveAs}
                    disabled={isSaving || !effectiveLabel}
                    className="px-4 py-2 bg-[var(--color-secondary-base)] hover:opacity-90 text-[var(--color-secondary-on-base)] font-black text-xs rounded transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <CopyPlus className="w-4 h-4" />
                    <span>Guardar como "{effectiveLabel}"</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Option 3: Google Drive / Nube Status */}
        {onOpenCloudStatus && (
          <button
            onClick={() => {
              onClose();
              onOpenCloudStatus();
            }}
            className={`w-full text-left p-3.5 rounded-[${radius.modal}] bg-[var(--ui-bg-card)] hover:bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] transition group flex items-start gap-3 cursor-pointer`}
          >
            <div className={`p-2.5 rounded-[${radius.card}] bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] text-[var(--ui-dock-text)] group-hover:scale-110 transition flex-shrink-0`}>
              <HardDrive className="w-5 h-5" />
            </div>
            <div className="space-y-0.5 min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs sm:text-sm text-[var(--ui-text-primary)]">Google Drive / Nube</span>
                <span className="text-[10px] font-bold text-[var(--color-secondary-text)]">Nube Personal</span>
              </div>
              <p className="text-[11px] text-[var(--ui-text-secondary)]">
                Sincronización y estado de resguardo de archivos en tu cuenta de Google Drive.
              </p>
            </div>
          </button>
        )}

        {/* Option 4: Descargar Copia (.JSON) */}
        <button
          onClick={() => {
            onExportJson();
            onClose();
          }}
          className={`w-full text-left p-3.5 rounded-[${radius.modal}] bg-[var(--ui-bg-card)] hover:bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] hover:border-[var(--color-status-warning-base)]/40 transition group flex items-start gap-3 cursor-pointer`}
        >
          <div className={`p-2.5 rounded-[${radius.card}] bg-[var(--color-status-warning-muted)] text-[var(--color-status-warning-text)] group-hover:scale-110 transition flex-shrink-0`}>
            <Download className="w-5 h-5" />
          </div>
          <div className="space-y-0.5 min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs sm:text-sm text-[var(--ui-text-primary)]">Descargar Copia (.JSON)</span>
              <span className="text-[10px] font-bold text-[var(--ui-text-secondary)]">Archivo Portátil</span>
            </div>
            <p className="text-[11px] text-[var(--ui-text-secondary)]">
              Exporta un archivo .JSON liviano a tu dispositivo para transferirlo a otra computadora o celular.
            </p>
          </div>
        </button>
      </div>
    </Modal>
  );
}
