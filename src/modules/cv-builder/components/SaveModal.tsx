import React from 'react';
import { Save, Download, Cloud, ShieldCheck, HardDrive } from 'lucide-react';
import { checkStorageStatus } from '../services/cvStorageService';
import { Modal } from '../../../shared/core/ui/Modal';

import { radius } from '../../../shared/core/uiDesignSystem';

export interface SaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveStorage: () => void;
  onExportJson: () => void;
  onOpenCloudStatus?: () => void;
  isSaving?: boolean;
}

export default function SaveModal({
  isOpen,
  onClose,
  onSaveStorage,
  onExportJson,
  onOpenCloudStatus,
  isSaving = false
}: SaveModalProps) {
  const storageStatus = checkStorageStatus();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Guardar Documento"
      icon={<Save className="w-5 h-5 text-[var(--ui-accent-purple)]" />}
      size="md"
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
                {isSaving ? 'Guardando...' : 'Recomendado'}
              </span>
            </div>
            <p className="text-[11px] text-[var(--ui-text-secondary)]">
              Almacena el borrador de forma segura en tu navegador e IndexedDB con compresión WebP.
            </p>
          </div>
        </button>

        {/* Option 2: Google Drive / Nube Status */}
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

        {/* Option 3: Descargar Copia (.JSON) */}
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
              <span className="text-[10px] font-bold text-[var(--ui-text-muted)]">Archivo Portátil</span>
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
