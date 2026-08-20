import React from 'react';
import { Save, Download, X, Cloud, ShieldCheck } from 'lucide-react';
import { checkStorageStatus } from '../services/cvStorageService';

export interface SaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveStorage: () => void;
  onExportJson: () => void;
  isSaving?: boolean;
}

export default function SaveModal({
  isOpen,
  onClose,
  onSaveStorage,
  onExportJson,
  isSaving = false
}: SaveModalProps) {
  if (!isOpen) return null;

  const storageStatus = checkStorageStatus();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in no-print">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Save className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Guardar Currículum</h3>
              <p className="text-xs text-slate-400">Guarda tus datos en tu equipo o descarga un respaldo</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Options */}
        <div className="p-5 space-y-3">
          {/* Option 1: Guardar en Almacenamiento Local / Nube */}
          <button
            onClick={() => {
              onSaveStorage();
              onClose();
            }}
            disabled={isSaving}
            className="w-full text-left p-4 rounded-2xl bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/40 hover:border-purple-500/60 transition group flex items-start gap-3.5 cursor-pointer disabled:opacity-50"
          >
            <div className="p-2.5 rounded-xl bg-purple-600/20 text-purple-400 group-hover:scale-110 transition">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="space-y-0.5 min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm text-white">Guardar en Almacenamiento</span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-purple-900/80 text-purple-200 border border-purple-700/50">
                  {isSaving ? 'Guardando...' : 'Recomendado'}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Almacena el borrador de forma segura en tu navegador e IndexedDB con compresión WebP.
              </p>
            </div>
          </button>

          {/* Option 2: Descargar Copia (.JSON) */}
          <button
            onClick={() => {
              onExportJson();
              onClose();
            }}
            className="w-full text-left p-4 rounded-2xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/40 transition group flex items-start gap-3.5 cursor-pointer"
          >
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition">
              <Download className="w-5 h-5" />
            </div>
            <div className="space-y-0.5 min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm text-white">Descargar Copia (.JSON)</span>
                <span className="text-[10px] font-bold text-slate-400">Archivo Portátil</span>
              </div>
              <p className="text-xs text-slate-300">
                Exporta un archivo .JSON liviano a tu dispositivo para transferirlo a otra computadora o celular.
              </p>
            </div>
          </button>
        </div>

        {/* Footer Status */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-bold text-slate-300">{storageStatus.label}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
