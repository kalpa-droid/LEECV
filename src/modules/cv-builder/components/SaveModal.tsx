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
      icon={<Save className="w-5 h-5 text-purple-400" />}
      size="md"
      footer={
        <div className="w-full flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-bold ui-text-primary">{storageStatus.label}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition cursor-pointer"
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
          className="w-full text-left p-3.5 rounded-2xl bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/40 hover:border-purple-500/60 transition group flex items-start gap-3 cursor-pointer disabled:opacity-50"
        >
          <div className="p-2.5 rounded-xl bg-purple-600/20 text-purple-400 group-hover:scale-110 transition flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-0.5 min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs sm:text-sm text-white">Guardar en Almacenamiento</span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-purple-900/80 text-purple-200 border border-purple-700/50">
                {isSaving ? 'Guardando...' : 'Recomendado'}
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
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
            className="w-full text-left p-3.5 rounded-2xl bg-blue-950/40 hover:bg-blue-900/60 border border-blue-800/40 hover:border-blue-500/60 transition group flex items-start gap-3 cursor-pointer"
          >
            <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 group-hover:scale-110 transition flex-shrink-0">
              <HardDrive className="w-5 h-5" />
            </div>
            <div className="space-y-0.5 min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs sm:text-sm text-white">Google Drive / Nube</span>
                <span className="text-[10px] font-bold text-blue-300">Nube Personal</span>
              </div>
              <p className="text-[11px] text-slate-300">
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
          className="w-full text-left p-3.5 rounded-2xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/40 transition group flex items-start gap-3 cursor-pointer"
        >
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition flex-shrink-0">
            <Download className="w-5 h-5" />
          </div>
          <div className="space-y-0.5 min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs sm:text-sm text-white">Descargar Copia (.JSON)</span>
              <span className="text-[10px] font-bold text-slate-400">Archivo Portátil</span>
            </div>
            <p className="text-[11px] text-slate-300">
              Exporta un archivo .JSON liviano a tu dispositivo para transferirlo a otra computadora o celular.
            </p>
          </div>
        </button>
      </div>
    </Modal>
  );
}
