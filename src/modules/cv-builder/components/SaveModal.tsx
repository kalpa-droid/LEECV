import React from 'react';
import { Save, Download, Cloud, ShieldCheck, HardDrive } from 'lucide-react';
import { checkStorageStatus } from '../services/cvStorageService';
import { Modal } from '../../../shared/core/ui/Modal';

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
      icon={<Save className="w-5 h-5 text-[var(--color-accent-purple)]" />}
      size="md"
      footer={
        <div className="w-full flex items-center justify-between text-xs text-white/60">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-[var(--color-accent-purple)]" />
            <span className="text-xs font-bold ui-text-primary">{storageStatus.label}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition cursor-pointer"
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
          className="w-full text-left p-3.5 rounded-2xl bg-[var(--color-accent-purple-light)]/40 hover:bg-[var(--color-accent-purple-light)]/60 border border-[var(--color-accent-purple)]/40 hover:border-[var(--color-accent-purple)]/60 transition group flex items-start gap-3 cursor-pointer disabled:opacity-50"
        >
          <div className="p-2.5 rounded-xl bg-[var(--color-accent-purple-light)] border border-[var(--color-accent-purple)]/40 text-[var(--color-accent-purple-text)] group-hover:scale-110 transition flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-0.5 min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs sm:text-sm text-white">Guardar en Almacenamiento</span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[var(--color-accent-purple)]/80 text-white border border-[var(--color-accent-purple)]/50">
                {isSaving ? 'Guardando...' : 'Recomendado'}
              </span>
            </div>
            <p className="text-[11px] text-white/80">
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
            className="w-full text-left p-3.5 rounded-2xl bg-[var(--color-secondary-muted)]/40 hover:bg-[var(--color-secondary-muted)]/60 border border-[var(--color-secondary-base)]/40 hover:border-[var(--color-secondary-base)]/60 transition group flex items-start gap-3 cursor-pointer"
          >
            <div className="p-2.5 rounded-xl bg-[var(--color-secondary-muted)] border border-[var(--color-secondary-base)]/40 text-[var(--color-secondary-text)] group-hover:scale-110 transition flex-shrink-0">
              <HardDrive className="w-5 h-5" />
            </div>
            <div className="space-y-0.5 min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs sm:text-sm text-white">Google Drive / Nube</span>
                <span className="text-[10px] font-bold text-[var(--color-secondary-text)]">Nube Personal</span>
              </div>
              <p className="text-[11px] text-white/80">
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
          className="w-full text-left p-3.5 rounded-2xl bg-black/40 hover:bg-black/60 border border-white/10 hover:border-[var(--color-status-warning-base)]/40 transition group flex items-start gap-3 cursor-pointer"
        >
          <div className="p-2.5 rounded-xl bg-[var(--color-status-warning-muted)] text-[var(--color-status-warning-text)] group-hover:scale-110 transition flex-shrink-0">
            <Download className="w-5 h-5" />
          </div>
          <div className="space-y-0.5 min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs sm:text-sm text-white">Descargar Copia (.JSON)</span>
              <span className="text-[10px] font-bold text-white/60">Archivo Portátil</span>
            </div>
            <p className="text-[11px] text-white/80">
              Exporta un archivo .JSON liviano a tu dispositivo para transferirlo a otra computadora o celular.
            </p>
          </div>
        </button>
      </div>
    </Modal>
  );
}
