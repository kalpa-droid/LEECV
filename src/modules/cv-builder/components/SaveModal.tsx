import React, { useState } from 'react';
import { Save, Download, Cloud, ShieldCheck, CopyPlus, Tag, Briefcase, FileArchive, Globe } from 'lucide-react';
import { checkStorageStatus } from '../services/cvStorageService';
import { Modal } from '../../../shared/core/ui/Modal';
import { radius } from '../../../shared/core/uiDesignSystem';
import { JOB_POSITION_CATALOG } from '../../../shared/core/data/jobPositionCatalog';

export interface SaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveStorage: () => void;
  onExportJson: () => void;
  onOpenCloudStatus: () => void;
  isSaving?: boolean;
  onSaveAs?: (versionLabel: string) => void;
  initialSaveAsOpen?: boolean;
}

export default function SaveModal({
  isOpen,
  onClose,
  onSaveStorage,
  onExportJson,
  onOpenCloudStatus,
  isSaving = false,
  onSaveAs,
  initialSaveAsOpen = false
}: SaveModalProps) {
  const storageStatus = checkStorageStatus();

  // State for "Guardar una copia para..."
  const [selectedCategory, setSelectedCategory] = useState<string>(JOB_POSITION_CATALOG[0].category);
  const [selectedPosition, setSelectedPosition] = useState<string>(JOB_POSITION_CATALOG[0].positions[0]);
  const [customPositionInput, setCustomPositionInput] = useState<string>('');
  const [isSaveAsActive, setIsSaveAsActive] = useState<boolean>(initialSaveAsOpen);

  React.useEffect(() => {
    if (isOpen) {
      setIsSaveAsActive(initialSaveAsOpen);
    }
  }, [isOpen, initialSaveAsOpen]);

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
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenCloudStatus();
              }}
              className="ml-2 text-[10px] font-extrabold text-[var(--color-secondary-bright)] hover:underline cursor-pointer"
            >
              ⚙️ Estado de Nube & Drive
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 bg-[var(--ui-bg-panel)] hover:bg-[var(--ui-btn-neutral-hover)] text-[var(--ui-text-primary)] border border-[var(--ui-border)] font-bold rounded-[${radius.card}] transition cursor-pointer`}
          >
            Cerrar
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        {/* Opción 1: Guardar Cambios (Sobrescribir Activo) */}
        <button
          type="button"
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
              <span className="font-extrabold text-xs sm:text-sm text-[var(--ui-text-primary)]">Guardar Cambios (Sobrescribir Activo)</span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[var(--color-accent-purple-light)] text-[var(--color-accent-purple-text)] border border-[var(--color-accent-purple)]/50">
                {isSaving ? 'Guardando...' : 'Sobrescribir Activo'}
              </span>
            </div>
            <p className="text-[11px] text-[var(--ui-text-secondary)]">
              Actualiza el documento activo en tu Navegador, Supabase y Google Drive simultáneamente.
            </p>
          </div>
        </button>

        {/* Opción 2: Guardar una copia para... */}
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
                  <span className="font-extrabold text-xs sm:text-sm text-[var(--ui-text-primary)]">Guardar una copia para...</span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[var(--color-secondary-base)] text-[var(--color-secondary-on-base)]">
                    Copia Independiente
                  </span>
                </div>
                <p className="text-[11px] text-[var(--ui-text-secondary)]">
                  Crea una nueva copia con ID único etiquetada para un puesto específico (ej. "Docencia", "Gerente").
                </p>
              </div>
            </button>

            {/* Formulario desplegable de puesto */}
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
                    <span>Guardar como copia para "{effectiveLabel}"</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Opción 3: Descargar Copia Portátil (.JSON / .ZIP) */}
        <button
          type="button"
          onClick={() => {
            onExportJson();
            onClose();
          }}
          className={`w-full text-left p-3.5 rounded-[${radius.modal}] bg-[var(--ui-bg-card)] hover:bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] hover:border-[var(--color-status-warning-base)]/40 transition group flex items-start gap-3 cursor-pointer`}
        >
          <div className={`p-2.5 rounded-[${radius.card}] bg-[var(--color-status-warning-muted)] text-[var(--color-status-warning-text)] group-hover:scale-110 transition flex-shrink-0`}>
            <FileArchive className="w-5 h-5" />
          </div>
          <div className="space-y-0.5 min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs sm:text-sm text-[var(--ui-text-primary)]">Descargar Copia Portátil (.JSON / .ZIP)</span>
              <span className="text-[10px] font-bold text-[var(--ui-text-secondary)]">Llevar a otra PC</span>
            </div>
            <p className="text-[11px] text-[var(--ui-text-secondary)]">
              Elige descargar un archivo .JSON liviano o un paquete .ZIP completo para llevar tu CV en pendrive o enviar por email a otra computadora.
            </p>
          </div>
        </button>

        {/* Opción 4: Publicar en la Web (Link Público) */}
        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenCloudStatus();
          }}
          className={`w-full text-left p-3.5 rounded-[${radius.modal}] bg-[var(--color-status-success-base)] hover:opacity-90 border border-[var(--color-status-success-base)] transition group flex items-start gap-3 cursor-pointer`}
        >
          <div className={`p-2.5 rounded-[${radius.card}] bg-[var(--color-status-success-base)] border border-[var(--color-status-success-on-base)]/20 text-[var(--color-status-success-on-base)] group-hover:scale-110 transition flex-shrink-0`}>
            <Globe className="w-5 h-5" />
          </div>
          <div className="space-y-0.5 min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="font-black text-xs sm:text-sm text-[var(--color-status-success-on-base)]">Publicar en la Web (Link Público)</span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[var(--color-status-success-base)] border border-[var(--color-status-success-on-base)]/20 text-[var(--color-status-success-on-base)]">
                🌐 Link Público
              </span>
            </div>
            <p className="text-[11px] text-[var(--color-status-success-on-base)] opacity-80">
              Genera un enlace web público único para compartir tu currículum online.
            </p>
          </div>
        </button>
      </div>
    </Modal>
  );
}
